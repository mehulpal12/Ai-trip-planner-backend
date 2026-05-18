import { z } from "zod";

export const createDestinationSchema = z.object({
  name: z.string().min(2, "Name is required"),

  city: z.string().min(2, "City is required"),

  state: z.string().optional(),

  country: z.string().optional(),

  latitude: z.number().optional(),

  longitude: z.number().optional(),

  startDate: z.string().optional(),

  endDate: z.string().optional(),

  orderIndex: z.number().positive(),
});

export const updateDestinationSchema =
  createDestinationSchema.partial();
