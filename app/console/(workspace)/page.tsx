import type { Metadata } from "next";
import { Suspense } from "react";
import { OverviewView } from "./overview-view";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  // OverviewView reads ?charger= for the drawer, which needs a Suspense boundary
  return (
    <Suspense>
      <OverviewView />
    </Suspense>
  );
}
