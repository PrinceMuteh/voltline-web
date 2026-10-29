import type { Metadata } from "next";
import { Suspense } from "react";
import { MapView } from "./map-view";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  // MapView reads ?station= for the sheet, which needs a Suspense boundary
  return (
    <Suspense>
      <MapView />
    </Suspense>
  );
}
