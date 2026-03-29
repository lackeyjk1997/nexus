import { redirect } from "next/navigation";

export default function ObservationsPage() {
  redirect("/intelligence?tab=feed");
}
