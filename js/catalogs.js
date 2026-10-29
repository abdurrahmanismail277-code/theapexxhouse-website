(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = document.querySelectorAll('.apx-cat-reveal');
  document.querySelector('.apx-cat-section')?.classList.add('apx-cat-motion-ready');
  if (document.body.classList.contains('apx-cat-page')) document.body.classList.add('apx-cat-motion-ready');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((item) => item.classList.add('apx-cat-visible'));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('apx-cat-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    reveals.forEach((item) => observer.observe(item));
  }

  if (document.body.classList.contains('apx-cat-page')) {
    const progress = document.createElement('div');
    progress.className = 'apx-cat-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '<span></span>';
    document.body.prepend(progress);
    const bar = progress.firstElementChild;
    let scheduled = false;
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const amount = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      bar.style.transform = `scaleX(${amount})`;
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(updateProgress);
    }, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();
  }

  const flyerButtons = document.querySelectorAll('[data-apx-cat-image]');
  if (!flyerButtons.length) return;

  let returnFocus = null;
  const lightbox = document.createElement('div');
  lightbox.className = 'apx-cat-lightbox';
  lightbox.hidden = true;
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Catalog flyer preview');
  lightbox.innerHTML = '<div class="apx-cat-lightbox-inner"><button class="apx-cat-lightbox-close" type="button" aria-label="Close flyer preview">&times;</button><img class="apx-cat-lightbox-image" alt=""></div>';
  document.body.append(lightbox);
  const closeButton = lightbox.querySelector('.apx-cat-lightbox-close');
  const preview = lightbox.querySelector('.apx-cat-lightbox-image');

  const closeLightbox = () => {
    if (lightbox.hidden) return;
    lightbox.classList.remove('apx-cat-open');
    lightbox.hidden = true;
    document.body.style.overflow = lightbox.dataset.previousOverflow || '';
    returnFocus?.focus();
  };

  flyerButtons.forEach((button) => {
    button.addEventListener('click', () => {
      returnFocus = button;
      preview.src = button.dataset.apxCatImage;
      preview.alt = button.dataset.apxCatAlt || 'Apex House service catalog flyer';
      lightbox.dataset.previousOverflow = document.body.style.overflow;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        lightbox.classList.add('apx-cat-open');
        closeButton.focus();
      });
    });
  });

  closeButton.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  lightbox.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'Tab') {
      event.preventDefault();
      closeButton.focus();
    }
  });
})();
