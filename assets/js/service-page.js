import { SERVICE_ORDER, SERVICE_PAGES } from "./service-pages-data.js";

const root = document.getElementById("svc-full-page");
const service = root && SERVICE_PAGES[root.dataset.servicePage];
if (!root || !service) throw new Error("A valid Apex House service page key is required.");

const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};
const appendParagraphs = (parent, paragraphs, className = "svc-full-paragraph") => {
  paragraphs.forEach(text => parent.append(make("p", className, text)));
};
const serviceLabel = key => SERVICE_PAGES[key].name;
const sectionDefinitions = [
  { id: "about", label: `About ${service.name}`, title: `About ${service.name}`, paragraphs: service.about },
  ...(service.areas.length ? [{ id: "areas", label: "Areas we help you think through", title: "Areas we help you think through", list: service.areas }] : []),
  ...(service.who.length ? [{ id: "who", label: "Who Apex Consulting is for", title: "Who Apex Consulting is for", list: service.who }] : []),
  { id: "services", label: "Our services", title: "Our services", services: service.services },
  { id: "why", label: `Why ${service.name}`, title: `Why ${service.name}`, paragraphs: service.why },
  { id: "together", label: "Let's work together", title: service.closingTitle, paragraphs: service.closing, signoff: service.signoff, extra: service.closingExtra }
];

document.title = `${service.name} | The Apex House`;
const hero = root.querySelector("[data-svc-full-hero]");
hero.append(make("p", "svc-full-eyebrow", "THE APEX HOUSE"));
hero.append(make("h1", "svc-full-title", service.name));
hero.append(make("p", "svc-full-tagline", service.tagline));

const navigation = root.querySelector("[data-svc-full-navigation]");
sectionDefinitions.forEach(section => {
  const link = make("a", "svc-full-nav-link", section.label);
  link.href = `#svc-full-${section.id}`;
  navigation.append(link);
});

const sections = root.querySelector("[data-svc-full-sections]");
sectionDefinitions.forEach(definition => {
  const section = make("section", "svc-full-section");
  section.id = `svc-full-${definition.id}`;
  section.setAttribute("aria-labelledby", `${section.id}-title`);
  const heading = make("h2", "svc-full-section-title", definition.title);
  heading.id = `${section.id}-title`;
  section.append(heading);
  if (definition.paragraphs) appendParagraphs(section, definition.paragraphs);
  if (definition.list) {
    const list = make("ul", "svc-full-list");
    definition.list.forEach(item => list.append(make("li", "svc-full-list-item", item)));
    section.append(list);
  }
  if (definition.services) {
    definition.services.forEach((item, index) => {
      const article = make("section", "svc-full-service");
      article.id = `svc-full-service-${index + 1}`;
      const serviceHeading = make("h3", "svc-full-service-title", item.title);
      serviceHeading.id = `${article.id}-title`;
      article.setAttribute("aria-labelledby", serviceHeading.id);
      article.append(serviceHeading);
      if (item.descriptor) article.append(make("p", "svc-full-service-descriptor", item.descriptor));
      appendParagraphs(article, item.paragraphs);
      article.append(make("h4", "svc-full-subheading", item.listTitle));
      const offers = make("ul", "svc-full-list");
      item.items.forEach(text => offers.append(make("li", "svc-full-list-item", text)));
      article.append(offers);
      article.append(make("h4", "svc-full-subheading", item.audienceTitle));
      article.append(make("p", "svc-full-paragraph", item.ideal));
      article.append(make("p", "svc-full-outcome", `${item.outcomeTitle}: ${item.outcome}`));
      if (item.note) article.append(make("p", "svc-full-note", item.note));
      section.append(article);
    });
  }
  if (definition.signoff) section.append(make("p", "svc-full-signoff", definition.signoff));
  if (definition.extra) section.append(make("p", "svc-full-extra", definition.extra));
  if (definition.id === "together") {
    const wa = make("a", "svc-full-whatsapp", `Talk to us about ${service.name}`);
    wa.href = `https://wa.me/2348038326349?text=${encodeURIComponent(service.whatsappMessage)}`;
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    section.append(wa);
  }
  sections.append(section);
});

const footer = root.querySelector("[data-svc-full-footer]");
footer.append(make("p", "svc-full-footer-label", "Explore our other services"));
const otherServices = make("nav", "svc-full-other-services");
otherServices.setAttribute("aria-label", "Other Apex House services");
SERVICE_ORDER.filter(key => key !== root.dataset.servicePage).forEach(key => {
  const link = make("a", "svc-full-other-link", serviceLabel(key));
  link.href = SERVICE_PAGES[key].page;
  otherServices.append(link);
});
footer.append(otherServices);
const home = make("a", "svc-full-home", "Back to home");
home.href = "index.html";
footer.append(home);

navigation.addEventListener("click", event => {
  const link = event.target.closest("a[href^='#svc-full-']");
  if (!link) return;
  const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", link.hash);
});
