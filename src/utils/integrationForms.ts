export function parseRecipients(value: string): string[] {
  const recipients = [...new Set(value.split(/[;,\n]+/).map(v => v.trim().toLowerCase()).filter(Boolean))];
  if (!recipients.length || recipients.length > 30) throw new Error("Enter 1 to 30 unique email addresses.");
  if (recipients.some(v => v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) throw new Error("Check the recipient email addresses.");
  return recipients;
}
export function parseMoney(value: string): string {
  const text = value.trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) throw new Error("Use a non-negative amount with at most two decimal places.");
  return text;
}
export function authIdentity(): { userId: string; role: string } {
  try { const value = JSON.parse(sessionStorage.getItem("hrms_session") || "{}"); return { userId: String(value.userId || ""), role: String(value.role || "EMPLOYEE").replace(/^ROLE_/, "") }; }
  catch { return { userId: "", role: "EMPLOYEE" }; }
}
export function errorText(error: unknown, fallback = "The action could not be completed."): string {
  const e = error as { response?: { data?: { message?: string; detail?: string } }; message?: string };
  return e?.response?.data?.message || e?.response?.data?.detail || e?.message || fallback;
}
export function periodToday(): string { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; }
export function safeProviderUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || !["accounts.google.com", "login.microsoftonline.com"].includes(url.hostname) || url.username || url.password || url.port) throw new Error("Unapproved authorization URL.");
  return url;
}
export function payrollPolicyDays(value: string[]): string[] {
  const valid = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
  if (!value.length || value.some(v => !valid.includes(v))) throw new Error("Select at least one valid working day.");
  return [...new Set(value)];
}
