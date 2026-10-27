import { COUNTRIES } from "./countries.js";

const GLOBE_SRC = "assets/flags/globe.svg";
const NIGERIA_TIME_ZONE = "Africa/Lagos";
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

function createCombobox({ input, listbox, items, label, searchText, value, onSelect, renderOption, limit = 280 }) {
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
  search.type = "search"; search.className = "combobox-panel-search"; search.placeholder = input.placeholder || "Search";
  search.setAttribute("aria-label", input.getAttribute("aria-label") || "Search options");
  search.setAttribute("aria-autocomplete", "list"); search.setAttribute("aria-controls", listbox.id); search.setAttribute("role", "combobox"); search.setAttribute("aria-expanded", "true");
  search.autocomplete = "off"; searchRow.append(searchIcon, search);
  const clear = document.createElement("button");
  clear.type = "button"; clear.className = "combobox-clear"; clear.setAttribute("aria-label", "Clear search"); clear.textContent = "×";
  clear.addEventListener("click", () => { search.value = ""; search.dispatchEvent(new Event("input", { bubbles: true })); search.focus(); });
  searchRow.append(clear);
  panel.append(panelTop, searchRow, listbox); wrapper.append(backdrop, panel);
  input.readOnly = true;
  input.setAttribute("role", "button"); input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-label", input.getAttribute("aria-label") || "Choose an option");
  input.placeholder ||= "Select an option";

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
    matches = filtered;
    activeIndex = matches.length ? 0 : -1;
    listbox.replaceChildren();
    matches.forEach((item, index) => {
      const option = document.createElement("li");
      option.id = `${listbox.id}-option-${index}`; option.className = "combobox-option"; option.setAttribute("role", "option"); option.setAttribute("aria-selected", "false");
      if (selected && value(selected) === value(item)) option.dataset.current = "true";
      (renderOption ? renderOption(item) : defaultOption(item)).forEach(node => option.append(node));
      option.addEventListener("pointerdown", event => { event.preventDefault(); choose(item); });
      listbox.append(option);
    });
    if (!matches.length) {
      const empty = document.createElement("li"); empty.className = "combobox-empty"; empty.setAttribute("role", "presentation");
      empty.textContent = "No matches found."; listbox.append(empty);
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

const PHONE_LENGTHS = { NG:[10,10],GB:[9,10],US:[10,10],CA:[10,10],AU:[9,9],NZ:[8,10],IN:[10,10],GH:[9,9],KE:[9,9],ZA:[9,9],AE:[9,9],SA:[9,9],EG:[10,10],DE:[7,12],FR:[9,9],ES:[9,9],IT:[6,11],IE:[7,10] };

export function initBookingInputs({ draft = {}, onCountryChange = () => {} } = {}) {
  const nigeria = COUNTRIES.find(item => item.isoCode === "NG");
  if (!nigeria) throw new Error("Nigeria booking data is unavailable.");
  const countryHidden = document.getElementById("country-iso");
  const phoneDialHidden = document.getElementById("phone-dial-code");
  const phoneDialCountryHidden = document.getElementById("phone-dial-country-iso");
  const timeZoneHidden = document.getElementById("event-timezone");
  const countryInput = document.getElementById("country-search");
  const dialInput = document.getElementById("phone-dial-search");
  const timeZoneInput = document.getElementById("timezone-search");
  const phoneInput = document.getElementById("whatsapp-national");
  const e164Hidden = document.getElementById("whatsapp-e164");

  countryInput.value = nigeria.name;
  countryInput.readOnly = true;
  countryInput.setAttribute("aria-readonly", "true");
  countryHidden.value = nigeria.isoCode;
  dialInput.value = nigeria.dialCode;
  dialInput.readOnly = true;
  dialInput.setAttribute("aria-readonly", "true");
  phoneDialHidden.value = nigeria.dialCode;
  phoneDialCountryHidden.value = nigeria.isoCode;
  const dialCountry = nigeria;

  const nigeriaZone = { zone: NIGERIA_TIME_ZONE, label: "Nigeria time (WAT, UTC+1)", flag: "NG" };
  timeZoneInput.placeholder = "Nigeria time (WAT, UTC+1)";
  timeZoneInput.setAttribute("aria-label", "Nigeria event time zone");
  const zoneCombo = createCombobox({
    input: timeZoneInput,
    listbox: document.getElementById("timezone-listbox"),
    items: [nigeriaZone],
    label: item => item.label,
    searchText: item => `${item.label} Nigeria WAT UTC+1 Africa Lagos`,
    value: item => item.zone,
    renderOption: item => [flagImage(item.flag), Object.assign(document.createElement("span"), { className: "combobox-option-title", textContent: item.label })],
    onSelect: item => { timeZoneHidden.value = item.zone; timeZoneHidden.dispatchEvent(new Event("change", { bubbles: true })); },
  });
  zoneCombo.setValue(NIGERIA_TIME_ZONE);
  if (draft.whatsappNational) phoneInput.value = draft.whatsappNational;
  onCountryChange(nigeria);

  function buildPhone() {
    const dialDigits = nigeria.dialCode.replace(/\D/g, "");
    let digits = phoneInput.value.replace(/\D/g, "");
    if (digits.startsWith(dialDigits)) digits = digits.slice(dialDigits.length);
    digits = digits.replace(/^0+/, "");
    const e164 = digits ? `+${dialDigits}${digits}` : "";
    const [minimum, maximum] = PHONE_LENGTHS.NG;
    e164Hidden.value = e164;
    return { e164, valid: digits.length >= minimum && digits.length <= maximum && dialDigits.length + digits.length <= 15 };
  }
  function updatePhone() { buildPhone(); }
  phoneInput.addEventListener("input", updatePhone);
  phoneInput.addEventListener("change", updatePhone);
  updatePhone();

  return {
    get country() { return nigeria; },
    get dialCountry() { return nigeria; },
    get timeZone() { return zoneCombo.selected?.zone || ""; },
    get phone() { return buildPhone(); },
    setCountry() { countryInput.value = nigeria.name; countryHidden.value = nigeria.isoCode; },
    setTimeZone(zone) { zoneCombo.setValue(zone); },
    reset() {
      countryInput.value = nigeria.name;
      countryHidden.value = nigeria.isoCode;
      dialInput.value = nigeria.dialCode;
      phoneDialHidden.value = nigeria.dialCode;
      phoneDialCountryHidden.value = nigeria.isoCode;
      phoneInput.value = "";
      zoneCombo.setValue(NIGERIA_TIME_ZONE);
      updatePhone();
    },
  };
}
