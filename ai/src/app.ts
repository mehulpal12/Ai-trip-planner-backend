import express from "express";
import cors from "cors";
import helmet from "helmet";
import itineraryRouter from "./routes/itinerary.routes.js";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use("/api/ai/itinerary", itineraryRouter);

app.get("/health", (_, res) => {
  res.status(200).json({ success: true, service: "ai-service", status: "healthy" });
});

export default app;