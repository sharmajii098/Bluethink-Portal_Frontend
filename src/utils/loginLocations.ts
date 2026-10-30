export type LoginLocation = {
  id: number; employeeId: string; employeeName?: string; latitude: number | null;
  longitude: number | null; accuracyMeters?: number | null; distanceFromOffice?: number | null;
  workMode: string; loginStatus: string; loginDate?: string; loginTime: string;
};
export type LocationSummary = { first: LoginLocation; latest: LoginLocation; count: number };
export function summarizeLocations(rows: LoginLocation[], day: string, query = "", mode = "ALL"): LocationSummary[] {
  const groups = new Map<string, LocationSummary>();
  for (const row of rows) {
    if (!row.employeeId || (row.loginDate || row.loginTime?.slice(0, 10)) !== day) continue;
    const current = groups.get(row.employeeId);
    if (!current) groups.set(row.employeeId, { first: row, latest: row, count: 1 });
    else {
      current.count++;
      if (row.loginTime < current.first.loginTime) current.first = row;
      if (row.loginTime > current.latest.loginTime || (row.loginTime === current.latest.loginTime && row.id > current.latest.id)) current.latest = row;
    }
  }
  const q = query.trim().toLowerCase();
  return [...groups.values()].filter(({latest}) => (mode === "ALL" || latest.workMode === mode)
    && `${latest.employeeId} ${latest.employeeName || ""}`.toLowerCase().includes(q))
    .sort((a, b) => b.latest.loginTime.localeCompare(a.latest.loginTime));
}
export function mapLinks(row: Pick<LoginLocation, "latitude" | "longitude">) {
  const {latitude: lat, longitude: lon} = row;
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)
    || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const params = new URLSearchParams({ bbox: [Math.max(-180, lon-.008), Math.max(-90, lat-.005), Math.min(180, lon+.008), Math.min(90, lat+.005)].join(","), layer: "mapnik", marker: `${lat},${lon}` });
  return { embed: `https://www.openstreetmap.org/export/embed.html?${params}`, full: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}` };
}
export function businessToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
