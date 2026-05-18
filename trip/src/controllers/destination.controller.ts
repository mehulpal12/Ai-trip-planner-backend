import { Request, Response } from "express";

import {
  createDestinationService,
  getTripDestinationsService,
  updateDestinationService,
  deleteDestinationService,
} from "../services/destination.service.js";

import {
  createDestinationSchema,
  updateDestinationSchema,
} from "../validations/destination.validation.js";

export const createDestination = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData =
      createDestinationSchema.parse(req.body);

    const destination =
      await createDestinationService(
        req.params.tripId as string,
        validatedData
      );

    res.status(201).json({
      success: true,
      data: destination,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTripDestinations = async (
  req: Request,
  res: Response
) => {
  try {
    const destinations =
      await getTripDestinationsService(
        req.params.tripId as string,
      );

    res.status(200).json({
      success: true,
      data: destinations,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateDestination = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData =
      updateDestinationSchema.parse(req.body);

    const destination =
      await updateDestinationService(
        req.params.id as string,
        validatedData
      );

    res.status(200).json({
      success: true,
      data: destination,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteDestination = async (
  req: Request,
  res: Response
) => {
  try {
    await deleteDestinationService(req.params.id as string);

    res.status(200).json({
      success: true,
      message: "Destination deleted",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
