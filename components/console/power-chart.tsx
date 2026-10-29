"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { clock } from "@/lib/format";

const HEIGHT = 140;
const PAD = { top: 18, right: 8, bottom: 20, left: 8 };
const LINE = "#1d4ed8"; // the Charging blue

/**
 * Power over a session: a 2 px line over a light fill, the peak labelled directly, and a
 * crosshair that snaps to the nearest reading with its value. One series, so no legend.
 */
export function PowerChart({
  points,
  peakW,
  timeZone,
}: {
  points: { at: string; powerW: number }[];
  peakW: number;
  timeZone?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-[13.5px] text-ink-3">
        Not enough meter readings yet to draw power.
      </p>
    );
  }

  const t0 = Date.parse(points[0].at);
  const t1 = Date.parse(points.at(-1)!.at);
  const top = Math.max(peakW, 1);
  const x = (iso: string) =>
    PAD.left +
    ((Date.parse(iso) - t0) / Math.max(t1 - t0, 1)) *
      (width - PAD.left - PAD.right);
  const y = (w: number) =>
    PAD.top + (1 - w / top) * (HEIGHT - PAD.top - PAD.bottom);
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(p.at)},${y(p.powerW)}`)
    .join("");
  const area = `${line}L${x(points.at(-1)!.at)},${y(0)}L${x(points[0].at)},${y(0)}Z`;
  const peakIndex = points.findIndex((p) => p.powerW === peakW);
  const active = hover === null ? null : points[hover];

  const onMove = (e: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    const px = e.clientX - box.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.at) - px) < Math.abs(x(points[best].at) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={`Power over the session, peak ${(peakW / 1000).toFixed(1)} kW`}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="block overflow-visible">
          <line
            x1={0}
            x2={width}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--color-line-strong)"
          />
          <path d={area} fill={LINE} opacity={0.1} />
          <path
            d={line}
            fill="none"
            stroke={LINE}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {peakIndex >= 0 && hover === null && (
            <text
              x={Math.min(Math.max(x(points[peakIndex].at), 40), width - 40)}
              y={y(peakW) - 6}
              textAnchor="middle"
              className="fill-ink-2 text-[11.5px]"
            >
              Peak {(peakW / 1000).toFixed(1)} kW
            </text>
          )}
          {active && (
            <>
              <line
                x1={x(active.at)}
                x2={x(active.at)}
                y1={PAD.top - 6}
                y2={y(0)}
                stroke="var(--color-ink-3)"
                strokeWidth={1}
              />
              <circle
                cx={x(active.at)}
                cy={y(active.powerW)}
                r={4}
                fill={LINE}
                stroke="white"
                strokeWidth={2}
              />
            </>
          )}
          <text x={PAD.left} y={HEIGHT - 4} className="fill-ink-3 text-[11px]">
            {clock(points[0].at, timeZone).slice(0, 5)}
          </text>
          <text
            x={width - PAD.right}
            y={HEIGHT - 4}
            textAnchor="end"
            className="fill-ink-3 text-[11px]"
          >
            {clock(points.at(-1)!.at, timeZone).slice(0, 5)}
          </text>
        </svg>
      )}
      {active && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[12px] whitespace-nowrap text-white"
          style={{ left: Math.min(Math.max(x(active.at), 50), width - 50) }}
        >
          <strong className="font-semibold">
            {(active.powerW / 1000).toFixed(1)} kW
          </strong>{" "}
          <span className="text-white/70">
            {clock(active.at, timeZone).slice(0, 5)}
          </span>
        </div>
      )}
    </div>
  );
}
