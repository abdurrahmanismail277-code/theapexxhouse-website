
    import { SETTINGS, SERVICES, calculatePrice, getService, readServiceIdsFromUrl } from "../../services.js";
    import { createCurrencyEstimator } from "./currency-estimates.js";
    import { initBookingInputs } from "./booking-inputs.js";
    // Public endpoint URL only; set this after deploying the Cloudflare Worker. Never put secrets here.
    const BOOKING_ENDPOINT = "/api/book";
    const BOOKING_CONFIG_ENDPOINT = "/api/booking-config";
    // Change these transfer details here; never put private keys or API secrets in this file.
    const PAYMENT_CONFIG = Object.freeze({
      accountNumber: "8038326349",
      bank: "OPay",
      accountName: "Mutmainnah Tirmidhiy Olunle",
      whatsappNumber: "2348038326349",
    });
    const BOOKING_STORAGE_KEY = "apex-house-pending-payment";
    const BOOKING_DRAFT_KEY = "apex-house-booking-draft";
    function readBookingDraft() {
      try { const value = JSON.parse(localStorage.getItem(BOOKING_DRAFT_KEY) || "null"); return value && typeof value === "object" ? value : {}; } catch { return {}; }
    }
    function saveBookingDraft() {
      const draft = {};
      for (const [key, value] of new FormData(bookingForm).entries()) {
        if (["consent", "website", "turnstileToken"].includes(key)) continue;
        draft[key] = value;
      }
      try { localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft)); } catch {}
    }
    function restoreBookingDraft(draft) {
      for (const [key, value] of Object.entries(draft)) {
        const control = bookingForm.elements.namedItem(key);
        if (!control) continue;
        if (control instanceof RadioNodeList) [...control].forEach(item => { item.checked = item.value === value; });
        else if (control.type !== "checkbox" && control.type !== "hidden" && key !== "website") control.value = value;
        else if (control.type === "hidden") control.value = value;
      }
    }
    const bookingDraft = readBookingDraft();
    const naira = amount => `${String.fromCharCode(0x20A6)}${Number(amount).toLocaleString("en-NG")}`;
    const serviceOptions = document.getElementById("booking-service");
    const offerOptions = document.getElementById("booking-package");
    const bookingForm = document.getElementById("booking-form");
    const steps = [...bookingForm.querySelectorAll(".booking-step")];
    const progress = [...bookingForm.querySelectorAll(".booking-progress span")];
    let currentStep = 0;
    let bookingInputs;
    let currencyEstimator;
    let turnstileSetupPromise = null;
    let turnstileWidgetId = null;
    const turnstileTokenInput = document.getElementById("turnstile-token");
    const turnstileContainer = document.getElementById("turnstile-container");
    const turnstileHelp = document.getElementById("turnstile-help");
    async function ensureTurnstile() {
      if (turnstileWidgetId !== null) return true;
      if (turnstileSetupPromise) return turnstileSetupPromise;
      turnstileSetupPromise = (async () => {
        const configResponse = await fetch(BOOKING_CONFIG_ENDPOINT, { headers: { Accept: "application/json" } });
        const config = await configResponse.json().catch(() => ({}));
        if (!configResponse.ok || !config.turnstileSiteKey) throw new Error("Security verification is not configured. Please contact us on WhatsApp to complete your booking.");
        if (!window.turnstile) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error("Security verification could not load. Check your connection or contact us on WhatsApp."));
            document.head.append(script);
          });
        }
        if (!window.turnstile) throw new Error("Security verification could not start. Please try again or contact us on WhatsApp.");
        turnstileWidgetId = window.turnstile.render(turnstileContainer, {
          sitekey: config.turnstileSiteKey,
          callback: token => { turnstileTokenInput.value = token; turnstileHelp.textContent = "Security check complete."; },
          "expired-callback": () => { turnstileTokenInput.value = ""; turnstileHelp.textContent = "The security check expired. Please complete it again."; },
          "error-callback": () => { turnstileTokenInput.value = ""; turnstileHelp.textContent = "Security verification failed. Please try again."; },
        });
        turnstileHelp.textContent = "Complete the security check before submitting your request.";
        return true;
      })().catch(error => {
        turnstileSetupPromise = null;
        turnstileHelp.textContent = error.message || "Security verification is unavailable. Please contact us on WhatsApp.";
        return false;
      });
      return turnstileSetupPromise;
    }
    function priceLabel(amount) {
      const converted = currencyEstimator.convert(amount);
      return converted.currency === "NGN" && converted.requestedCurrency !== "NGN"
        ? `${converted.ngn} NGN (offline ${converted.requestedCurrency} estimate unavailable)`
        : converted.currency === "NGN" ? `${converted.ngn} NGN` : `\u2248 ${converted.approximate} \u00b7 ${converted.ngn} NGN`;
    }
    serviceOptions.innerHTML = `<option value="">Choose a service</option>${Object.entries(SERVICES).map(([, group]) => `<optgroup label="${group.label}">${group.services.map(service => `<option value="${service.id}">${service.name}</option>`).join("")}</optgroup>`).join("")}`;
    serviceOptions.classList.remove("booking-services-loading");
    restoreBookingDraft(bookingDraft);
    bookingInputs = initBookingInputs({ draft: bookingDraft });
    currencyEstimator = createCurrencyEstimator(document.getElementById("selected-currency"));
    document.getElementById("phone-dial-country-iso").value = bookingInputs.dialCountry?.isoCode || "NG";
    document.getElementById("currency-search").required = true;
    const allServiceIds = new Set(Object.values(SERVICES).flatMap(group => group.services.map(service => service.id)));
    const validUrlSelections = readServiceIdsFromUrl(window.location.search);
    let storedSelections = [];
    try { storedSelections = JSON.parse(sessionStorage.getItem("apex-house-selected-services") || "[]"); } catch {}
    const initialSelections = validUrlSelections.length ? [...new Set(validUrlSelections)] : [...new Set(storedSelections)].filter(id => allServiceIds.has(id));
    if (initialSelections.length) {
      serviceOptions.value = initialSelections[0];
      const choiceList = document.createElement("div");
      choiceList.className = "booking-package-prefill";
      choiceList.setAttribute("role", "group");
      choiceList.setAttribute("aria-label", "Services selected in your package. Choose a service to book.");
      choiceList.innerHTML = `<span>Services in your package</span>${initialSelections.map(id => `<button type="button" data-prefill-service="${id}" aria-pressed="true" aria-current="${id === initialSelections[0] ? "true" : "false"}">${getService(id).name}</button>`).join("")}${initialSelections.length > 1 ? "<small>The booking form submits one service at a time. Choose which service to book now.</small>" : ""}`;
      bookingForm.querySelector(".booking-fields").prepend(choiceList);
      choiceList.addEventListener("click", event => {
        const option = event.target.closest("[data-prefill-service]");
        if (!option) return;
        serviceOptions.value = option.dataset.prefillService;
        choiceList.querySelectorAll("[data-prefill-service]").forEach(button => button.setAttribute("aria-pressed", String(button === option)));
        updateOffers();
      });
    }
    function selectedMode() { return bookingForm.elements.mode.value; }
    function selectedService() { return getService(serviceOptions.value); }
    const conditionalTimers = new WeakMap();
    function setConditionalField(wrapper, visible) {
      if (!wrapper) return;
      window.clearTimeout(conditionalTimers.get(wrapper));
      const controls = [...wrapper.querySelectorAll("input,select,textarea")];
      if (visible) {
        wrapper.hidden = false;
        wrapper.inert = false;
        wrapper.setAttribute("aria-hidden", "false");
        controls.forEach(control => { control.disabled = false; });
        requestAnimationFrame(() => wrapper.classList.remove("is-collapsing"));
      } else {
        wrapper.inert = true;
        wrapper.setAttribute("aria-hidden", "true");
        controls.forEach(control => { control.disabled = true; });
        wrapper.classList.add("is-collapsing");
        conditionalTimers.set(wrapper, window.setTimeout(() => { if (wrapper.inert) wrapper.hidden = true; }, 180));
      }
    }
    function updateOffers() {
      const service = selectedService();
      const modeRadios = [...bookingForm.querySelectorAll('input[name="mode"]')];
      modeRadios.forEach(radio => { radio.disabled = !service || !service.offers.some(offer => offer.mode === radio.value); });
      if (service && !service.offers.some(offer => offer.mode === selectedMode())) {
        const firstMode = service.offers[0].mode;
        modeRadios.find(radio => radio.value === firstMode).checked = true;
      }
      const mode = selectedMode();
      const isVirtual = mode === "virtual";
      const venueField = document.getElementById("venue-field");
      const venueInput = venueField.querySelector("input");
      setConditionalField(venueField, !isVirtual);
      venueInput.required = !isVirtual;
      venueInput.setAttribute("aria-required", String(!isVirtual));
      venueField.querySelector(".required-mark").hidden = isVirtual;
      setConditionalField(document.getElementById("platform-field"), isVirtual);
      setConditionalField(document.getElementById("timezone-field"), isVirtual);
      const offers = service ? service.offers.filter(offer => offer.mode === mode) : [];
      offerOptions.innerHTML = offers.length ? offers.map(offer => `<option value="${offer.id}">${offer.label} / ${priceLabel(offer.amount)} per ${offer.unit}</option>`).join("") : '<option value="">Choose a service first</option>';
      const offer = offers[0];
      const units = { hour: "hours", day: "days", package: "packages", content: "content pieces", block: "blocks" };
      document.getElementById("quantity-label").textContent = `Number of ${units[offer?.unit] || "items"}`;
      document.getElementById("quantity-unit").textContent = offer ? `Price is per ${offer.unit}.` : "Choose a service to see the unit.";
      const extraHoursField = document.getElementById("extra-hours-field");
      setConditionalField(extraHoursField, Boolean(service?.extraHoursAllowed));
      updateEstimate();
    }
    function animatePrice(target, text) {
      if (target.textContent === text) return;
      target.textContent = text;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof target.animate !== "function") return;
      target.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], {
        duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "none",
      });
    }
    function updateEstimate() {
      const service = selectedService();
      const offerId = offerOptions.value;
      const quantity = Number(document.getElementById("booking-quantity").value);
      const extraHours = Number(document.getElementById("booking-extra-hours").value || 0);
      const quote = calculatePrice(serviceOptions.value, selectedMode(), offerId, quantity, extraHours);
      const currency = currencyEstimator.currency;
      const estimate = quote ? currencyEstimator.convert(quote.amount, currency) : null;
      const estimateUnavailable = Boolean(estimate && currency !== "NGN" && estimate.currency === "NGN");
      const totalText = !estimate ? "Select a service and package" : estimateUnavailable ? `${estimate.ngn} NGN` : currency === "NGN" ? `${estimate.ngn} NGN` : `~ ${estimate.approximate}`;
      animatePrice(document.getElementById("booking-price-live"), totalText);
      animatePrice(document.getElementById("booking-price"), totalText);
      const notes = [];
      if (selectedMode() === "physical") notes.push("Transport fare not included.");
      if (service?.extraHoursAllowed) notes.push(SETTINGS.launchExtraHourRateNGN == null ? "Additional hours are confirmed after review." : `Additional hours: ${priceLabel(SETTINGS.launchExtraHourRateNGN)} per hour, confirmed after review.`);
      if (estimate) {
        if (estimateUnavailable) notes.push(`No offline ${estimate.requestedCurrency} estimate is available; showing NGN only.`);
        else if (currency !== "NGN") notes.push(`Approximately ${estimate.ngn} NGN.`);
        notes.push("Approximate conversion for your reference. Final billing is in Nigerian naira (NGN) at the rate confirmed by The Apex House.");
      }
      const note = notes.join(" ") || "Choose a service and package to see an estimate.";
      document.getElementById("estimate-note").textContent = note;
      document.getElementById("estimate-note-live").textContent = note;
      document.getElementById("exchange-rate").value = estimate?.rate || "";
      document.getElementById("exchange-rate-timestamp").value = estimate?.timestamp || "";
      document.getElementById("approximate-amount").value = estimate && !estimateUnavailable ? estimate.approximateAmount : "";
      currencyEstimator.updateInfo();
    }
    serviceOptions.addEventListener("change", updateOffers);
    offerOptions.addEventListener("change", updateEstimate);
    document.getElementById("selected-currency").addEventListener("change", updateEstimate);
    currencyEstimator.ready.then(() => { currencyEstimator.updateInfo(); document.getElementById("booking-price-live").classList.remove("booking-rate-loading"); updateEstimate(); });
    document.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener("change", updateOffers));
    document.getElementById("booking-quantity").addEventListener("input", updateEstimate);
    document.getElementById("booking-extra-hours").addEventListener("input", updateEstimate);
    document.getElementById("platform-preference").addEventListener("change", () => {
      const other = document.getElementById("platform-other");
      other.hidden = document.getElementById("platform-preference").value !== "Other";
      if (other.hidden) other.value = "";
    });
    document.querySelectorAll("[data-stepper]").forEach(button => button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.stepper);
      const min = Number(input.min || 0), max = Number(input.max || 1000), step = Number(input.step || 1);
      input.value = String(Math.min(max, Math.max(min, Number(input.value || 0) + Number(button.dataset.delta) * step)));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }));
    const notesInput = document.getElementById("additional-notes");
    notesInput.addEventListener("input", () => { document.getElementById("notes-count").textContent = String(notesInput.value.length); });
    let draftSaveTimer;
    const scheduleDraftSave = () => { window.clearTimeout(draftSaveTimer); draftSaveTimer = window.setTimeout(saveBookingDraft, 250); };
    bookingForm.addEventListener("input", scheduleDraftSave);
    bookingForm.addEventListener("change", scheduleDraftSave);
    const priceDetails = document.getElementById("booking-estimate-live");
    const compactPriceQuery = window.matchMedia("(max-width: 760px)");
    const setPriceSummaryMode = () => { priceDetails.open = !compactPriceQuery.matches; };
    setPriceSummaryMode();
    compactPriceQuery.addEventListener?.("change", setPriceSummaryMode);

    function validateField(field) {
      if (field.disabled || field.type === "hidden" || field.closest("[hidden]") || field.closest(".booking-honeypot")) return true;
      let message = "";
      if (field.id === "country-search" && !bookingInputs.country) message = "Please choose your country from the list.";
      else if (field.id === "currency-search" && !bookingInputs.currency) message = "Please choose a currency from the list.";
      else if (field.id === "phone-dial-search" && !bookingInputs.dialCountry) message = "Please choose a country calling code from the list.";
      else if (field.id === "timezone-search" && selectedMode() === "virtual" && !bookingInputs.timeZone) message = "Please choose a time zone from the list.";
      else if (field.id === "whatsapp-national") {
        const phone = bookingInputs.phone;
        if (!phone.e164) message = "Please enter your phone or WhatsApp number.";
        else if (!phone.valid) message = "Please check the number length for the selected country code.";
      } else if (field.name === "email" && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) message = "Please enter a valid email address.";
      else if (field.name === "eventDate" && field.value && field.value < new Date().toISOString().slice(0, 10)) message = "Preferred date cannot be in the past.";
      else if (field.required && !String(field.value || "").trim()) {
        const messages = { eventName: "Please enter your event name.", eventType: "Please choose your event type.", eventDate: "Please choose your preferred date.", name: "Please enter your name.", email: "Please enter your email address.", audienceSize: "Please enter the audience size.", serviceId: "Please choose a service.", offerId: "Please choose a package.", whatsappNational: "Please enter your phone or WhatsApp number." };
        message = messages[field.name] || "Please complete this field.";
      } else if (!field.checkValidity()) message = field.validationMessage || "Please check this field.";
      field.setCustomValidity(message);
      const wrapper = field.closest(".booking-field");
      if (wrapper) {
        wrapper.classList.toggle("is-invalid", Boolean(message));
        const error = wrapper.querySelector(".field-error");
        if (error) error.textContent = message;
        field.setAttribute("aria-invalid", String(Boolean(message)));
      }
      return !message;
    }
    function validateStep(step) {
      const fields = [...step.querySelectorAll("input,select,textarea")].filter(field => !field.disabled && field.type !== "radio" && field.type !== "hidden" && !field.closest(".booking-honeypot") && !field.closest("[hidden]"));
      if (currentStep === 0) fields.push(document.getElementById("currency-search"));
      const invalid = fields.filter(field => !validateField(field));
      if (invalid.length) {
        invalid[0].focus({ preventScroll: true });
        invalid[0].scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        return false;
      }
      return true;
    }
    bookingForm.addEventListener("blur", event => { if (event.target.matches("input,select,textarea") && event.target.required) validateField(event.target); }, true);
    document.getElementById("booking-next").addEventListener("click", () => {
      if (!validateStep(steps[currentStep])) return;
      if (currentStep < 3) currentStep++;
      renderStep();
    });
    document.getElementById("booking-back").addEventListener("click", () => { currentStep = Math.max(0, currentStep - 1); renderStep(); });
    function renderStep() {
      if (currentStep === 3) void ensureTurnstile();
      steps.forEach((step, index) => step.hidden = index !== currentStep);
      document.getElementById("booking-back").hidden = currentStep === 0;
      document.getElementById("booking-next").hidden = currentStep === 3;
      document.getElementById("booking-submit").hidden = currentStep !== 3;
      progress.forEach((bar, index) => bar.setAttribute("aria-current", index === currentStep ? "step" : "false"));
      const phase = currentStep === 0 ? 0 : currentStep < 3 ? 1 : 2;
      document.querySelectorAll("[data-booking-phase]").forEach((label, index) => {
        if (index === phase) label.setAttribute("aria-current", "step"); else label.removeAttribute("aria-current");
      });
      bookingForm.querySelector(".booking-progress").setAttribute("aria-label", `Step ${currentStep + 1} of 4`);
      if (currentStep === 3) {
        const data = new FormData(bookingForm);
        const service = selectedService();
        const offer = service?.offers.find(item => item.id === data.get("offerId") && item.mode === data.get("mode"));
        const quote = calculatePrice(data.get("serviceId"), data.get("mode"), data.get("offerId"), Number(data.get("quantity")), Number(data.get("extraHours") || 0));
        const displayEstimate = quote ? currencyEstimator.convert(quote.amount) : null;
        const country = bookingInputs.country;
        const reviewParts = [
          `${service?.name} / ${offer?.label} / ${data.get("quantity")} ${offer?.unit}(s)`,
          `${data.get("eventName")} (${data.get("eventDate")}${data.get("eventTime") ? ` ${data.get("eventTime")}` : ""})`,
          `${data.get("name")} / ${data.get("email")}`,
          `Country: ${country?.name || "Not selected"}`,
          data.get("mode") === "virtual" && bookingInputs.timeZone ? `Time zone: ${bookingInputs.timeZone}` : "",
          displayEstimate?.hasRate ? `${displayEstimate.currency} ${displayEstimate.approximate} / ${displayEstimate.ngn} NGN` : displayEstimate ? `No ${displayEstimate.requestedCurrency} estimate is available offline; NGN ${displayEstimate.ngn}` : "Quote unavailable",
        ].filter(Boolean);
        document.getElementById("booking-review").textContent = reviewParts.join(" / ");
      }
    }
    const paymentScreen = document.getElementById("booking-payment");
    const paymentTitle = document.getElementById("payment-title");
    let currentBooking = null;
    function createBookingReference() {
      const now = new Date();
      const date = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let suffix = "";
      if (window.crypto && window.crypto.getRandomValues) {
        const values = new Uint32Array(4);
        window.crypto.getRandomValues(values);
        suffix = [...values].map(value => alphabet[value % alphabet.length]).join("");
      } else {
        suffix = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
      }
      return `APEX-${date}-${suffix}`;
    }
    function displayBookingPayment(booking) {
      const checkout = document.getElementById("payment-checkout");
      checkout.hidden = !booking.paymentLink;
      checkout.href = booking.paymentLink || "#";
      const usesOnlineCheckout = Boolean(booking.paymentLink);
      document.querySelector(".payment-intro").hidden = usesOnlineCheckout;
      document.querySelector(".payment-details").hidden = usesOnlineCheckout;
      document.querySelector(".international-payment-placeholder").hidden = usesOnlineCheckout;
      document.querySelector(".payment-instruction").hidden = usesOnlineCheckout;
      document.getElementById("payment-whatsapp").hidden = usesOnlineCheckout;
      document.querySelector(".payment-warning").hidden = usesOnlineCheckout;
      document.getElementById("payment-guidance").textContent = booking.paymentLink
        ? "Your request is confirmed. Use the secure checkout link below to pay online."
        : booking.amountKnown
          ? "Your request is confirmed. Use the transfer details below to complete payment."
          : "Our team will confirm the final amount before payment. Please wait for our message before transferring.";
      currentBooking = booking;
      const amountKnown = booking.amountKnown === true && Number.isFinite(Number(booking.amount));
      const quantity = `${booking.quantity} ${booking.unit}${Number(booking.quantity) === 1 ? "" : "s"}`;
      document.getElementById("payment-reference-summary").textContent = booking.reference;
      document.getElementById("payment-name").textContent = booking.name;
      document.getElementById("payment-service").textContent = booking.service;
      document.getElementById("payment-mode").textContent = booking.mode === "physical" ? "Physical" : "Virtual";
      document.getElementById("payment-package").textContent = booking.package;
      document.getElementById("payment-quantity").textContent = quantity;
      const eventDate = booking.date ? new Date(`${booking.date}T12:00:00`) : null;
      const dateText = eventDate && !Number.isNaN(eventDate.valueOf()) ? eventDate.toLocaleDateString(navigator.language || "en", { day: "numeric", month: "long", year: "numeric" }) : "Not provided";
      document.getElementById("payment-event-date").textContent = `${dateText}${booking.time ? ` at ${booking.time}` : ""}`;
      document.getElementById("payment-country").textContent = `${booking.country || "Not provided"}${booking.countryISO ? ` (${booking.countryISO})` : ""}`;
      document.getElementById("payment-timezone").textContent = booking.eventTimezone || "Not applicable";
      const paymentConversion = amountKnown ? currencyEstimator.convert(booking.amount, booking.selectedCurrency || "NGN") : null;
      document.getElementById("payment-currency-summary").textContent = paymentConversion?.hasRate ? `${paymentConversion.currency}: ${paymentConversion.approximate} / ${paymentConversion.ngn} NGN (approximate)` : paymentConversion ? `No ${paymentConversion.requestedCurrency} estimate is available offline; authoritative total: ${paymentConversion.ngn} NGN` : "Final amount to be confirmed";
      const amountText = amountKnown ? naira(booking.amount) : "To be confirmed on WhatsApp";
      document.getElementById("payment-total").textContent = amountText;
      const localEstimate = document.getElementById("payment-total-local");
      const selectedCurrency = booking.selectedCurrency || currencyEstimator.currency;
      localEstimate.hidden = !amountKnown || selectedCurrency === "NGN";
      localEstimate.textContent = amountKnown && selectedCurrency !== "NGN"
        ? paymentConversion?.hasRate
          ? `Approximate ${paymentConversion.approximate} / ${paymentConversion.ngn} NGN. Indicative only; payment is due in NGN and your bank may use a different rate.`
          : `No ${selectedCurrency} estimate is available offline. Payment is due in NGN: ${paymentConversion.ngn}.`
        : "";
      document.getElementById("payment-bank").textContent = PAYMENT_CONFIG.bank;
      document.getElementById("payment-account-name").textContent = PAYMENT_CONFIG.accountName;
      document.getElementById("payment-account-number").textContent = PAYMENT_CONFIG.accountNumber;
      document.getElementById("payment-amount").textContent = amountText;
      document.querySelector('[data-copy="amount"]').hidden = !amountKnown;
      document.getElementById("payment-reference").textContent = booking.reference;
      const messageAmount = amountKnown ? naira(booking.amount) : "To be confirmed on WhatsApp";
      const receiptMessage = `Hello, The Apex House. I have made payment for my booking.\nReference: ${booking.reference}\nName: ${booking.name}\nService: ${booking.service}\nAmount: ${messageAmount}\nI am attaching my receipt. Thank you.`;
      const whatsappHref = `https://wa.me/${PAYMENT_CONFIG.whatsappNumber}?text=${encodeURIComponent(receiptMessage)}`;
      document.getElementById("payment-whatsapp").href = whatsappHref;
      document.getElementById("payment-help").querySelector("a").href = `https://wa.me/${PAYMENT_CONFIG.whatsappNumber}`;
      bookingForm.hidden = true;
      paymentScreen.hidden = false;
      document.querySelectorAll("[data-booking-phase]").forEach((label,index)=>{if(index===3)label.setAttribute("aria-current","step");else label.removeAttribute("aria-current")});
      history.replaceState({}, "", "#booking-payment");
      requestAnimationFrame(() => {
        paymentScreen.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        paymentTitle.focus({ preventScroll: true });
      });
    }
    bookingForm.addEventListener("submit", async event => {
      event.preventDefault();
      const status = document.getElementById("booking-status");
      if (!validateStep(steps[currentStep])) return;
      const data = Object.fromEntries(new FormData(bookingForm));
      const service = selectedService();
      const offer = service?.offers.find(item => item.id === data.offerId && item.mode === data.mode);
      const quote = calculatePrice(data.serviceId, data.mode, data.offerId, Number(data.quantity), Number(data.extraHours || 0));
      if (!service || !offer || !quote) {
        status.textContent = "Please check the service, package, and quantity before continuing.";
        return;
      }
      const selectedCountry = bookingInputs.country;
      const selectedPhone = bookingInputs.phone;
      const selectedCurrency = bookingInputs.currency;
      if (!selectedCountry || !selectedPhone.valid || !selectedCurrency) {
        status.textContent = "Please check your country, phone number, and currency selections.";
        return;
      }
      if (!turnstileTokenInput.value) {
        const ready = await ensureTurnstile();
        status.textContent = ready
          ? "Complete the security check before submitting your booking."
          : turnstileHelp.textContent;
        turnstileContainer.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (String(data.website || "").trim()) return;
      const amountKnown = data.mode !== "physical" && service.id !== "launch-hosting";
      const conversion = currencyEstimator.convert(quote.amount, selectedCurrency.code);
      const platform = data.mode === "virtual" ? (data.platformPreference === "Other" ? String(data.platformOther || "").trim() : String(data.platformPreference || "")) : "";
      const brief = String(data.brief || "").trim() || "No additional details provided.";
      const booking = {
        reference: createBookingReference(),
        name: String(data.name).trim(), email: String(data.email).trim(),
        country: selectedCountry.name, countryISO: selectedCountry.isoCode,
        phoneDialCode: bookingInputs.dialCountry.dialCode, whatsapp: selectedPhone.e164,
        service: service.name, mode: data.mode, package: offer.label,
        quantity: Number(data.quantity), unit: offer.unit,
        amount: quote.amount, amountNGN: quote.amount, amountKnown,
        selectedCurrency: selectedCurrency.code,
        approximateAmount: conversion.currency === "NGN" && selectedCurrency.code !== "NGN" ? null : conversion.approximateAmount,
        exchangeRate: conversion.rate, exchangeRateTimestamp: conversion.timestamp,
        date: data.eventDate, time: String(data.eventTime || ""),
        eventTimezone: data.mode === "virtual" ? bookingInputs.timeZone : "",
        platform, additionalNotes: String(data.additionalNotes || "").trim(),
      };
      Object.assign(data, {
        country: booking.country, countryName: booking.country, countryISO: booking.countryISO,
        phoneDialCode: booking.phoneDialCode, whatsapp: booking.whatsapp,
        selectedCurrency: booking.selectedCurrency, approximateAmount: booking.approximateAmount,
        exchangeRate: booking.exchangeRate, exchangeRateTimestamp: booking.exchangeRateTimestamp,
        amount: booking.amountNGN, amountNGN: booking.amountNGN, amountKnown,
        eventTime: booking.time, eventTimezone: booking.eventTimezone, platform: booking.platform, brief,
      });
      const submitButton = document.getElementById("booking-submit");
      submitButton.disabled = true;
      submitButton.textContent = "Sending request…";
      status.textContent = "Sending your booking request securely…";
      try {
        const response = await fetch(BOOKING_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            consent: data.consent === "true",
            reference: booking.reference,
            service: booking.service,
            package: booking.package,
            unit: booking.unit,
            amount: booking.amountNGN,
            amountNGN: booking.amountNGN,
            amountKnown: booking.amountKnown,
            country: booking.country,
            countryISO: booking.countryISO,
            whatsapp: booking.whatsapp,
            selectedCurrency: booking.selectedCurrency,
            approximateAmount: booking.approximateAmount,
            exchangeRate: booking.exchangeRate,
            exchangeRateTimestamp: booking.exchangeRateTimestamp,
            eventTime: booking.time,
            eventTimezone: booking.eventTimezone,
            additionalNotes: booking.additionalNotes,
            platform: booking.platform,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true) throw new Error(result.error || "We could not send your booking request.");
        booking.reference = typeof result.reference === "string" ? result.reference : booking.reference;
        booking.paymentLink = typeof result.paymentLink === "string" ? result.paymentLink : "";
        try { sessionStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(booking)); } catch (error) { console.warn("Could not save this booking for refresh recovery.", error); }
        try { localStorage.removeItem(BOOKING_DRAFT_KEY); } catch {}
        status.textContent = "Your booking request was received.";
        displayBookingPayment(booking);
      } catch (error) {
        status.textContent = error.message || "We could not send your booking request. Please try again or contact us on WhatsApp.";
        turnstileTokenInput.value = "";
        if (turnstileWidgetId !== null && window.turnstile) window.turnstile.reset(turnstileWidgetId);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Show payment instructions";
      }
    });
    document.querySelectorAll(".payment-copy").forEach(button => button.addEventListener("click", async () => {
      const booking = getSavedBooking();
      if (!booking) return;
      const values = {
        accountNumber: PAYMENT_CONFIG.accountNumber,
        accountName: PAYMENT_CONFIG.accountName,
        amount: String(booking.amount),
        reference: booking.reference,
      };
      const value = values[button.dataset.copy];
      if (!value) return;
      const originalText = button.dataset.originalText || button.textContent;
      button.dataset.originalText = originalText;
      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
          copied = true;
        }
      } catch (error) { /* Try the legacy copy method below. */ }
      if (!copied) {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
        textarea.remove();
        button.focus({ preventScroll: true });
      }
      const announcement = document.getElementById("copy-announcement");
      if (button._copyTimer) window.clearTimeout(button._copyTimer);
      button.textContent = copied ? "Copied" : "Copy failed - select the detail and copy it manually";
      announcement.textContent = copied ? `Copied ${originalText.replace(/^Copy /, "").toLowerCase()}.` : "Copy was not available on this browser.";
      button._copyTimer = window.setTimeout(() => { button.textContent = originalText; announcement.textContent = ""; }, 2000);
    }));
    function getSavedBooking() {
      if (currentBooking) return currentBooking;
      try {
        const booking = JSON.parse(sessionStorage.getItem(BOOKING_STORAGE_KEY) || "null");
        if (booking && typeof booking.reference === "string") return booking;
      } catch (error) { /* Keep the in-memory booking usable if storage is blocked. */ }
      return currentBooking;
    }
    document.getElementById("new-booking").addEventListener("click", () => {
      try { sessionStorage.removeItem(BOOKING_STORAGE_KEY); } catch (error) {}
      currentBooking = null;
      turnstileTokenInput.value = "";
      if (turnstileWidgetId !== null && window.turnstile) window.turnstile.reset(turnstileWidgetId);
      paymentScreen.hidden = true;
      bookingForm.hidden = false;
      bookingForm.reset();
      bookingInputs.reset();
      currentStep = 0;
      history.replaceState({}, "", "#book");
      updateOffers();
      renderStep();
      document.getElementById("booking-title").focus({ preventScroll: true });
    });
    document.querySelectorAll('input[name="eventDate"],input[name="alternateDate"]').forEach(input => input.min = new Date().toISOString().slice(0, 10));
    updateOffers();
    renderStep();
    document.getElementById("payment-whatsapp").href = `https://wa.me/${PAYMENT_CONFIG.whatsappNumber}`;
    document.getElementById("payment-help").querySelector("a").href = `https://wa.me/${PAYMENT_CONFIG.whatsappNumber}`;
    document.getElementById("payment-bank").textContent = PAYMENT_CONFIG.bank;
    document.getElementById("payment-account-name").textContent = PAYMENT_CONFIG.accountName;
    document.getElementById("payment-account-number").textContent = PAYMENT_CONFIG.accountNumber;
    const savedBooking = getSavedBooking();
    if (savedBooking) displayBookingPayment(savedBooking);
