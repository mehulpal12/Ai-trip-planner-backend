import { Router } from "express";
import * as itineraryController from "./itinerary.controller.js";

const router = Router();

router.post(
  "/internal/trips/:tripId/itinerary",
  itineraryController.save
);

export default router;