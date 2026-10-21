import logoSrc from "../branding/bluethink-inc-official-master.png";

import { parseReportCsv, reportCellValue } from "./reportTable";
const label = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
let logoPromise: Promise<string> | undefined;
export function reportLogoPng(): Promise<string> {
  return logoPromise ??= new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 1116; canvas.height = 324;
      const context = canvas.getContext("2d"); if (!context) { reject(new Error("Unable to render report logo")); return; }
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/png"));
    }; image.onerror = () => { logoPromise = undefined; reject(new Error("Unable to load report logo")); }; image.src = logoSrc;
  });
}
export async function createBrandedWorkbook(csv: string, filename: string): Promise<Blob> {
  const [{ default: ExcelJS }, logo] = await Promise.all([import("exceljs"), reportLogoPng()]);
  const data = parseReportCsv(csv); const headings = data.shift() || ["Record"];
  const title = label(filename.replace(/\.csv$/i, "").replace(/^bluethink[-_ ]*/i, ""));
  const book = new ExcelJS.Workbook(); book.creator = "Bluethink IT Consulting Pvt. Ltd."; book.subject = title; book.created = new Date();
  const sheet = book.addWorksheet("Report", { views: [{ state: "frozen", ySplit: 8 }], pageSetup: { paperSize: 9, orientation: headings.length > 7 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:8" } });
  const count = Math.max(headings.length, 6);
  sheet.columns = Array.from({ length: count }, (_, i) => ({ width: Math.min(45, Math.max(18, (headings[i]?.length || 16) + 4)) }));
  sheet.mergeCells(1, 3, 1, count); sheet.getCell(1, 3).value = "BLUETHINK IT CONSULTING PVT. LTD."; sheet.getCell(1, 3).font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF153D60" } }; sheet.getCell(1, 3).alignment = { vertical: "middle", horizontal: "right" }; sheet.getRow(1).height = 36;
  sheet.mergeCells(2, 3, 2, count); sheet.getCell(2, 3).value = "B-12, SEC-2, Noida, U.P.-201301 | Think beyond"; sheet.getCell(2, 3).alignment = { horizontal: "right" }; sheet.getCell(2, 3).font = { name: "Calibri", size: 10, color: { argb: "FF657789" } }; sheet.getRow(2).height = 22;
  const image = book.addImage({ base64: logo, extension: "png" }); sheet.addImage(image, { tl: { col: 0, row: 0 }, ext: { width: 190, height: 52 } });
  sheet.mergeCells(4, 1, 4, count); sheet.getCell(4, 1).value = title; sheet.getCell(4, 1).font = { name: "Calibri", size: 18, bold: true, color: { argb: "FF153D60" } }; sheet.getRow(4).height = 30;
  sheet.mergeCells(5, 1, 5, count); sheet.getCell(5, 1).value = `Generated: ${new Date().toLocaleString("en-IN")} | Records: ${data.length}`;
  let viewer = "Authorized portal user"; try { const s = JSON.parse(sessionStorage.getItem("hrms_session") || "{}"); viewer = [s.fullName || s.userId, s.role].filter(Boolean).join(" · ") || viewer; } catch { /* No session metadata is required to format a report. */ }
  sheet.mergeCells(6, 1, 6, count); sheet.getCell(6, 1).value = `Exported by: ${viewer} | Source: visible HRMS report records`;
  for (const n of [5, 6]) { sheet.getCell(n, 1).font = { name: "Calibri", size: 10, color: { argb: "FF657789" } }; sheet.getRow(n).height = 20; }
  const header = sheet.getRow(8); headings.forEach((h, i) => { const c = header.getCell(i + 1); c.value = label(h); c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF153D60" } }; c.alignment = { vertical: "middle", wrapText: true }; }); header.height = 32;
  data.forEach((values, index) => {
    const r = sheet.getRow(index + 9); r.height = 32;
    headings.forEach((h, column) => { const c = r.getCell(column + 1); const v = values[column] || "";
      const typed = reportCellValue(h, v); c.value = typed.value;
      if (typed.format) c.numFmt = typed.format;
      c.font = { name: "Calibri", size: 11, color: { argb: "FF253D45" } }; c.alignment = { vertical: "top", wrapText: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? "FFF0F5F9" : "FFFFFFFF" } }; c.border = { bottom: { style: "hair", color: { argb: "FFDCE4EA" } } };
    });
    // Allow long notes to remain visible in the workbook.
    r.height = Math.min(240, Math.max(32, ...values.map((v, i) => v.split(/\r?\n/).reduce((n, line) => n + Math.max(1, Math.ceil(line.length / (sheet.getColumn(i + 1).width || 24))), 0) * 15 + 8)));
  });
  sheet.autoFilter = { from: { row: 8, column: 1 }, to: { row: Math.max(8, data.length + 8), column: headings.length } };
  sheet.mergeCells(data.length + 11, 1, data.length + 11, count); const footer = sheet.getCell(data.length + 11, 1); footer.value = "CONFIDENTIAL | Bluethink HRMS | For authorized business use only"; footer.font = { name: "Calibri", italic: true, size: 10, color: { argb: "FF657789" } };
  sheet.headerFooter.oddFooter = "&LBluethink HRMS · Confidential&RPage &P of &N";
  const bytes = await book.xlsx.writeBuffer(); return new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
export async function downloadBrandedCsv(csv: string, filename: string): Promise<void> {
  try { const blob = await createBrandedWorkbook(csv, filename); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `Bluethink-${filename.replace(/\.csv$/i, "")}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
  catch { window.alert("The Excel report could not be generated. Please retry the download."); }
}
