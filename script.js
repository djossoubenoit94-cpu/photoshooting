const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function setTheme(next) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    // ignore
  }
}

function getPreferredTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore
  }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function initTheme() {
  setTheme(getPreferredTheme());
  const btn = $("#themeBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(cur === "light" ? "dark" : "light");
  });
}

function initNav() {
  const toggle = $(".nav__toggle");
  const links = $("#nav-links");
  if (!toggle || !links) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    links.classList.toggle("is-open", open);
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    setOpen(!open);
  });

  $$(".nav__link", links).forEach((a) => {
    a.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("click", (e) => {
    if (!links.classList.contains("is-open")) return;
    const t = e.target;
    if (t instanceof Element && (links.contains(t) || toggle.contains(t))) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

function initYear() {
  const el = $("#year");
  if (el) el.textContent = String(new Date().getFullYear());
}

function initReveal() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = $$("[data-reveal]");
  if (items.length === 0) return;

  items.forEach((el) => {
    const delay = el.getAttribute("data-delay");
    if (delay) el.style.setProperty("--delay", `${Number(delay)}ms`);
  });

  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.18 }
  );

  items.forEach((el) => io.observe(el));
}

function initScrollProgressAndActiveNav() {
  const progress = $("#scrollProgress");
  const toTop = $("#toTop");
  const links = $$(".nav__link");
  const sections = ["home", "about", "skills", "experience", "projects", "education", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const byId = new Map(links.map((a) => [a.getAttribute("href")?.slice(1), a]));

  const update = () => {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const max = (doc.scrollHeight || 1) - window.innerHeight;
    const pct = max <= 0 ? 0 : (scrollTop / max) * 100;
    if (progress) progress.style.width = `${clamp(pct, 0, 100)}%`;
    if (toTop) toTop.classList.toggle("is-visible", scrollTop > 700);

    // Active section (pick the last section whose top is above a threshold)
    const threshold = 120;
    let activeId = "home";
    for (const s of sections) {
      const rect = s.getBoundingClientRect();
      if (rect.top - threshold <= 0) activeId = s.id;
    }
    for (const [id, a] of byId.entries()) {
      if (!a) continue;
      a.classList.toggle("is-active", id === activeId);
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  if (toTop) {
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
}

function initCountUp() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = $$(".countup[data-count]");
  if (els.length === 0) return;

  const run = (el) => {
    const target = Number(el.getAttribute("data-count") || "0");
    if (!Number.isFinite(target)) return;
    if (reduce) {
      el.textContent = String(target);
      return;
    }

    const duration = 900;
    const start = performance.now();
    const from = 0;
    const step = (t) => {
      const p = clamp((t - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (target - from) * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!("IntersectionObserver" in window)) {
    els.forEach(run);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          run(e.target);
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.35 }
  );
  els.forEach((el) => io.observe(el));
}

function initSkillBars() {
  const skills = $$(".skill[data-skill]");
  if (skills.length === 0) return;

  const fill = (el) => {
    const pct = Number(el.getAttribute("data-skill") || "0");
    el.style.setProperty("--pct", String(clamp(pct, 0, 100)));
    el.classList.add("is-filled");
  };

  if (!("IntersectionObserver" in window)) {
    skills.forEach(fill);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          fill(e.target);
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.35 }
  );

  skills.forEach((el) => io.observe(el));
}

function initContactFormMailto() {
  const form = $("#contactForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const subject = encodeURIComponent(`CV contact from ${name || "someone"}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}\n`);

    // Replace with your real email
    const to = "you@email.com";
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  });
}

initTheme();
initNav();
initYear();
initReveal();
initScrollProgressAndActiveNav();
initCountUp();
initSkillBars();
initContactFormMailto();

