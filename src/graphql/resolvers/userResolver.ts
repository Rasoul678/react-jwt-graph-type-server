import { User } from "../../entity/User";
import { compare, hash } from "bcryptjs";
import { getConnection } from "typeorm";
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
  @Query(() => String)
  hello() {
    return "hello!";
  }

  @UseMiddleware(isAuth)
  @Query(() => String)
  bye(@Ctx() { payload }: MyContext) {
    return `user id: ${payload?.userId}`;
  }

  @Query(() => [User])
  users() {
    return User.find();
  }

  @Query(() => ResetPasswordResponse)
  async resetPassword(
    @Arg("input", () => ResetPasswordInput) input: ResetPasswordInput
  ): Promise<ResetPasswordResponse> {
    const user = await User.findOne({
      where: { resetPasswordToken: input.token },
    });

    if (!user) {
      return {
        message: "Invalid token",
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

  @Query(() => ResetPasswordResponse)
  async sendChangePasswordEmail(
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

    return { accessToken };
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

      //! Save the record in db.
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values([
          {
            email: input.email,
            password: hashedPassword,
          },
        ])
        .returning("*")
        .execute();

      const savedUser = result.generatedMaps[0];
      //! User successfully registered.
      const refreshToken = createRefreshToken(savedUser as User);
      sendRefreshToken(res, refreshToken);

      const accessToken = createAccessToken(savedUser as User);

      return { accessToken };
    } catch (error) {
      console.log(error);
      return { error: { type: "Server error", message: error.message } };
    }
  }
}

export default userResolver;
