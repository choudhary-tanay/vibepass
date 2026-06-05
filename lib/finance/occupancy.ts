import { numberValue, percent } from "./money";

export function calculateOccupancyPercent(confirmedBookings: number, capacity: number): number {
  return percent(Math.max(0, numberValue(confirmedBookings)), Math.max(0, numberValue(capacity)));
}

export function calculateAvailableSeats(capacity: number, confirmedBookings: number): number {
  return Math.max(0, Math.floor(numberValue(capacity)) - Math.floor(numberValue(confirmedBookings)));
}
