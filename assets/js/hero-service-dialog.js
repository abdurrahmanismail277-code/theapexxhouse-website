import { SERVICE_PAGES } from "./service-pages-data.js";

const services = SERVICE_PAGES;

const chooser = document.querySelector(".svc-panel-chips");
const overlay = document.getElementById("svc-panel-dialog");
if (chooser && overlay) {
  const dialog = overlay.querySelector(".svc-panel-dialog");
  const content = overlay.querySelector(".svc-panel-content");
  const closeButton = overlay.querySelector(".svc-panel-close");
  const chips = [...chooser.querySelectorAll("[data-hero-service]")];
  let returnFocus = null;
  let previousBodyOverflow = "";
  let isClosing = false;
  let closeTimer = null;
  const focusable = () => [...dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.getClientRects().length);

  const render = key => {
    const service = services[key];
    if (!service) return;
    chips.forEach(chip => {
      const selected = chip.dataset.heroService === key;
      chip.classList.toggle("is-selected", selected);
      chip.setAttribute("aria-expanded", String(selected));
    });
    content.innerHTML = `<p class="svc-panel-eyebrow">THE APEX HOUSE · SERVICE OVERVIEW</p>
      <h2 id="svc-panel-title">${service.name}</h2>
      <p class="svc-panel-tagline" id="svc-panel-tagline">${service.tagline}</p>
      <div class="svc-panel-switcher" role="group" aria-label="Choose a service">${chips.map(chip => `<button type="button" data-svc-panel-service="${chip.dataset.heroService}" aria-pressed="${chip.dataset.heroService === key}">${chip.textContent}</button>`).join("")}</div>
      <div class="svc-panel-grid">
        <section><h3>What it means</h3><p>${service.summary}</p></section>
        <section><h3>What it covers</h3><ul>${service.covers.map(item => `<li><strong>${item.name}</strong> — ${item.summary}</li>`).join("")}</ul></section>
        <section><h3>Who it is for</h3><p>${service.audience}</p></section>
        <section><h3>How it helps</h3><p>${service.outcome}</p></section>
      </div>
      <div class="svc-panel-actions"><a class="svc-panel-read-more" href="${service.page}">Read more <span aria-hidden="true">↗</span></a><a class="svc-panel-contact" href="mailto:theapexhouse2026@gmail.com?subject=${encodeURIComponent(`Enquiry about ${service.name}`)}&body=${encodeURIComponent(service.emailMessage)}">Talk to us about ${service.name}</a></div>`;
    content.querySelectorAll("[data-svc-panel-service]").forEach(button => button.addEventListener("click", () => {
      const nextKey = button.dataset.svcPanelService;
      render(nextKey);
      content.querySelector(`[data-svc-panel-service="${nextKey}"]`)?.focus();
    }));
  };
  const handleDialogKeydown = event => {
    if (overlay.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) { event.preventDefault(); dialog.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  };
  const handleDialogFocusIn = event => {
    if (!overlay.hidden && !dialog.contains(event.target)) closeButton.focus();
  };
  const open = (key, trigger) => {
    if (!overlay.hidden) return;
    returnFocus = trigger;
    render(key);
    overlay.hidden = false;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleDialogKeydown);
    document.addEventListener("focusin", handleDialogFocusIn);
    closeButton.focus();
  };
  const close = () => {
    if (overlay.hidden || isClosing) return;
    isClosing = true;
    overlay.classList.add("is-closing");
    const finishClose = event => {
      if (overlay.hidden || !isClosing || (event && event.target !== overlay)) return;
      overlay.removeEventListener("transitionend", finishClose);
      if (closeTimer !== null) { window.clearTimeout(closeTimer); closeTimer = null; }
      overlay.hidden = true;
      overlay.classList.remove("is-closing");
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleDialogKeydown);
      document.removeEventListener("focusin", handleDialogFocusIn);
      chips.forEach(chip => { chip.classList.remove("is-selected"); chip.setAttribute("aria-expanded", "false"); });
      returnFocus?.focus();
      isClosing = false;
    };
    overlay.addEventListener("transitionend", finishClose);
    closeTimer = window.setTimeout(finishClose, 260);
  };
  chips.forEach(chip => chip.addEventListener("click", () => {
    if (overlay.hidden) open(chip.dataset.heroService, chip);
    else render(chip.dataset.heroService);
  }));
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
}
