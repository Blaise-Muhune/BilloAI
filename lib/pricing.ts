/** Public list prices. Keep these in sync with the Stripe prices in .env.local. */

export const INDIVIDUAL_MONTHLY_USD = 19;
export const INDIVIDUAL_YEARLY_USD = 180;
export const INDIVIDUAL_YEARLY_PER_MONTH_USD = Math.round(INDIVIDUAL_YEARLY_USD / 12);
export const INDIVIDUAL_YEARLY_SAVINGS_USD = INDIVIDUAL_MONTHLY_USD * 12 - INDIVIDUAL_YEARLY_USD;
export const ORGANIZER_SEAT_USD = 6;
export const TEAM_SEAT_MONTHLY_USD = 15;
export const TEAM_SEAT_YEARLY_USD = 150;
export const SEAT_MIN = 1;
export const SEAT_MAX = 500;
export const TEAM_SEAT_MIN = 5;
export const TEAM_SEAT_MAX = 200;
export const TEAM_YEARLY_FLOOR_USD = TEAM_SEAT_MIN * TEAM_SEAT_YEARLY_USD;

export function usd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function planLabel(plan: string | undefined) {
  if (plan === "team") return "Team";
  if (plan === "organizer") return "Group seats";
  if (plan === "individual") return "Individual";
  return "Free";
}

export function statusLabel(status: string | undefined) {
  if (status === "active") return "Active";
  if (status === "past_due") return "Past due";
  if (status === "canceled") return "Canceled";
  return "None";
}

export function clampSeats(value: number) {
  if (!Number.isFinite(value)) return SEAT_MIN;
  return Math.min(SEAT_MAX, Math.max(SEAT_MIN, Math.floor(value)));
}

export function seatsPrice(value: number) {
  return clampSeats(value) * ORGANIZER_SEAT_USD;
}

export function clampTeamSeats(value: number) {
  if (!Number.isFinite(value)) return TEAM_SEAT_MIN;
  return Math.min(TEAM_SEAT_MAX, Math.max(TEAM_SEAT_MIN, Math.floor(value)));
}

export function teamSeatsYearlyPrice(value: number) {
  return clampTeamSeats(value) * TEAM_SEAT_YEARLY_USD;
}

export function teamSeatsMonthlyPrice(value: number) {
  return clampTeamSeats(value) * TEAM_SEAT_MONTHLY_USD;
}
