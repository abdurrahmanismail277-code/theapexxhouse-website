const ISO_CODES = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO
JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ
MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA
RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO
TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK
`.trim().split(/\s+/);

const DIAL_GROUPS = `
1:US CA AG AI AS BB BM BS DM DO GD GU JM KN KY LC MP MS PR SX TC TT VC VG VI
7:RU KZ
20:EG 27:ZA 30:GR 31:NL 32:BE 33:FR MC 34:ES 36:HU 39:IT VA 40:RO 41:CH LI 43:AT 44:GB GG IM JE 45:DK 46:SE 47:NO SJ 48:PL 49:DE
51:PE 52:MX 53:CU 54:AR 55:BR 56:CL 57:CO 58:VE 60:MY 61:AU CC CX 62:ID 63:PH 64:NZ 65:SG 66:TH 81:JP 82:KR 84:VN 86:CN 90:TR 91:IN 92:PK 93:AF 94:LK 95:MM 98:IR
212:MA EH 213:DZ 216:TN 218:LY 220:GM 221:SN 222:MR 223:ML 224:GN 225:CI 226:BF 227:NE 228:TG 229:BJ 230:MU 231:LR 232:SL 233:GH 234:NG 235:TD 236:CF 237:CM 238:CV 239:ST 240:GQ 241:GA 242:CG 243:CD 244:AO 245:GW 246:IO 248:SC 249:SD 250:RW 251:ET 252:SO 253:DJ 254:KE 255:TZ 256:UG 257:BI 258:MZ 260:ZM 261:MG 263:ZW 264:NA 265:MW 266:LS 267:BW 268:SZ 269:KM 290:SH 291:ER 297:AW 298:FO 299:GL 350:GI 351:PT 352:LU 353:IE 354:IS 355:AL 356:MT 357:CY 358:FI AX 359:BG 370:LT 371:LV 372:EE 373:MD 374:AM 375:BY 376:AD 377:MC 378:SM 380:UA 381:RS 382:ME 383:XK 385:HR 386:SI 387:BA 389:MK 420:CZ 421:SK 423:LI
500:FK 501:BZ 502:GT 503:SV 504:HN 505:NI 506:CR 507:PA 508:PM 509:HT 590:BL GP MF 591:BO 592:GY 593:EC 594:GF 595:PY 596:MQ 597:SR 598:UY 599:CW BQ
670:TL 672:NF HM 673:BN 674:NR 675:PG 676:TO 677:SB 678:VU 679:FJ 680:PW 681:WF 682:CK 683:NU 685:WS 686:KI 687:NC 688:TV 689:PF 690:TK 691:FM 692:MH 850:KP 852:HK 853:MO 855:KH 856:LA 880:BD 886:TW 960:MV 961:LB 962:JO 963:SY 964:IQ 965:KW 966:SA 967:YE 968:OM 970:PS 971:AE 972:IL 973:BH 974:QA 975:BT 976:MN 977:NP 992:TJ 993:TM 994:AZ 995:GE 996:KG 998:UZ
`.trim().split(/\s+/);
const DIAL_CODES = {};
let activeDialCode = "";
for (const entry of DIAL_GROUPS) {
  const separator = entry.indexOf(":");
  if (separator >= 0) activeDialCode = entry.slice(0, separator);
  const countryCodes = separator >= 0 ? entry.slice(separator + 1) : entry;
  if (activeDialCode) DIAL_CODES[countryCodes] = `+${activeDialCode}`;
}
Object.assign(DIAL_CODES, {
  AQ: "+672", BV: "+47", EH: "+212", GS: "+500", HM: "+672", PN: "+64", RE: "+262", SS: "+211", TF: "+262", UM: "+1", XK: "+383", YT: "+262",
});

const CURRENCY_GROUPS = `
AED:AE;AFN:AF;ALL:AL;AMD:AM;ANG:CW SX;AOA:AO;ARS:AR;AUD:AU CC CX HM KI NR TV;AWG:AW;AZN:AZ;BAM:BA;BBD:BB;BDT:BD;BGN:BG;BHD:BH;BIF:BI;BMD:BM;BND:BN;BOB:BO;BRL:BR;BSD:BS;BTN:BT;BWP:BW;BYN:BY;BZD:BZ;CAD:CA;CDF:CD;CHF:CH LI;CLP:CL;CNY:CN;COP:CO;CRC:CR;CUP:CU;CVE:CV;CZK:CZ;DJF:DJ;DKK:DK FO GL;DOP:DO;DZD:DZ;EGP:EG;ERN:ER;ETB:ET;EUR:AD AT AX BE BL CY DE EE ES FI FR GF GP GR IE IT LI LU LV MC ME MF MT NL PM PT RE SI SK SM VA;FJD:FJ;FKP:FK;GBP:GB GG GI IM JE SH;GEL:GE;GHS:GH;GMD:GM;GNF:GN;GTQ:GT;GYD:GY;HKD:HK;HNL:HN;HTG:HT;HUF:HU;IDR:ID;ILS:IL PS;INR:IN;IQD:IQ;IRR:IR;ISK:IS;JMD:JM;JOD:JO;JPY:JP;KES:KE;KGS:KG;KHR:KH;KMF:KM;KRW:KR;KWD:KW;KYD:KY;KZT:KZ;LAK:LA;LBP:LB;LKR:LK;LRD:LR;LSL:LS;LYD:LY;MAD:MA EH;MDL:MD;MGA:MG;MKD:MK;MMK:MM;MNT:MN;MOP:MO;MRU:MR;MUR:MU;MVR:MV;MWK:MW;MXN:MX;MYR:MY;MZN:MZ;NAD:NA;NGN:NG;NIO:NI;NOK:NO SJ;NPR:NP;NZD:NZ;OMR:OM;PAB:PA;PEN:PE;PGK:PG;PHP:PH;PKR:PK;PLN:PL;PYG:PY;QAR:QA;RON:RO;RSD:RS;RUB:RU;RWF:RW;SAR:SA;SBD:SB;SCR:SC;SDG:SD;SEK:SE;SGD:SG;SLE:SL;SOS:SO;SRD:SR;SSP:SS;STN:ST;SYP:SY;SZL:SZ;THB:TH;TJS:TJ;TMT:TM;TND:TN;TOP:TO;TRY:TR;TTD:TT;TWD:TW;TZS:TZ;UAH:UA;UGX:UG;USD:AS BQ IO FM GU MH FM MP PW PR UM US VI;UYU:UY;UZS:UZ;VES:VE;VND:VN;VUV:VU;WST:WS;XAF:CF CM CG CD GQ GA TD;XCD:AI AG DM GD MS KN LC VC;XOF:BJ BF CI GW ML NE SN TG;XPF:PF NC WF;YER:YE;ZAR:ZA;ZMW:ZM;ZWG:ZW
`.trim().split(";").map(entry => entry.split(":"));
export const CURRENCY_BY_COUNTRY = Object.fromEntries(CURRENCY_GROUPS.flatMap(([currency, codes]) => codes.split(" ").map(code => [code, currency])));
Object.assign(CURRENCY_BY_COUNTRY, {
  AQ: "USD", BV: "NOK", CK: "NZD", EC: "USD", GS: "GBP", HR: "EUR", KP: "KPW", LT: "EUR", MQ: "EUR", NF: "AUD",
  NU: "NZD", PN: "NZD", SV: "USD", TC: "USD", TF: "EUR", TK: "NZD", TL: "USD", VG: "USD", XK: "EUR", YT: "EUR",
});
const displayNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames([navigator.language || "en"], { type: "region" }) : null;
export const COUNTRIES = Object.freeze(ISO_CODES.map(isoCode => Object.freeze({
  isoCode,
  name: displayNames?.of(isoCode) || isoCode,
  flag: isoCode.toLowerCase(),
  dialCode: DIAL_CODES[isoCode] || "",
  defaultCurrency: CURRENCY_BY_COUNTRY[isoCode] || "USD",
})));

const TIME_ZONE_HINTS = new Map([
  ["Africa/Lagos", "NG"], ["Africa/Accra", "GH"], ["Africa/Nairobi", "KE"], ["Africa/Johannesburg", "ZA"],
  ["Europe/London", "GB"], ["Europe/Dublin", "IE"], ["Europe/Paris", "FR"], ["Europe/Berlin", "DE"],
  ["Europe/Madrid", "ES"], ["Europe/Rome", "IT"], ["Europe/Amsterdam", "NL"], ["Europe/Zurich", "CH"],
  ["Asia/Dubai", "AE"], ["Asia/Riyadh", "SA"], ["Asia/Kolkata", "IN"], ["Asia/Tokyo", "JP"],
  ["Asia/Singapore", "SG"], ["Asia/Hong_Kong", "HK"], ["Asia/Seoul", "KR"], ["Asia/Shanghai", "CN"],
  ["Australia/Sydney", "AU"], ["Pacific/Auckland", "NZ"], ["America/Toronto", "CA"], ["America/Vancouver", "CA"],
  ["America/Los_Angeles", "US"], ["America/Chicago", "US"], ["America/New_York", "US"], ["America/Mexico_City", "MX"],
]);

export function suggestCountry() {
  let region = "";
  try { region = new Intl.Locale(navigator.language).region || ""; } catch {}
  const byLocale = COUNTRIES.find(country => country.isoCode === region);
  if (byLocale) return byLocale;
  let timeZone = "";
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {}
  const hintedCode = TIME_ZONE_HINTS.get(timeZone);
  return COUNTRIES.find(country => country.isoCode === hintedCode) || COUNTRIES.find(country => country.isoCode === "NG");
}

export function getCountry(isoCode) {
  return COUNTRIES.find(country => country.isoCode === isoCode) || null;
}
