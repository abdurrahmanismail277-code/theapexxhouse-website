(() => {
  const header = document.querySelector('.nav') || document.querySelector('.topbar');
  let nav = document.querySelector('.nav-links');
  const navInner = document.querySelector('.nav-inner') || header;
  if (!header || !navInner) return;
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'nav-links';
    nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML = '<a href="index.html">Home</a><a href="services.html">Services</a><a href="index.html#work">Projects</a><a href="about.html">About</a><a href="insights.html">Insights</a><a href="faq.html">FAQ</a><a href="contact.html">Contact</a>';
    navInner.append(nav);
  }

  document.documentElement.classList.add('js-ready');
  const homeLink = 'index.html';
  const page = location.pathname.split('/').pop() || 'index.html';
  const isHome = page === 'index.html' || page === 'home.html';
  const isProjects = isHome && location.hash === '#work';
  const isAbout = ['about.html', 'about-founder.html', 'about-co-founder.html'].includes(page);
  const links = [
    { label: 'Home', href: homeLink, current: isHome && !isProjects, icon: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>' },
    { label: 'Services', href: 'services.html', current: page === 'services.html', icon: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2"/>' },
    { label: 'Projects', href: 'index.html#work', current: isProjects, icon: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>' },
    { label: 'About', href: 'about.html', current: isAbout, icon: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>' },
    { label: 'Insights', href: 'insights.html', current: page === 'insights.html', icon: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 4.5v14A2.5 2.5 0 0 1 6.5 16H20M8 6h8m-8 4h8"/>' },
    { label: 'FAQ', href: 'faq.html', current: page === 'faq.html', icon: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-1.1.9-1.8 1.3-1.8 2.7m0 3h.01"/>' },
    { label: 'Contact', href: 'contact.html', current: page === 'contact.html', icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>' }
  ];
  const logo = header.querySelector('.brand')?.cloneNode(true) || header.querySelector('a')?.cloneNode(true);
  const drawer = document.createElement('aside');
  drawer.className = 'ah-menu-drawer';
  drawer.id = 'site-menu-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Main menu');
  const backdrop = document.createElement('div');
  backdrop.className = 'ah-menu-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  const existingToggle = navInner.querySelector('.menu-toggle');
  const toggle = existingToggle || document.createElement('button');
  toggle.className = 'menu-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', drawer.id);
  toggle.innerHTML = '<span class="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span>';
  if (!existingToggle) navInner.prepend(toggle);
  drawer.innerHTML = '<div class="ah-menu-head"><div class="ah-menu-logo"></div><button class="ah-menu-close" type="button" aria-label="Close menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><ul class="ah-menu-links"></ul><div class="ah-menu-actions"><a class="ah-menu-book" href="book.html"><span>Book a service</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a><a class="ah-menu-whatsapp" href="https://wa.me/2348038326349" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 11.8a8.3 8.3 0 0 1-12.2 7.3l-4.1 1 1.1-4a8.3 8.3 0 1 1 15.2-4.3Z"/><path d="M9 8.8c.4 2.7 2.4 4.7 5 5.2l1.2-1.2 2.1 1.1c-.4 1.4-1.4 1.8-2.8 1.5-3.4-.8-6.1-3.5-6.9-6.8-.3-1.4.2-2.4 1.5-2.8l1.2 2.1z"/></svg><span>Chat on WhatsApp</span></a><div class="ah-menu-contact"><a href="mailto:theapexhouse2026@gmail.com"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg><span>theapexhouse2026@gmail.com</span></a><a href="tel:+2348038326349"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h3l2 5-2 1.5a14 14 0 0 0 4.5 4.5L16 12l5 2v3a3 3 0 0 1-3.2 3A17 17 0 0 1 4 6.2 3 3 0 0 1 7 3Z"/></svg><span>+234 803 832 6349</span></a></div></div>';
  if (page === 'book.html') drawer.querySelector('.ah-menu-book').setAttribute('aria-current', 'page');
  if (logo) drawer.querySelector('.ah-menu-logo').append(logo);
  const list = drawer.querySelector('.ah-menu-links');
  links.forEach((item, index) => {
    const li = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = item.href;
    anchor.innerHTML = `<span class="ah-menu-highlight" aria-hidden="true"></span><svg class="ah-menu-icon" viewBox="0 0 24 24" aria-hidden="true">${item.icon}</svg><span class="ah-menu-label">${item.label}</span><svg class="ah-menu-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;
    anchor.style.setProperty('--menu-index', index);
    if (item.current) anchor.setAttribute('aria-current', 'page');
    li.append(anchor);
    list.append(li);
  });
  drawer.style.setProperty('--menu-count', links.length);
  drawer.inert = true;
  drawer.setAttribute("aria-hidden", "true");
  document.body.append(backdrop, drawer);

  let scrollY = 0;
  let previousBodyStyles = null;
  let returnFocus = toggle;
  let closeTimer;
  let touchStartX = null;
  const backgroundNodes = [...document.body.children].filter(node => node !== drawer && node !== backdrop && node.tagName !== 'SCRIPT');
  const focusable = () => [...drawer.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden);
  const open = () => {
    if (document.body.classList.contains('ah-menu-open')) return;
    clearTimeout(closeTimer);
    returnFocus = toggle;
    const navStyle = getComputedStyle(navInner);
    const headerStyle = getComputedStyle(header);
    const navHasImage = navStyle.backgroundImage !== 'none';
    const navHasColor = navStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
    const backgroundImage = navHasImage ? navStyle.backgroundImage : headerStyle.backgroundImage;
    const backgroundColor = navHasColor ? navStyle.backgroundColor : headerStyle.backgroundColor;
    drawer.style.backgroundColor = backgroundColor || 'var(--navy)';
    if (backgroundImage && backgroundImage !== 'none') drawer.style.backgroundImage = backgroundImage;
    else drawer.style.backgroundImage = 'none';
    scrollY = window.scrollY;
    previousBodyStyles = { position: document.body.style.position, top: document.body.style.top, width: document.body.style.width };
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.classList.remove('ah-menu-closing');
    document.body.classList.add('ah-menu-open');
    backgroundNodes.forEach(node => { node.inert = true; node.setAttribute('aria-hidden', 'true'); });
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    drawer.querySelector('.ah-menu-close').focus();
  };
  const close = (restore = true) => {
    if (!document.body.classList.contains('ah-menu-open')) return;
    document.body.classList.add('ah-menu-closing');
    drawer.inert = true;
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove('ah-menu-open');
    backgroundNodes.forEach(node => { node.inert = false; node.removeAttribute('aria-hidden'); });
    document.body.style.position = previousBodyStyles?.position || '';
    document.body.style.top = previousBodyStyles?.top || '';
    document.body.style.width = previousBodyStyles?.width || '';
    previousBodyStyles = null;
    window.scrollTo(0, scrollY);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    closeTimer = setTimeout(() => document.body.classList.remove('ah-menu-closing'), 260);
    if (restore) returnFocus?.focus();
  };
  toggle.addEventListener('click', () => document.body.classList.contains('ah-menu-open') ? close() : open());
  drawer.querySelector('.ah-menu-close').addEventListener('click', () => close());
  backdrop.addEventListener('click', () => close());
  drawer.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = focusable();
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('ah-menu-open')) close();
  });
  drawer.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
  drawer.addEventListener('touchend', event => {
    if (touchStartX !== null && touchStartX - event.changedTouches[0].clientX > 60) close();
    touchStartX = null;
  }, { passive: true });
  drawer.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (!anchor) return;
    close(false);
    const url = new URL(anchor.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.hash) {
      event.preventDefault();
      setTimeout(() => document.querySelector(url.hash)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 20);
    }
  });
})();
