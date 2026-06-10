import express from "express";
import cors from "cors";
import helmet from "helmet";
import itineraryRouter from "./routes/itinerary.routes.js";
import { redisClient } from "./config/redis.js";
import { serverAdapter } from "./config/bull-board.js";
const app = express();

// Global Middleware Setup
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes Setup
app.use("/api/ai/trips", itineraryRouter);
app.use(
  "/admin/queues",
  serverAdapter.getRouter()
);

app.get("/health", (_, res) => {
  res.status(200).json({ success: true, service: "ai-service 123456", status: "healthy" });
});

app.get("/redis-health", async (_, res) => {
  try {
    // If protocolVersion is correctly set to 2, this ping will execute flawlessly
    const result = await redisClient.ping();
    res.status(200).json({
      success: true,
      redis: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



export default app;