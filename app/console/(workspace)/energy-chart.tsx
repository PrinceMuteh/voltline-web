"use client";

import { useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const label = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * kWh per hour, 00:00 to 24:00. Past hours in neutral grey, the current hour in green,
 * hours still to come empty. One series, so no legend; each bar is its own hover and
 * focus target and the tooltip waits 80 ms so sweeping across does not flicker.
 */
export function EnergyChart({
  byHourWh,
}: {
  byHourWh: (number | null)[] | undefined;
}) {
  const [active, setActive] = useState<number | null>(null);
  const delay = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = (h: number) => {
    clearTimeout(delay.current);
    delay.current = setTimeout(() => setActive(h), 80);
  };
  const hide = () => {
    clearTimeout(delay.current);
    setActive(null);
  };

  if (!byHourWh) {
    return <Skeleton className="h-48 w-full" />;
  }

  const current = byHourWh.findLastIndex((v) => v !== null);
  const max = Math.max(...byHourWh.map((v) => v ?? 0));
  // Clean top tick: 1, 2, 5 × 10^n kWh
  const maxKwh = max / 1000;
  const top =
    maxKwh <= 0
      ? 1
      : [1, 2, 5, 10]
          .map((m) => m * 10 ** Math.floor(Math.log10(maxKwh)))
          .find((t) => t >= maxKwh)!;
  const empty = max === 0;

  return (
    <div>
      <div className="relative flex h-48 gap-3">
        <div
          aria-hidden
          className="tabular flex w-8 shrink-0 flex-col justify-between text-right text-[11.5px] text-ink-3"
        >
          <span>{top}</span>
          <span>{top / 2}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 border-t border-line"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-1/2 border-t border-line"
          />
          <ul
            aria-label="Energy delivered per hour today, in kWh"
            className="absolute inset-0 flex items-end gap-[2px] border-b border-line-strong"
            onPointerLeave={hide}
          >
            {HOURS.map((h) => {
              const wh = byHourWh[h];
              const value = wh === null ? null : wh / 1000;
              const height = value === null ? 0 : (value / top) * 100;
              return (
                <li
                  key={h}
                  tabIndex={value === null ? -1 : 0}
                  aria-label={`${label(h)}: ${value === null ? "still to come" : `${value.toFixed(1)} kWh`}`}
                  onPointerEnter={() => value !== null && show(h)}
                  onFocus={() => value !== null && setActive(h)}
                  onBlur={hide}
                  className="relative flex h-full flex-1 items-end justify-center outline-none focus-visible:bg-subtle"
                >
                  <span
                    className={
                      h === current
                        ? "w-full max-w-6 rounded-t-[4px] bg-[#16a34a]"
                        : "w-full max-w-6 rounded-t-[4px] bg-[#8a8a91]"
                    }
                    style={{
                      height: `${height}%`,
                      opacity: active !== null && active !== h ? 0.6 : 1,
                    }}
                  />
                  {active === h && value !== null && (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-md bg-ink px-2 py-1 text-[12px] whitespace-nowrap text-white"
                    >
                      <strong className="tabular font-semibold">
                        {value.toFixed(1)} kWh
                      </strong>{" "}
                      <span className="text-white/70">
                        {label(h)}–{label((h + 1) % 24)}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {empty && (
            <p className="absolute inset-x-0 top-1/3 text-center text-[13.5px] text-ink-3">
              No energy delivered yet today.
            </p>
          )}
        </div>
      </div>
      <div
        aria-hidden
        className="tabular mt-1.5 ml-11 flex justify-between text-[11.5px] text-ink-3"
      >
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}
