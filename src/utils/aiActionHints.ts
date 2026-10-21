/**
 * Explicitly user-triggered, local-only form suggestions. Not an LLM action dispatcher.
 * Only extracts recognizable information from ONE user message; never guesses identities,
 * roles, record IDs or review decisions. All fields remain editable and server-validated.
 */
export type HintAction = "SUPPORT_TICKET" | "LEAVE_REQUEST" | "TIMESHEET_ENTRY" | "EXPENSE_CLAIM" |
  "REVIEW_LEAVE" | "REVIEW_TIMESHEET" | "HR_SERVICE_REQUEST" | "OVERTIME_REQUEST";

const date = String.raw`\d{4}-\d{2}-\d{2}`;
const field = (note: string, labels: string[], max = 900): string => {
  const label = labels.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const m = note.match(new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:=]\\s*([^\\n]{1,${max}})`, "i"));
  return m?.[1]?.trim() || "";
};
const firstLine = (note: string, max: number) => note.split(/[\r\n.!?]/)[0]?.trim().slice(0, max) || "";
const matches = (note: string, pattern: RegExp) => note.match(pattern)?.[1]?.trim() || "";
const expenseCats = ["Travel", "Food", "Accommodation", "Medical", "Office Supplies", "Internet/Phone", "Other"];
const ticketCats = ["IT SUPPORT", "ACCESS & ACCOUNTS", "HARDWARE", "SOFTWARE", "NETWORK", "HR / PAYROLL", "OTHER"];

export function suggestActionFields(message: string, type: HintAction): Record<string, string> {
  const note = message.trim().slice(0, 2000);
  if (!note || type.startsWith("REVIEW_")) return {}; // Reviewer must choose records/decisions manually.
  const suggested: Record<string, string> = {};
  const description = field(note, ["description", "details", "issue", "reason", "task", "summary"], 900);
  if (type === "HR_SERVICE_REQUEST") {
    suggested.subject = (field(note, ["subject", "title"], 160) || firstLine(note, 100)).slice(0, 160);
    suggested.description = (field(note, ["description", "details"], 2000) || note).slice(0, 2000);
    const category = field(note, ["category"], 30).toUpperCase();
    if (["PAYROLL","BENEFITS","DOCUMENTS","ATTENDANCE","OTHER"].includes(category)) suggested.category=category;
    const priority = field(note, ["priority"], 12).toUpperCase();
    if (["LOW","MEDIUM","HIGH","URGENT"].includes(priority)) suggested.priority=priority;
  }
  if (type === "OVERTIME_REQUEST") {
    const d = field(note, ["work date", "date"], 25) || matches(note, new RegExp(`\\bon\\s+(${date})\\b`, "i"));
    if (new RegExp(`^${date}$`).test(d)) suggested.workDate=d;
    const hours = field(note, ["overtime hours", "hours"], 8);
    if (/^\d+(?:\.\d{1,2})?$/.test(hours)) suggested.hours=hours;
    const project = field(note, ["project"], 100); if (project) suggested.project=project;
    const reason = field(note, ["reason"], 1200); if (reason) suggested.reason=reason;
    const mode = field(note, ["compensation"], 25).toUpperCase().replace(/\s+/g,"_");
    if (["PAYMENT","COMP_OFF"].includes(mode)) suggested.compensationMode=mode;
  }
  if (type === "SUPPORT_TICKET") {
    suggested.description = (field(note, ["description", "details", "issue"], 2000) || note).slice(0, 2000);
    suggested.subject = (field(note, ["subject", "title"], 160) || firstLine(note, 100)).slice(0, 160);
    const category = field(note, ["category"], 35).toUpperCase();
    if (ticketCats.includes(category)) suggested.category = category;
    const priority = field(note, ["priority"], 15).toUpperCase();
    if (["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) suggested.priority = priority;
  }
  if (type === "EXPENSE_CLAIM") {
    const category = field(note, ["category"], 35);
    const selected = expenseCats.find(c => c.toLowerCase() === category.toLowerCase());
    if (selected) suggested.category = selected;
    const rawAmount = field(note, ["amount"], 25) || matches(note, /(?:₹|\bINR\s*)([\d,]+(?:\.\d{1,2})?)/i);
    if (/^[\d,]+(?:\.\d{1,2})?$/.test(rawAmount)) suggested.amount = rawAmount.replaceAll(",", "");
    const d = field(note, ["expense date", "date"], 25) || matches(note, new RegExp(`\\bon\\s+(${date})\\b`, "i"));
    if (new RegExp(`^${date}$`).test(d)) suggested.expenseDate = d;
    suggested.description = (field(note, ["description", "details", "purpose"], 1000) || note).slice(0, 1000);
    const receipt = field(note, ["receipt reference", "receipt name"], 160);
    if (receipt) suggested.receiptName = receipt;
  }
  if (type === "LEAVE_REQUEST") {
    const range = note.match(new RegExp(`\\bfrom\\s+(${date})\\s+to\\s+(${date})\\b`, "i"));
    const start = field(note, ["start date", "from"], 25) || range?.[1] || "";
    const end = field(note, ["end date", "to"], 25) || range?.[2] || "";
    if (new RegExp(`^${date}$`).test(start)) suggested.startDate = start;
    if (new RegExp(`^${date}$`).test(end)) suggested.endDate = end;
    const reason = field(note, ["reason"], 900);
    if (reason) suggested.reason = reason;
    const leaveType = field(note, ["leave type", "leave category"], 100);
    if (leaveType) suggested.leaveType = leaveType;
    const duration = field(note, ["duration"], 25).toUpperCase().replace(/\s+/g, "_");
    if (["FULL_DAY", "FIRST_HALF", "SECOND_HALF"].includes(duration)) suggested.leaveDurationType = duration;
  }
  if (type === "TIMESHEET_ENTRY") {
    const d = field(note, ["work date", "date"], 25) || matches(note, new RegExp(`\\bon\\s+(${date})\\b`, "i"));
    if (new RegExp(`^${date}$`).test(d)) suggested.date = d;
    const hours = field(note, ["hours", "hours worked"], 10) || matches(note, /\b(?:worked\s+)?(\d+(?:\.\d+)?)\s*(?:hours|hrs)\b/i);
    if (/^\d+(?:\.\d+)?$/.test(hours)) suggested.hoursWorked = hours;
    const mode = field(note, ["work mode", "mode"], 20).toUpperCase();
    if (["OFFICE", "HYBRID", "WFH"].includes(mode)) suggested.workMode = mode;
    if (description) suggested.taskDescription = description;
  }
  return suggested;
}
