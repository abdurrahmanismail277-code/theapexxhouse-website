const services = {
  consulting: {
    name: "Apex Consulting",
    tagline: "Where Excellence Meets Expression.",
    meaning: "Apex Consulting helps event organisers move from uncertainty to clarity and from ideas to intentional planning. We provide strategic guidance to help you think through your event, make informed decisions, and develop it with a clearer sense of direction.",
    covers: [
      "Event Clarity Session — One-to-one event planning clarity and direction.",
      "Event Advisory — Ongoing event guidance and advisory support.",
      "Project Management — Practical coordination to help keep your project organized, on schedule, and moving toward its goals."
    ],
    audience: "Event organisers with an idea or event in development who need professional guidance before proceeding; event organisers who want continued strategic guidance as they develop and prepare their events; and event organisers and teams who need structured coordination to move work from plan to delivery.",
    outcomes: "A clearer perspective on your event and a better understanding of the steps ahead; a more considered approach to event planning, with professional guidance supporting your decisions; and a clearer plan, coordinated work, and steady progress toward your project goals.",
    message: "Hello, I’m interested in Apex Consulting. Please share more about how you can support my event or project."
  },
  media: {
    name: "Apex Media",
    tagline: "Apex Media helps brands and event teams reach their audiences through WhatsApp promotion, broadcast amplification, and clear, on-brand event content.",
    meaning: "Apex Media helps brands and event teams reach their audiences through WhatsApp promotion, broadcast amplification, and clear, on-brand event content.",
    covers: [
      "Brand Influencing (WhatsApp status) — Promotion on WhatsApp status for each 24-hour block.",
      "Brand Influencing and Broadcast Amplification (WhatsApp) — WhatsApp status promotion with broadcast amplification per 24-hour block.",
      "Event Content Support — Flyer captions, promotional write-ups, announcements, and event copywriting."
    ],
    audience: "Brands and event teams who want to reach their audiences through WhatsApp promotion, broadcast amplification, and event content.",
    outcomes: "Reach audiences through WhatsApp promotion and broadcast amplification, with clear, on-brand event content.",
    message: "Hello, I’m interested in Apex Media. Please share more about how you can help my brand or event reach its audience."
  },
  communication: {
    name: "Apex Communication",
    tagline: "Apex Communication brings people together with clear communication and thoughtful experiences.",
    meaning: "Apex Communication brings together event moderation, launch hosting, public speaking, and community management to help organizations communicate clearly and create engaging audience experiences.",
    covers: [
      "Event Moderation and Panel Facilitation — Thoughtful event moderation and panel facilitation.",
      "Launch Hosting and Facilitation — A polished welcome and facilitation for your launch.",
      "Public Speaking — Stories and ideas delivered with clarity and presence.",
      "Event Community Management — Daily community management (2 hours per day)."
    ],
    audience: "Organizations looking for event moderation, launch hosting, public speaking, or community management.",
    outcomes: "Communicate clearly and create engaging audience experiences.",
    message: "Hello, I’m interested in Apex Communication. Please share more about the support available for my event or community."
  }
};

const chooser = document.querySelector(".hero-service-links");
const overlay = document.getElementById("hero-service-dialog");
if (chooser && overlay) {
  const dialog = overlay.querySelector(".hero-service-dialog");
  const content = overlay.querySelector(".hero-service-content");
  const closeButton = overlay.querySelector(".hero-service-close");
  const chips = [...chooser.querySelectorAll("[data-hero-service]")];
  let returnFocus = null;
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
    content.innerHTML = `<p class="hero-service-eyebrow">THE APEX HOUSE · SERVICE OVERVIEW</p>
      <h2 id="hero-service-title">${service.name}</h2>
      <p class="hero-service-tagline" id="hero-service-tagline">${service.tagline}</p>
      <div class="hero-service-switcher" role="group" aria-label="Choose a service">${chips.map(chip => `<button type="button" data-dialog-service="${chip.dataset.heroService}" aria-pressed="${chip.dataset.heroService === key}">${chip.textContent}</button>`).join("")}</div>
      <div class="hero-service-grid">
        <section><h3>What it means</h3><p>${service.meaning}</p></section>
        <section><h3>What it covers</h3><ul>${service.covers.map(item => `<li>${item}</li>`).join("")}</ul></section>
        <section><h3>Who it is for</h3><p>${service.audience}</p></section>
        <section><h3>How it helps</h3><p>${service.outcomes}</p></section>
      </div>
      <a class="hero-service-contact" href="https://wa.me/2348038326349?text=${encodeURIComponent(service.message)}" target="_blank" rel="noopener noreferrer">Talk to us about ${service.name}<span aria-hidden="true">↗</span></a>`;
    content.querySelectorAll("[data-dialog-service]").forEach(button => button.addEventListener("click", () => {
      const nextKey = button.dataset.dialogService;
      render(nextKey);
      content.querySelector(`[data-dialog-service="${nextKey}"]`)?.focus();
    }));
  };
  const open = (key, trigger) => {
    returnFocus = trigger;
    render(key);
    overlay.hidden = false;
    document.body.classList.add("hero-service-open");
    closeButton.focus();
  };
  const close = () => {
    if (overlay.hidden) return;
    overlay.classList.add("is-closing");
    const finishClose = () => {
      if (overlay.hidden) return;
      overlay.hidden = true;
      overlay.classList.remove("is-closing");
      document.body.classList.remove("hero-service-open");
      chips.forEach(chip => { chip.classList.remove("is-selected"); chip.setAttribute("aria-expanded", "false"); });
      returnFocus?.focus();
    };
    overlay.addEventListener("transitionend", finishClose, { once: true });
    window.setTimeout(finishClose, 260);
  };
  chips.forEach(chip => chip.addEventListener("click", () => {
    if (overlay.hidden) open(chip.dataset.heroService, chip);
    else render(chip.dataset.heroService);
  }));
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  document.addEventListener("keydown", event => {
    if (overlay.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) { event.preventDefault(); dialog.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}
