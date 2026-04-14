export const dynamic = "force-dynamic";

import { DealFitnessClient } from "./deal-fitness-client";

export default async function DealFitnessPage() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let initialData: { deals: any[] } = { deals: [] };
  try {
    const res = await fetch(`${baseUrl}/api/deal-fitness`, { cache: "no-store" });
    if (res.ok) initialData = await res.json();
  } catch {
    // Render with empty portfolio; the client will surface the empty state.
  }

  return <DealFitnessClient initialData={initialData} />;
}
