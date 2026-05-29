import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:4000";
const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || "http://localhost:4001";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:4002";

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.get("/health", (_, res) => {
  res.json({
    success: true,
    service: "gateway"
  });
});

app.use(
  "/api/users",
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/": "/api/users/"
    },
    logger: console
  })
);

app.use(
  "/api/trips",
  createProxyMiddleware({
    target: TRIP_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/": "/api/trips/"
    }
  })
);

app.use(
  "/api/ai",
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/": "/api/ai/"
    }
  })
);

console.log("User service:", USER_SERVICE_URL);
console.log("AI service:", AI_SERVICE_URL);
console.log("Trip service:", TRIP_SERVICE_URL);

export default app;
