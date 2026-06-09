import { Router } from "express";
import { 
  handleItineraryCreation, 
  handleGetAllUserItineraries,
  handleDeleteSingleItinerary,
  handleClearAllUserItineraries,
  handleGetJobStatus
} from "../controllers/itinerary.controller.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
// import { protectAuth } from "../middleware/auth.js"; 

const router = Router();

// Secure all downstream operations using your authentication guard
// router.use(protectAuth)
// /api/ai/trips
// 1. Generate & Cache (Checks rate-limiting first)
router.post("/generate", aiRateLimiter, handleItineraryCreation);
router.post("/:tripId/itinerary/generate",  handleItineraryCreation);
// bullMQ progress tracking for async jobs
router.get('/itinerary/jobs/:jobId', handleGetJobStatus);
// 2. Read History Stack (Fetches all unexpired cached objects for the sidebar)
router.get("/history", aiRateLimiter, handleGetAllUserItineraries);

// 3. Delete Specific Target Cache Key
router.delete("/remove-item", handleDeleteSingleItinerary);

// 4. Wipe Entire User Portfolio Deck
router.delete("/clear-all", handleClearAllUserItineraries);

export default router;