import { SERVICES, SETTINGS } from "../../services.js";

const content = document.getElementById("pricing-content");
const tabs = [...document.querySelectorAll(".pricing-tab")];
const categoryIntro = document.getElementById("pricing-category-intro");
const categoryDescriptions = {
  communication: "Apex Communication brings together event moderation, launch hosting, public speaking, and community management to help organizations communicate clearly and create engaging audience experiences.",
  consulting: "Apex Consulting offers focused event-planning sessions, ongoing advisory, and project management to help organisers find direction and move their plans forward.",
  media: "Apex Media helps brands and event teams reach their audiences through WhatsApp promotion, broadcast amplification, and clear, on-brand event content."
};
if (content && tabs.length) {
  const formatNGN = amount => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
  const render = category => {
    const group = SERVICES[category];
    if (!group) return;
    if (categoryIntro) categoryIntro.textContent = categoryDescriptions[category] || "";
    content.setAttribute("aria-labelledby", `pricing-tab-${category}`);
    const serviceCards = group.services.map(service => {
      const offers = service.offers.map(offer => `<span class="price-row">${offer.label} (${offer.mode}): <strong>${formatNGN(offer.amount)}</strong> per ${offer.unit}</span>`).join("");
      const physicalNote = service.offers.some(offer => offer.mode === "physical") ? `<small class="price-note">Transport fare not included.</small>` : "";
      const extraNote = service.extraHoursAllowed ? (SETTINGS.launchExtraHourRateNGN == null ? `<small class="price-note">Extra hours confirmed after review.</small>` : `<small class="price-note">Extra hour: ${formatNGN(SETTINGS.launchExtraHourRateNGN)} per hour.</small>`) : "";
      return `<article class="price-card"><h3>${service.name}</h3><a class="price-book" data-book-service="${service.id}" href="book.html?service=${encodeURIComponent(service.id)}">Book this service</a><p>${service.description}</p><div class="price-rows">${offers}${physicalNote}${extraNote}</div></article>`;
    });
    const inquiryCards = (group.inquiryServices || []).map(service => {
      const message = encodeURIComponent(service.inquiryMessage || `Hello, I’m interested in ${service.name}. Please share more details and pricing.`);
      return `<article class="price-card"><h3>${service.name}</h3><a class="price-book" href="https://wa.me/2348038326349?text=${message}" target="_blank" rel="noopener noreferrer">Enquire</a><p>${service.description}</p><div class="price-rows"><span class="price-row">Scope-based pricing</span></div></article>`;
    });
    content.innerHTML = [...serviceCards, ...inquiryCards].join("");

  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      tabs.forEach(item => { item.setAttribute("aria-selected", String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
      render(tab.dataset.category);
    });
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].click();
      tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].focus();
    });
  });
  render("communication");
}
