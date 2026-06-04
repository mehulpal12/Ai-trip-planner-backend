import axios from "axios";

export const tripClient = axios.create({
  // Removes the accidental non-null operator to allow a clean fallback if env is missing
  baseURL: process.env.TRIP_SERVICE_URL || "http://localhost:4001",
  headers: {
    "Content-Type": "application/json",
  },
});

export async function getItinerary(tripId: string, inputHash: string) {
  const url = `/api/trips/internal/trips/${tripId}/itinerary?inputHash=${inputHash}`;

  console.log("Calling Trip Service:", `${tripClient.defaults.baseURL}${url}`);
  const response = await tripClient.get(url);
  return response.data;
}

export async function saveItinerary(tripId: string, itinerary: any, inputHash: string) {
  // Pass both the payload and the identifier hash to the internal route body
  const response = await tripClient.post(`/api/trips/internal/trips/${tripId}/itinerary`, {
    itinerary,
    inputHash
  });
  return response.data;
}



export async function deleteItinerary(tripId: string) {
  // Routes safely to your Trip-Service's POST endpoint
  const response = await tripClient.delete(`/api/trips/internal/trips/${tripId}/itinerary`);
  return response.data;
}   