import { SERVICE_ORDER, SERVICE_PAGES } from "./service-pages-data.js?v=20261116-footer-groups";

const footerServices = document.querySelector("[data-footer-services]");
const serviceSlug = value => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

if (footerServices) {
  const groupClass = key => `footer-service-group footer-service-group-${key}`;

  SERVICE_ORDER.forEach(key => {
    const chamber = SERVICE_PAGES[key];
    if (!chamber || !chamber.services || !chamber.services.length) return;

    const group = document.createElement("nav");
    group.className = groupClass(key);
    group.setAttribute("aria-label", `${chamber.name} services`);

    const heading = document.createElement("h4");
    heading.className = "footer-service-group-title";
    heading.textContent = chamber.name.toUpperCase();
    group.append(heading);

    const list = document.createElement("ul");
    chamber.services.forEach(service => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `${chamber.page}#${serviceSlug(service.title)}`;
      link.textContent = service.title;
      item.append(link);
      list.append(item);
    });
    group.append(list);
    footerServices.append(group);
  });
}
