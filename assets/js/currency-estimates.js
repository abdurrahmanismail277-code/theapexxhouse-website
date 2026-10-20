import { CURRENCIES, FALLBACK_RATES_NGN, FALLBACK_RATE_DATE } from "./currencies.js";

const STORAGE_KEY = "apex-house-ngn-rates-v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const API_URL = "https://open.er-api.com/v6/latest/NGN";
const FRACTIONAL_CURRENCIES = new Set(["USD", "GBP", "EUR", "CAD", "AUD", "GHS", "KES", "ZAR", "AED", "SAR", "EGP", "XOF", "XAF", "INR", "CHF", "NZD"]);

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (cached && Number.isFinite(cached.savedAt) && cached.base === "NGN" && cached.rates?.NGN === 1 && cached.rates.USD > 0) {
      return { ...cached, fresh: Date.now() - cached.savedAt < CACHE_TTL_MS };
    }
  } catch {}
  return null;
}
function saveCache(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: Date.now() })); } catch {}
}
function formatMoney(amount, currency, locale) {
  const maxDigits = FRACTIONAL_CURRENCIES.has(currency) ? 2 : 0;
  return new Intl.NumberFormat(locale || navigator.language || "en", {
    style: "currency", currency, currencyDisplay: "symbol", maximumFractionDigits: maxDigits,
    minimumFractionDigits: FRACTIONAL_CURRENCIES.has(currency) ? 2 : 0,
  }).format(amount);
}

export function createCurrencyEstimator(select, onUpdate = () => {}) {
  let current = {
    rates: { ...FALLBACK_RATES_NGN },
    timestamp: FALLBACK_RATE_DATE,
    source: "dated-fallback",
    liveAvailable: false,
  };
  const cached = readCache();
  if (cached) current = { rates: cached.rates, timestamp: cached.timestamp, source: "cache", liveAvailable: cached.fresh };
  const currencies = new Map(CURRENCIES.map(item => [item.code, item]));
  select.addEventListener("change", onUpdate);

  const convert = (amount, currency = select.value || "NGN", locale = navigator.language || "en") => {
    const rate = Number(current.rates[currency]);
    const hasRate = Number.isFinite(rate) && rate > 0;
    const ngnText = formatMoney(amount, "NGN", locale);
    if (currency === "NGN" || !hasRate) return {
      currency: "NGN", requestedCurrency: currency, approximate: ngnText, approximateAmount: currency === "NGN" ? amount : null,
      ngn: ngnText, rate: currency === "NGN" ? 1 : null,
      timestamp: current.timestamp, source: current.source, hasRate: currency === "NGN",
    };
    return {
      currency, requestedCurrency: currency, approximate: formatMoney(amount * rate, currency, locale), approximateAmount: amount * rate, ngn: ngnText,
      rate, timestamp: current.timestamp, source: current.source, hasRate: true,
    };
  };

  const ready = (async () => {
    if (cached?.fresh) { onUpdate(); return current; }
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(API_URL, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Rate service returned an error");
      const data = await response.json();
      if (data.result !== "success" || data.base_code !== "NGN" || !data.rates || data.rates.NGN !== 1) throw new Error("Rate response was invalid");
      current = {
        rates: data.rates,
        timestamp: data.time_last_update_utc || new Date().toISOString(),
        source: "live",
        liveAvailable: true,
      };
      saveCache({ base: "NGN", rates: current.rates, timestamp: current.timestamp });
    } catch {
      current = cached
        ? { rates: cached.rates, timestamp: cached.timestamp, source: "cache", liveAvailable: false }
        : { rates: { ...FALLBACK_RATES_NGN }, timestamp: FALLBACK_RATE_DATE, source: "dated-fallback", liveAvailable: false };
    } finally {
      window.clearTimeout(requestTimeout);
    }
    onUpdate();
    return current;
  })();

  const updateInfo = () => {
    const target = document.getElementById("currency-rate-info");
    if (!target) return;
    if (current.liveAvailable) {
      const when = new Date(current.timestamp);
      const formatted = Number.isNaN(when.valueOf()) ? current.timestamp : new Intl.DateTimeFormat(navigator.language || "en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(when);
      target.replaceChildren(document.createTextNode(`Rates updated ${formatted} UTC / `));
      const sourceLink = document.createElement("a");
      sourceLink.href = "https://www.exchangerate-api.com";
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener noreferrer";
      sourceLink.textContent = "Rates by Exchange Rate API";
      target.append(sourceLink);
    } else if (current.source === "cache") {
      target.textContent = `Live rate unavailable; showing cached rates from ${current.timestamp}.`;
    } else {
      target.textContent = `Live rate unavailable; showing dated reference rates (${FALLBACK_RATE_DATE}). Currencies without a fallback rate display in NGN only.`;
    }
  };
  updateInfo();
  return {
    convert,
    get currency() { return select.value || "NGN"; },
    get rates() { return current.rates; },
    get timestamp() { return current.timestamp; },
    get source() { return current.source; },
    get ready() { return ready; },
    updateInfo,
  };
}
