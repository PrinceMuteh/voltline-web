import type { Metadata } from "next";
import { Suspense } from "react";
import { WelcomeFlow } from "./welcome-flow";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  // WelcomeFlow reads ?next= (a charger deep link), which needs a Suspense boundary
  return (
    <Suspense>
      <WelcomeFlow />
    </Suspense>
  );
}
