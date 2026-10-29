"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { BottomSheet } from "@/components/app/bottom-sheet";
import { PLUG_LABEL } from "@/components/app/bits";
import { StartPanel } from "@/components/app/station-sheet";
import { Button } from "@/components/ui/button";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { naira } from "@/lib/format";
import { cn } from "@/lib/cn";

type Station = Schemas["StationDto"];

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** A charger QR holds its deep link (…/app/c/CP-0021) or just the charge point ID. */
function codeFrom(text: string) {
  const match = /\/app\/c\/([^/?#]+)/.exec(text);
  return decodeURIComponent(match ? match[1] : text).trim();
}

export function ScanView() {
  const initial = useSearchParams().get("code");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [camera, setCamera] = useState<
    "starting" | "on" | "unsupported" | "denied"
  >("starting");
  const [found, setFound] = useState<string>();
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Chrome and Edge on Android scan natively; elsewhere the charger ID is typed in
  const supported = useSyncExternalStore(
    () => () => undefined,
    () =>
      Boolean(window.BarcodeDetector && navigator.mediaDevices?.getUserMedia),
    () => true,
  );
  const status = supported ? camera : "unsupported";
  const [station, setStation] = useState<Station>();
  const [error, setError] = useState<string>();

  const lookUp = useCallback(async (raw: string) => {
    const code = codeFrom(raw);
    const { data, error: apiError } = await api.GET(
      "/v1/app/chargers/by-code/{code}",
      {
        params: { path: { code } },
      },
    );
    if (apiError || !data) {
      setFound(undefined);
      setError(errorMessage(apiError));
      return;
    }
    setError(undefined);
    setManual(false);
    setStation(data);
  }, []);

  // A deep link (/app/c/CP-0021) arrives here with ?code=
  const deepLink = useQuery({
    queryKey: ["app", "by-code", initial],
    enabled: Boolean(initial),
    retry: false,
    queryFn: async () => {
      const { data, error: apiError } = await api.GET(
        "/v1/app/chargers/by-code/{code}",
        {
          params: { path: { code: codeFrom(initial!) } },
        },
      );
      if (apiError) throw apiError;
      return data;
    },
  });
  const [deepLinkClosed, setDeepLinkClosed] = useState(false);
  const shown = station ?? (deepLinkClosed ? undefined : deepLink.data);
  const shownError =
    error ?? (deepLink.error ? errorMessage(deepLink.error) : undefined);

  useEffect(() => {
    if (initial || !supported) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((media) => {
        if (cancelled) return media.getTracks().forEach((t) => t.stop());
        stream.current = media;
        video.current!.srcObject = media;
        void video.current!.play();
        setCamera("on");
        const tick = async () => {
          if (cancelled || !video.current) return;
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes[0]) {
            const code = codeFrom(codes[0].rawValue);
            setFound(code);
            // Brackets tighten and turn green, then the sheet opens
            setTimeout(() => void lookUp(code), 350);
            return;
          }
          timer = setTimeout(() => void tick(), 250);
        };
        void tick();
      })
      .catch(() => {
        setCamera("denied");
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [initial, lookUp, supported]);

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0];
    try {
      await track?.applyConstraints({
        advanced: [{ torch: !torch } as MediaTrackConstraintSet],
      });
      setTorch(!torch);
    } catch {
      setTorch(false);
    }
  };

  const connector = shown?.connectors[0];

  return (
    <main className="relative flex flex-1 flex-col bg-ink text-white">
      <header className="z-10 flex items-center justify-between px-4 py-3">
        <Link
          href="/app"
          className="rounded-control px-2 py-1 text-[15px] hover:bg-white/10"
        >
          Close
        </Link>
        <h1 className="text-[16px] font-semibold">Scan charger QR</h1>
        <button
          type="button"
          onClick={() => void toggleTorch()}
          disabled={status !== "on"}
          aria-pressed={torch}
          className="rounded-control px-2 py-1 text-[15px] hover:bg-white/10 disabled:opacity-40"
        >
          Torch
        </button>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={video}
          playsInline
          muted
          className="absolute inset-0 size-full object-cover"
        />
        {/* Dimmed outside a 240 px finder with four corner brackets */}
        <div
          aria-hidden
          className="relative size-60 rounded-2xl shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]"
        >
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-300 ease-out",
              found && "scale-[0.86]",
            )}
          >
            {[
              "top-0 left-0 border-t-4 border-l-4",
              "top-0 right-0 border-t-4 border-r-4",
              "bottom-0 left-0 border-b-4 border-l-4",
              "bottom-0 right-0 border-b-4 border-r-4",
            ].map((c) => (
              <span
                key={c}
                className={cn(
                  "absolute size-8 rounded-sm",
                  c,
                  found ? "border-volt" : "border-white",
                )}
              />
            ))}
          </div>
          {status === "on" && !found && (
            <span className="absolute inset-x-4 top-2 h-0.5 animate-scan rounded-full bg-volt shadow-[0_0_12px_var(--color-volt)]" />
          )}
        </div>
      </div>

      <div className="z-10 px-6 pt-4 pb-8 text-center">
        <p className="text-[15px]" aria-live="polite">
          {found
            ? `Found ${found}`
            : status === "unsupported"
              ? "This browser can’t scan QR codes. Enter the charger ID instead."
              : status === "denied"
                ? "Camera access is off. Enter the charger ID instead."
                : "Point at the QR code on the charger"}
        </p>
        {shownError && (
          <p role="alert" className="mt-2 text-[14px] text-[#ffb4a8]">
            {shownError}
          </p>
        )}
        <Button
          variant="secondary"
          className="mt-4 h-12 w-full text-[16px]"
          onClick={() => setManual(true)}
        >
          Enter charger ID instead
        </Button>
      </div>

      <BottomSheet
        open={
          (manual ||
            ((status === "unsupported" || status === "denied") &&
              !dismissed)) &&
          !shown
        }
        onClose={() => {
          setManual(false);
          setDismissed(true);
        }}
        label="Enter the charger ID"
      >
        <ManualEntry onFind={lookUp} error={error} />
      </BottomSheet>

      <BottomSheet
        open={Boolean(shown)}
        onClose={() => {
          setStation(undefined);
          setFound(undefined);
          setDeepLinkClosed(true);
        }}
        label="Confirm charger"
      >
        {shown && connector && (
          <div className="text-ink">
            <StartPanel
              station={shown}
              km={null}
              title={
                <div>
                  <p className="font-mono text-[14px] text-ink-3">
                    {connector.chargePointId}
                    {shown.connectors.length === 1 &&
                      ` · EVSE ${connector.evseId}`}
                  </p>
                  <h2 className="text-[22px] font-semibold tracking-[-0.01em]">
                    {shown.name}
                  </h2>
                  <p className="text-[14px] text-ink-2">
                    Plug {PLUG_LABEL[connector.type]} · Up to {connector.maxKw}{" "}
                    kW
                    {shown.price && ` · ${naira(shown.price.perKwhKobo)}/kWh`}
                  </p>
                </div>
              }
            />
          </div>
        )}
      </BottomSheet>
    </main>
  );
}

function ManualEntry({
  onFind,
  error,
}: {
  onFind: (code: string) => Promise<void>;
  error?: string;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="pb-2 text-ink"
      onSubmit={(e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setBusy(true);
        void onFind(code).finally(() => setBusy(false));
      }}
    >
      <h2 className="text-[22px] font-semibold">Enter the charger ID</h2>
      <p className="mt-1 text-[15px] text-ink-2">
        It is printed under the QR code, like CP-0021.
      </p>
      <label className="mt-4 flex flex-col gap-1.5">
        <span className="sr-only">Charger ID</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="CP-0021"
          className="h-12 rounded-control border border-line-strong px-3 font-mono text-[16px] tracking-wide outline-none focus:border-ink-3"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-[14px] text-error">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="mt-4 h-12 w-full text-[16px]"
        loading={busy}
        disabled={!code.trim()}
      >
        Find charger
      </Button>
    </form>
  );
}
