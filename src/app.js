(() => {
  "use strict";

  const html = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  let lenis = null;
  let loadFinished = false;

  /* ---------------------------------------------------------------- safety net */
  const failSafe = () => {
    html.classList.add("is-ready");
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in-view"));
    document.getElementById("preloader")?.classList.add("is-done");
    body.classList.remove("is-locked");
    try {
      lenis?.start();
    } catch (_) {
      /* noop */
    }
  };

  window.addEventListener("error", failSafe);
  window.addEventListener("unhandledrejection", failSafe);

  /* ---------------------------------------------------------------- reveal on scroll */
  const revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    revealItems.forEach((el) => revealObserver.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------------------------------------------------------------- preloader */
  const preloader = document.getElementById("preloader");
  const loadCount = document.getElementById("load-count");
  const loadBar = document.getElementById("load-bar");

  const finishLoading = () => {
    if (loadFinished) return;
    loadFinished = true;

    if (loadCount) loadCount.textContent = "100";
    if (loadBar) loadBar.style.transform = "scaleX(1)";

    html.classList.add("is-ready");
    preloader?.classList.add("is-done");
    body.classList.remove("is-locked");

    try {
      lenis?.start();
    } catch (_) {
      /* noop */
    }

    window.setTimeout(() => preloader?.remove(), 1100);
  };

  if (preloader && !reduceMotion) {
    body.classList.add("is-locked");
    const startedAt = performance.now();
    const duration = 1450;

    const countUp = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (loadCount) loadCount.textContent = String(Math.round(eased * 100)).padStart(2, "0");
      if (loadBar) loadBar.style.transform = `scaleX(${eased})`;

      if (progress < 1) {
        requestAnimationFrame(countUp);
      } else {
        window.setTimeout(finishLoading, 120);
      }
    };

    requestAnimationFrame(countUp);
  } else {
    finishLoading();
  }

  /* ---------------------------------------------------------------- smooth scroll */
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.7,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    if (!loadFinished) lenis.stop();
  }

  /* ---------------------------------------------------------------- mobile menu */
  const menuBtn = document.getElementById("menu-btn");
  const menu = document.getElementById("mobile-menu");
  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    html.classList.toggle("menu-open", open);
    menu?.classList.toggle("is-open", open);
    menu?.setAttribute("aria-hidden", String(!open));
    if (menu) menu.inert = !open;
    menuBtn?.setAttribute("aria-expanded", String(open));
    menuBtn?.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");

    if (lenis) {
      if (open) {
        lenis.stop();
      } else if (!body.classList.contains("is-locked")) {
        lenis.start();
      }
    }
  }

  function closeMenu() {
    if (menuOpen) setMenu(false);
  }

  if (menu) menu.inert = true;

  menuBtn?.addEventListener("click", () => setMenu(!menuOpen));
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuOpen) {
      closeMenu();
      menuBtn?.focus();
    }
  });

  /* ---------------------------------------------------------------- anchor scroll */
  const scrollToTarget = (target) => {
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.5 });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      closeMenu();
      window.setTimeout(() => scrollToTarget(target), 20);

      try {
        history.replaceState(null, "", href);
      } catch (_) {
        /* noop */
      }
    });
  });

  /* ---------------------------------------------------------------- custom cursor */
  const cursor = document.getElementById("cursor");
  const cursorRing = cursor?.querySelector(".cursor__ring");
  const cursorLabel = document.getElementById("cursor-label");

  if (cursor && cursorRing && finePointer && !reduceMotion) {
    html.classList.add("has-cursor");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener(
      "mousemove",
      (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      },
      { passive: true }
    );

    const cursorLoop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.transform = `translate3d(${ringX - mouseX}px, ${ringY - mouseY}px, 0)`;
      requestAnimationFrame(cursorLoop);
    };
    requestAnimationFrame(cursorLoop);

    const setCursorState = (el) => {
      if (!el) return;
      const isView = el.matches('[data-cursor="view"]');
      cursor.classList.toggle("is-view", isView);
      cursor.classList.toggle("is-hover", !isView);
      if (cursorLabel) cursorLabel.textContent = isView ? "View" : "";
    };

    document.addEventListener("pointerover", (event) => {
      const el = event.target.closest("a, button, [data-cursor]");
      if (el) setCursorState(el);
    });

    document.addEventListener("pointerout", (event) => {
      const el = event.target.closest("a, button, [data-cursor]");
      if (!el) return;
      const next = event.relatedTarget;
      if (next && el.contains(next)) return;
      cursor.classList.remove("is-hover", "is-view");
    });

    document.addEventListener("mouseleave", () => {
      cursor.style.opacity = "0";
    });
    document.addEventListener("mouseenter", () => {
      cursor.style.opacity = "1";
    });
  }

  /* ---------------------------------------------------------------- magnetic buttons */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (event) => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.14;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.22;
        el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      });

      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ---------------------------------------------------------------- portrait tilt */
  const portrait = document.querySelector("[data-tilt]");
  const portraitWrap = portrait?.closest(".hero__visual");

  if (portrait && portraitWrap && finePointer && !reduceMotion) {
    portraitWrap.addEventListener("mousemove", (event) => {
      const rect = portraitWrap.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      portrait.style.transform = `translate3d(0, var(--py, 0px), 0) rotateX(${(-py * 3.2).toFixed(
        2
      )}deg) rotateY(${(px * 4).toFixed(2)}deg)`;
    });

    portraitWrap.addEventListener("mouseleave", () => {
      portrait.style.transform = "";
    });
  }

  /* ---------------------------------------------------------------- project image preview */
  const preview = document.getElementById("project-preview");
  const previewImage = preview?.querySelector("img");
  const previewTag = document.getElementById("project-preview-tag");
  const projectList = document.getElementById("project-list");

  if (preview && previewImage && projectList && finePointer && !reduceMotion) {
    let targetX = -600;
    let targetY = -600;
    let currentX = -600;
    let currentY = -600;
    let rotation = 0;
    let primed = false;

    const onMove = (event) => {
      const width = preview.offsetWidth || 300;
      const height = preview.offsetHeight || 200;
      targetX = Math.min(event.clientX + 28, window.innerWidth - width - 20);
      targetY = Math.min(Math.max(event.clientY - height / 2, 16), window.innerHeight - height - 16);

      if (!primed) {
        currentX = targetX;
        currentY = targetY;
        primed = true;
      }
    };

    projectList.addEventListener("mousemove", onMove, { passive: true });

    projectList.addEventListener("mouseleave", () => {
      preview.classList.remove("is-active");
      primed = false;
    });

    projectList.querySelectorAll(".project-row").forEach((row) => {
      row.addEventListener("mouseenter", () => {
        const src = row.getAttribute("data-preview");
        if (!src) return;

        previewImage.src = src;
        if (previewTag) previewTag.textContent = row.getAttribute("data-preview-tag") || "";
        preview.classList.add("is-active");
      });
    });

    const previewLoop = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;
      rotation += (Math.max(-7, Math.min(7, (targetX - currentX) * 0.1)) - rotation) * 0.1;

      preview.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(
        2
      )}px, 0) rotate(${rotation.toFixed(2)}deg)`;

      requestAnimationFrame(previewLoop);
    };
    requestAnimationFrame(previewLoop);
  }

  /* ---------------------------------------------------------------- scroll ui + parallax */
  const header = document.getElementById("site-header");
  const progressBar = document.getElementById("progress-bar");
  const heroVisual = document.querySelector(".hero__visual");
  const heroTitle = document.querySelector(".hero__title");
  let ticking = false;

  const updateScrollUI = () => {
    const y = window.scrollY || window.pageYOffset || 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    if (progressBar) {
      progressBar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }

    header?.classList.toggle("is-scrolled", y > 20);

    if (!reduceMotion) {
      if (heroVisual && y < window.innerHeight * 1.3) {
        heroVisual.style.setProperty("--py", `${(y * 0.075).toFixed(2)}px`);
      }
      if (heroTitle && y < window.innerHeight) {
        heroTitle.style.transform = `translate3d(0, ${(y * 0.05).toFixed(2)}px, 0)`;
      }
    }

    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrollUI);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  updateScrollUI();

  /* ---------------------------------------------------------------- active nav link */
  const navLinks = Array.from(document.querySelectorAll("[data-nav]"));
  const navSections = navLinks
    .map((link) => document.getElementById(link.dataset.nav))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navSections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            const isActive = link.dataset.nav === entry.target.id;
            link.classList.toggle("is-active", isActive);
            if (isActive) {
              link.setAttribute("aria-current", "page");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );

    navSections.forEach((section) => navObserver.observe(section));
  }

  /* ---------------------------------------------------------------- contact spotlight */
  const contactPanel = document.querySelector(".contact-panel");

  if (contactPanel && finePointer && !reduceMotion) {
    contactPanel.addEventListener(
      "pointermove",
      (event) => {
        const rect = contactPanel.getBoundingClientRect();
        contactPanel.style.setProperty("--mx", `${(event.clientX - rect.left).toFixed(0)}px`);
        contactPanel.style.setProperty("--my", `${(event.clientY - rect.top).toFixed(0)}px`);
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------------- local clock */
  const clock = document.getElementById("clock");

  if (clock) {
    let formatter;
    try {
      formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (_) {
      formatter = null;
    }

    const tickClock = () => {
      clock.textContent = `${formatter ? formatter.format(new Date()) : "--:--"} WIB`;
    };

    tickClock();
    window.setInterval(tickClock, 20000);
  }
})();
