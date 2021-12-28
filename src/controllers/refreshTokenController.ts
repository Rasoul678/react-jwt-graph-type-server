import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { createAccessToken, createRefreshToken } from "../utils/auth";
import { sendRefreshToken } from "../utils/sendRefreshToken";
import { User } from "../entity/User";

export const refreshTokenController = async (req: Request, res: Response) => {
  const token = req.cookies.jid;

  if (!token) {
    return res.send({ ok: false, accessToken: "" });
  }

  let payload: any = null;

  try {
    payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
  } catch (error) {
    console.log(error);
    return res.send({ ok: false, accessToken: "" });
  }

  //! Token is valid, check if user still exists
  const user = await User.findOne({ id: payload.userId });

  if (!user) {
    return res.send({ ok: false, accessToken: "" });
  }

  //! Check if refresh token version has been revoked (if user has changed password)
  if (user.tokenVersion !== payload.tokenVersion) {
    return res.send({ ok: false, accessToken: "" });
  }

  const refreshToken = createRefreshToken(user);
  sendRefreshToken(res, refreshToken);

  return res.send({ ok: true, accessToken: createAccessToken(user) });
};
