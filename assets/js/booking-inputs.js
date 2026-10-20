import { COUNTRIES, getCountry, suggestCountry } from "./countries.js";
import { CURRENCIES } from "./currencies.js";

const GLOBE_SRC = "assets/flags/globe.svg";
const POPULAR_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "CAD", "AED", "GHS", "ZAR", "KES"];
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

function flagImage(flag) {
  const image = document.createElement("img");
  image.className = "combobox-flag";
  image.width = 24;
  image.height = 18;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.src = flag ? `assets/flags/${String(flag).toLowerCase()}.svg` : GLOBE_SRC;
  image.addEventListener("error", () => {
    if (!image.src.endsWith("/globe.svg")) image.src = GLOBE_SRC;
    else image.hidden = true;
  }, { once: true });
  return image;
}

function createCombobox({ input, listbox, items, label, searchText, value, onSelect, renderOption, limit = 280, currency = false }) {
  let selected = null;
  let activeIndex = -1;
  let matches = [];
  const wrapper = input.closest(".combobox-wrap");
  wrapper.classList.add("is-enhanced");
  listbox.hidden = false;
  const triggerFlag = document.createElement("img");
  triggerFlag.className = "combobox-trigger-flag"; triggerFlag.width = 24; triggerFlag.height = 18; triggerFlag.alt = ""; triggerFlag.hidden = true; triggerFlag.decoding = "async";
  wrapper.append(triggerFlag);
  const panel = document.createElement("div");
  panel.className = "combobox-panel";
  panel.hidden = true;
  const backdrop = document.createElement("button");
  backdrop.type = "button"; backdrop.className = "combobox-backdrop"; backdrop.tabIndex = -1; backdrop.setAttribute("aria-label", "Close options");
  const panelTop = document.createElement("div"); panelTop.className = "combobox-panel-top";
  const handle = document.createElement("span"); handle.className = "combobox-sheet-handle"; handle.setAttribute("aria-hidden", "true");
  const closeButton = document.createElement("button"); closeButton.type = "button"; closeButton.className = "combobox-panel-close"; closeButton.setAttribute("aria-label", "Close options"); closeButton.textContent = "×";
  panelTop.append(handle, closeButton);
  const searchRow = document.createElement("div");
  searchRow.className = "combobox-search-row";
  const searchIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  searchIcon.setAttribute("viewBox", "0 0 24 24"); searchIcon.setAttribute("aria-hidden", "true"); searchIcon.classList.add("combobox-search-icon");
  const searchPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  searchPath.setAttribute("d", "M21 21l-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"); searchPath.setAttribute("fill", "none"); searchPath.setAttribute("stroke", "currentColor"); searchPath.setAttribute("stroke-width", "1.8"); searchPath.setAttribute("stroke-linecap", "round"); searchIcon.append(searchPath);
  const search = document.createElement("input");
  search.type = "search"; search.className = "combobox-panel-search"; search.placeholder = currency ? "Search currency or country" : input.placeholder || "Search";
  search.setAttribute("aria-label", currency ? "Search currency or country" : input.getAttribute("aria-label") || "Search options");
  search.setAttribute("aria-autocomplete", "list"); search.setAttribute("aria-controls", listbox.id); search.setAttribute("role", "combobox"); search.setAttribute("aria-expanded", "true");
  search.autocomplete = "off"; searchRow.append(searchIcon, search);
  const clear = document.createElement("button");
  clear.type = "button"; clear.className = "combobox-clear"; clear.setAttribute("aria-label", "Clear search"); clear.textContent = "×";
  clear.addEventListener("click", () => { search.value = ""; search.dispatchEvent(new Event("input", { bubbles: true })); search.focus(); });
  searchRow.append(clear);
  panel.append(panelTop, searchRow, listbox); wrapper.append(backdrop, panel);
  input.readOnly = true;
  input.setAttribute("role", "button"); input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-label", input.getAttribute("aria-label") || `Choose ${currency ? "currency" : "option"}`);
  input.placeholder ||= currency ? "Select currency" : "Select an option";

  const close = () => {
    const wasOpen = input.getAttribute("aria-expanded") === "true";
    input.setAttribute("aria-expanded", "false");
    search.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    search.removeAttribute("aria-activedescendant");
    panel.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    if (wasOpen) document.body.classList.remove("combobox-sheet-open");
    window.setTimeout(() => { if (input.getAttribute("aria-expanded") !== "true") panel.hidden = true; }, 180);
  };
  const open = (focusSearch = true) => {
    panel.hidden = false;
    backdrop.hidden = false;
    const fieldRect = wrapper.getBoundingClientRect();
    const isMobileSheet = window.matchMedia("(max-width: 768px)").matches;
    panel.classList.toggle("opens-up", !isMobileSheet && fieldRect.bottom + 326 > window.innerHeight && fieldRect.top > 326);
    requestAnimationFrame(() => panel.classList.add("is-open"));
    requestAnimationFrame(() => backdrop.classList.add("is-open")); document.body.classList.add("combobox-sheet-open");
    input.setAttribute("aria-expanded", "true"); search.setAttribute("aria-expanded", "true");
    search.value = ""; render("");
    if (focusSearch) requestAnimationFrame(() => search.focus({ preventScroll: true }));
  };
  const choose = item => {
    const returnFocus = input.getAttribute("aria-expanded") === "true";
    selected = item;
    input.value = label(item);
    input.title = label(item);
    input.setAttribute("aria-label", `Selected: ${label(item)}`);
    triggerFlag.src = `assets/flags/${String(item.flag || "").toLowerCase() || "globe"}.svg`;
    triggerFlag.hidden = false;
    triggerFlag.onerror = () => { triggerFlag.onerror = null; triggerFlag.src = GLOBE_SRC; };
    input.dataset.selected = "true";
    input.setCustomValidity("");
    close();
    onSelect?.(item);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    if (returnFocus) input.focus({ preventScroll: true });
  };
  const updateActive = () => {
    [...listbox.querySelectorAll('[role="option"]')].forEach((option, index) => {
      option.dataset.active = String(index === activeIndex && !option.hasAttribute("aria-disabled"));
      option.setAttribute("aria-selected", String(option.dataset.current === "true"));
    });
    if (activeIndex >= 0 && matches[activeIndex]) {
      const id = `${listbox.id}-option-${activeIndex}`;
      input.setAttribute("aria-activedescendant", id); search.setAttribute("aria-activedescendant", id);
      listbox.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ block: "nearest" });
    } else { input.removeAttribute("aria-activedescendant"); search.removeAttribute("aria-activedescendant"); }
  };
  const updateOverflow = () => panel.classList.toggle("has-overflow", listbox.scrollHeight > listbox.clientHeight + 2);
  listbox.addEventListener("scroll", updateOverflow, { passive: true });
  const render = query => {
    const needle = normalize(query);
    const filtered = items.filter(item => !needle || normalize(searchText(item)).includes(needle));
    matches = currency && !needle ? [
      ...POPULAR_CURRENCIES.map(code => filtered.find(item => item.code === code)).filter(Boolean),
      ...filtered.filter(item => !POPULAR_CURRENCIES.includes(item.code)).sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code)),
    ] : filtered;
    activeIndex = matches.length ? 0 : -1;
    listbox.replaceChildren();
    let allHeadingAdded = false;
    matches.forEach((item, index) => {
      if (currency && !needle && index === 0) listbox.append(groupHeading("Popular"));
      if (currency && !needle && !allHeadingAdded && index >= POPULAR_CURRENCIES.filter(code => matches.some(entry => entry.code === code)).length) { listbox.append(groupHeading("All currencies")); allHeadingAdded = true; }
      const option = document.createElement("li");
      option.id = `${listbox.id}-option-${index}`; option.className = "combobox-option"; option.setAttribute("role", "option"); option.setAttribute("aria-selected", "false");
      if (selected && value(selected) === value(item)) option.dataset.current = "true";
      (renderOption ? renderOption(item) : defaultOption(item)).forEach(node => option.append(node));
      option.addEventListener("pointerdown", event => { event.preventDefault(); choose(item); });
      listbox.append(option);
    });
    if (!matches.length) {
      const empty = document.createElement("li"); empty.className = "combobox-empty"; empty.setAttribute("role", "presentation");
      empty.textContent = currency ? "No currencies found. Try a different search." : "No matches found."; listbox.append(empty);
    }
    requestAnimationFrame(updateOverflow);
    updateActive();
  };
  function groupHeading(text) { const heading = document.createElement("li"); heading.className = "combobox-group-heading"; heading.setAttribute("role", "presentation"); heading.textContent = text; return heading; }
  function defaultOption(item) { const img = flagImage(item.flag); const title = document.createElement("span"); title.className = "combobox-option-title"; title.textContent = label(item); return [img, title]; }

  input.addEventListener("click", () => open(true));
  input.addEventListener("keydown", event => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) { event.preventDefault(); if (input.getAttribute("aria-expanded") !== "true") open(true); else search.focus(); }
    else if (event.key === "Escape") { event.preventDefault(); close(); }
  });
  search.addEventListener("input", () => render(search.value));
  closeButton.addEventListener("click", () => { close(); input.focus({ preventScroll: true }); });
  backdrop.addEventListener("click", () => { close(); input.focus({ preventScroll: true }); });
  search.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (matches.length) activeIndex = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length; updateActive(); }
    else if (event.key === "Enter") { event.preventDefault(); if (matches[activeIndex]) choose(matches[activeIndex]); }
    else if (event.key === "Home") { event.preventDefault(); activeIndex = 0; updateActive(); }
    else if (event.key === "End") { event.preventDefault(); activeIndex = matches.length - 1; updateActive(); }
    else if (event.key === "Escape") { event.preventDefault(); close(); input.focus({ preventScroll: true }); }
    else if (event.key === "Tab") close();
  });
  document.addEventListener("pointerdown", event => { if (!wrapper.contains(event.target)) close(); }, { passive: true });
  input.addEventListener("blur", () => window.setTimeout(() => { if (!wrapper.contains(document.activeElement)) close(); }, 0));
  return { get selected() { return selected; }, choose, setValue(targetValue) { const item = items.find(candidate => value(candidate) === targetValue); if (item) choose(item); }, get input() { return input; } };
}

