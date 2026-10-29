import { PageHeader } from "./page-header";

/** Placeholder for console screens scheduled in a later build phase. */
export function ComingInPhase({
  title,
  phase,
  description,
}: {
  title: string;
  phase: number;
  description: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
        <p className="text-[14px] font-medium">Arrives in phase {phase}</p>
        <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-3">
          {description}
        </p>
      </div>
    </>
  );
}
