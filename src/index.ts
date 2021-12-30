import "reflect-metadata";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createConnection } from "typeorm";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { buildSchema } from "type-graphql";
import { userResolver, profileResolver } from "./graphql/resolvers";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { refreshTokenController } from "./controllers/refreshTokenController";

(async () => {
  const app = express();

  app.use(cookieParser());
  app.use(
    cors({
      credentials: true,
      origin: "http://localhost:3000",
    })
  );

  await createConnection();

  app.get("/", (_req, res) => res.send("Hello from express"));

  app.post("/refresh_token", refreshTokenController);

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [userResolver, profileResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(4000, () => {
    console.log("Server started on http://localhost:4000/graphql");
  });
})();
