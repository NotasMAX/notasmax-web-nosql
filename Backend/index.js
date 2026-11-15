import "dotenv/config.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import { dirname, extname, resolve } from "node:path";
import { existsSync } from "node:fs";
import routes from "./Routes/routes.js";
import authRoutes from "./Routes/AuthRoute.js";
import { connectDatabase } from "./DB/conn.js";
import { loadRuntimeConfig, getCorsOrigins } from "./config.js";
import { originGuard } from "./middlewares/originGuard.js";

const app = express();
const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "public");
const frontendIndexPath = resolve(frontendDirectory, "index.html");
const hasBuiltFrontend = existsSync(frontendIndexPath);

export function createFrontendFallback(indexPath) {
  return (req, res, next) => {
    const normalizedPath = req.path.toLowerCase();
    const isApiPath = normalizedPath === "/notasmax" || normalizedPath.startsWith("/notasmax/");
    const isAssetPath =
      extname(req.path) !== "" || normalizedPath === "/assets" || normalizedPath.startsWith("/assets/");
    if (req.method !== "GET" || isApiPath || isAssetPath || !req.accepts("html")) {
      return next();
    }

    return res.sendFile(indexPath, (error) => {
      if (error) next(error);
    });
  };
}

app.use(express.json());
app.use(cookieParser());

app.use(originGuard);

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, false);
    try {
      return callback(null, getCorsOrigins().includes(origin));
    } catch {
      return callback(new Error("Invalid server configuration"));
    }
  },
}));

app.use("/NotasMax/Auth", authRoutes);
app.use("/NotasMax", routes);

if (hasBuiltFrontend) {
  app.use(express.static(frontendDirectory, { index: false }));
  app.use(createFrontendFallback(frontendIndexPath));
}

export async function startServer() {
  let config;
  try {
    config = loadRuntimeConfig();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  try {
    await connectDatabase(config.mongoUri);
  } catch {
    console.error("MongoDB connection failed.");
    process.exitCode = 1;
    return;
  }

  app.listen(config.port, () => console.log(`API listening on port ${config.port}.`));
  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await startServer();
}

export default app;
