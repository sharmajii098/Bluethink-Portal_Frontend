export function safeMeetingLink(value: string | null | undefined): string | null {
  try { const u = new URL(value || ""); return u.protocol === "https:" && !u.username && !u.password && u.hostname.includes(".") && !/^[\d.]+$/.test(u.hostname) ? u.href : null; } catch { return null; }
}
export function dateInZone(zone = "Asia/Kolkata", date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(k => parts.find(p => p.type === k)?.value).join("-");
}
export function calendarDates(start: string, end: string, month: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return [];
  const [y, m] = month.split("-").map(Number);
  const min = `${month}-01`, max = `${month}-${new Date(y, m, 0).getDate()}`;
  const from = start > min ? start : min, to = end < max ? end : max;
  const result: string[] = [];
  for (let d = new Date(`${from}T12:00:00Z`); d.toISOString().slice(0, 10) <= to && result.length < 31; d.setUTCDate(d.getUTCDate() + 1)) result.push(d.toISOString().slice(0, 10));
  return result;
}
export function icsEvent(meeting: {id:number; title:string; agenda?:string; occurrenceStart:string; occurrenceEnd:string; meetingUrl?:string; status:string}): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const utc = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bluethink//Team Meetings//EN", "BEGIN:VEVENT", `UID:${meeting.id}-${utc(meeting.occurrenceStart)}@bluethink-portal`, `DTSTAMP:${utc(new Date().toISOString())}`, `DTSTART:${utc(meeting.occurrenceStart)}`, `DTEND:${utc(meeting.occurrenceEnd)}`, `SUMMARY:${esc(meeting.title)}`, `DESCRIPTION:${esc(meeting.agenda || "")}`, `LOCATION:${esc(safeMeetingLink(meeting.meetingUrl) || "")}`, `STATUS:${meeting.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT", "END:VCALENDAR"];
  return lines.map(line => { const parts: string[] = []; let part="", bytes=0; for(const c of line){const size=new TextEncoder().encode(c).length;if(bytes+size>73){parts.push(part);part=" ";bytes=1;}part+=c;bytes+=size;}parts.push(part);return parts.join("\r\n"); }).join("\r\n") + "\r\n";
}
