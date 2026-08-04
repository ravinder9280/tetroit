import cors from "cors";
import express from "express";
import morgan from "morgan";
import { auth } from "./lib/auth";
import routes from "./routes";
import { toNodeHandler } from "better-auth/node";

const app: express.Express = express();

app.use(morgan("tiny"));


app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000"],
  })
);
app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json({ limit: "100mb" }));


app.use("/v1", routes);

export default app;
