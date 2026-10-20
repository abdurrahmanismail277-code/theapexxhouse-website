(() => {
  const root = document.documentElement;
  const style = document.createElement("style");
  style.textContent = "html.page-entering body{opacity:0;transform:translateY(3px)}html.page-leaving body{opacity:0;transform:translateY(-4px)}body{transition:opacity .2s ease,transform .2s ease}@media(prefers-reduced-motion:reduce){body{transition:none!important}html.page-entering body,html.page-leaving body{opacity:1;transform:none}}";
  document.head.append(style);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced && !root.classList.contains("is-loading")) {
    root.classList.add("page-entering");
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("page-entering")));
  }
  let navigating = false;
  document.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("data-no-transition") || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute("download")) return;
    let target;
    try { target = new URL(link.href, location.href); } catch { return; }
    if (target.origin !== location.origin || (target.pathname === location.pathname && target.search === location.search)) return;
    if (reduced || navigating) return;
    event.preventDefault(); navigating = true; root.classList.add("page-leaving");
    window.setTimeout(() => { location.assign(target.href); }, 200);
  });
  window.addEventListener("pageshow", () => { navigating = false; root.classList.remove("page-leaving", "page-entering"); });
})();
