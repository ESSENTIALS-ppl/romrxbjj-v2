// P1-12: build a .ics calendar for protocol days and retests. Pure. No scores, no mailbox addresses, no secrets.
// Rebuilt on live P1-07 47aad435. Default timezone fallback is America/New_York (not Chicago).
// UIDs are not mailbox addresses (no @) so the branch stays within the address rule.
export const DEFAULT_TZ = "America/New_York"; // same fallback as live P1-07 v4 / 47aad435
export const DEFAULT_HOUR = 9;
export const DEFAULT_MINUTE = 0;
export const BYDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export function validTz(tz: string | null | undefined): tz is string {
  if (!tz || typeof tz !== "string" || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

/** reminder_time such as "08:30" or "8:30 AM". Unparseable = 09:00. */
export function parseReminderTime(t: string | null | undefined): { hour: number; minute: number } {
  if (!t) return { hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE };
  const m = /^\s*(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([AaPp][Mm])?\s*$/.exec(t);
  if (!m) return { hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE };
  let hour = parseInt(m[1], 10);
  const minute = m[2] != null ? parseInt(m[2], 10) : 0;
  const ap = m[3]?.toLowerCase();
  if (ap) {
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return { hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE };
    if (ap === "pm" && hour < 12) hour += 12;
    if (ap === "am" && hour === 12) hour = 0;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE };
  return { hour, minute };
}

export function pad(n: number): string { return String(n).padStart(2, "0"); }
export function ymdUtc(iso: string, tz: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(t));
  const g = (x: string) => parts.find((p) => p.type === x)?.value ?? "";
  const y = g("year"), m = g("month"), d = g("day");
  if (!y || !m || !d) return null;
  return `${y}${m}${d}`;
}
export function stampUtc(d = new Date()): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
/** RFC 5545 3.1: lines longer than 75 OCTETS are folded (CRLF + one space). Counts UTF-8 bytes and never splits a
 *  character (Vera FYI 1: the old version counted UTF-16 code units). */
const enc = new TextEncoder();
export function fold(line: string): string {
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curBytes = 0;
  let limit = 75; // first line 75 octets; continuation lines 74 + the leading space
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      out.push(out.length === 0 ? cur : " " + cur);
      cur = "";
      curBytes = 0;
      limit = 74;
    }
    cur += ch;
    curBytes += b;
  }
  out.push(out.length === 0 ? cur : " " + cur);
  return out.join("\r\n");
}


/** US IANA zones used by Base. Google Calendar and Apple Calendar need VTIMEZONE when DTSTART uses TZID. */
const US_DST: Record<string, { std: string; dst: string; stdName: string; dstName: string }> = {
  "America/New_York": { std: "-0500", dst: "-0400", stdName: "EST", dstName: "EDT" },
  "America/Chicago": { std: "-0600", dst: "-0500", stdName: "CST", dstName: "CDT" },
  "America/Denver": { std: "-0700", dst: "-0600", stdName: "MST", dstName: "MDT" },
  "America/Los_Angeles": { std: "-0800", dst: "-0700", stdName: "PST", dstName: "PDT" },
  "America/Phoenix": { std: "-0700", dst: "-0700", stdName: "MST", dstName: "MST" },
};

export function vtimeZoneLines(tz: string): string[] {
  const z = US_DST[tz];
  if (!z) return [];
  if (z.std === z.dst) {
    return [
      "BEGIN:VTIMEZONE",
      `TZID:${tz}`,
      "BEGIN:STANDARD",
      `TZOFFSETFROM:${z.std}`,
      `TZOFFSETTO:${z.std}`,
      `TZNAME:${z.stdName}`,
      "DTSTART:19700101T000000",
      "END:STANDARD",
      "END:VTIMEZONE",
    ];
  }
  return [
    "BEGIN:VTIMEZONE",
    `TZID:${tz}`,
    "BEGIN:DAYLIGHT",
    `TZOFFSETFROM:${z.std}`,
    `TZOFFSETTO:${z.dst}`,
    `TZNAME:${z.dstName}`,
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    `TZOFFSETFROM:${z.dst}`,
    `TZOFFSETTO:${z.std}`,
    `TZNAME:${z.stdName}`,
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
}

export interface CalendarInput {
  timezone: string | null | undefined;
  reminder_time: string | null | undefined;
  next_check_at?: string | null;
  next_retest_at?: string | null;
  now?: Date;
}

export function buildIcs(input: CalendarInput): string {
  const tz = validTz(input.timezone) ? input.timezone : DEFAULT_TZ;
  const { hour, minute } = parseReminderTime(input.reminder_time);
  const now = input.now ?? new Date();
  const dtstamp = stampUtc(now);
  const hm = `${pad(hour)}${pad(minute)}00`;
  // DTSTART of the weekly rule: today's local date at reminder time (RRULE expands from there).
  const todayParts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const g = (x: string) => todayParts.find((p) => p.type === x)?.value ?? "";
  const startDay = `${g("year")}${g("month")}${g("day")}`;
  const tzBlock = vtimeZoneLines(tz);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ROMRx//Base//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...tzBlock,
    "BEGIN:VEVENT",
    "UID:romrx-protocol-weekly",
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${tz}:${startDay}T${hm}`,
    "RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA",
    "SUMMARY:ROMRx protocol session",
    "DESCRIPTION:Your ROMRx session for today.",
    "END:VEVENT",
  ];
  const oneShot = (uid: string, iso: string | null | undefined, summary: string, description: string) => {
    if (!iso) return;
    const day = ymdUtc(iso, tz);
    if (!day) return;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${tz}:${day}T${hm}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
    );
  };
  // P1-07 rules 2/3: after a quick check or the day-8 roll, next_check_at = next_retest_at. Then only the retest event is
  // written (no duplicate check-in on the retest day).
  const checkDay = input.next_check_at ? ymdUtc(input.next_check_at, tz) : null;
  const retestDay = input.next_retest_at ? ymdUtc(input.next_retest_at, tz) : null;
  if (!(checkDay && retestDay && checkDay >= retestDay)) {
    oneShot("romrx-check", input.next_check_at, "ROMRx check-in", "A short ROMRx check-in is due.");
  }
  oneShot("romrx-retest", input.next_retest_at, "ROMRx 6-week retest", "Your 6-week ROMRx retest is due.");
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
