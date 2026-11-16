import { COUNTRIES } from "./countries.js?v=20261116-international-dial-countries";

const GLOBE_SRC = "assets/flags/globe.svg?v=20261029";
const NIGERIA_TIME_ZONE = "Africa/Lagos";
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
let lockedScrollY = 0;
let mobileScrollLocked = false;
let viewportListenersActive = false;

function updateComboboxViewport() {
  const viewport = window.visualViewport;
  document.documentElement.style.setProperty("--combobox-vv-height", `${viewport?.height || window.innerHeight}px`);
  document.documentElement.style.setProperty("--combobox-vv-offset", `${viewport?.offsetTop || 0}px`);
}

function watchComboboxViewport() {
  updateComboboxViewport();
  if (viewportListenersActive) return;
  viewportListenersActive = true;
  window.visualViewport?.addEventListener("resize", updateComboboxViewport);
  window.visualViewport?.addEventListener("scroll", updateComboboxViewport);
  window.addEventListener("resize", updateComboboxViewport);
}

function stopWatchingComboboxViewport() {
  if (!viewportListenersActive) return;
  viewportListenersActive = false;
  window.visualViewport?.removeEventListener("resize", updateComboboxViewport);
  window.visualViewport?.removeEventListener("scroll", updateComboboxViewport);
  window.removeEventListener("resize", updateComboboxViewport);
}

function lockComboboxScroll() {
  if (mobileScrollLocked) return;
  mobileScrollLocked = true;
  lockedScrollY = window.scrollY;
  document.documentElement.style.setProperty("--combobox-scroll-top", `${-lockedScrollY}px`);
  watchComboboxViewport();
}

function unlockComboboxScroll() {
  if (!mobileScrollLocked) return;
  mobileScrollLocked = false;
  stopWatchingComboboxViewport();
  document.documentElement.style.removeProperty("--combobox-scroll-top");
  document.body.classList.remove("combobox-sheet-open");
  window.scrollTo(0, lockedScrollY);
}

function flagImage(flag) {
  const image = document.createElement("img");
  image.className = "combobox-flag";
  image.width = 24;
  image.height = 18;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.src = flag ? `assets/flags/${String(flag).toLowerCase()}.svg?v=20261029` : GLOBE_SRC;
  image.addEventListener("error", () => {
    if (!image.src.endsWith("/globe.svg")) image.src = GLOBE_SRC;
    else image.hidden = true;
  }, { once: true });
  return image;
}

