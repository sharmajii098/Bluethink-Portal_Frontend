import { reportLogoPng } from "../utils/brandedExport";
import { PrintRounded } from "@mui/icons-material";
import logoSrc from "../branding/bluethink-inc-official-master.png";
import documentStyles from "./PayslipDocument.css?inline";
import "./PayslipDocument.css";

type Salary = Record<string, any>;
const amount = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value: any) => amount(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const text = (value: any) => value === null || value === undefined || value === "" ? "N/A" : String(value);
// Print uses an HTML document; escape every record value before interpolation.
const escape = (value: any) => text(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const annualAmount = (value: any, monthly: any) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : amount(monthly) * 12;
const days = (value: any) => amount(value).toLocaleString("en-IN", { maximumFractionDigits: 1 });
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function belowThousand(value: number): string {
  const parts: string[] = [];
  if (value >= 100) { parts.push(`${ONES[Math.floor(value / 100)]} Hundred`); value %= 100; }
  if (value >= 20) { parts.push(TENS[Math.floor(value / 10)]); value %= 10; }
  if (value) parts.push(ONES[value]);
  return parts.join(" ");
}
export function amountInWords(value: any) {
  const paiseTotal = Math.round(Math.abs(amount(value)) * 100);
  let rupees = Math.floor(paiseTotal / 100);
  const paise = paiseTotal % 100;
  // Payroll amounts beyond this range remain unambiguous as formatted numbers.
  if (rupees >= 1000000000) return `${amount(value) < 0 ? "MINUS " : ""}INR ${money(Math.abs(amount(value)))} ONLY`;
  const parts: string[] = [];
  for (const [unit, divisor] of [["Crore", 10000000], ["Lakh", 100000], ["Thousand", 1000]] as const) {
    const count = Math.floor(rupees / divisor);
    if (count) { parts.push(`${belowThousand(count)} ${unit}`); rupees %= divisor; }
  }
  if (rupees) parts.push(belowThousand(rupees));
  return `${amount(value) < 0 ? "Minus " : ""}${parts.join(" ") || "Zero"} Rupees${paise ? ` and ${belowThousand(paise)} Paise` : ""} Only`.toUpperCase();
}

function renderPayslip(s: Salary, documentLogo = logoSrc) {
  const earnings = [["Basic & DA", s.basicSalary], ["HRA", s.hra], ["Conveyance", s.conveyance], ["Medical Allowance", s.medicalAllowance], ["Special Allowance", s.specialAllowance], ["Other Allowance", s.otherAllowance], ["Bonus", s.bonus]];
  const deductions = [["Provident Fund", s.pf], ["E.S.I. / Insurance", s.esi], ["Professional Tax", s.professionalTax], ["Loan", s.loanDeduction], ["TDS / IT", s.tds], ["Attendance / LWP", s.attendanceDeduction]];
  const info = (label: string, value: any) => `<div class="ps-detail"><dt>${label}</dt><dd>${escape(value)}</dd></div>`;
  const rows = Array.from({ length: Math.max(earnings.length, deductions.length) }, (_, i) => {
    const e = earnings[i]; const d = deductions[i];
    return `<tr><td>${e ? escape(e[0]) : ""}</td><td class="ps-number">${e ? money(e[1]) : ""}</td><td>${d ? escape(d[0]) : ""}</td><td class="ps-number">${d ? money(d[1]) : ""}</td></tr>`;
  }).join("");
  return `<article class="ps-sheet" aria-label="Official monthly salary slip">
    <header class="ps-company"><img src="${escape(new URL(documentLogo, window.location.href).href)}" alt="Bluethink Inc. — Think beyond"/><div><h2>BLUETHINK IT CONSULTING PVT. LTD.</h2><p>B-12, SEC-2, Noida, U.P.-201301</p></div></header>
    <div class="ps-period"><div><span>MONTHLY SALARY STATEMENT</span><h3>${escape(s.month)} ${escape(s.year)}</h3></div><span class="ps-private">CONFIDENTIAL · INR</span></div>
    <section class="ps-section"><h4>Employee details</h4><dl class="ps-details">
      ${info("Employee name", s.employeeName)}${info("Employee ID", s.employeeCode)}${info("Department", s.department)}${info("Designation", s.designation)}${info("Employee band", s.employeeBand)}${info("Date of joining", s.joiningDate)}${info("PAN number", s.panNumber)}${info("Bank name", s.bankName)}${info("Account number", s.bankAccountNumber)}
    </dl></section>
    <section class="ps-section ps-attendance"><h4>Pay period details</h4><dl class="ps-days">
      ${info("Scheduled working days", days(s.scheduledWorkingDays))}${info("Timesheet present days", days(s.timesheetPresentDays ?? s.daysWorked))}${info("Paid leave / project off", days(amount(s.paidLeaveDays) + amount(s.projectOffDays)))}${info("Absent / LWP", days(amount(s.absentDays) + amount(s.lwpDays)))}
    </dl></section>
    <div class="ps-table-scroll"><table class="ps-pay"><caption>Earnings and deductions · amounts in INR</caption><colgroup><col style="width:32%"/><col style="width:18%"/><col style="width:32%"/><col style="width:18%"/></colgroup><thead><tr><th scope="col">Earnings</th><th scope="col" class="ps-number">Amount</th><th scope="col">Deductions</th><th scope="col" class="ps-number">Amount</th></tr></thead><tbody>${rows}<tr class="ps-total"><th scope="row">Gross earnings</th><td class="ps-number">${money(s.grossSalary)}</td><th scope="row">Total deductions</th><td class="ps-number">${money(s.deductions)}</td></tr></tbody></table></div>
    <section class="ps-net"><div><span>NET SALARY</span><small>Monthly payable amount</small></div><strong>₹ ${money(s.netSalary)}</strong></section>
    <div class="ps-words"><span>AMOUNT IN WORDS</span><p>${escape(amountInWords(s.netSalary))}</p></div>
    <section class="ps-annual"><h4>Annualized salary summary <span>12-month equivalent · not year-to-date</span></h4><dl><div><dt>Annual gross</dt><dd>₹ ${money(annualAmount(s.annualGrossSalary, s.grossSalary))}</dd></div><div><dt>Annual deductions</dt><dd>₹ ${money(annualAmount(s.annualDeductions, s.deductions))}</dd></div><div><dt>Annual net</dt><dd>₹ ${money(annualAmount(s.annualNetSalary, s.netSalary))}</dd></div></dl></section>
    <footer class="ps-footer"><p>This payslip is system-generated; no signature is required.</p>${s.generatedBy || s.generatedAt ? `<p>Generated by ${escape(s.generatedBy)}${s.generatedAt ? ` on ${escape(text(s.generatedAt).replace("T", " "))}` : ""}</p>` : ""}</footer>
  </article>`;
}

export function printPayslip(salary: Salary) {
  const win = window.open("", "_blank", "width=920,height=900");
  if (!win) { window.alert("Please allow pop-ups for this portal to print or save your payslip as PDF."); return; }
  win.document.title = "Preparing Bluethink payslip";
  win.document.body.textContent = "Preparing your Bluethink salary statement…";
  void (async () => {
    const embeddedLogo = await reportLogoPng();
    if (win.closed) return;
    win.document.open();
    win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bluethink Payslip - ${escape(salary.employeeName)} - ${escape(salary.month)} ${escape(salary.year)}</title><style>${documentStyles}</style></head><body class="ps-print-document">${renderPayslip(salary, embeddedLogo)}</body></html>`);
    win.document.close();
    await Promise.all([
      ...Array.from(win.document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => { image.onload = () => resolve(); image.onerror = () => resolve(); })),
      win.document.fonts.ready,
    ]);
    if (!win.closed) { win.focus(); win.print(); }
  })().catch(() => { if (!win.closed) win.document.body.textContent = "Unable to prepare the payslip. Close this window and retry from the portal."; });
}

export default function PayslipDocument({ salary, compact = false }: { salary: Salary; compact?: boolean }) {
  return <div className={`official-payslip ${compact ? "compact" : ""}`}>
    <div className="ps-preview-tools"><span>Salary statement · INR</span><button type="button" className="payslip-print-button" onClick={() => printPayslip(salary)}><PrintRounded fontSize="small"/> Print / Save PDF</button></div>
    <div dangerouslySetInnerHTML={{ __html: renderPayslip(salary) }} />
  </div>;
}
