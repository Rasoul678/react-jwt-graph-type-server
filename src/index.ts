import "reflect-metadata";
import "dotenv/config";
import { createConnection } from "typeorm";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { buildSchema } from "type-graphql";
import { userResolver } from "./graphql/resolvers";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import cookieParser from "cookie-parser";
import { refreshTokenController } from "./controllers/refreshTokenController";

(async () => {
  const app = express();

  app.use(cookieParser());

  await createConnection();

  app.get("/", (_req, res) => res.send("Hello from express"));

  app.post("/refresh_token", refreshTokenController);

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [userResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ req, res }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log("Server started on http://localhost:4000/graphql");
  });
})();
