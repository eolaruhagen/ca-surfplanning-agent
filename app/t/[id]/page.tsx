import { notFound } from "next/navigation";
import { kv } from "@/lib/kv";
import { TripSchema } from "@/lib/schemas";
import TripViewClient from "@/app/components/trip-view/trip-view-client";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await kv.get(`trip:${id}`);
  if (!raw) notFound();
  const trip = TripSchema.parse(raw);
  return <TripViewClient trip={trip} />;
}
