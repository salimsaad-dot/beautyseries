// Beauty Series · Redco, Madina
const WHATSAPP_NUMBER = "233598002756"; // international format, no "+" or leading 0
const TIMEZONE = "Africa/Accra";

// Opening hours by day (0 = Sunday ... 6 = Saturday). null = closed. Hours in 24h.
// If these change, also update the #week table and the JSON-LD in index.html.
const HOURS = {
  0: [13, 18], // Sunday 1pm - 6pm
  1: [8, 19],  // Monday - Saturday 8am - 7pm
  2: [8, 19],
  3: [8, 19],
  4: [8, 19],
  5: [8, 19],
  6: [8, 19],
};
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Treatments per service (keep in sync with the menu in index.html)
const TREATMENTS = {
  "Hair care": ["Hair braiding", "Wig installation", "Wig revamping", "Blend or braided wig", "Hair treatment"],
  "Nails": ["Regular nails", "Acrylic nails", "Gel X / builder gel", "Pedicure & manicure"],
  "Brows": ["Microblading", "Ombré brows"],
  "Lashes": ["Classic lashes", "Hybrid lashes", "Volume lashes"],
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const fmtHour = (h) => {
  const suffix = h >= 12 ? "pm" : "am";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${suffix}`;
};

// Current day + time in Ghana, whatever the visitor's own timezone is
function nowInGhana() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE, weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
}

const openWhatsApp = (text) =>
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");

// Photos fade in once downloaded. Already-cached ones show at once (no fade).
document.querySelectorAll(".fade-img").forEach((img) => {
  const show = () => img.classList.add("loaded");
  if (img.complete) {
    img.style.transition = "none";
    show();
    requestAnimationFrame(() => requestAnimationFrame(() => (img.style.transition = "")));
  } else {
    img.addEventListener("load", show, { once: true });
    img.addEventListener("error", show, { once: true });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  /* ---------- Header + mobile menu ---------- */
  const header = document.getElementById("header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  const setMenu = (open) => {
    body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  burger.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal, [data-inview]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Live "Open now" status + today's row ---------- */
  const status = document.getElementById("status");
  const statusText = document.getElementById("statusText");

  function updateStatus() {
    const { day, minutes } = nowInGhana();
    const today = HOURS[day];

    document.querySelectorAll("#week tr").forEach((tr) => tr.classList.toggle("today", Number(tr.dataset.day) === day));

    if (today && minutes >= today[0] * 60 && minutes < today[1] * 60) {
      status.className = "status open";
      statusText.textContent = `Open now · closes ${fmtHour(today[1])}`;
      return;
    }

    let label = "";
    if (today && minutes < today[0] * 60) {
      label = `opens today at ${fmtHour(today[0])}`;
    } else {
      for (let i = 1; i <= 7; i++) {
        const d = (day + i) % 7;
        if (HOURS[d]) {
          label = `opens ${i === 1 ? "tomorrow" : DAY_NAMES[d]} at ${fmtHour(HOURS[d][0])}`;
          break;
        }
      }
    }
    status.className = "status closed";
    statusText.textContent = `Closed now · ${label}`;
  }
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* ---------- Shop: bag → one WhatsApp order ---------- */
  const bag = new Map(); // product name → quantity
  const bagBar = document.getElementById("bag");
  const bagCount = document.getElementById("bagCount");

  function renderBuy(li) {
    const name = li.dataset.product;
    const qty = bag.get(name) || 0;
    const buy = li.querySelector(".buy");
    li.classList.toggle("in-bag", qty > 0);

    if (qty === 0) {
      buy.innerHTML = `<button type="button" class="add">Add to bag</button>`;
      buy.querySelector(".add").setAttribute("aria-label", `Add ${name} to bag`);
      return;
    }
    let out = buy.querySelector("output");
    if (!out) {
      buy.innerHTML = `<div class="qty"><button type="button" class="minus" aria-label="One less ${name}">−</button><span><output aria-live="polite"></output><span class="qty-label"> in bag</span></span><button type="button" class="plus" aria-label="One more ${name}">+</button></div>`;
      out = buy.querySelector("output");
    }
    out.textContent = qty;
  }

  function renderBag() {
    const total = [...bag.values()].reduce((a, b) => a + b, 0);
    const wasOpen = bagBar.classList.contains("is-open");
    bagCount.textContent = `${total} item${total === 1 ? "" : "s"} in your bag`;
    bagBar.classList.toggle("is-open", total > 0);
    bagBar.inert = total === 0;
    bagBar.setAttribute("aria-hidden", String(total === 0));
    body.classList.toggle("bag-open", total > 0);
    body.style.setProperty("--bag-h", `${bagBar.offsetHeight}px`);
    // Small nudge on the count when it changes while the bar is already up
    if (wasOpen && total > 0 && !reduceMotion.matches) {
      bagCount.animate([{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], { duration: 200, easing: "ease-out" });
    }
  }

  document.getElementById("products").addEventListener("click", (e) => {
    const li = e.target.closest(".product");
    if (!li) return;
    const name = li.dataset.product;
    const qty = bag.get(name) || 0;
    let next = qty;
    if (e.target.closest(".add, .plus")) next = Math.min(qty + 1, 20);
    else if (e.target.closest(".minus")) next = qty - 1;
    else return;

    if (next > 0) bag.set(name, next); else bag.delete(name);
    renderBuy(li);
    renderBag();
    // Keep keyboard focus sensible when the button is swapped for the stepper (and back)
    if (qty === 0 && next === 1) li.querySelector(".plus").focus();
    if (next === 0) li.querySelector(".add").focus();
  });

  document.getElementById("bagClear").addEventListener("click", () => {
    bag.clear();
    document.querySelectorAll(".product").forEach(renderBuy);
    renderBag();
  });

  document.getElementById("bagSend").addEventListener("click", () => {
    const lines = ["Hello Beauty Series! I'd like to order:", ""];
    bag.forEach((qty, name) => lines.push(`• ${qty} × ${name}`));
    lines.push("", "Please let me know the total and how I can pick up or get it delivered. Thank you!");
    openWhatsApp(lines.join("\n"));
  });

  document.querySelectorAll(".product").forEach((li) => {
    li.querySelector(".add").setAttribute("aria-label", `Add ${li.dataset.product} to bag`);
  });

  /* ---------- Booking form → WhatsApp ---------- */
  const form = document.getElementById("bookForm");
  const cat = document.getElementById("cat");
  const treat = document.getElementById("treat");
  const dateInput = document.getElementById("date");
  const timeSel = document.getElementById("time");
  const hairField = document.getElementById("hairField");
  const err = document.getElementById("err");

  const todayGh = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date()); // YYYY-MM-DD
  dateInput.min = todayGh;

  function fillTreatments() {
    const list = TREATMENTS[cat.value];
    treat.innerHTML = "";
    if (!list) {
      treat.disabled = true;
      treat.append(new Option("Pick a service first", ""));
    } else {
      treat.disabled = false;
      treat.append(new Option("Choose…", ""));
      list.forEach((t) => treat.append(new Option(t, t)));
    }
    toggleHair();
  }

  // "Braiding hair" question only matters for Hair braiding
  const hairShown = () => hairField.classList.contains("is-open");
  function toggleHair() {
    const show = treat.value === "Hair braiding";
    hairField.classList.toggle("is-open", show);
    hairField.inert = !show;
    hairField.setAttribute("aria-hidden", String(!show));
  }

  cat.addEventListener("change", fillTreatments);
  treat.addEventListener("change", toggleHair);

  // Menu rows pre-fill the form, and the filled fields glow once when the form comes into view
  let glowPending = false;
  const glow = () => {
    glowPending = false;
    [cat, treat].forEach((el) => {
      el.classList.remove("prefilled");
      void el.offsetWidth; // restart the animation if it ran before
      el.classList.add("prefilled");
    });
  };
  const formInView = () => {
    const r = form.getBoundingClientRect();
    return r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.3;
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { if (en.isIntersecting && glowPending) glow(); }, { threshold: 0.4 }).observe(form);
  }
  document.querySelectorAll("[data-cat]").forEach((a) =>
    a.addEventListener("click", () => {
      cat.value = a.dataset.cat;
      fillTreatments();
      treat.value = a.dataset.treat;
      toggleHair();
      cat.classList.remove("invalid");
      treat.classList.remove("invalid");
      if (formInView()) glow(); else glowPending = true;
    })
  );

  // Build time slots for the chosen day
  dateInput.addEventListener("change", () => {
    const keep = timeSel.value; // Safari can fire "change" again on blur, so keep a still-valid time
    err.textContent = "";
    dateInput.classList.remove("invalid");
    timeSel.innerHTML = "";

    if (!dateInput.value) {
      timeSel.disabled = true;
      timeSel.append(new Option("Pick a day first", ""));
      return;
    }

    const day = new Date(dateInput.value + "T12:00").getDay();
    const hrs = HOURS[day];
    if (!hrs) {
      timeSel.disabled = true;
      timeSel.append(new Option("Closed that day", ""));
      dateInput.classList.add("invalid");
      err.textContent = `Sorry, we're closed on ${DAY_NAMES[day]}s. Please pick another day.`;
      return;
    }

    const { minutes } = nowInGhana();
    const isToday = dateInput.value === todayGh;

    timeSel.append(new Option("Choose a time…", ""));
    let any = false;
    for (let h = hrs[0]; h < hrs[1]; h++) {
      if (isToday && h * 60 <= minutes) continue;
      timeSel.append(new Option(fmtHour(h), fmtHour(h)));
      any = true;
    }
    timeSel.disabled = !any;
    if (keep && [...timeSel.options].some((o) => o.value === keep)) timeSel.value = keep;
    if (!any) {
      timeSel.innerHTML = "";
      timeSel.append(new Option("No more slots today", ""));
      err.textContent = "No slots left today. Please choose another day.";
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    err.textContent = "";
    form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));

    const name = document.getElementById("name");
    const missing = [cat, treat, dateInput, timeSel, name].filter((el) => !el.value.trim());
    if (missing.length) {
      missing.forEach((el) => el.classList.add("invalid"));
      const first = missing[0];
      (first === treat && treat.disabled ? cat : first === timeSel && timeSel.disabled ? dateInput : first).focus();
      err.textContent = "Please fill in the highlighted fields.";
      return;
    }

    const d = new Date(dateInput.value + "T12:00");
    const niceDate = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const notes = document.getElementById("notes").value.trim();

    const lines = [
      "Hello Beauty Series! I'd like to book an appointment.",
      "",
      `*Service:* ${treat.value} (${cat.value})`,
      `*Day:* ${niceDate}`,
      `*Time:* ${timeSel.value}`,
    ];
    if (hairShown()) lines.push(`*Hair:* ${form.hair.value}`);
    lines.push(`*Name:* ${name.value.trim()}`);
    if (notes) lines.push(`*Notes:* ${notes}`);

    openWhatsApp(lines.join("\n"));
  });

  document.getElementById("year").textContent = new Date().getFullYear();
});
