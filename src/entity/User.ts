import { Field, ObjectType, Int } from "type-graphql";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { Profile } from "./Profile";

@ObjectType()
@Entity("users")
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column("text")
  email: string;

  @Column("text")
  password: string;

  @Column("text", { default: "" })
  resetPasswordToken: string;

  @Column("int", { default: 0 })
  tokenVersion: number;

  @Field(() => Profile, { nullable: true })
  @OneToOne(() => Profile, (profile) => profile.user)
  @JoinColumn()
  profile: Profile;

  @Field(() => Int)
  @Column("int", { nullable: true })
  profileId: number;
}
