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
  const isAbout = ['about.html', 'about-founder.html', 'about-co-founder.html'].includes(page);
  const links = [
    { label: 'Home', href: homeLink, current: isHome },
    { label: 'Services', href: 'services.html', current: page === 'services.html' },
    { label: 'Projects', href: 'index.html#work', current: false },
    { label: 'About', href: 'about.html', current: isAbout },
    { label: 'Insights', href: 'insights.html', current: page === 'insights.html' },
    { label: 'FAQ', href: 'faq.html', current: page === 'faq.html' },
    { label: 'Contact', href: 'contact.html', current: page === 'contact.html' }
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
  drawer.innerHTML = '<div class="ah-menu-head"><div class="ah-menu-logo"></div><button class="ah-menu-close" type="button" aria-label="Close menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><ul class="ah-menu-links"></ul><div class="ah-menu-actions"><a class="ah-menu-book" href="book.html">Book a service</a><a class="ah-menu-whatsapp" href="https://wa.me/2348038326349" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a><div class="ah-menu-contact"><a href="mailto:theapexhouse2026@gmail.com">theapexhouse2026@gmail.com</a><a href="tel:+2348038326349">+234 803 832 6349</a></div></div>';
  if (page === 'book.html') drawer.querySelector('.ah-menu-book').setAttribute('aria-current', 'page');
  if (logo) drawer.querySelector('.ah-menu-logo').append(logo);
  const list = drawer.querySelector('.ah-menu-links');
  links.forEach((item, index) => {
    const li = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = item.href;
    anchor.textContent = item.label;
    anchor.style.setProperty('--menu-index', index);
    if (item.current) anchor.setAttribute('aria-current', 'page');
    li.append(anchor);
    list.append(li);
  });
  drawer.style.setProperty('--menu-count', links.length);
  document.body.append(backdrop, drawer);

  let scrollY = 0;
  let returnFocus = toggle;
  let closeTimer;
  let touchStartX = null;
  const backgroundNodes = [...document.body.children].filter(node => node !== drawer && node !== backdrop && node.tagName !== 'SCRIPT');
  const focusable = () => [...drawer.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden);
  const open = () => {
    if (document.body.classList.contains('ah-menu-open')) return;
    clearTimeout(closeTimer);
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
    scrollY = window.scrollY;
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
    document.body.classList.remove('ah-menu-open');
    backgroundNodes.forEach(node => { node.inert = false; node.removeAttribute('aria-hidden'); });
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
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
