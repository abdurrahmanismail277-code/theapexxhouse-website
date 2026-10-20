import { CURRENCY_BY_COUNTRY } from "./countries.js";

// Add supported display currencies here; NGN remains the source and billing currency.
const REQUIRED_CURRENCIES = `NGN NG Nigerian naira
USD US US dollar
GBP GB British pound
EUR EU Euro
CAD CA Canadian dollar
AUD AU Australian dollar
GHS GH Ghanaian cedi
KES KE Kenyan shilling
ZAR ZA South African rand
AED AE UAE dirham
SAR SA Saudi riyal
EGP EG Egyptian pound
XOF SN West African CFA franc
XAF CM Central African CFA franc
INR IN Indian rupee
JPY JP Japanese yen
CHF CH Swiss franc
NZD NZ New Zealand dollar
`.trim().split("\n").map(line => {
  const [code, region, ...nameParts] = line.split(" ");
  return { code, region, name: nameParts.join(" ") };
});
const names = new Map(REQUIRED_CURRENCIES.map(item => [item.code, item.name]));
const regionByCurrency = new Map(REQUIRED_CURRENCIES.map(item => [item.code, item.region]));
for (const code of new Set(Object.values(CURRENCY_BY_COUNTRY))) {
  if (!names.has(code)) names.set(code, code);
}
function createDisplayNames(type) {
  try { return typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames([navigator.language || "en"], { type }) : null; }
  catch { return null; }
}
const currencyDisplayNames = createDisplayNames("currency");
const regionDisplayNames = createDisplayNames("region");
const neutralCurrencyFlags = new Set(["ANG", "XOF", "XAF", "XCD", "XPF", "XDR", "XXX"]);
export const CURRENCIES = Object.freeze([...names].map(([code, name]) => Object.freeze({
  code,
  name: name === code ? currencyDisplayNames?.of(code) || code : name,
  flag: code === "EUR" ? "eu" : neutralCurrencyFlags.has(code) ? "" : (regionByCurrency.get(code) || Object.entries(CURRENCY_BY_COUNTRY).find(([, currency]) => currency === code)?.[0] || "").toLowerCase(),
  countryName: (code === "EUR" ? "European Union" : regionByCurrency.get(code) || Object.entries(CURRENCY_BY_COUNTRY).find(([, currency]) => currency === code)?.[0]) ? regionDisplayNames?.of(code === "EUR" ? "EU" : regionByCurrency.get(code) || Object.entries(CURRENCY_BY_COUNTRY).find(([, currency]) => currency === code)?.[0]) || "" : "",
  symbol: (() => { try { return new Intl.NumberFormat(navigator.language || "en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0).find(part => part.type === "currency")?.value || ""; } catch { return ""; } })(),
})).sort((a, b) => a.code === "NGN" ? -1 : b.code === "NGN" ? 1 : a.code.localeCompare(b.code)));

// Dated fallback snapshots, in NGN base units, from ExchangeRate-API's open endpoint.
// Reference snapshot: 2026-10-20 UTC. Replace only with a dated published snapshot.
export const FALLBACK_RATE_DATE = "2026-10-20";
export const FALLBACK_RATES_NGN = Object.freeze({
  NGN: 1, USD: 0.000750, GBP: 0.000564, EUR: 0.000669, CAD: 0.001039,
  AUD: 0.001067, GHS: 0.008657, KES: 0.097300, ZAR: 0.012275,
  AED: 0.002755, SAR: 0.002814, EGP: 0.040047, XOF: 0.438879,
  XAF: 0.438879, INR: 0.070698, JPY: 0.118044, CHF: 0.000623,
  NZD: 0.001314,
});