function createCombobox({ input, listbox, items, label, searchText, value, onSelect, renderOption, suggestedItem, prioritizeMatches = true, limit = 280 }) {
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
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", `Choose ${input.getAttribute("aria-label") || "an option"}`);
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
  search.setAttribute("aria-label", `Search ${input.getAttribute("aria-label") || "options"}`);
  search.setAttribute("aria-autocomplete", "list"); search.setAttribute("aria-controls", listbox.id); search.setAttribute("role", "combobox"); search.setAttribute("aria-expanded", "true");
  search.autocomplete = "off"; searchRow.append(searchIcon, search);
  const clear = document.createElement("button");
  clear.type = "button"; clear.className = "combobox-clear"; clear.setAttribute("aria-label", "Clear search"); clear.textContent = "×";
  clear.addEventListener("click", () => { search.value = ""; search.dispatchEvent(new Event("input", { bubbles: true })); search.focus(); });
  searchRow.append(clear);
  panel.append(panelTop, searchRow, listbox); wrapper.append(backdrop, panel);
  input.readOnly = true;
  input.inputMode = "none";
  input.setAttribute("role", "button"); input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-label", input.getAttribute("aria-label") || "Choose an option");
  input.placeholder ||= "Select an option";

  const close = ({ returnFocus = false } = {}) => {
    const wasOpen = input.getAttribute("aria-expanded") === "true";
    input.setAttribute("aria-expanded", "false");
    search.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    search.removeAttribute("aria-activedescendant");
    panel.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    panel.hidden = true;
    backdrop.hidden = true;
    search.blur();
    if (wasOpen && mobileScrollLocked) unlockComboboxScroll();
    else if (wasOpen) document.body.classList.remove("combobox-sheet-open");
    if (returnFocus) input.focus({ preventScroll: true });
  };
  const open = (focusSearch = true) => {
    const fieldRect = wrapper.getBoundingClientRect();
    const isMobileSheet = window.matchMedia("(max-width: 768px)").matches;
    panel.hidden = false;
    backdrop.hidden = false;
    panel.classList.toggle("opens-up", !isMobileSheet && fieldRect.bottom + 326 > window.innerHeight && fieldRect.top > 326);
    if (isMobileSheet) lockComboboxScroll();
    requestAnimationFrame(() => panel.classList.add("is-open"));
    requestAnimationFrame(() => backdrop.classList.add("is-open")); document.body.classList.add("combobox-sheet-open");
    input.setAttribute("aria-expanded", "true"); search.setAttribute("aria-expanded", "true");
    search.value = ""; render("");
    const touchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (focusSearch && !touchDevice) requestAnimationFrame(() => search.focus({ preventScroll: true }));
  };
  const choose = item => {
    const returnFocus = input.getAttribute("aria-expanded") === "true";
    selected = item;
    input.value = label(item);
    input.title = label(item);
    input.setAttribute("aria-label", `Selected: ${label(item)}`);
    triggerFlag.src = `assets/flags/${String(item.flag || "").toLowerCase() || "globe"}.svg?v=20261029`;
    triggerFlag.hidden = false;
    triggerFlag.onerror = () => { triggerFlag.onerror = null; triggerFlag.src = GLOBE_SRC; };
    input.dataset.selected = "true";
    input.setCustomValidity("");
    close({ returnFocus });
    onSelect?.(item);
    input.dispatchEvent(new Event("change", { bubbles: true }));
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
    if (needle && prioritizeMatches) {
      const startsWithQuery = item => normalize(searchText(item)).split(/[\s()+/-]+/).some(part => part.startsWith(needle));
      filtered.sort((left, right) => Number(startsWithQuery(right)) - Number(startsWithQuery(left)));
    }
    matches = filtered;
    const selectedIndex = selected ? matches.findIndex(item => value(item) === value(selected)) : -1;
    activeIndex = matches.length ? (selectedIndex >= 0 ? selectedIndex : 0) : -1;
    listbox.replaceChildren();
    let currentGroup = null;
    matches.forEach((item, index) => {
      const group = suggestedItem ? (suggestedItem(item) ? "Suggested" : "All countries") : null;
      if (group && group !== currentGroup) {
        listbox.append(groupHeading(group));
        currentGroup = group;
      }
      const option = document.createElement("li");
      option.id = `${listbox.id}-option-${index}`; option.className = "combobox-option"; option.setAttribute("role", "option"); option.setAttribute("aria-selected", "false");
      if (selected && value(selected) === value(item)) option.dataset.current = "true";
      (renderOption ? renderOption(item) : defaultOption(item)).forEach(node => option.append(node));
      option.addEventListener("click", () => choose(item));
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
    else if (event.key === "Escape") { event.preventDefault(); close({ returnFocus: true }); }
  });
  search.addEventListener("input", () => render(search.value));
  closeButton.addEventListener("click", () => close({ returnFocus: true }));
  backdrop.addEventListener("click", () => close({ returnFocus: true }));
  search.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (matches.length) activeIndex = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length; updateActive(); }
    else if (event.key === "Enter") { event.preventDefault(); if (matches[activeIndex]) choose(matches[activeIndex]); }
    else if (event.key === "Home") { event.preventDefault(); activeIndex = 0; updateActive(); }
    else if (event.key === "End") { event.preventDefault(); activeIndex = matches.length - 1; updateActive(); }
    else if (event.key === "Escape") { event.preventDefault(); close({ returnFocus: true }); }
    else if (event.key === "Tab") { event.preventDefault(); close({ returnFocus: true }); }
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

  const countriesByName = [...COUNTRIES].sort((left, right) => left.name.localeCompare(right.name));
  const countryCombo = createCombobox({
    input: countryInput,
    listbox: document.getElementById("country-listbox"),
    items: [nigeria, ...countriesByName.filter(item => item.isoCode !== nigeria.isoCode)],
    label: item => item.name,
    searchText: item => item.name,
    value: item => item.isoCode,
    suggestedItem: item => item.isoCode === nigeria.isoCode,
    prioritizeMatches: false,
    onSelect: item => {
      countryHidden.value = item.isoCode;
      if (dialCombo.selected?.isoCode !== item.isoCode) dialCombo.setValue(item.isoCode);
      onCountryChange(item);
    },
  });
  const dialCountries = COUNTRIES.filter(item => item.dialCode);
  const dialCombo = createCombobox({
    input: dialInput,
    listbox: document.getElementById("phone-dial-listbox"),
    items: dialCountries,
    label: item => item.dialCode,
    searchText: item => `${item.name} ${item.isoCode} ${item.dialCode}`,
    value: item => item.isoCode,
    onSelect: item => {
      phoneDialHidden.value = item.dialCode;
      phoneDialCountryHidden.value = item.isoCode;
      if (countryCombo.selected?.isoCode !== item.isoCode) countryCombo.setValue(item.isoCode);
      updatePhone();
      document.dispatchEvent(new CustomEvent("booking-dial-country-change", { detail: item }));
    },
    renderOption: item => {
      const flag = flagImage(item.flag);
      const title = document.createElement("span"); title.className = "combobox-option-title"; title.textContent = `${item.name} (${item.dialCode})`;
      return [flag, title];
    },
  });
  countryCombo.setValue(nigeria.isoCode);
  dialCombo.setValue(nigeria.isoCode);

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
    const dialCountry = dialCombo.selected || nigeria;
    const dialDigits = dialCountry.dialCode.replace(/\D/g, "");
    let digits = phoneInput.value.replace(/\D/g, "");
    if (digits.startsWith(dialDigits)) digits = digits.slice(dialDigits.length);
    digits = digits.replace(/^0+/, "");
    const e164 = digits ? `+${dialDigits}${digits}` : "";
    const [minimum, maximum] = PHONE_LENGTHS[dialCountry.isoCode] || [6, 14];
    e164Hidden.value = e164;
    return { e164, valid: digits.length >= minimum && digits.length <= maximum && dialDigits.length + digits.length <= 15 };
  }
  function updatePhone() { buildPhone(); }
  phoneInput.addEventListener("input", updatePhone);
  phoneInput.addEventListener("change", updatePhone);
  updatePhone();

  return {
    get country() { return countryCombo.selected || nigeria; },
    get dialCountry() { return dialCombo.selected || nigeria; },
    get timeZone() { return zoneCombo.selected?.zone || ""; },
    get phone() { return buildPhone(); },
    setCountry(isoCode = "NG") { countryCombo.setValue(isoCode); },
    setDialCountry(isoCode = "NG") { dialCombo.setValue(isoCode); },
    setTimeZone(zone) { zoneCombo.setValue(zone); },
    reset() {
      countryCombo.setValue("NG");
      dialCombo.setValue("NG");
      phoneInput.value = "";
      zoneCombo.setValue(NIGERIA_TIME_ZONE);
      updatePhone();
    },
  };
}
