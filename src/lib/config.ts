/**
 * Business rules for "pay small small".
 * The values marked TODO are placeholders. Confirm them with the client before launch.
 */
export const rules = {
  /** Allowed plan lengths in months. */
  durations: [1, 2, 3, 4, 5, 6] as const,
  /** TODO(client): minimum first payment as a fraction of the price. */
  minDepositFraction: 0.1,
  /** TODO(client): smallest top-up a customer may pay, in pesewas (GHS 20). */
  minPayment: 20_00,
  /** Unpaid plans (no deposit) are cancelled after this many hours. */
  pendingExpiryHours: 48,
  /** TODO(client): don't remind the same customer more often than this. */
  reminderIntervalDays: 7,
  /** Paystack requires an email; customers without one get a placeholder. */
  placeholderEmailDomain: "customers.ebendo.invalid",
};

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * The shop's public details. TODO(client, #16): confirm the phone/WhatsApp
 * number and opening hours — until then the site shows "[to confirm]".
 */
export const shop = {
  name: "Ebendo Blessing Supply Enterprise",
  address: ["Behind Accra Brewery Ltd", "Graphic Road, Accra"],
  gps: "GA-138-2791", // Ghana Post GPS
  /** What Google Maps searches for, for the map and "Get directions". */
  mapQuery: "Accra Brewery, Graphic Road, Accra",
  phone: null as string | null, // e.g. "+233 24 000 0000"
  whatsapp: null as string | null, // e.g. "233240000000" (digits only, for wa.me links)
  hours: null as [days: string, time: string][] | null,
};
