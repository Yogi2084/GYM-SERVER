import "dotenv/config";
import { serve } from "@hono/node-server";
import { allRoutes } from "./routes/routes-index.js";

allRoutes.get("/", (c) => c.text("Hello from Neuronest!"));

serve(allRoutes, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
