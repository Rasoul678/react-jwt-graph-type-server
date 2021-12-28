import { User } from "../entity/User";
import { getConnection } from "typeorm";

// TODO: add forget password
export const revokeRefreshToken = async (userId: number) => {
  await getConnection().getRepository(User).increment({ id: userId }, "tokenVersion", 1);
};
