/** ₦ 214,414 from kobo. */
export function naira(kobo: number) {
  return `₦ ${Math.round(kobo / 100).toLocaleString("en-NG")}`;
}

/** "7.2 kW" from watts; one decimal, as in the designs. */
export function kw(watts: number) {
  return `${(watts / 1000).toFixed(1)} kW`;
}

/** "486.2 kWh" from watt-hours. */
export function kwh(wattHours: number) {
  return `${(wattHours / 1000).toFixed(1)} kWh`;
}

/** "12 s", "14 min", "3 h", "2 days": time since an ISO date. */
export function since(iso: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours} h` : `${Math.floor(hours / 24)} days`;
}

/** "09:42:18" in the workspace's time zone. */
export function clock(iso: string, timeZone?: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour12: false, timeZone });
}

/** "32 min", "1 h 50 min", "2 h 05 min". */
export function duration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}

/** "Today 09:12", "Yesterday 21:10" or "27 Oct 18:30", in the workspace's time zone. */
export function dayTime(iso: string, timeZone: string, now = Date.now()) {
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone });
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  if (day(date) === day(new Date(now))) return `Today ${time}`;
  if (day(date) === day(new Date(now - 86_400_000))) return `Yesterday ${time}`;
  const short = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone,
  });
  return `${short} ${time}`;
}

/** ₦ 6,420.50 style when kobo matter (receipts, billing lines). */
export function nairaExact(kobo: number) {
  return `₦ ${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
