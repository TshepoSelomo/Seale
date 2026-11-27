(function () {
  "use strict";

  const { CATALOG, AREAS, SALONS } = window.SEALE_DATA;
  const USERS_KEY = "seale.users";
  const BOOKINGS_KEY = "seale.bookings";
  const SESSION_KEY = "seale.session";
  const UI_KEY = "seale.ui";
  const CATEGORIES = ["All", "Hair", "Braids", "Barber", "Nails", "Spa"];
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const state = {
    authMode: "login",
    authError: "",
    draft: { name: "", email: "", password: "" },
    didFocusAuth: false,
    user: null,
    view: "discover",
    location: { id: "rosebank", label: "Rosebank", lat: -26.1459, lng: 28.0436, source: "area" },
    query: "",
    category: "All",
    sort: "distance",
    compareIds: [],
    compareServiceId: "womens-cut",
    compareSort: "price",
    compareOnly: false,
    salonId: null,
    serviceId: null,
    stylistId: "",
    date: null,
    slot: null,
    note: "",
    cancelId: null,
    highlightBookingId: null,
    userMenu: false,
    forceTop: false,
    scrollTo: null,
    geoStatus: "",
    saving: false
  };

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
  }

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function refCode(id) {
    return `SE-${hashString(id).toString(36).toUpperCase().padStart(4, "0").slice(-4)}`;
  }

  function money(amount) {
    return `R${Number(amount).toLocaleString("en-ZA")}`;
  }

  function formatDuration(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h} hr ${m} min`;
    if (h) return h === 1 ? "1 hr" : `${h} hr`;
    return `${m} min`;
  }

  function formatKm(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(km < 10 ? 1 : 0)} km`;
  }

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseISODate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function timeToMinutes(time) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function distanceKm(a, b) {
    const earth = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function initials(name) {
    const skip = new Set(["the", "and", "&"]);
    const words = String(name).split(/\s+/).filter((word) => word && !skip.has(word.toLowerCase()) && /[A-Za-z]/.test(word[0]));
    const letters = words.slice(0, 2).map((word) => word[0].toUpperCase()).join("");
    return letters || String(name).slice(0, 1).toUpperCase();
  }

  function firstName(name) {
    return String(name).split(" ")[0];
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadUsers() { return readJson(USERS_KEY, []); }
  function saveUsers(users) { return writeJson(USERS_KEY, users); }
  function loadBookings() { return readJson(BOOKINGS_KEY, []); }
  function saveBookings(bookings) { return writeJson(BOOKINGS_KEY, bookings); }

  function publicUser(user) {
    return { id: user.id, name: user.name, email: user.email };
  }

  function getSalon(id) {
    return SALONS.find((salon) => salon.id === id) || null;
  }

  function offeredServices(salon) {
    return CATALOG.filter((service) => salon.prices[service.id] != null).map((service) => ({
      ...service,
      price: salon.prices[service.id]
    }));
  }

  function stylistsFor(salon, service) {
    return salon.stylists.filter((stylist) => stylist.categories.includes(service.category));
  }

  function assertCoverage() {
    SALONS.forEach((salon) => {
      offeredServices(salon).forEach((service) => {
        if (!stylistsFor(salon, service).length) {
          throw new Error(`${salon.name} has no stylist for ${service.name}`);
        }
      });
    });
  }

  function ensureSeed() {
    const users = loadUsers();
    if (!users.some((user) => user.email === "amara@seale.app")) {
      users.push({
        id: "user-amara",
        name: "Amara Khumalo",
        email: "amara@seale.app",
        password: "seale123"
      });
      saveUsers(users);
    }
  }

  function futureOpenDate(salon, openIndex) {
    const cursor = new Date();
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(12, 0, 0, 0);
    let found = 0;
    for (let i = 0; i < 28; i += 1) {
      if (!salon.closedDays.includes(cursor.getDay())) {
        found += 1;
        if (found === openIndex) return toISODate(cursor);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return toISODate(cursor);
  }

  function ensureSampleBooking() {
    const bookings = loadBookings();
    if (bookings.some((booking) => booking.id === "bk-sample")) return;
    const salon = getSalon("knot");
    if (!salon) return;
    const service = offeredServices(salon).find((item) => item.id === "knotless");
    const stylist = salon.stylists.find((item) => item.id === "knot-thandiwe");
    if (!service || !stylist) return;
    bookings.push({
      id: "bk-sample",
      ref: "SE-KNOT",
      userId: "user-amara",
      salonId: salon.id,
      salonName: salon.name,
      suburb: salon.suburb,
      serviceId: service.id,
      serviceName: service.name,
      stylistId: stylist.id,
      stylistName: stylist.name,
      date: futureOpenDate(salon, 2),
      time: "10:00",
      duration: service.duration,
      price: service.price,
      note: "Keep the parts neat, please.",
      status: "confirmed",
      createdAt: new Date().toISOString()
    });
    saveBookings(bookings);
  }

  function restoreSession() {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return;
    const user = loadUsers().find((item) => item.id === id);
    if (user) state.user = publicUser(user);
  }

  function restoreUi() {
    try {
      const raw = sessionStorage.getItem(UI_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.location && typeof saved.location.lat === "number" && typeof saved.location.lng === "number") {
        state.location = saved.location;
      }
      if (Array.isArray(saved.compareIds)) {
        state.compareIds = saved.compareIds.filter((id) => SALONS.some((salon) => salon.id === id)).slice(0, 4);
      }
      if (typeof saved.query === "string") state.query = saved.query;
      if (CATEGORIES.includes(saved.category)) state.category = saved.category;
      if (["distance", "price", "rating"].includes(saved.sort)) state.sort = saved.sort;
      if (CATALOG.some((service) => service.id === saved.compareServiceId)) state.compareServiceId = saved.compareServiceId;
      if (["price", "distance", "earliest"].includes(saved.compareSort)) state.compareSort = saved.compareSort;
      if (typeof saved.compareOnly === "boolean") state.compareOnly = saved.compareOnly;
    } catch (error) {
      /* keep defaults */
    }
  }

  function persistUi() {
    try {
      sessionStorage.setItem(UI_KEY, JSON.stringify({
        location: state.location,
        compareIds: state.compareIds,
        query: state.query,
        category: state.category,
        sort: state.sort,
        compareServiceId: state.compareServiceId,
        compareSort: state.compareSort,
        compareOnly: state.compareOnly
      }));
    } catch (error) {
      /* session storage can be blocked */
    }
  }

  function isPast(date, time) {
    return new Date(`${date}T${time}:00`).getTime() <= Date.now();
  }

  function externalAppointments(salon, stylistId, date) {
    let cursor = hashString(`${salon.id}|${stylistId}|${date}`);
    const windowMins = salon.close * 60 - salon.open * 60;
    const appointments = [];
    for (let i = 0; i < 2; i += 1) {
      cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
      const dur = [60, 90, 120][cursor % 3];
      const steps = Math.floor(Math.max(0, windowMins - dur) / 30);
      cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
      const start = salon.open * 60 + (steps > 0 ? (cursor % (steps + 1)) * 30 : 0);
      appointments.push({ start, end: start + dur });
    }
    return appointments;
  }

  function isFree(salon, stylistId, date, time, duration, bookings) {
    if (isPast(date, time)) return false;
    const start = timeToMinutes(time);
    const end = start + duration;
    const blocked = externalAppointments(salon, stylistId, date).some((appointment) => start < appointment.end && appointment.start < end);
    if (blocked) return false;
    const records = bookings || loadBookings();
    return !records.some((booking) => {
      if (booking.status !== "confirmed" || booking.stylistId !== stylistId || booking.date !== date) return false;
      const bookingStart = timeToMinutes(booking.time);
      return start < bookingStart + booking.duration && bookingStart < end;
    });
  }

  function openSlots(salon, service, date, stylistId) {
    const stylists = stylistsFor(salon, service).filter((stylist) => !stylistId || stylist.id === stylistId);
    if (!stylists.length) return [];
    const bookings = loadBookings();
    const slots = [];
    for (let t = salon.open * 60; t + service.duration <= salon.close * 60; t += 30) {
      const time = minutesToTime(t);
      if (isPast(date, time)) continue;
      const chosen = stylists.find((stylist) => isFree(salon, stylist.id, date, time, service.duration, bookings));
      slots.push({
        time,
        taken: !chosen,
        stylistId: chosen ? chosen.id : "",
        stylistName: chosen ? chosen.name : ""
      });
    }
    return slots;
  }

  function upcomingDates(salon, count) {
    const dates = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    for (let i = 0; dates.length < count && i < 28; i += 1) {
      if (!salon.closedDays.includes(cursor.getDay())) dates.push(toISODate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  function earliestSlot(salon, service) {
    const dates = upcomingDates(salon, 6);
    for (let i = 0; i < dates.length; i += 1) {
      const open = openSlots(salon, service, dates[i], "").find((slot) => !slot.taken);
      if (open) return { date: dates[i], time: open.time, stylistId: open.stylistId };
    }
    return null;
  }

  function formatLongDate(iso) {
    const date = parseISODate(iso);
    const today = toISODate(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const base = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
    if (iso === today) return `Today, ${base}`;
    if (iso === toISODate(tomorrowDate)) return `Tomorrow, ${base}`;
    return base;
  }

  function formatSlotWhen(slot) {
    if (!slot) return "Fully booked this week";
    const date = parseISODate(slot.date);
    const today = toISODate(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    let day = `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
    if (slot.date === today) day = "Today";
    else if (slot.date === toISODate(tomorrowDate)) day = "Tomorrow";
    return `${day} · ${slot.time}`;
  }

  function formatHours(salon) {
    const span = `${String(salon.open).padStart(2, "0")}:00–${String(salon.close).padStart(2, "0")}:00`;
    if (!salon.closedDays.length) return `${span} · 7 days`;
    return `${span} · Closed ${salon.closedDays.map((day) => WEEKDAYS_SHORT[day]).join(", ")}`;
  }

  function isOpenNow(salon) {
    const now = new Date();
    if (salon.closedDays.includes(now.getDay())) return false;
    const mins = now.getHours() * 60 + now.getMinutes();
    return mins >= salon.open * 60 && mins < salon.close * 60;
  }

  function serviceFromQuery(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return null;
    return CATALOG.find((service) => service.name.toLowerCase().includes(q)) || null;
  }

  function matchedService(salon, query) {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return null;
    return offeredServices(salon).find((service) => {
      const hay = `${service.name} ${service.category}`.toLowerCase();
      return tokens.every((token) => hay.includes(token));
    }) || null;
  }

  function minPrice(salon) {
    const prices = Object.values(salon.prices);
    return prices.length ? Math.min(...prices) : Infinity;
  }

  function priceForSort(salon, query) {
    const match = matchedService(salon, query);
    return match ? match.price : minPrice(salon);
  }

  function salonMatches(salon, query, category) {
    const services = offeredServices(salon);
    if (category !== "All" && !services.some((service) => service.category === category)) return false;
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const hay = [
      salon.name,
      salon.suburb,
      salon.address,
      salon.blurb,
      ...salon.stylists.map((stylist) => `${stylist.name} ${stylist.role}`),
      ...services.map((service) => `${service.name} ${service.category}`)
    ].join(" ").toLowerCase();
    return tokens.every((token) => hay.includes(token));
  }

  function visibleSalons() {
    return SALONS.filter((salon) => salonMatches(salon, state.query, state.category));
  }

  function sortSalons(list) {
    const query = state.query;
    return [...list].sort((a, b) => {
      if (state.sort === "rating") {
        return b.rating - a.rating || distanceKm(state.location, a) - distanceKm(state.location, b);
      }
      if (state.sort === "price") {
        return priceForSort(a, query) - priceForSort(b, query) || distanceKm(state.location, a) - distanceKm(state.location, b);
      }
      return distanceKm(state.location, a) - distanceKm(state.location, b);
    });
  }

  function nearestSalon() {
    return [...SALONS].sort((a, b) => distanceKm(state.location, a) - distanceKm(state.location, b))[0];
  }

  function farFromDemo(location) {
    return distanceKm(location, { lat: -26.15, lng: 28.04 }) > 40;
  }

  function bookingStart(booking) {
    return new Date(`${booking.date}T${booking.time}:00`).getTime();
  }

  function isFinished(booking) {
    return bookingStart(booking) + booking.duration * 60000 < Date.now();
  }

  function upcomingCount() {
    if (!state.user) return 0;
    return loadBookings().filter((booking) => booking.userId === state.user.id && booking.status === "confirmed" && !isFinished(booking)).length;
  }

  function showToast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.classList.remove("show"), 3400);
  }

  function currentAttr(isCurrent) {
    return isCurrent ? ' aria-current="page"' : "";
  }

  function renderAuth() {
    const origin = { lat: -26.1459, lng: 28.0436 };
    const nearest = [...SALONS].sort((a, b) => distanceKm(origin, a) - distanceKm(origin, b)).slice(0, 3);
    const isRegister = state.authMode === "register";
    return `
      <main class="auth">
        <div class="auth-layout">
          <section class="auth-panel">
            <p class="logo">Seale</p>
            <h1>${isRegister ? "Create an account" : "Log in"}</h1>
            <p class="quiet">Find a nearby salon, compare prices, and book a time. Accounts stay in this browser.</p>
            ${state.authError ? `<p class="form-error">${esc(state.authError)}</p>` : ""}
            <form id="auth-form" class="auth-form" novalidate>
              ${isRegister ? `
                <label class="field">
                  <span>Name</span>
                  <input name="name" autocomplete="name" value="${esc(state.draft.name)}" required />
                </label>
              ` : ""}
              <label class="field">
                <span>Email</span>
                <input id="email" name="email" type="email" autocomplete="email" spellcheck="false" value="${esc(state.draft.email)}" required />
              </label>
              <label class="field">
                <span>Password</span>
                <input name="password" type="password" autocomplete="${isRegister ? "new-password" : "current-password"}" value="${esc(state.draft.password)}" required />
              </label>
              <button class="btn-primary" type="submit">${isRegister ? "Create account" : "Log in"}</button>
            </form>
            <div class="demo-box">
              <span>Demo</span>
              <code>amara@seale.app</code>
              <code>seale123</code>
              <button type="button" class="btn-secondary" data-action="demo-login">Continue as Amara</button>
            </div>
            <button type="button" class="btn-text" data-action="auth-mode" data-mode="${isRegister ? "login" : "register"}">
              ${isRegister ? "I already have an account" : "Create an account"}
            </button>
          </section>
          <aside class="auth-aside" aria-label="Nearest salons to Rosebank">
            <p class="quiet">Nearest to Rosebank</p>
            ${nearest.map((salon) => `
              <div class="aside-row">
                <span class="swatch-bar" style="background:linear-gradient(180deg, ${salon.tones[0]}, ${salon.tones[1]})"></span>
                <div>
                  <strong>${esc(salon.name)}</strong>
                  <p class="quiet">${esc(salon.suburb)} · ${esc(formatKm(distanceKm(origin, salon)))}</p>
                </div>
                <p class="money">${money(minPrice(salon))}</p>
              </div>
            `).join("")}
          </aside>
        </div>
      </main>
    `;
  }

  function renderShell() {
    const onDiscover = state.view === "discover" || state.view === "salon";
    const count = upcomingCount();
    return `
      <a class="skip" href="#content">Skip to content</a>
      <header class="app-header">
        <div class="wrap header-row">
          <button type="button" class="logo" data-action="goto" data-view="discover">Seale</button>
          <nav class="tabs" aria-label="Primary">
            <button type="button" data-action="goto" data-view="discover"${currentAttr(onDiscover)}>Discover</button>
            <button type="button" data-action="goto" data-view="compare"${currentAttr(state.view === "compare")}>Compare</button>
            <button type="button" data-action="goto" data-view="bookings"${currentAttr(state.view === "bookings")}>Bookings${count ? ` <span class="count">${count}</span>` : ""}</button>
          </nav>
          <div class="user-menu">
            <button type="button" class="user-btn" data-action="toggle-menu" aria-expanded="${state.userMenu ? "true" : "false"}" aria-haspopup="true">
              <span class="avatar">${esc(initials(state.user.name))}</span>
              <span class="user-name">${esc(firstName(state.user.name))}</span>
            </button>
            ${state.userMenu ? `
              <div class="menu">
                <strong>${esc(state.user.name)}</strong>
                <p class="quiet">${esc(state.user.email)}</p>
                <button type="button" class="btn-secondary" data-action="sign-out">Sign out</button>
              </div>
            ` : ""}
          </div>
        </div>
      </header>
      <main id="content" class="wrap page ${state.compareIds.length && state.view === "discover" ? "has-shortlist" : ""}">
        ${renderView()}
        <p class="site-foot">Prices and times are sample data stored in this browser.</p>
      </main>
      ${renderShortlistBar()}
    `;
  }

  function renderView() {
    if (state.view === "salon") return renderSalon();
    if (state.view === "compare") return renderCompare();
    if (state.view === "bookings") return renderBookings();
    return renderDiscover();
  }

  function renderDiscover() {
    const nearest = nearestSalon();
    const salons = sortSalons(visibleSalons());
    const queried = SALONS.filter((salon) => salonMatches(salon, state.query, "All"));
    const place = state.location.label;
    const categoryCount = (category) => (
      category === "All"
        ? queried.length
        : queried.filter((salon) => offeredServices(salon).some((service) => service.category === category)).length
    );
    return `
      <section class="page-head">
        <h1 class="page-title">Salons near ${esc(place)}</h1>
        <p class="quiet" aria-live="polite">${salons.length} ${salons.length === 1 ? "salon" : "salons"} · ${state.sort === "price" ? "lowest price first" : state.sort === "rating" ? "top rated first" : "nearest first"}</p>
      </section>
      <div class="toolbar">
        <label class="search toolbar-field">
          <span>Search</span>
          <input id="search-input" type="search" placeholder="Salon, suburb, or service" value="${esc(state.query)}" autocomplete="off" />
        </label>
        <label class="toolbar-field">
          <span>Area</span>
          <select id="area-select">
            ${state.location.source === "gps" ? `<option value="gps" selected>Your location</option>` : ""}
            ${AREAS.map((area) => `<option value="${esc(area.id)}" ${state.location.id === area.id ? "selected" : ""}>${esc(area.label)}</option>`).join("")}
          </select>
        </label>
        <label class="toolbar-field">
          <span>Service</span>
          <select id="category-select">
            ${CATEGORIES.map((category) => `<option value="${esc(category)}" ${state.category === category ? "selected" : ""}>${esc(category)} (${categoryCount(category)})</option>`).join("")}
          </select>
        </label>
        <label class="toolbar-field">
          <span>Sort</span>
          <select id="sort-select">
            <option value="distance" ${state.sort === "distance" ? "selected" : ""}>Nearest</option>
            <option value="price" ${state.sort === "price" ? "selected" : ""}>Lowest price</option>
            <option value="rating" ${state.sort === "rating" ? "selected" : ""}>Top rated</option>
          </select>
        </label>
        <button type="button" class="btn-secondary" data-action="use-location" ${state.geoStatus === "locating" ? "disabled" : ""}>
          ${state.geoStatus === "locating" ? "Finding you…" : "Use my location"}
        </button>
      </div>
      ${state.query || state.category !== "All" ? `<button type="button" class="btn-text" data-action="clear-filters">Clear search</button>` : ""}
      ${farFromDemo(state.location) ? `<p class="quiet">You are outside these Johannesburg neighbourhoods. Pick an area to browse the map.</p>` : ""}
      ${salons.length ? `
        <div class="discover-grid">
          ${renderMap(nearest)}
          <div class="card-grid">
            ${salons.map((salon) => renderSalonCard(salon, state.sort === "distance" ? salons[0].id : "")).join("")}
          </div>
        </div>
      ` : `
        <div class="empty">
          <h2>No salon matches that search.</h2>
          <p class="quiet">Try a service such as braids, nails, or fade.</p>
          <button type="button" class="btn-secondary" data-action="clear-filters">Clear search</button>
        </div>
      `}
    `;
  }

  function renderMap(nearest) {
    const bounds = {
      minLat: Math.min(...SALONS.map((salon) => salon.lat)),
      maxLat: Math.max(...SALONS.map((salon) => salon.lat)),
      minLng: Math.min(...SALONS.map((salon) => salon.lng)),
      maxLng: Math.max(...SALONS.map((salon) => salon.lng))
    };
    const pointFor = (lat, lng) => {
      const x = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1);
      const y = (bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat || 1);
      const pad = 0.14;
      return { left: (pad + x * (1 - pad * 2)) * 100, top: (pad + y * (1 - pad * 2)) * 100 };
    };
    const latPad = (bounds.maxLat - bounds.minLat) * 0.35;
    const lngPad = (bounds.maxLng - bounds.minLng) * 0.35;
    const showYou = state.location.lat >= bounds.minLat - latPad
      && state.location.lat <= bounds.maxLat + latPad
      && state.location.lng >= bounds.minLng - lngPad
      && state.location.lng <= bounds.maxLng + lngPad;
    const you = pointFor(state.location.lat, state.location.lng);
    return `
      <aside class="map-card">
        <p class="quiet">Area · ${esc(state.location.label)}</p>
        <div class="map" role="group" aria-label="Map of salons">
          ${SALONS.map((salon) => {
            const point = pointFor(salon.lat, salon.lng);
            const km = formatKm(distanceKm(state.location, salon));
            const isNearest = salon.id === nearest.id;
            const dim = state.query.trim() || state.category !== "All" ? !salonMatches(salon, state.query, state.category) : false;
            return `<button type="button" class="map-pin ${isNearest ? "is-nearest has-label" : ""} ${dim ? "is-dim" : ""}" style="left:${point.left}%;top:${point.top}%" data-action="open-salon" data-id="${esc(salon.id)}" aria-label="${esc(`${salon.name}, ${km}`)}">${isNearest ? `<span>${esc(salon.suburb)}</span>` : ""}<i></i></button>`;
          }).join("")}
          ${showYou ? `<div class="map-pin is-you has-label" style="left:${you.left}%;top:${you.top}%"><span>You</span><i></i></div>` : ""}
        </div>
      </aside>
    `;
  }

  function renderSalonCard(salon, nearestId) {
    const km = distanceKm(state.location, salon);
    const match = matchedService(salon, state.query);
    const lead = match || offeredServices(salon).slice().sort((a, b) => a.price - b.price)[0];
    const soon = lead ? earliestSlot(salon, lead) : null;
    const open = isOpenNow(salon);
    const added = state.compareIds.includes(salon.id);
    const showNearest = salon.id === nearestId && state.sort === "distance";
    return `
      <article class="salon-card">
        <button type="button" class="salon-open" data-action="open-salon" data-id="${esc(salon.id)}">
          <div class="band" style="--a:${salon.tones[0]};--b:${salon.tones[1]}">
            <strong>${esc(salon.name)}</strong>
            ${showNearest ? `<span class="nearest-tag">Nearest</span>` : ""}
          </div>
          <div class="card-copy">
            <p class="quiet">${esc(salon.suburb)} · ${esc(formatKm(km))} · ${salon.rating.toFixed(1)}</p>
            <p>${match ? `${esc(match.name)} · ` : "From "}<span class="money">${money(match ? match.price : minPrice(salon))}</span></p>
            <p class="quiet">${soon ? `Next open ${esc(formatSlotWhen(soon))}` : "No open time this week"}</p>
            <span class="badge ${open ? "is-open" : "is-closed"}">${open ? "Open now" : "Closed now"}</span>
          </div>
        </button>
        <div class="card-foot">
          <button type="button" class="compare-toggle ${added ? "is-on" : ""}" data-action="toggle-compare" data-id="${esc(salon.id)}" aria-pressed="${added ? "true" : "false"}">${added ? "Added" : "Compare"}</button>
        </div>
      </article>
    `;
  }

  function renderSalon() {
    const salon = getSalon(state.salonId);
    if (!salon) {
      return `<div class="empty"><h1>That salon is not on the list.</h1><button type="button" class="btn-secondary" data-action="goto" data-view="discover">Back to salons</button></div>`;
    }
    const services = offeredServices(salon);
    const service = services.find((item) => item.id === state.serviceId) || null;
    const dates = upcomingDates(salon, 8);
    const date = state.date && dates.includes(state.date) ? state.date : dates[0];
    const stylists = service ? stylistsFor(salon, service) : salon.stylists;
    const stylistId = stylists.some((stylist) => stylist.id === state.stylistId) ? state.stylistId : "";
    const slots = service ? openSlots(salon, service, date, stylistId) : [];
    const picked = state.slot && state.date === date ? state.slot : null;
    const openCount = slots.filter((slot) => !slot.taken).length;
    const added = state.compareIds.includes(salon.id);
    const km = distanceKm(state.location, salon);
    const open = isOpenNow(salon);
    return `
      <section class="stack">
        <button type="button" class="btn-text" data-action="goto" data-view="discover">All salons</button>
        <div class="salon-hero" style="--a:${salon.tones[0]};--b:${salon.tones[1]}">
          <h1>${esc(salon.name)}</h1>
          <p>${esc(salon.suburb)} · ${esc(formatKm(km))} · ${salon.rating.toFixed(1)} · ${salon.reviews.toLocaleString("en-ZA")} reviews</p>
        </div>
        <p>${esc(salon.blurb)}</p>
        <p class="quiet">${esc(salon.address)} · ${esc(formatHours(salon))}</p>
        <div class="row-actions">
          <span class="badge ${open ? "is-open" : "is-closed"}">${open ? "Open now" : "Closed now"}</span>
          <button type="button" class="chip ${added ? "is-on" : ""}" data-action="toggle-compare" data-id="${esc(salon.id)}" aria-pressed="${added ? "true" : "false"}">${added ? "Added to compare" : "Add to compare"}</button>
        </div>
      </section>
      <div class="salon-layout">
        <section class="stack">
          <h2>Services</h2>
          <div class="service-list">
            ${services.map((item) => `
              <button type="button" class="service-row ${service && service.id === item.id ? "is-selected" : ""}" data-action="pick-service" data-id="${esc(item.id)}">
                <strong>${esc(item.name)}</strong>
                <span class="meta quiet">${esc(item.category)} · ${esc(formatDuration(item.duration))}</span>
                <span class="money">${money(item.price)}</span>
              </button>
            `).join("")}
          </div>
          <p class="quiet">Stylists: ${esc(salon.stylists.map((stylist) => `${stylist.name} (${stylist.role})`).join(", "))}</p>
        </section>
        <aside class="booking-panel" id="booking-panel">
          <h2>${service ? esc(service.name) : "Choose a service"}</h2>
          ${service ? renderBookingControls(salon, service, dates, date, stylists, stylistId, slots, picked, openCount) : `<p class="quiet">Pick a service to see open and taken times.</p>`}
        </aside>
      </div>
    `;
  }

  function renderBookingControls(salon, service, dates, date, stylists, stylistId, slots, picked, openCount) {
    const stylist = picked ? salon.stylists.find((item) => item.id === picked.stylistId) : null;
    const elsewhere = SALONS
      .filter((item) => item.id !== salon.id && item.prices[service.id] != null)
      .map((item) => ({ id: item.id, name: item.name, price: item.prices[service.id] }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);
    return `
      <label class="field">
        <span>Stylist</span>
        <select id="stylist-select">
          <option value="" ${stylistId === "" ? "selected" : ""}>No preference</option>
          ${stylists.map((item) => `<option value="${esc(item.id)}" ${item.id === stylistId ? "selected" : ""}>${esc(item.name)} · ${esc(item.role)}</option>`).join("")}
        </select>
      </label>
      <div class="day-strip" role="group" aria-label="Dates">
        ${dates.map((iso) => {
          const day = parseISODate(iso);
          const has = openSlots(salon, service, iso, stylistId).some((slot) => !slot.taken);
          return `
            <button type="button" class="day ${iso === date ? "is-on" : ""}" data-action="pick-date" data-date="${iso}" aria-pressed="${iso === date ? "true" : "false"}">
              <strong>${WEEKDAYS_SHORT[day.getDay()]}</strong>
              <span>${day.getDate()} ${MONTHS[day.getMonth()]}</span>
              ${has ? "" : "<small>Full</small>"}
            </button>
          `;
        }).join("")}
      </div>
      <p class="quiet">${openCount} open · ${slots.length - openCount} taken · ${esc(formatLongDate(date))}</p>
      ${slots.length ? `
        <div class="slots" role="group" aria-label="Times">
          ${slots.map((slot) => `
            <button type="button" class="slot ${slot.taken ? "is-taken" : ""} ${picked && picked.time === slot.time ? "is-picked" : ""}" data-action="pick-slot" data-date="${date}" data-time="${slot.time}" data-stylist="${esc(slot.stylistId)}" ${slot.taken ? "disabled" : ""} aria-pressed="${picked && picked.time === slot.time ? "true" : "false"}">${slot.time}</button>
          `).join("")}
        </div>
        <p class="legend"><span class="swatch"></span> Open <span class="swatch is-taken"></span> Taken</p>
      ` : `<p class="quiet">Nothing left on this day. Try the next date that is not marked Full.</p>`}
      <dl class="summary">
        <div><dt>Service</dt><dd>${esc(service.name)} · ${esc(formatDuration(service.duration))}</dd></div>
        <div><dt>When</dt><dd>${picked ? esc(`${formatLongDate(date)} · ${picked.time}`) : "Choose an open slot"}</dd></div>
        <div><dt>Stylist</dt><dd>${stylist ? esc(stylist.name) : "Assigned when you pick a time"}</dd></div>
        <div><dt>Total</dt><dd class="money">${money(service.price)}</dd></div>
      </dl>
      <label class="field">
        <span>Note</span>
        <textarea id="note" maxlength="180" placeholder="Optional note for the salon">${esc(state.note)}</textarea>
      </label>
      <button type="button" class="btn-primary btn-block" data-action="confirm-booking" ${picked ? "" : "disabled"}>Confirm booking</button>
      ${elsewhere.length ? `
        <div>
          <p class="quiet">Same service elsewhere</p>
          <div class="elsewhere">
            ${elsewhere.map((item) => `<button type="button" class="chip" data-action="book" data-salon="${esc(item.id)}" data-service="${esc(service.id)}">${esc(item.name)} ${money(item.price)}</button>`).join("")}
          </div>
        </div>
      ` : ""}
    `;
  }

  function renderCompare() {
    const service = CATALOG.find((item) => item.id === state.compareServiceId) || CATALOG[0];
    let salons = SALONS.filter((salon) => salon.prices[service.id] != null);
    const missing = state.compareIds
      .map(getSalon)
      .filter((salon) => salon && salon.prices[service.id] == null);
    if (state.compareOnly && state.compareIds.length) {
      salons = salons.filter((salon) => state.compareIds.includes(salon.id));
    }
    const rows = salons.map((salon) => ({
      salon,
      price: salon.prices[service.id],
      km: distanceKm(state.location, salon),
      slot: earliestSlot(salon, { ...service, price: salon.prices[service.id] })
    }));
    const lowest = rows.length ? Math.min(...rows.map((row) => row.price)) : 0;
    rows.sort((a, b) => {
      if (state.compareSort === "distance") return a.km - b.km || a.price - b.price;
      if (state.compareSort === "earliest") {
        const aTime = a.slot ? new Date(`${a.slot.date}T${a.slot.time}:00`).getTime() : Infinity;
        const bTime = b.slot ? new Date(`${b.slot.date}T${b.slot.time}:00`).getTime() : Infinity;
        return aTime - bTime || a.price - b.price;
      }
      return a.price - b.price || a.km - b.km;
    });
    return `
      <section>
        <h1 class="page-title">Compare prices</h1>
        <p class="quiet">${esc(service.name)} · ${esc(formatDuration(service.duration))} · from ${esc(state.location.label)}</p>
      </section>
      <div class="toolbar">
        <label class="field" style="flex:1 1 240px">
          <span>Service</span>
          <select id="compare-service">
            ${["Hair", "Braids", "Barber", "Nails", "Spa"].map((category) => `
              <optgroup label="${category}">
                ${CATALOG.filter((item) => item.category === category).map((item) => `
                  <option value="${esc(item.id)}" ${item.id === service.id ? "selected" : ""}>${esc(item.name)}</option>
                `).join("")}
              </optgroup>
            `).join("")}
          </select>
        </label>
      </div>
      <div class="chips" role="group" aria-label="Sort comparison">
        ${[
          ["price", "Lowest price"],
          ["distance", "Nearest"],
          ["earliest", "Soonest"]
        ].map(([id, label]) => `
          <button type="button" class="chip ${state.compareSort === id ? "is-on" : ""}" data-action="set-compare-sort" data-id="${id}">${label}</button>
        `).join("")}
        ${state.compareIds.length ? `<button type="button" class="chip ${state.compareOnly ? "is-on" : ""}" data-action="toggle-compare-only">${state.compareOnly ? "Shortlist only" : "Show shortlist only"}</button>` : ""}
        ${state.compareIds.length ? `<button type="button" class="btn-text" data-action="clear-shortlist">Clear shortlist</button>` : ""}
      </div>
      ${rows.length ? `
        <div class="compare-list">
          ${rows.map((row) => {
            const shortlisted = state.compareIds.includes(row.salon.id);
            const lowestHere = row.price === lowest;
            return `
              <article class="compare-card">
                <div class="band" style="--a:${row.salon.tones[0]};--b:${row.salon.tones[1]}">
                  <strong>${esc(row.salon.name)}</strong>
                  ${lowestHere ? `<span class="nearest-tag">Lowest</span>` : ""}
                </div>
                <div class="compare-body">
                  <p class="quiet">${esc(row.salon.suburb)} · ${esc(formatKm(row.km))} · ${row.salon.rating.toFixed(1)}${shortlisted ? " · Shortlisted" : ""}</p>
                  <p class="money">${money(row.price)}</p>
                  <p>${lowestHere ? "Lowest price" : `${money(row.price - lowest)} more`} · ${esc(formatSlotWhen(row.slot))}</p>
                  <button type="button" class="btn-primary" data-action="book" data-salon="${esc(row.salon.id)}" data-service="${esc(service.id)}">Check times</button>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="empty">
          <h2>Nobody on this shortlist offers ${esc(service.name)}.</h2>
          <button type="button" class="btn-secondary" data-action="toggle-compare-only">Show every salon</button>
        </div>
      `}
      ${missing.length ? `<p class="quiet">Shortlisted, and not offering ${esc(service.name)}: ${esc(missing.map((salon) => salon.name).join(", "))}.</p>` : ""}
    `;
  }

  function renderBookings() {
    const mine = loadBookings().filter((booking) => booking.userId === state.user.id);
    const upcoming = mine.filter((booking) => booking.status === "confirmed" && !isFinished(booking)).sort((a, b) => {
      if (a.id === state.highlightBookingId) return -1;
      if (b.id === state.highlightBookingId) return 1;
      return bookingStart(a) - bookingStart(b);
    });
    const past = mine.filter((booking) => booking.status === "confirmed" && isFinished(booking)).sort((a, b) => bookingStart(b) - bookingStart(a));
    const cancelled = mine.filter((booking) => booking.status === "cancelled").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return `
      <section>
        <h1 class="page-title">Bookings</h1>
        <p class="quiet">Booked as ${esc(state.user.name)}. Cancelling a visit opens that time again.</p>
      </section>
      ${upcoming.length ? renderBookingGroup("Upcoming", upcoming) : `
        <div class="empty">
          <h2>No upcoming bookings.</h2>
          <p class="quiet">Find a salon, check a time, and confirm it here.</p>
          <button type="button" class="btn-primary" data-action="goto" data-view="discover">Find a salon</button>
        </div>
      `}
      ${past.length ? renderBookingGroup("Past", past) : ""}
      ${cancelled.length ? renderBookingGroup("Cancelled", cancelled) : ""}
    `;
  }

  function renderBookingGroup(title, bookings) {
    return `
      <section class="stack">
        <h2>${esc(title)}</h2>
        ${bookings.map((booking) => {
          const cancelling = state.cancelId === booking.id;
          const canCancel = booking.status === "confirmed" && !isFinished(booking);
          return `
            <article class="booking-card ${booking.id === state.highlightBookingId ? "is-new" : ""}">
              <header class="receipt-head">
                <span>${esc(booking.ref)}</span>
                <span class="money">${money(booking.price)}</span>
              </header>
              <h3>${esc(booking.salonName)}</h3>
              <dl class="receipt">
                <div><dt>Service</dt><dd>${esc(booking.serviceName)} · ${esc(formatDuration(booking.duration))}</dd></div>
                <div><dt>When</dt><dd>${esc(formatLongDate(booking.date))} · ${esc(booking.time)}</dd></div>
                <div><dt>Stylist</dt><dd>${esc(booking.stylistName)} · ${esc(booking.suburb)}</dd></div>
              </dl>
              ${booking.note ? `<p class="quiet">${esc(booking.note)}</p>` : ""}
              ${canCancel && !cancelling ? `<button type="button" class="btn-secondary" data-action="ask-cancel" data-id="${esc(booking.id)}">Cancel booking</button>` : ""}
              ${cancelling ? `
                <div class="confirm-box">
                  <p>Cancel ${esc(booking.ref)}? The time goes back on the board.</p>
                  <button type="button" class="btn-danger" data-action="confirm-cancel" data-id="${esc(booking.id)}">Yes, cancel it</button>
                  <button type="button" class="btn-secondary" data-action="keep-booking">Keep it</button>
                </div>
              ` : ""}
            </article>
          `;
        }).join("")}
      </section>
    `;
  }

  function renderShortlistBar() {
    if (!state.user || !state.compareIds.length || state.view !== "discover") return "";
    const names = state.compareIds.map((id) => getSalon(id)?.name).filter(Boolean);
    return `
      <div class="shortlist-bar">
        <p><strong>${names.length} shortlisted</strong><span>${esc(names.join(" · "))}</span></p>
        <button type="button" class="btn-primary" data-action="goto" data-view="compare" data-shortlist="true">Compare prices</button>
      </div>
    `;
  }

  function pageTitle() {
    if (!state.user) return "Seale — Log in";
    if (state.view === "salon") {
      const salon = getSalon(state.salonId);
      return salon ? `${salon.name} — Seale` : "Seale";
    }
    if (state.view === "compare") return "Compare prices — Seale";
    if (state.view === "bookings") return "My bookings — Seale";
    return "Discover salons — Seale";
  }

  function captureFocus() {
    const el = document.activeElement;
    if (!el || !el.id) return null;
    if (!["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return null;
    return { id: el.id, start: el.selectionStart, end: el.selectionEnd };
  }

  function restoreFocus(saved) {
    if (!saved) return;
    const el = document.getElementById(saved.id);
    if (!el) return;
    el.focus();
    if (typeof saved.start === "number" && el.setSelectionRange) {
      try { el.setSelectionRange(saved.start, saved.end); } catch (error) { /* email fields */ }
    }
  }

  function render() {
    const root = document.getElementById("app");
    const y = window.scrollY;
    const focus = captureFocus();
    root.innerHTML = state.user ? renderShell() : renderAuth();
    if (state.forceTop) window.scrollTo(0, 0);
    else window.scrollTo(0, y);
    state.forceTop = false;
    restoreFocus(focus);
    if (!state.user && !state.didFocusAuth) {
      const email = document.getElementById("email");
      if (email) email.focus();
      state.didFocusAuth = true;
    }
    if (state.scrollTo) {
      const target = document.getElementById(state.scrollTo);
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      state.scrollTo = null;
      if (target) target.scrollIntoView({ behavior, block: "start" });
    }
    persistUi();
    document.title = pageTitle();
  }

  function startSession(user) {
    localStorage.setItem(SESSION_KEY, user.id);
    state.user = publicUser(user);
    state.authError = "";
    state.view = "discover";
    state.forceTop = true;
    state.userMenu = false;
    render();
    showToast(`Welcome, ${firstName(user.name)}.`);
  }

  function submitAuth(form) {
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const name = String(data.get("name") || "").trim();
    state.draft = { name, email, password };
    if (state.authMode === "register") {
      if (name.length < 2 || !email.includes("@") || !email.includes(".") || password.length < 6) {
        state.authError = "Enter your name, a valid email, and a password of at least 6 characters.";
        render();
        return;
      }
      const users = loadUsers();
      if (users.some((user) => user.email === email)) {
        state.authError = "That email already has an account. Log in instead.";
        render();
        return;
      }
      const user = { id: uid("user"), name, email, password };
      users.push(user);
      saveUsers(users);
      startSession(user);
      return;
    }
    const user = loadUsers().find((item) => item.email === email);
    if (!user) {
      state.authError = "No account uses that email. Use the demo, or create an account.";
      render();
      return;
    }
    if (user.password !== password) {
      state.authError = "That password does not match.";
      render();
      return;
    }
    startSession(user);
  }

  function openSalon(id, serviceId) {
    state.view = "salon";
    state.salonId = id;
    state.serviceId = serviceId || null;
    state.stylistId = "";
    state.date = null;
    state.slot = null;
    state.note = "";
    state.cancelId = null;
    state.forceTop = true;
    if (serviceId) state.scrollTo = "booking-panel";
    render();
  }

  function toggleCompare(id) {
    if (state.compareIds.includes(id)) {
      state.compareIds = state.compareIds.filter((item) => item !== id);
      render();
      return;
    }
    if (state.compareIds.length >= 4) {
      showToast("You can compare up to 4 salons.");
      return;
    }
    state.compareIds = state.compareIds.concat(id);
    render();
  }

  function confirmBooking() {
    if (state.saving) return;
    const salon = getSalon(state.salonId);
    const service = salon && offeredServices(salon).find((item) => item.id === state.serviceId);
    const slot = state.slot;
    const date = state.date;
    if (!state.user || !salon || !service || !slot || !date) {
      showToast("Choose a service and an open time first.");
      return;
    }
    const stylist = salon.stylists.find((item) => item.id === slot.stylistId);
    if (!stylist) {
      showToast("Choose a time again so a stylist can be assigned.");
      return;
    }
    state.saving = true;
    if (!isFree(salon, slot.stylistId, date, slot.time, service.duration)) {
      state.saving = false;
      state.slot = null;
      render();
      showToast("That time was just taken. Pick another open slot.");
      return;
    }
    const noteEl = document.getElementById("note");
    const note = (noteEl ? noteEl.value : state.note).trim().slice(0, 180);
    const bookings = loadBookings();
    const booking = {
      id: uid("bk"),
      ref: "",
      userId: state.user.id,
      salonId: salon.id,
      salonName: salon.name,
      suburb: salon.suburb,
      serviceId: service.id,
      serviceName: service.name,
      stylistId: stylist.id,
      stylistName: stylist.name,
      date,
      time: slot.time,
      duration: service.duration,
      price: service.price,
      note,
      status: "confirmed",
      createdAt: new Date().toISOString()
    };
    booking.ref = refCode(booking.id);
    bookings.push(booking);
    if (!saveBookings(bookings)) {
      state.saving = false;
      showToast("This browser blocked saving the booking.");
      return;
    }
    state.saving = false;
    state.slot = null;
    state.note = "";
    state.highlightBookingId = booking.id;
    state.view = "bookings";
    state.forceTop = true;
    render();
    showToast(`Booked ${booking.ref} at ${salon.name}.`);
  }

  function confirmCancel(id) {
    const bookings = loadBookings();
    const booking = bookings.find((item) => item.id === id && item.userId === state.user.id);
    if (!booking) return;
    booking.status = "cancelled";
    saveBookings(bookings);
    state.cancelId = null;
    if (state.highlightBookingId === id) state.highlightBookingId = null;
    render();
    showToast(`${booking.ref} is cancelled. That time is open again.`);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      showToast("This browser cannot share location. Pick a suburb.");
      return;
    }
    state.geoStatus = "locating";
    render();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.location = {
          id: "gps",
          label: "Your location",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "gps"
        };
        state.geoStatus = "ok";
        render();
        showToast("Distances now start from your location.");
      },
      () => {
        state.geoStatus = "denied";
        render();
        showToast(`Location stayed on ${state.location.label}. The suburb chips still work.`);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  function onClick(event) {
    const el = event.target.closest("[data-action]");
    if (!el) {
      if (state.userMenu && !event.target.closest(".user-menu")) {
        state.userMenu = false;
        render();
      }
      return;
    }
    const action = el.dataset.action;
    if (action === "toggle-menu") {
      state.userMenu = !state.userMenu;
      render();
      return;
    }
    state.userMenu = false;
    if (action === "demo-login") {
      const user = loadUsers().find((item) => item.email === "amara@seale.app");
      if (!user) {
        state.authError = "The demo account is missing from this browser.";
        render();
        return;
      }
      startSession(user);
      return;
    }
    if (action === "auth-mode") {
      state.authMode = el.dataset.mode === "register" ? "register" : "login";
      state.authError = "";
      render();
      return;
    }
    if (action === "sign-out") {
      localStorage.removeItem(SESSION_KEY);
      state.user = null;
      state.userMenu = false;
      state.forceTop = true;
      render();
      return;
    }
    if (action === "goto") {
      if (state.view === "bookings" && el.dataset.view !== "bookings") state.highlightBookingId = null;
      state.view = el.dataset.view;
      state.cancelId = null;
      state.forceTop = true;
      if (el.dataset.view === "compare") {
        const match = serviceFromQuery(state.query);
        if (match) state.compareServiceId = match.id;
        if (el.dataset.shortlist === "true") state.compareOnly = true;
      }
      render();
      return;
    }
    if (action === "set-area") {
      const area = AREAS.find((item) => item.id === el.dataset.id);
      if (!area) return;
      state.location = { ...area, source: "area" };
      state.geoStatus = "";
      render();
      return;
    }
    if (action === "use-location") {
      useMyLocation();
      return;
    }
    if (action === "set-category") {
      state.category = el.dataset.id;
      render();
      return;
    }
    if (action === "set-sort") {
      state.sort = el.dataset.id;
      render();
      return;
    }
    if (action === "clear-filters") {
      state.query = "";
      state.category = "All";
      state.sort = "distance";
      render();
      return;
    }
    if (action === "open-salon" || action === "book") {
      openSalon(el.dataset.id || el.dataset.salon, el.dataset.service || "");
      return;
    }
    if (action === "toggle-compare") {
      toggleCompare(el.dataset.id);
      return;
    }
    if (action === "clear-shortlist") {
      state.compareIds = [];
      state.compareOnly = false;
      render();
      return;
    }
    if (action === "toggle-compare-only") {
      state.compareOnly = !state.compareOnly;
      render();
      return;
    }
    if (action === "set-compare-sort") {
      state.compareSort = el.dataset.id;
      render();
      return;
    }
    if (action === "pick-service") {
      state.serviceId = el.dataset.id;
      state.slot = null;
      state.stylistId = "";
      render();
      return;
    }
    if (action === "pick-date") {
      state.date = el.dataset.date;
      state.slot = null;
      render();
      return;
    }
    if (action === "pick-slot") {
      state.date = el.dataset.date;
      state.slot = { time: el.dataset.time, stylistId: el.dataset.stylist };
      render();
      return;
    }
    if (action === "confirm-booking") {
      confirmBooking();
      return;
    }
    if (action === "ask-cancel") {
      state.cancelId = el.dataset.id;
      render();
      return;
    }
    if (action === "keep-booking") {
      state.cancelId = null;
      render();
      return;
    }
    if (action === "confirm-cancel") {
      confirmCancel(el.dataset.id);
    }
  }

  function onInput(event) {
    const target = event.target;
    if (target.id === "search-input") {
      state.query = target.value;
      render();
      return;
    }
    if (target.id === "note") {
      state.note = target.value;
      return;
    }
    if (target.form && target.form.id === "auth-form") {
      state.draft[target.name] = target.value;
      state.authError = "";
      const error = document.querySelector(".form-error");
      if (error) error.remove();
    }
  }

  function onChange(event) {
    const target = event.target;
    if (target.id === "stylist-select") {
      state.stylistId = target.value;
      state.slot = null;
      render();
    }
    if (target.id === "compare-service") {
      state.compareServiceId = target.value;
      render();
    }
    if (target.id === "area-select" && target.value !== "gps") {
      const area = AREAS.find((item) => item.id === target.value);
      if (!area) return;
      state.location = { ...area, source: "area" };
      state.geoStatus = "";
      render();
    }
    if (target.id === "category-select") {
      state.category = target.value;
      render();
    }
    if (target.id === "sort-select") {
      state.sort = target.value;
      render();
    }
  }

  function onSubmit(event) {
    if (event.target && event.target.id === "auth-form") {
      event.preventDefault();
      submitAuth(event.target);
    }
  }

  function onKeydown(event) {
    if (event.key === "Escape" && state.userMenu) {
      state.userMenu = false;
      render();
    }
  }

  function init() {
    assertCoverage();
    ensureSeed();
    ensureSampleBooking();
    restoreSession();
    restoreUi();
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", onKeydown);
    render();
  }

  init();
})();
