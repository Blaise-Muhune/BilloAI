/** Public list prices. Keep these in sync with the Stripe prices in .env.local. */

export const INDIVIDUAL_MONTHLY_USD = 19;
export const INDIVIDUAL_YEARLY_USD = 180;
export const ORGANIZER_SEAT_USD = 6;

export function usd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
