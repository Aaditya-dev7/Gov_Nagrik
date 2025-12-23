export type EmailAlertSettings = {
  enabled: boolean;
  toEmail: string;
  high: boolean;
  urgent: boolean;
};

const KEY = "settings:emailAlerts";

export function loadEmailAlertSettings(): EmailAlertSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EmailAlertSettings>;
      return {
        enabled: !!parsed.enabled,
        toEmail: parsed.toEmail ?? "",
        high: parsed.high ?? true,
        urgent: parsed.urgent ?? true,
      };
    }
  } catch {}
  return { enabled: false, toEmail: "", high: true, urgent: true };
}

export function saveEmailAlertSettings(s: EmailAlertSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
