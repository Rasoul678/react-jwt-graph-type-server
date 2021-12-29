import nodemailer from "nodemailer";
import { encode } from "js-base64";

export const sendEmail = async (email: string, token: string) => {
  //! initialize nodemailer
  const transporter = nodemailer.createTransport({
    host: "smtp.live.com",
    port: 587,
    auth: {
      user: process.env.NODE_MAILER_USER,
      pass: process.env.NODE_MAILER_PASS,
    },
  });

  const mailOptions = {
    from: process.env.NODE_MAILER_USER, //! sender address
    to: email, //! list of receivers
    subject: "Reset password email",
    html: `
    <h2>Hi</h2>
    <p style='padding: 1rem 0;'>Please click on the link below to go to the change password page.</p>
    <a href='http://localhost:3000/reset_password?rpt=${encode(
      token
    )}' style='color: crimson; font-size: 1rem;'>Change Password</a>
    `,
  };

  //! trigger the sending of the E-mail
  await transporter.sendMail(mailOptions);
};
