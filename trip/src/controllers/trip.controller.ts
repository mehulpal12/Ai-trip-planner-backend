import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/protect.js";

import * as tripService from "../services/trip.service.js";

export const createTrip = async (
  req: AuthRequest,
  res: Response
) => {

  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const trip = await tripService.createTrip({
    ...req.body,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: trip,
  });
};

export const getTrips = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const trips = await tripService.getTrips(req.user.id);

  res.status(200).json({
    success: true,
    data: trips,
  });
};

export const getTripById = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const trip = await tripService.getTripById(req.params.id as string);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found",
    });
  }

  const hasAccess =
    trip.createdBy === req.user.id ||
    trip.members?.some((member: { userId: string }) => member.userId === req.user.id);

  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: "Forbidden - You do not have access to this trip",
    });
  }

  res.status(200).json({
    success: true,
    data: trip,
  });
};

export const updateTrip = async (
  req: AuthRequest,
  res: Response
) => {
  const trip =
    await tripService.updateTrip(
      req.params.id as string,
      req.body
    );

  res.status(200).json({
    success: true,
    data: trip,
  });
};

export const deleteTrip = async (
  req: AuthRequest,
  res: Response
) => {
  await tripService.deleteTrip(
    req.params.id as string
  );

  res.status(200).json({
    success: true,
    message: "Trip deleted",
  });
};

export const getUserTrips = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const trips = await tripService.getUserTrips(req.user.id);

  res.status(200).json({
    success: true,
    data: trips,
  });
};
