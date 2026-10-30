/** Browser-only UI preferences. Only allow known choices from localStorage. */
export const UI_SETTINGS_KEY = "hrms_ui_settings";
export type UiSettings = {
  notificationPolling: boolean;
  pollingSeconds: number;
  confirmLogout: boolean;
  dateFormat: "IN" | "ISO";
  density: "comfortable" | "compact";
  contentWidth: "standard" | "wide";
  textSize: "normal" | "large";
  sidebarCompact: boolean;
};
export const defaultUiSettings: UiSettings = {
  notificationPolling: true, pollingSeconds: 30, confirmLogout: false, dateFormat: "IN",
  density: "comfortable", contentWidth: "standard", textSize: "normal", sidebarCompact: false,
};
export function readUiSettings(): UiSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(UI_SETTINGS_KEY) || "{}");
    const data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    return {
      notificationPolling: data.notificationPolling !== false,
      pollingSeconds: [15, 30, 60, 120].includes(Number(data.pollingSeconds)) ? Number(data.pollingSeconds) : 30,
      confirmLogout: data.confirmLogout === true,
      dateFormat: data.dateFormat === "ISO" ? "ISO" : "IN",
      density: data.density === "compact" ? "compact" : "comfortable",
      contentWidth: data.contentWidth === "wide" ? "wide" : "standard",
      textSize: data.textSize === "large" ? "large" : "normal",
      sidebarCompact: data.sidebarCompact === true,
    };
  } catch { return { ...defaultUiSettings }; }
}
export function saveUiSettings(value: UiSettings): void {
  localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("hrms-settings-changed"));
}
