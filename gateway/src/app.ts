import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://127.0.0.1:4000";
const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || "http://127.0.0.1:4001";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:4002";

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.get("/health", (_, res) => {
  res.json({
    success: true,
    service: "gateway"
  });
});

// =========================================================================
// PROXIES - Using explicit key-value rewrites to stop path stripping
// =========================================================================

// 1. USER IDENTITY ROUTING
app.use(
  "/api/users",
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Forcefully keeps the prefix intact before passing it down
      return path.startsWith("/api/users") ? path : `/api/users${path}`;
    },
    logger: console
  })
);

// 2. CORE TRIP CRUD ROUTING
app.use(
  "/api/trips",
  createProxyMiddleware({
    target: TRIP_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Forcefully keeps the prefix intact before passing it down
      return path.startsWith("/api/trips") ? path : `/api/trips${path}`;
    },
    logger: console
  })
);

// 3. BACKGROUND AI ENGINE ROUTING
app.use(
  "/api/ai",
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Forcefully keeps the prefix intact before passing it down
      return path.startsWith("/api/ai/trips") ? path : `/api/ai${path}`;
    },
    logger: console
  })
);

console.log("User service mapped to:", USER_SERVICE_URL);
console.log("Trip service mapped to:", TRIP_SERVICE_URL);
console.log("AI service mapped to:", AI_SERVICE_URL);

export default app;