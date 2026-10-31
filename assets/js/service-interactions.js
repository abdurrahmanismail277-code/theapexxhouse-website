(() => {
  const cards = [...document.querySelectorAll("[data-service-card]")];
  const packageBar = document.getElementById("service-package-bar");
  const countLabel = document.getElementById("service-package-count");
  const continueLink = document.getElementById("service-package-continue");
  const clearButton = document.getElementById("service-package-clear");
  const selectedKey = "apex-house-selected-services";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const details = window.APEX_SERVICE_DETAILS || {};
  let hideBarTimer;

  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
  const serviceIds = new Set(cards.map(card => card.dataset.serviceId));
  const readSelections = () => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(selectedKey) || "[]");
      return Array.isArray(stored) ? [...new Set(stored.filter(id => serviceIds.has(id)))] : [];
    } catch {
      return [];
    }
  };
  let selected = readSelections();

  cards.forEach(card => {
    const id = card.dataset.serviceId;
    const panel = card.querySelector(".service-expanded");
    const list = panel?.querySelector("[data-service-included]");
    const bestFor = panel?.querySelector("[data-service-best-for]");
    const content = details[id];
    if (content && list && bestFor) {
      list.innerHTML = content.included.map(item => `<li>${escapeHtml(item)}</li>`).join("");
      bestFor.textContent = content.bestFor;
    }
    const checkbox = card.querySelector("[data-select-service]");
    if (checkbox) checkbox.checked = selected.includes(id);
  });

  const saveSelections = () => {
    try {
      if (selected.length) sessionStorage.setItem(selectedKey, JSON.stringify(selected));
      else sessionStorage.removeItem(selectedKey);
    } catch {}
  };
  const updatePackageBar = () => {
    if (!packageBar || !countLabel || !continueLink) return;
    const visible = selected.length > 0;
    if (hideBarTimer) window.clearTimeout(hideBarTimer);
    if (visible) {
      packageBar.hidden = false;
      document.body.classList.add("has-package-bar");
      requestAnimationFrame(() => packageBar.classList.add("is-visible"));
      countLabel.textContent = String(selected.length);
      countLabel.classList.remove("is-counting");
      requestAnimationFrame(() => countLabel.classList.add("is-counting"));
      packageBar.querySelector(".service-package-summary span:last-child").textContent = selected.length === 1 ? "service selected" : "services selected";
      continueLink.href = `book.html?services=${selected.join(",")}`;
    } else {
      packageBar.classList.remove("is-visible");
      hideBarTimer = window.setTimeout(() => {
        packageBar.hidden = true;
        document.body.classList.remove("has-package-bar");
      }, reducedMotion.matches ? 0 : 260);
    }
  };

  const setSelected = (id, isSelected) => {
    selected = isSelected ? [...new Set([...selected, id])] : selected.filter(item => item !== id);
    const card = cards.find(item => item.dataset.serviceId === id);
    if (card) {
      const checkbox = card.querySelector("[data-select-service]");
      if (checkbox) checkbox.checked = isSelected;
      card.classList.toggle("is-selected", isSelected);
    }
    saveSelections();
    updatePackageBar();
  };

  cards.forEach(card => {
    const toggle = card.querySelector(".service-expand");
    const panel = card.querySelector(".service-expanded");
    const checkbox = card.querySelector("[data-select-service]");
    if (checkbox) {
      card.classList.toggle("is-selected", checkbox.checked);
      checkbox.addEventListener("change", () => setSelected(card.dataset.serviceId, checkbox.checked));
    }
    if (!toggle || !panel) return;

    const finishOpening = () => {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      panel.style.height = "auto";
    };
    const open = () => {
      cards.forEach(other => {
        if (other !== card) close(other, false);
      });
      toggle.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      if (reducedMotion.matches) {
        panel.style.height = "auto";
        panel.style.opacity = "1";
        return;
      }
      panel.style.height = "0px";
      panel.style.opacity = "0";
      requestAnimationFrame(() => {
        panel.style.height = `${panel.scrollHeight}px`;
        panel.style.opacity = "1";
      });
    };
    const close = (target, restoreFocus) => {
      const button = target.querySelector(".service-expand");
      const content = target.querySelector(".service-expanded");
      if (!button || !content || button.getAttribute("aria-expanded") !== "true") return;
      if (reducedMotion.matches) {
        button.setAttribute("aria-expanded", "false");
        content.hidden = true;
        content.style.height = "";
        content.style.opacity = "";
        if (restoreFocus) button.focus();
        return;
      }
      const contentHeight = content.getBoundingClientRect().height;
      button.setAttribute("aria-expanded", "false");
      content.style.height = `${contentHeight}px`;
      requestAnimationFrame(() => {
        content.style.height = "0px";
        content.style.opacity = "0";
      });
      const onClose = event => {
        if (event.propertyName !== "height") return;
        if (button.getAttribute("aria-expanded") === "true") {
          content.removeEventListener("transitionend", onClose);
          return;
        }
        content.hidden = true;
        content.style.height = "";
        content.style.opacity = "";
        content.removeEventListener("transitionend", onClose);
      };
      content.addEventListener("transitionend", onClose);
      if (restoreFocus) button.focus();
    };

    panel.addEventListener("transitionend", event => {
      if (event.propertyName === "height") finishOpening();
    });
    toggle.addEventListener("click", () => {
      if (toggle.getAttribute("aria-expanded") === "true") close(card, false);
      else open();
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const openToggle = document.querySelector('.service-expand[aria-expanded="true"]');
    if (!openToggle) return;
    event.preventDefault();
    const card = openToggle.closest("[data-service-card]");
    openToggle.click();
    openToggle.focus();
    card?.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      selected = [];
      cards.forEach(card => {
        const checkbox = card.querySelector("[data-select-service]");
        if (checkbox) checkbox.checked = false;
        card.classList.remove("is-selected");
      });
      saveSelections();
      updatePackageBar();
    });
  }

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (finePointer.matches && !reducedMotion.matches) {
    cards.forEach(card => {
      let pointerFrame = 0;
      let pointerPosition;
      card.addEventListener("pointermove", event => {
        if (event.pointerType !== "mouse" || reducedMotion.matches) return;
        pointerPosition = { x: event.clientX, y: event.clientY };
        if (pointerFrame) return;
        pointerFrame = requestAnimationFrame(() => {
          pointerFrame = 0;
          const rect = card.getBoundingClientRect();
          const x = Math.max(0, Math.min(rect.width, pointerPosition.x - rect.left));
          const y = Math.max(0, Math.min(rect.height, pointerPosition.y - rect.top));
          const tiltX = ((x / rect.width) - 0.5) * 8;
          const tiltY = (0.5 - (y / rect.height)) * 8;
          card.style.setProperty("--spot-x", `${(x / rect.width) * 100}%`);
          card.style.setProperty("--spot-y", `${(y / rect.height) * 100}%`);
          card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
          card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
          card.classList.add("pointer-active");
        });
      }, { passive: true });
      card.addEventListener("pointerleave", () => {
        if (pointerFrame) cancelAnimationFrame(pointerFrame);
        pointerFrame = 0;
        card.classList.remove("pointer-active");
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      }, { passive: true });
    });
  }

  updatePackageBar();
})();
