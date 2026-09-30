// Artifact build only: antd's locales come from the CDN bundle (antd-with-locales).
const g = window as unknown as { antd: { locales: Record<string, unknown> } };
export const trTR = g.antd.locales.tr_TR;
export const enUS = g.antd.locales.en_US;
