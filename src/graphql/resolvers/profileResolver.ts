import { isAuth } from "../../middlewares/isAuth";
import {
  Arg,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { getConnection } from "typeorm";
import { Profile } from "../../entity/Profile";

@InputType()
class ProfileInput {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  firstName: string;

  @Field(() => String, { nullable: true })
  lastName: string;
}

@Resolver()
class profileResolver {
  @UseMiddleware(isAuth)
  @Query(() => Profile, { nullable: true })
  async profile(@Arg("userId") userId: string) {
    const profile = getConnection()
      .createQueryBuilder()
      .select("profile")
      .from(Profile, "profile")
      .leftJoinAndSelect("profile.user", "user")
      .where("user.id = :id", { id: userId })
      .getOne();

    return profile;
  }

  @Mutation(() => Boolean)
  async updateProfile(@Arg("input", () => ProfileInput) input: ProfileInput) {
    try {
      await getConnection()
        .createQueryBuilder()
        .update(Profile)
        .set({ firstName: input.firstName, lastName: input.lastName })
        .where("id = :id", { id: input.id })
        .execute();

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}

export default profileResolver;
