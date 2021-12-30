import { User } from "../../entity/User";
import { compare, hash } from "bcryptjs";
import { MyContext } from "src/MyContext";
import { createAccessToken, createRefreshToken } from "../../utils/auth";
import { isAuth } from "../../middlewares/isAuth";
import { sendRefreshToken } from "../../utils/sendRefreshToken";
import { revokeRefreshToken } from "../../utils/revokeRefreshToken";
import { sendEmail } from "../../utils/sendEmail";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { verify } from "jsonwebtoken";
import { Profile } from "../../entity/Profile";

@ObjectType()
class FieldError {
  @Field()
  type: string;

  @Field()
  message: string;
}

@ObjectType()
class ResetPasswordResponse {
  @Field()
  ok: boolean;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => FieldError, { nullable: true })
  error?: FieldError;

  @Field(() => String, { nullable: true })
  accessToken?: string;

  @Field(() => User, { nullable: true })
  user?: User;
}

@InputType()
class EmailPasswordInput {
  @Field()
  email: string;

  @Field()
  password: string;
}

@InputType()
class ResetPasswordInput {
  @Field()
  token: string;

  @Field()
  password: string;
}

@Resolver()
class userResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    const authorization = req.headers["authorization"];

    if (!authorization) {
      return null;
    }

    try {
      const token = authorization.split(" ")[1];
      const payload: any = verify(token, process.env.ACCESS_TOKEN_SECRET!);

      return User.findOne(payload.userId, { relations: ["profile"] });
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @UseMiddleware(isAuth)
  @Query(() => [User])
  users() {
    return User.find({ relations: ["profile"] });
  }

  @Mutation(() => ResetPasswordResponse)
  async resetPassword(
    @Arg("input", () => ResetPasswordInput) input: ResetPasswordInput
  ): Promise<ResetPasswordResponse> {
    const user = await User.findOne({
      where: { resetPasswordToken: input.token },
    });

    if (!user) {
      return {
        message: "Token expired or invalid",
        ok: false,
      };
    }

    const hashedPassword = await hash(input.password, 12);

    try {
      await User.update(
        { id: user.id },
        { password: hashedPassword, resetPasswordToken: "" }
      );

      //! Revoke refresh token on password change.
      revokeRefreshToken(user.id);

      return {
        message: "Password changed successfully",
        ok: true,
      };
    } catch (error) {
      console.log(error);
      return {
        message: "Password change failed",
        ok: false,
      };
    }
  }

  @Mutation(() => ResetPasswordResponse)
  async sendResetPasswordEmail(
    @Arg("email") email: string
  ): Promise<ResetPasswordResponse> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return {
        ok: false,
        message: "Email address is not correct",
      };
    }

    const resetPasswordToken = Math.random().toString(36).substring(2);

    try {
      //! trigger the sending of the E-mail
      await sendEmail(email, resetPasswordToken);

      await User.update({ email }, { resetPasswordToken });

      setTimeout(async () => {
        await User.update({ email }, { resetPasswordToken: "" });
      }, 120000);

      return {
        ok: true,
        message: "Reset password link sent successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        ok: false,
        message: "Reset password failed",
      };
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("input", () => EmailPasswordInput) input: EmailPasswordInput,
    @Ctx() { res }: MyContext
  ): Promise<UserResponse> {
    //! See if there is such user in db.
    const user = await User.findOne({ where: { email: input.email } });
    if (!user) return { error: { type: "email", message: "Email not found" } };

    //! See if the password is correct.
    const valid = await compare(input.password, user.password);

    if (!valid) {
      return { error: { type: "password", message: "Password is incorrect" } };
    }

    //! User successfully logged in.

    const refreshToken = createRefreshToken(user);
    sendRefreshToken(res, refreshToken);

    const accessToken = createAccessToken(user);

    return { accessToken, user };
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("input", () => EmailPasswordInput) input: EmailPasswordInput,
    @Ctx() { res }: MyContext
  ): Promise<UserResponse> {
    try {
      //! User email has to be unique.
      const persistedUser = await User.findOne({
        where: { email: input.email },
      });

      if (persistedUser)
        return { error: { type: "email", message: "Email already exists" } };

      //! Hash the password before inserting it into the db.
      const hashedPassword = await hash(input.password, 12);

      const profile = await Profile.create().save();

      const user = await User.create({
        email: input.email,
        password: hashedPassword,
        profileId: profile.id,
      }).save();

      //! User successfully registered.
      const refreshToken = createRefreshToken(user);
      sendRefreshToken(res, refreshToken);

      const accessToken = createAccessToken(user);

      return { accessToken, user };
    } catch (error) {
      console.log(error);
      return { error: { type: "Server error", message: error.message } };
    }
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { res }: MyContext) {
    sendRefreshToken(res, "");
    return true;
  }
}

export default userResolver;
