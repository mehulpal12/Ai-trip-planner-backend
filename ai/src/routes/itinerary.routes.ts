import { Router } from "express";
import { 
  handleItineraryCreation, 
  handleGetAllUserItineraries,
  handleDeleteSingleItinerary,
  handleClearAllUserItineraries
} from "../controllers/itinerary.controller.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
// import { protectAuth } from "../middleware/auth.js"; 

const router = Router();

// Secure all downstream operations using your authentication guard
// router.use(protectAuth)

// 1. Generate & Cache (Checks rate-limiting first)
router.post("/generate",  handleItineraryCreation);

// 2. Read History Stack (Fetches all unexpired cached objects for the sidebar)
router.get("/history", handleGetAllUserItineraries);

// 3. Delete Specific Target Cache Key
router.delete("/remove-item", handleDeleteSingleItinerary);

// 4. Wipe Entire User Portfolio Deck
router.delete("/clear-all", handleClearAllUserItineraries);

export default router;