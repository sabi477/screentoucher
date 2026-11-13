(() => {
  "use strict";

  /* Yıl */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* Görünme animasyonu */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* Logolar: ızgara / liste geçişi */
  const toggle = document.querySelector("[data-view-toggle]");
  if (toggle) {
    const views = {
      grid: document.querySelector("[data-view='grid']"),
      list: document.querySelector("[data-view='list']"),
    };
    const set = (name) => {
      toggle.querySelectorAll("button").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.target === name));
      });
      Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));
      try { localStorage.setItem("st-view", name); } catch (_) {}
    };
    toggle.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-target]");
      if (b) set(b.dataset.target);
    });
    let saved = null;
    try { saved = localStorage.getItem("st-view"); } catch (_) {}
    if (saved && views[saved]) set(saved);
  }

  /* Vitrin: sol sütundaki marka adı ekranın ortasındaki karta göre değişir */
  const curName = document.querySelector("[data-current-name]");
  if (curName) {
    const curSector = document.querySelector("[data-current-sector]");
    const curIndex = document.querySelector("[data-current-index]");
    const curTotal = document.querySelector("[data-current-total]");
    const setCurrent = (el, total) => {
      if (curName.textContent === el.dataset.name && curIndex.textContent === el.dataset.index) return;
      curName.textContent = el.dataset.name;
      curSector.textContent = el.dataset.sector;
      curIndex.textContent = el.dataset.index;
      if (total) curTotal.textContent = total;
      curName.classList.remove("is-swap");
      void curName.offsetWidth;
      curName.classList.add("is-swap");
    };
    const cards = document.querySelectorAll(".show-card");
    const cardTotal = String(cards.length).padStart(2, "0");
    if ("IntersectionObserver" in window) {
      const watch = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && setCurrent(e.target, cardTotal)),
        { rootMargin: "-50% 0px -50% 0px" }
      );
      cards.forEach((c) => watch.observe(c));
    }
    const rows = document.querySelectorAll(".logo-row");
    const rowTotal = String(rows.length).padStart(2, "0");
    rows.forEach((r) => r.addEventListener("mouseenter", () => setCurrent(r, rowTotal)));
  }

  /* Liste satırı üzerinde logo önizleme */
  const preview = document.querySelector(".preview");
  if (preview && window.matchMedia("(hover: hover)").matches) {
    const img = preview.querySelector("img");
    let x = 0, y = 0, raf = 0;
    const move = () => {
      preview.style.transform = `translate3d(${x + 48}px, ${y - 120}px, 0)`;
      raf = 0;
    };
    document.querySelectorAll("[data-preview]").forEach((row) => {
      row.addEventListener("mouseenter", () => {
        img.src = row.dataset.preview;
        preview.classList.add("is-on");
      });
      row.addEventListener("mouseleave", () => preview.classList.remove("is-on"));
      row.addEventListener("mousemove", (e) => {
        x = e.clientX; y = e.clientY;
        if (!raf) raf = requestAnimationFrame(move);
      });
    });
  }

  /* Navbar → turuncu iletişim kartı
     Navbar yerinden hiç oynamaz. Sayfanın sonuna doğru kaydırdıkça olduğu yerde
     aşağı doğru uzar ve genişler, rengi turuncuya döner ve iletişim kartına dönüşür.
     .contact kutusu sayfada yalnızca yer tutucu olarak kalır; içeriği büyüyen kutuya taşınır. */
  const nav = document.querySelector(".nav");
  const card = document.querySelector(".contact");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (nav && card && !calm.matches) {
    document.documentElement.classList.add("has-morph");

    const shell = document.createElement("div");
    shell.className = "morph";
    const bar = document.createElement("div");
    bar.className = "morph__bar";
    bar.innerHTML = nav.innerHTML;
    const content = document.createElement("div");
    content.className = "morph__content";
    card.querySelectorAll(".contact__body, .contact__note").forEach((el) => content.appendChild(el));
    card.querySelector(".contact__bar")?.remove();
    shell.append(bar, content);
    document.body.appendChild(shell);

    const footer = document.querySelector(".footer");
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const FROM = [30, 30, 28, 0.8];   /* navbar zemini */
    const TO = [230, 95, 43, 1];      /* --orange */

    let geo = null;        /* ölçüler: navbar ve kartın son hali */
    let target = 0;        /* kaydırmadan gelen ilerleme */
    let current = 0;       /* yumuşatılmış ilerleme */
    let raf = 0;
    let rafAt = 0;

    const measure = () => {
      if (footer) footer.style.minHeight = "";
      const n = nav.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      const cardDocTop = c.top + window.scrollY;
      /* Sayfa sonunda kart tam navbar hizasına gelsin diye footer'ı gerektiği kadar uzat */
      if (footer) {
        const after = document.documentElement.scrollHeight - cardDocTop;
        const need = window.innerHeight - n.top - after;
        if (need > 0) footer.style.minHeight = `${footer.offsetHeight + need}px`;
      }
      geo = {
        top: n.top, navW: n.width, navH: n.height, navCx: n.left + n.width / 2,
        cardW: c.width, cardH: c.height, cardCx: c.left + c.width / 2,
        start: cardDocTop - window.innerHeight,          /* kart ekranın altına girdiğinde */
        end: cardDocTop - n.top,                          /* kart navbar hizasına geldiğinde */
      };
      content.style.width = `${geo.cardW}px`;
      content.style.height = `${geo.cardH - geo.navH}px`;
    };

    const paint = (p) => {
      const e = ease(p);
      const w = lerp(geo.navW, geo.cardW, e);
      const h = lerp(geo.navH, geo.cardH, e);
      const cx = lerp(geo.navCx, geo.cardCx, e);
      const k = clamp(p * 1.5);
      const rgba = FROM.map((v, i) => (i < 3 ? Math.round(lerp(v, TO[i], k)) : +lerp(v, TO[i], k).toFixed(3)));
      shell.style.transform = `translate3d(${cx - w / 2}px, ${geo.top}px, 0)`;
      shell.style.width = `${w}px`;
      shell.style.height = `${h}px`;
      shell.style.backgroundColor = `rgba(${rgba.join(",")})`;
      shell.style.borderRadius = `${lerp(14, 16, e)}px`;
      shell.style.setProperty("--content", clamp((p - 0.6) / 0.4).toFixed(3));
      shell.classList.toggle("is-on", p > 0.001);
      shell.classList.toggle("is-warm", p > 0.35);
      shell.classList.toggle("is-open", p > 0.85);
      nav.classList.toggle("is-morphing", p > 0.001);
    };

    /* Yay (spring): hedefe hafifçe esneyerek oturur — mıknatıs hissi */
    let vel = 0;
    const loop = () => {
      vel = (vel + (target - current) * 0.14) * 0.74;
      current += vel;
      const done = Math.abs(target - current) < 0.0006 && Math.abs(vel) < 0.0006;
      if (done) { current = target; vel = 0; }
      paint(Math.max(0, current));
      raf = done ? 0 : requestAnimationFrame(loop);
      rafAt = performance.now();
    };
    const kick = () => {
      /* Arka plandaki sekmede kare gelmezse döngü takılı kalmasın */
      if (raf && performance.now() - rafAt > 250) { cancelAnimationFrame(raf); raf = 0; }
      if (!raf) { raf = requestAnimationFrame(loop); rafAt = performance.now(); }
    };

    /* Mıknatıs: kaydırma durduğunda kart yarı açık kaldıysa sayfayı yumuşakça
       kartın tam açık olduğu noktaya çeker. Kullanıcı tekrar kaydırırsa bırakır. */
    let idle = 0;
    let snapping = false;
    const progressAt = (y) => clamp((y - geo.start) / (geo.end - geo.start));
    let lastY = window.scrollY;
    let dir = 1;   /* 1: aşağı, -1: yukarı */
    const snap = () => {
      const p = progressAt(window.scrollY);
      if (p <= 0.015 || p >= 0.985) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      /* Aşağı inerken açığa, yukarı çıkarken kapalıya çeker; çok az açıldıysa kapalıya */
      const toOpen = dir > 0 ? p > 0.12 : p > 0.88;
      snapping = true;
      window.scrollTo({ top: toOpen ? Math.min(geo.end, maxScroll) : geo.start, behavior: "smooth" });
    };
    const release = () => { snapping = false; };
    ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, release, { passive: true }));

    /* "#iletisim" bağlantıları kartın tam açık olduğu noktaya götürür */
    document.querySelectorAll('a[href="#iletisim"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        snapping = true;
        window.scrollTo({ top: Math.min(geo.end, maxScroll), behavior: "smooth" });
        history.replaceState(null, "", "#iletisim");
      });
    });

    const update = () => {
      const y = window.scrollY;
      if (y !== lastY && !snapping) dir = y > lastY ? 1 : -1;
      lastY = y;
      target = progressAt(y);
      kick();
      clearTimeout(idle);
      if (!snapping) idle = setTimeout(snap, 180);
      else if (target >= 0.985 || target <= 0.015) snapping = false;
    };

    measure();
    target = current = clamp((window.scrollY - geo.start) / (geo.end - geo.start));
    paint(current);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", () => { measure(); update(); });
    window.addEventListener("load", () => { measure(); update(); });
  }

  /* Formlar
     Formspree form adresini aşağıya yapıştır (örn. "https://formspree.io/f/abcdwxyz").
     Boş kaldığı sürece formlar yalnızca teşekkür durumunu gösterir, hiçbir yere göndermez.
     Bir forma ayrıca data-endpoint verilirse o forma özel adres kullanılır. */
  const FORM_ENDPOINT = "";

  document.querySelectorAll("form[data-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector("[type=submit]");
      const endpoint = form.dataset.endpoint || FORM_ENDPOINT;
      btn.disabled = true;
      try {
        if (endpoint) {
          const res = await fetch(endpoint, {
            method: "POST",
            body: new FormData(form),
            headers: { Accept: "application/json" },
          });
          if (!res.ok) throw new Error(res.status);
        }
        const ok = form.parentElement.querySelector(".form__success, .contact__success");
        form.hidden = true;
        if (ok) ok.hidden = false;
      } catch (_) {
        btn.disabled = false;
        btn.textContent = "Tekrar dene";
      }
    });
  });
})();
