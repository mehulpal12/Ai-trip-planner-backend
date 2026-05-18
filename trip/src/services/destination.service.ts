import prisma from "../config/db.js";

export const createDestinationService = async (
  tripId: string,
  data: any
) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  // Parse strings to Dates if provided
  const formattedData = {
    ...data,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  };

  const destination = await prisma.destination.create({
    data: {
      ...formattedData,
      tripId,
    },
  });

  return destination;
};

export const getTripDestinationsService = async (
  tripId: string
) => {
  return prisma.destination.findMany({
    where: { tripId },

    orderBy: {
      orderIndex: "asc",
    },
  });
};

export const updateDestinationService = async (
  id: string,
  data: any
) => {
  // Parse strings to Dates if provided
  const formattedData = { ...data };
  if (data.startDate !== undefined) {
    formattedData.startDate = data.startDate ? new Date(data.startDate) : null;
  }
  if (data.endDate !== undefined) {
    formattedData.endDate = data.endDate ? new Date(data.endDate) : null;
  }

  const destination = await prisma.destination.update({
    where: { id },

    data: formattedData,
  });

  return destination;
};

export const deleteDestinationService = async (
  id: string
) => {
  return prisma.destination.delete({
    where: { id },
  });
};
