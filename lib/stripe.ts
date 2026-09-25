import Stripe from "stripe";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  if (!key) throw new Error("Add STRIPE_SECRET_KEY to the server environment.");
  return new Stripe(key);
}

export function integrationId(label: string) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${label}_${suffix}`;
}

export function appOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
