document.querySelectorAll("[data-service-detail]").forEach(card => {
  const detail = window.APEX_SERVICE_DETAILS?.[card.dataset.serviceDetail];
  if (!detail) return;
  const list = card.querySelector("[data-service-included]");
  const bestFor = card.querySelector("[data-service-best-for]");
  detail.included.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });
  bestFor.textContent = detail.bestFor;
});
