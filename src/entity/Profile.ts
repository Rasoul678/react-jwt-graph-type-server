import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Profile extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => String, { defaultValue: "" })
  @Column("text", { default: "" })
  firstName: string;

  @Field(() => String, { defaultValue: "" })
  @Column("text", { default: "" })
  lastName: string;

  @Field(() => User, { nullable: true })
  @OneToOne(() => User, (user) => user.profile)
  user: User;
}
