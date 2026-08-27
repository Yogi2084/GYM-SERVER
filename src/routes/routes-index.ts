
import { Hono } from "hono";
import { cors } from "hono/cors";
import { webClientUrl } from "../../environment";

//import { authenticationsRoutes } from "./authentications/authentication-routes";
//import { memoryRoutes } from "./memories/memory-routes";
//import { searchRoutes } from "./search/search-routes";
import { userRoutes } from "./user/user-routs";
//import { chatRoutes } from "./chat/chat-routes";
//import { dashboardRoutes } from "./user/dashboard";

export const allRoutes = new Hono();

allRoutes.use(
  cors({
    origin: [webClientUrl],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Authorization", "Content-Type"],
    exposeHeaders: ["Content-Length"],
    credentials: true,
    maxAge: 600,
  })
);

//allRoutes.route("/api/auth", authenticationsRoutes);
//allRoutes.route("/memories", memoryRoutes);
//allRoutes.route("/semantic-search", searchRoutes);
allRoutes.route("/user", userRoutes);
//allRoutes.route("/chat", chatRoutes);
//allRoutes.route("/dashboard", dashboardRoutes);
allRoutes.get("/", (c) => {
  return c.json({ message: "Hello World" });
});