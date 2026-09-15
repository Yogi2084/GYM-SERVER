import { betterAuth } from "better-auth";
import { serverUrl, webClientUrl } from "../../environment";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prismaClient } from "./prisma";

export const auth = betterAuth({
  baseURL: serverUrl,
  basePath: "/api/auth",
  trustedOrigins: [webClientUrl],
  // socialProviders: {
  //   google: {
  //     clientId: googleClientId,
  //     clientSecret: googleClientSecret,
  //     scopes: [
  //       "https://www.googleapis.com/auth/userinfo.profile",
  //       "https://www.googleapis.com/auth/userinfo.email",
  //     ],
  //   },
  // },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
      // domain: "neuronest.world",
      // path: "/",
      // httpOnly: true,
    },
  },
  database: prismaAdapter(prismaClient, {
    provider: "postgresql",
  }),
  user: {
    modelName: "User",
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  chat: {
    modelName: "Chat",
  },
  emailAndPassword: {
    enabled: true,
  },
  cookies: {
    enabled: true,
  },
});
