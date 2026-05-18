import express from "express";

import { protect } from "../middlewares/protect.js";

import {
  createDestination,
  getTripDestinations,
  updateDestination,
  deleteDestination,
} from "../controllers/destination.controller.js";

import { isTripOwner } from "../middlewares/authorize.js";

const router = express.Router();

router.post(
  "/trips/:tripId/destinations",
  protect,
  isTripOwner,
  createDestination
);

router.get(
  "/trips/:tripId/destinations",
  protect,
  getTripDestinations
);

router.patch(
  "/destinations/:id",
  protect,
  updateDestination
);

router.delete(
  "/destinations/:id",
  protect,
  deleteDestination
);

export default router;
