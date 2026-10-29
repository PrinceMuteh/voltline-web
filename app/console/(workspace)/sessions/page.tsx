import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionsView } from "./sessions-view";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  // SessionsView reads ?session= for the drawer, which needs a Suspense boundary
  return (
    <Suspense>
      <SessionsView />
    </Suspense>
  );
}
