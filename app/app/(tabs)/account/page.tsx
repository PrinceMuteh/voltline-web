import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  // AccountView reads ?link=card, which needs a Suspense boundary
  return (
    <Suspense>
      <AccountView />
    </Suspense>
  );
}
