import { auth } from "../../lib/auth";
import { createUnsecureRoute } from "../middleware/session-middleware";

export const authenticationsRoutes = createUnsecureRoute();

// Add explicit route for social sign-in
authenticationsRoutes.post("/sign-in/social", async (c) => {
  return auth.handler(c.req.raw);
});

// Keep other auth routes handled generically
authenticationsRoutes.use((c) => {
  return auth.handler(c.req.raw);
});
