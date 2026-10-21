import { api } from "./api";
export async function downloadAuthorized(path: string, filename: string): Promise<void> {
  try {
    const response = await api.get(path, { responseType: "blob" });
    const blob = response.data as Blob;
    if (blob.type.includes("json")) throw new Error("The server did not return a document.");
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) {
    const e = error as { response?: { data?: Blob } };
    if (e.response?.data instanceof Blob) {
      let text = "Document download failed.";
      try { const data = JSON.parse(await e.response.data.text()); text = data.message || data.detail || text; } catch { /* use a safe fallback */ }
      throw new Error(text);
    }
    throw error;
  }
}
