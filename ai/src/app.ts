import express from "express";
import cors from "cors";
import helmet from "helmet";
import itineraryRouter from "./routes/itinerary.routes.js";
import { redisClient } from "./config/redis.js";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use("/api/ai/trips", itineraryRouter);

app.get("/health", (_, res) => {
  res.status(200).json({ success: true, service: "ai-service 123456", status: "healthy" });
});

app.get("/redis-health", async (_, res) => {
  try {
    const result = await redisClient.ping();

    res.status(200).json({
      success: true,
      redis: result,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
    });

  }
});

export default app;