function currencyOption(item) {
  const code = document.createElement("span"); code.className = "combobox-currency-code"; code.textContent = item.code;
  const name = document.createElement("span"); name.className = "combobox-currency-name"; name.textContent = item.name;
  const symbol = document.createElement("span"); symbol.className = "combobox-currency-symbol"; symbol.textContent = item.symbol || "";
  const check = document.createElement("span"); check.className = "combobox-check"; check.setAttribute("aria-hidden", "true"); check.textContent = "✓";
  return [flagImage(item.flag), code, name, symbol, check];
}

const PHONE_LENGTHS = { NG:[10,10],GB:[9,10],US:[10,10],CA:[10,10],AU:[9,9],NZ:[8,10],IN:[10,10],GH:[9,9],KE:[9,9],ZA:[9,9],AE:[9,9],SA:[9,9],EG:[10,10],DE:[7,12],FR:[9,9],ES:[9,9],IT:[6,11],IE:[7,10] };

export function initBookingInputs({ draft = {}, onCountryChange = () => {} } = {}) {
  const countryHidden = document.getElementById("country-iso"), phoneDialHidden = document.getElementById("phone-dial-code"), phoneDialCountryHidden = document.getElementById("phone-dial-country-iso"), currencyHidden = document.getElementById("selected-currency"), timeZoneHidden = document.getElementById("event-timezone");
  const countryInput = document.getElementById("country-search"), dialInput = document.getElementById("phone-dial-search"), currencyInput = document.getElementById("currency-search"), timeZoneInput = document.getElementById("timezone-search"), phoneInput = document.getElementById("whatsapp-national"), e164Hidden = document.getElementById("whatsapp-e164");
  let country, dialCountry;
  const countryCombo = createCombobox({ input:countryInput,listbox:document.getElementById("country-listbox"),items:COUNTRIES,label:item=>item.name,searchText:item=>`${item.name} ${item.isoCode} ${item.dialCode} ${item.isoCode === "GB" ? "UK United Kingdom Great Britain" : ""}`,value:item=>item.isoCode,renderOption:item=>[flagImage(item.isoCode),Object.assign(document.createElement("span"),{className:"combobox-option-title",textContent:item.name})],onSelect:item=>{country=item;countryHidden.value=item.isoCode;countryHidden.dispatchEvent(new Event("change",{bubbles:true}));dialCombo.setValue(item.isoCode);currencyCombo.setValue(item.defaultCurrency);onCountryChange(item);updatePhone();}});
  const dialCombo = createCombobox({ input:dialInput,listbox:document.getElementById("phone-dial-listbox"),items:COUNTRIES,label:item=>`${item.dialCode} · ${item.name}`,searchText:item=>`${item.dialCode} ${item.name} ${item.isoCode}`,value:item=>item.isoCode,renderOption:item=>[flagImage(item.isoCode),Object.assign(document.createElement("span"),{className:"combobox-option-title",textContent:`${item.dialCode} · ${item.name}`})],onSelect:item=>{dialCountry=item;phoneDialHidden.value=item.dialCode;phoneDialCountryHidden.value=item.isoCode;updatePhone();}});
  const currencyCombo = createCombobox({ input:currencyInput,listbox:document.getElementById("currency-listbox"),items:CURRENCIES,label:item=>`${item.code} · ${item.name}`,searchText:item=>`${item.code} ${item.name} ${item.countryName || ""} ${item.flag === "gb" ? "UK Great Britain" : ""}`,value:item=>item.code,renderOption:currencyOption,currency:true,onSelect:item=>{currencyHidden.value=item.code;currencyHidden.dispatchEvent(new Event("change",{bubbles:true}));}});
  const timeZones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Africa/Lagos","Europe/London","Europe/Paris","America/New_York","America/Chicago","America/Los_Angeles","Asia/Dubai","Asia/Kolkata","Asia/Singapore","Australia/Sydney","Pacific/Auckland"];
  const zoneItems = [...new Set([...(timeZones||[]),"UTC"])].map(zone=>({zone}));
  const zoneCombo = createCombobox({ input:timeZoneInput,listbox:document.getElementById("timezone-listbox"),items:zoneItems,label:item=>item.zone,searchText:item=>item.zone,value:item=>item.zone,renderOption:item=>[flagImage(""),Object.assign(document.createElement("span"),{className:"combobox-option-title",textContent:item.zone})],onSelect:item=>{timeZoneHidden.value=item.zone;timeZoneHidden.dispatchEvent(new Event("change",{bubbles:true}));}});
  const suggestion = getCountry(draft.countryISO)||suggestCountry(); countryCombo.setValue(draft.countryISO&&getCountry(draft.countryISO)?draft.countryISO:suggestion.isoCode);
  if(draft.phoneDialCountryISO)dialCombo.setValue(draft.phoneDialCountryISO); if(draft.selectedCurrency)currencyCombo.setValue(draft.selectedCurrency);
  let browserZone="UTC";try{browserZone=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";}catch{} zoneCombo.setValue(draft.eventTimezone||browserZone); if(draft.whatsappNational)phoneInput.value=draft.whatsappNational;
  function buildPhone(){const dialDigits=(dialCountry?.dialCode||"+234").replace(/\D/g,"");let digits=phoneInput.value.replace(/\D/g,"");if(digits.startsWith(dialDigits))digits=digits.slice(dialDigits.length);digits=digits.replace(/^0+/,"");const e164=digits?`+${dialDigits}${digits}`:"";e164Hidden.value=e164;const range=PHONE_LENGTHS[dialCountry?.isoCode||country?.isoCode]||[7,12];return{e164,valid:digits.length>=range[0]&&digits.length<=range[1]&&dialDigits.length+digits.length<=15};}
  function updatePhone(){buildPhone();} phoneInput.addEventListener("input",updatePhone);phoneInput.addEventListener("change",updatePhone);updatePhone();
  return {get country(){return countryCombo.selected;},get dialCountry(){return dialCombo.selected;},get currency(){return currencyCombo.selected;},get timeZone(){return zoneCombo.selected?.zone||"";},get phone(){return buildPhone();},setCountry(iso){countryCombo.setValue(iso);},setCurrency(code){currencyCombo.setValue(code);},setTimeZone(zone){zoneCombo.setValue(zone);},reset(){countryCombo.setValue(suggestCountry().isoCode);phoneInput.value="";updatePhone();},getCountry};
}
