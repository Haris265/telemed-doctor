import type { AvailabilitySlot, AvailableDateOption } from "./types";

function toMinutes(value: string) {
  const [h, m] = value.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function fromMinutes(total: number) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function formatLabel(slot: string) {
  const [h, m] = slot.split(":");
  const hour = parseInt(h, 10);
  const minute = m || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${minute} ${ampm}`;
}

/** Wall-clock "now" in Asia/Karachi (matches backend). */
export function pakistanParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    mins: Number(parts.hour) * 60 + Number(parts.minute),
    weekdayShort: parts.weekday,
  };
}

function addDaysIso(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function weekdayIndex(dateKey: string) {
  // JS: 0=Sun…6=Sat → backend: 0=Mon…6=Sun
  const [y, m, d] = dateKey.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (js + 6) % 7;
}

function labelFor(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][js];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${short} ${d} ${months[m - 1]} ${y}`;
}

/** Build upcoming date options from weekly clinic availability (prod fallback). */
export function datesFromWeeklyAvailability(
  slots: AvailabilitySlot[],
  limit = 14,
): AvailableDateOption[] {
  const active = slots.filter(
    (s) => s.is_active && (s.specific_date == null || s.specific_date === ""),
  );
  if (!active.length) return [];

  const byWeekday = new Map<number, AvailabilitySlot[]>();
  for (const s of active) {
    const list = byWeekday.get(s.weekday) || [];
    list.push(s);
    byWeekday.set(s.weekday, list);
  }

  const { dateKey: today } = pakistanParts();
  const options: AvailableDateOption[] = [];
  for (let offset = 0; offset < 60 && options.length < limit; offset++) {
    const date = addDaysIso(today, offset);
    const wd = weekdayIndex(date);
    const daySlots = byWeekday.get(wd);
    if (!daySlots?.length) continue;
    const windows = daySlots.map((s) => ({
      start: s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time,
      end: s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time,
    }));
    const starts = windows.map((w) => w.start);
    const ends = windows.map((w) => w.end);
    options.push({
      date,
      label: labelFor(date),
      start: starts.sort()[0],
      end: ends.sort().slice(-1)[0],
      windows,
      booked_times: [],
      clinic_id: daySlots[0].clinic ?? null,
    });
  }
  return options;
}

/** Open slots for a date option, matching backend generate_slots_for_windows. */
export function openSlotsForDate(
  option: AvailableDateOption,
  sessionMins: number,
  tokenDate: string,
  now = new Date(),
): { value: string; label: string }[] {
  const step = Math.max(Math.floor(sessionMins || 15), 5);
  const windows =
    option.windows && option.windows.length
      ? option.windows
      : [{ start: option.start, end: option.end }];
  const booked = new Set(
    (option.booked_times || []).map((t) =>
      t.length === 5 ? `${t}:00` : t.slice(0, 8),
    ),
  );
  const pk = pakistanParts(now);
  const isToday = tokenDate === pk.dateKey;
  const nowMins = pk.mins;

  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];

  for (const win of windows) {
    const startM = toMinutes(win.start);
    let endM = toMinutes(win.end);
    if (endM <= startM) endM += 24 * 60;
    let t = startM;
    const windowSlots: string[] = [];
    while (t + step <= endM) {
      windowSlots.push(fromMinutes(t));
      t += step;
    }
    if (!windowSlots.length && startM < endM) {
      windowSlots.push(fromMinutes(startM));
    }
    for (const slot of windowSlots) {
      const key = slot.slice(0, 8);
      if (seen.has(key) || booked.has(key)) continue;
      if (isToday && toMinutes(slot) <= nowMins) continue;
      seen.add(key);
      out.push({ value: key, label: formatLabel(slot) });
    }
  }

  out.sort((a, b) => a.value.localeCompare(b.value));
  return out;
}

export type WeeklyTimeRange = {
  weekday: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

/** ISO date keys (YYYY-MM-DD) open under a weekly schedule, for calendar highlight. */
export function upcomingOpenDateKeys(
  ranges: WeeklyTimeRange[],
  daysAhead = 62,
): Set<string> {
  const openWeekdays = new Set<number>();
  for (const r of ranges) {
    if (r.is_active === false) continue;
    openWeekdays.add(r.weekday);
  }
  const keys = new Set<string>();
  if (!openWeekdays.size) return keys;
  const { dateKey: today } = pakistanParts();
  for (let offset = 0; offset < daysAhead; offset++) {
    const date = addDaysIso(today, offset);
    if (openWeekdays.has(weekdayIndex(date))) {
      keys.add(date);
    }
  }
  return keys;
}

/** Approximate visit slots for one day's windows (ignores "now" filtering). */
export function countSlotsForRanges(
  ranges: { start_time: string; end_time: string }[],
  sessionMins: number,
): number {
  if (!ranges.length) return 0;
  const option: AvailableDateOption = {
    date: "2099-01-01",
    start: ranges[0].start_time,
    end: ranges[0].end_time,
    windows: ranges.map((r) => ({
      start: r.start_time.length === 5 ? `${r.start_time}:00` : r.start_time,
      end: r.end_time.length === 5 ? `${r.end_time}:00` : r.end_time,
    })),
    booked_times: [],
  };
  // Far future date so "today" filtering never drops slots.
  return openSlotsForDate(option, sessionMins, "2099-01-01", new Date(0)).length;
}
