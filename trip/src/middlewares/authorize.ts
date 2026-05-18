import { Response, NextFunction } from "express";
import { AuthRequest } from "./protect.js";
import prisma from "../config/db.js";

export const isTripOwner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tripId = (req.params.id || req.params.tripId) as string;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User identity missing",
      });
    }

    if (!tripId) {
       return res.status(400).json({
        success: false,
        message: "Trip ID is required",
      });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { createdBy: true },
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (trip.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - You do not own this trip",
      });
    }

    next();
  } catch (error) {
    console.error("Authorization Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error during authorization",
    });
  }
};
