import { Router } from "express";
import { 
  handleItineraryCreation, 
  handleGetCacheStats, 
  handleClearCache 
} from "../controllers/itinerary.controller.js";

const router = Router();

// Route for generation logic
router.post("/generate", handleItineraryCreation);

// Route to check cache count and keys
router.get("/cache-stats", handleGetCacheStats);

// Route to invalidate all cached records
router.delete("/cache", handleClearCache);

export default router;