import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/console/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AddChargerWizard } from "./add-charger-wizard";

export const metadata: Metadata = { title: "Add a charger" };

export default function AddChargerPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-2 text-[13px] text-ink-3">
        <Link href="/console" className="hover:text-ink">
          Overview
        </Link>{" "}
        / <span aria-current="page">Add a charger</span>
      </nav>
      <PageHeader title="Add a charger" />
      {/* The wizard reads ?charger= to resume, which needs a Suspense boundary */}
      <Suspense fallback={<Skeleton className="h-80 w-full max-w-2xl" />}>
        <AddChargerWizard />
      </Suspense>
    </>
  );
}
