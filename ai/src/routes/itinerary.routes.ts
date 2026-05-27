import { Router } from "express";
import { handleItineraryCreation } from "../controllers/itinerary.controller.js";

const router = Router();

router.post("/generate", handleItineraryCreation);

export default router;