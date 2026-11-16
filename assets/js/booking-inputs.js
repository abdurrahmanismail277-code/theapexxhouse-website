import { COUNTRIES } from "./countries.js?v=20261116-international-dial-countries";

const GLOBE_SRC = "assets/flags/globe.svg?v=20261029";
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
  image.src = flag ? `assets/flags/${String(flag).toLowerCase()}.svg?v=20261029` : GLOBE_SRC;
  image.addEventListener("error", () => {
    if (!image.src.endsWith("/globe.svg")) image.src = GLOBE_SRC;
    else image.hidden = true;
  }, { once: true });
  return image;
}

function createCombobox({ input, listbox, items, label, searchText, value, onSelect, renderOption, suggestedItem, suggestedLabel = "Suggested", prioritizeMatches = true, limit = 280 }) {
  let selected = null;
  let activeIndex = -1;
  let matches = [];
  let ignoreNextListScroll = false;
  const wrapper = input.closest(".combobox-wrap");
  wrapper.classList.add("is-enhanced");
  listbox.hidden = false;
  const triggerFlag = document.createElement("img");
  triggerFlag.className = "combobox-trigger-flag"; triggerFlag.width = 24; triggerFlag.height = 18; triggerFlag.alt = ""; triggerFlag.hidden = true; triggerFlag.decoding = "async";
  wrapper.append(triggerFlag);
  const panel = document.createElement("div");
  panel.className = "combobox-panel";
  panel.hidden = true;
  const searchRow = document.createElement("div");
  searchRow.className = "combobox-search-row";
  const searchIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  searchIcon.setAttribute("viewBox", "0 0 24 24"); searchIcon.setAttribute("aria-hidden", "true"); searchIcon.classList.add("combobox-search-icon");
  const searchPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  searchPath.setAttribute("d", "M21 21l-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"); searchPath.setAttribute("fill", "none"); searchPath.setAttribute("stroke", "currentColor"); searchPath.setAttribute("stroke-width", "1.8"); searchPath.setAttribute("stroke-linecap", "round"); searchIcon.append(searchPath);
  const search = document.createElement("input");
  search.type = "search"; search.className = "combobox-panel-search"; search.placeholder = "Search for countries";
  search.setAttribute("aria-label", "Search for countries");
  search.setAttribute("aria-controls", listbox.id); search.setAttribute("role", "searchbox");
  search.autocomplete = "off"; searchRow.append(searchIcon, search);
  const clear = document.createElement("button");
  clear.type = "button"; clear.className = "combobox-clear"; clear.setAttribute("aria-label", "Clear search"); clear.textContent = "×";
  const clearSearch = () => {
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    search.focus({ preventScroll: true });
  };
  clear.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    if (!search.value) close({ returnFocus: true });
    else clearSearch();
  });
  searchRow.append(clear);
  panel.append(searchRow, listbox); wrapper.append(panel);
  input.readOnly = true;
  input.inputMode = "none";
  input.setAttribute("role", "combobox"); input.setAttribute("aria-haspopup", "listbox"); input.setAttribute("aria-controls", listbox.id);
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-label", input.getAttribute("aria-label") || "Choose an option");
  input.placeholder ||= "Select an option";

  const isMobileInline = () => window.matchMedia("(max-width: 768px)").matches;
  let mobileListenersActive = false;
  const positionMobilePanel = () => {
    if (!isMobileInline() || panel.hidden) return;
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportLeft = viewport?.offsetLeft || 0;
    const viewportHeight = viewport?.height || window.innerHeight;
    const viewportWidth = viewport?.width || window.innerWidth;
    const triggerRect = wrapper.getBoundingClientRect();
    const phoneRow = wrapper.classList.contains("phone-dial-wrap") ? wrapper.closest(".phone-field-row") : null;
    const anchorRect = phoneRow?.getBoundingClientRect() || triggerRect;
    const nav = document.querySelector(".nav");
    const navRect = nav?.getBoundingClientRect();
    const safeTop = Math.max(viewportTop + 8, navRect && navRect.top <= viewportTop + 1 ? navRect.bottom + 6 : viewportTop + 8);
    const visibleBottom = viewportTop + viewportHeight - 8;
    const maxWidth = Math.max(0, viewportWidth - 16);
    const width = Math.min(maxWidth, Math.max(triggerRect.width, phoneRow ? 280 : triggerRect.width));
    const minLeft = viewportLeft + 8;
    const maxLeft = Math.max(minLeft, viewportLeft + viewportWidth - width - 8);
    const left = Math.min(maxLeft, Math.max(minLeft, anchorRect.left));
    const belowSpace = Math.max(0, visibleBottom - triggerRect.bottom - 6);
    const aboveSpace = Math.max(0, triggerRect.top - safeTop - 6);
    const rowsHeight = [...listbox.children].reduce((height, row) => height + row.getBoundingClientRect().height, 0);
    const preferredHeight = Math.min(320, Math.max(120, searchRow.getBoundingClientRect().height + rowsHeight + 2));
    const openAbove = belowSpace < preferredHeight && aboveSpace > belowSpace;
    const availableSpace = openAbove ? aboveSpace : belowSpace;
    const maxHeight = Math.max(80, Math.min(preferredHeight, availableSpace));
    panel.style.left = `${left}px`;
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${maxHeight}px`;
    panel.style.setProperty("--combobox-mobile-list-height", `${Math.max(24, Math.min(260, maxHeight - searchRow.getBoundingClientRect().height - 2))}px`);
    const panelHeight = Math.min(maxHeight, panel.getBoundingClientRect().height || maxHeight);
    const desiredTop = openAbove ? triggerRect.top - panelHeight - 6 : triggerRect.bottom + 6;
    panel.style.top = `${Math.min(visibleBottom - panelHeight, Math.max(safeTop, desiredTop))}px`;
  };
  const startMobilePositioning = () => {
    if (mobileListenersActive) return;
    mobileListenersActive = true;
    window.addEventListener("scroll", positionMobilePanel, { passive: true });
    document.addEventListener("scroll", positionMobilePanel, { passive: true, capture: true });
    window.addEventListener("resize", positionMobilePanel);
    window.visualViewport?.addEventListener("resize", positionMobilePanel);
    window.visualViewport?.addEventListener("scroll", positionMobilePanel);
  };
  const stopMobilePositioning = () => {
    if (!mobileListenersActive) return;
    mobileListenersActive = false;
    window.removeEventListener("scroll", positionMobilePanel);
    document.removeEventListener("scroll", positionMobilePanel, true);
    window.removeEventListener("resize", positionMobilePanel);
    window.visualViewport?.removeEventListener("resize", positionMobilePanel);
    window.visualViewport?.removeEventListener("scroll", positionMobilePanel);
  };
  const resetMobilePanel = () => {
    panel.classList.remove("mobile-inline");
    panel.style.removeProperty("left");
    panel.style.removeProperty("top");
    panel.style.removeProperty("width");
    panel.style.removeProperty("max-height");
    panel.style.removeProperty("--combobox-mobile-list-height");
    wrapper.append(panel);
  };
  const close = ({ returnFocus = false } = {}) => {
    const wasOpen = input.getAttribute("aria-expanded") === "true";
    input.setAttribute("aria-expanded", "false");
    panel.classList.remove("is-open");
    panel.hidden = true;
    search.blur();
    stopMobilePositioning();
    resetMobilePanel();
    input.removeAttribute("aria-activedescendant");
    search.removeAttribute("aria-activedescendant");
    if (returnFocus && wasOpen) input.focus({ preventScroll: true });
  };
  const open = (focusSearch = true) => {
    const isMobile = isMobileInline();
    const fieldRect = wrapper.getBoundingClientRect();
    panel.hidden = false;
    panel.classList.toggle("opens-up", !isMobile && fieldRect.bottom + 326 > window.innerHeight && fieldRect.top > 326);
    panel.classList.toggle("mobile-inline", isMobile);
    if (isMobile) {
      document.body.append(panel);
      startMobilePositioning();
    } else wrapper.append(panel);
    input.setAttribute("aria-expanded", "true");
    search.value = "";
    render("");
    positionMobilePanel();
    requestAnimationFrame(() => panel.classList.add("is-open"));
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
      const activeOption = listbox.querySelector(`#${CSS.escape(id)}`);
      if (activeOption) {
        ignoreNextListScroll = true;
        activeOption.scrollIntoView({ block: "nearest" });
        requestAnimationFrame(() => { ignoreNextListScroll = false; });
      }
    } else { input.removeAttribute("aria-activedescendant"); search.removeAttribute("aria-activedescendant"); }
  };
  const updateOverflow = () => panel.classList.toggle("has-overflow", listbox.scrollHeight > listbox.clientHeight + 2);
  listbox.addEventListener("scroll", () => {
    updateOverflow();
    if (ignoreNextListScroll) return;
    if (document.activeElement === search) search.blur();
  }, { passive: true });
  const render = query => {
    const needle = normalize(query);
    const filtered = items.filter(item => !needle || normalize(searchText(item)).includes(needle));
    if (needle && (prioritizeMatches || suggestedItem)) {
      const startsWithQuery = item => normalize(searchText(item)).split(/[\s()+/-]+/).some(part => part.startsWith(needle));
      filtered.sort((left, right) => {
        if (suggestedItem) {
          const groupOrder = Number(!suggestedItem(left)) - Number(!suggestedItem(right));
          if (groupOrder) return groupOrder;
        }
        return Number(startsWithQuery(right)) - Number(startsWithQuery(left));
      });
    }
    matches = filtered;
    const selectedIndex = selected ? matches.findIndex(item => value(item) === value(selected)) : -1;
    activeIndex = matches.length ? (selectedIndex >= 0 ? selectedIndex : 0) : -1;
    listbox.replaceChildren();
    let currentGroup = null;
    matches.forEach((item, index) => {
      const group = suggestedItem ? (suggestedItem(item) ? suggestedLabel : "All countries") : null;
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

  input.addEventListener("click", () => {
    if (input.getAttribute("aria-expanded") === "true" && isMobileInline()) close();
    else open(true);
  });
  input.addEventListener("keydown", event => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) { event.preventDefault(); if (input.getAttribute("aria-expanded") !== "true") open(true); else search.focus(); }
    else if (event.key === "Escape") { event.preventDefault(); close({ returnFocus: true }); }
  });
  search.addEventListener("input", () => render(search.value));
  search.addEventListener("search", () => search.dispatchEvent(new Event("input", { bubbles: true })));
  search.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (matches.length) activeIndex = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length; updateActive(); }
    else if (event.key === "Enter") { event.preventDefault(); if (matches[activeIndex]) choose(matches[activeIndex]); }
    else if (event.key === "Home") { event.preventDefault(); activeIndex = 0; updateActive(); }
    else if (event.key === "End") { event.preventDefault(); activeIndex = matches.length - 1; updateActive(); }
    else if (event.key === "Escape") { event.preventDefault(); close({ returnFocus: true }); }
    else if (event.key === "Tab") { event.preventDefault(); close({ returnFocus: true }); }
  });
  const outsidePanel = target => !wrapper.contains(target) && !panel.contains(target);
  document.addEventListener("pointerdown", event => { if (!isMobileInline() && outsidePanel(event.target)) close(); }, { passive: true });
  document.addEventListener("click", event => { if (isMobileInline() && outsidePanel(event.target)) close(); });
  input.addEventListener("blur", () => window.setTimeout(() => { if (!wrapper.contains(document.activeElement) && !panel.contains(document.activeElement)) close(); }, 0));
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
  const popularCodes = ["NG", "GB", "US", "AE", "CA", "SA"];
  const popularCountries = popularCodes.map(code => COUNTRIES.find(item => item.isoCode === code)).filter(Boolean);
  const popularCountryCodes = new Set(popularCodes);
  const countryCombo = createCombobox({
    input: countryInput,
    listbox: document.getElementById("country-listbox"),
    items: [...popularCountries, ...countriesByName.filter(item => !popularCountryCodes.has(item.isoCode))],
    label: item => item.name,
    searchText: item => `${item.name} ${item.dialCode}`,
    value: item => item.isoCode,
    suggestedItem: item => popularCountryCodes.has(item.isoCode),
    suggestedLabel: "Popular",
    onSelect: item => {
      countryHidden.value = item.isoCode;
      if (dialCombo.selected?.isoCode !== item.isoCode) dialCombo.setValue(item.isoCode);
      onCountryChange(item);
    },
  });
  const dialCountries = [
    ...popularCountries.filter(item => item.dialCode),
    ...countriesByName.filter(item => item.dialCode && !popularCountryCodes.has(item.isoCode)),
  ];
  const dialCombo = createCombobox({
    input: dialInput,
    listbox: document.getElementById("phone-dial-listbox"),
    items: dialCountries,
    label: item => item.dialCode,
    searchText: item => `${item.name} ${item.isoCode} ${item.dialCode}`,
    value: item => item.isoCode,
    suggestedItem: item => popularCountryCodes.has(item.isoCode),
    suggestedLabel: "Popular",
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
