import type { Locale } from "../data/types";

export function atlasUrl(locale: Locale, module?: string) {
  // The optional legacy bridge uses hash navigation; the public Atlas uses a query.
  const integrated = import.meta.env.VITE_ATLAS_DEEP_LINKS === "true";
  const origin =
    import.meta.env.VITE_ATLAS_ORIGIN ||
    (integrated ? window.location.origin : "https://gpu.aserdargun.com");
  const url = new URL(locale === "tr" ? "/?lang=tr" : "/en/", origin);
  if (module) {
    if (integrated) url.hash = `module=${module}`;
    else url.searchParams.set("module", module);
  }
  return url.href;
}

export function portfolioUrl(locale: Locale) {
  return `https://aserdargun.com/${locale === "tr" ? "tr/" : ""}`;
}
