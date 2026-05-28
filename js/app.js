/**
 * UKM 3D Campus Navigator – SPA logic, global state & interactions
 */

let currentLanguage = "EN";
let isLoggedIn = false;
let isFavorited = false;
let isAccessibleMode = false;

let currentView = "splash";
let navDestination = "bk6";
let mapScale = 1;
let mapIs3D = false;
let navTimer = null;
let navDistance = 50;
let navMaxDistance = 50;
let isNavigatingActive = false;

let navMotionPath = null;
let navMotionDot = null;
let navMotionLen = 0;

const STORAGE_KEYS = {
  loggedIn: "ukm_logged_in",
  favorited: "ukm_favorited",
  language: "ukm_language",
  accessible: "ukm_accessible",
};

const NAV_STEP_METERS = 5;
const NAV_TICK_MS = 1000;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function t(key) {
  const dict = langDictionary[currentLanguage];
  if (dict && dict[key] !== undefined) return dict[key];
  if (langDictionary.EN[key] !== undefined) return langDictionary.EN[key];
  return key;
}

function loadState() {
  isLoggedIn = localStorage.getItem(STORAGE_KEYS.loggedIn) === "true";
  isFavorited = localStorage.getItem(STORAGE_KEYS.favorited) === "true";
  const lang = localStorage.getItem(STORAGE_KEYS.language);
  if (lang === "EN" || lang === "CN") currentLanguage = lang;
  isAccessibleMode = localStorage.getItem(STORAGE_KEYS.accessible) === "true";
}

function persistState() {
  localStorage.setItem(STORAGE_KEYS.loggedIn, String(isLoggedIn));
  localStorage.setItem(STORAGE_KEYS.favorited, String(isFavorited));
  localStorage.setItem(STORAGE_KEYS.language, currentLanguage);
  localStorage.setItem(STORAGE_KEYS.accessible, String(isAccessibleMode));
}

function clearSession() {
  isLoggedIn = false;
  isFavorited = false;
  isAccessibleMode = false;
  localStorage.removeItem(STORAGE_KEYS.loggedIn);
  localStorage.removeItem(STORAGE_KEYS.favorited);
  localStorage.removeItem(STORAGE_KEYS.accessible);
}

function applyLanguage() {
  $$("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key && langDictionary[currentLanguage][key] !== undefined) {
      el.textContent = t(key);
    }
  });

  $$("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.placeholder = t(key);
  });

  $$("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });

  const langSelectLogin = $("#lang-select-login");
  const langSelectProfile = $("#lang-select-profile");
  if (langSelectLogin) langSelectLogin.value = currentLanguage;
  if (langSelectProfile) langSelectProfile.value = currentLanguage;

  const profileLang = $("#profile-lang-display");
  if (profileLang) profileLang.textContent = currentLanguage;

  renderSidebarHistory();
  renderNotifications();
  updateFavoriteUI();
  updateFavoritesList();
  updateNavigatingTitle();
  updateAccessibleUI();
}

function setLanguage(lang) {
  if (lang !== "EN" && lang !== "CN") return;
  currentLanguage = lang;
  persistState();
  applyLanguage();
}

function showView(viewId, direction = "forward") {
  const next = $(`#view-${viewId}`);
  const prev = $(".view--active");

  if (!next) return;

  if (prev && prev !== next) {
    prev.classList.remove("view--active");
    if (direction === "back") {
      prev.classList.add("view--exit-left");
      setTimeout(() => prev.classList.remove("view--exit-left"), 420);
    }
  }

  if (direction === "back") next.classList.add("view--enter-from-left");
  next.classList.add("view--active");
  requestAnimationFrame(() => next.classList.remove("view--enter-from-left"));

  currentView = viewId;

  if (viewId === "navigating") {
    updateAccessibleUI();
  }
}

function initBoot() {
  loadState();
  applyLanguage();
  updateFavoriteUI();
  updateFavoritesList();

  if (isLoggedIn) {
    showView("menu");
    return;
  }
  showView("splash");
}

function updateFavoriteUI() {
  const btn = $("#btn-favorite");
  const label = $("#favorite-label");
  if (!btn || !label) return;

  if (isFavorited) {
    btn.classList.add("saved");
    label.setAttribute("data-i18n", "saved");
    label.textContent = t("saved");
  } else {
    btn.classList.remove("saved");
    label.setAttribute("data-i18n", "saveFavorite");
    label.textContent = t("saveFavorite");
  }
}

function updateFavoritesList() {
  const list = $("#favorites-list");
  if (!list) return;
  list.innerHTML = "";

  if (isFavorited) {
    const li = document.createElement("li");
    li.className = "favorite-item";
    li.innerHTML = `<span>⭐</span><span>${t("favoriteBk6")}</span>`;
    list.appendChild(li);
  } else {
    const li = document.createElement("li");
    li.className = "favorites-empty";
    li.setAttribute("data-i18n", "noFavorites");
    li.textContent = t("noFavorites");
    list.appendChild(li);
  }
}

function setAccessibleMode(on) {
  isAccessibleMode = !!on;
  persistState();
  updateAccessibleUI();
}

function updateAccessibleUI() {
  const badge = $("#accessible-badge");
  const mapStage = $("#map-stage");
  const mapHint = $("#map-accessible-hint");
  const navView = $("#view-navigating");
  const navHint = $("#nav-accessible-hint");
  const navVisual = $("#nav-visual");

  if (badge) badge.classList.toggle("hidden", !isAccessibleMode);
  if (mapStage) mapStage.classList.toggle("accessible-mode", isAccessibleMode);
  if (mapHint) {
    mapHint.classList.toggle("hidden", !isAccessibleMode);
    if (isAccessibleMode) mapHint.textContent = t("accessibleHint");
  }
  if (navView) navView.classList.toggle("accessible-mode", isAccessibleMode);
  if (navHint) {
    navHint.classList.toggle("hidden", !isAccessibleMode);
    if (isAccessibleMode) navHint.textContent = t("accessibleHint");
  }
  if (navVisual) navVisual.classList.toggle("accessible-active", isAccessibleMode);
}

function updateNavigatingTitle() {
  const title = $("#nav-destination-title");
  if (!title) return;
  const destName =
    navDestination === "lab2"
      ? (currentLanguage === "CN" ? "实验室 2" : "Lab 2")
      : (currentLanguage === "CN" ? "BK6 教室" : "BK6 Classroom");

  if (navDistance > 0) {
    title.textContent =
      currentLanguage === "CN"
        ? `正在导航至 ${destName}\n${navDistance}m 后左转`
        : `Navigating to ${destName}\nIn ${navDistance}m, turn left`;
  } else {
    title.textContent =
      currentLanguage === "CN"
        ? `正在导航至 ${destName}`
        : `Navigating to ${destName}`;
  }
}

function initNavMotion() {
  navMotionPath = $("#nav-route-motion");
  navMotionDot = $("#nav-route-dot");
  navMotionLen = 0;
  if (navMotionPath && typeof navMotionPath.getTotalLength === "function") {
    navMotionLen = navMotionPath.getTotalLength();
  }
}

function setNavDotProgress(progress01) {
  if (!navMotionPath || !navMotionDot || !navMotionLen) return;
  const p = Math.min(1, Math.max(0, progress01));
  // start on right (length=0), move left as progress increases
  const lenAt = navMotionLen * p;
  const pt = navMotionPath.getPointAtLength(lenAt);
  navMotionDot.setAttribute("cx", String(pt.x));
  navMotionDot.setAttribute("cy", String(pt.y));
}

// Legacy progress/walker removed in Figma layout

function resetNavigatingUI() {
  stopNavTimer();
  navMaxDistance = 50;
  navDistance = navMaxDistance;
  isNavigatingActive = false;

  const arrivedEl = $("#nav-arrived");
  if (arrivedEl) arrivedEl.classList.add("hidden");
  updateNavigatingTitle();
  setNavDotProgress(0);
  updateAccessibleUI();
}

function stopNavTimer() {
  if (navTimer) {
    clearInterval(navTimer);
    navTimer = null;
  }
  isNavigatingActive = false;
}

function startNavTimer() {
  stopNavTimer();

  const arrivedEl = $("#nav-arrived");

  if (!arrivedEl) return;

  arrivedEl.classList.add("hidden");
  navDistance = navMaxDistance;
  isNavigatingActive = true;
  updateNavigatingTitle();
  setNavDotProgress(0);

  navTimer = setInterval(() => {
    navDistance -= NAV_STEP_METERS;

    if (navDistance > 0) {
      const progress = (navMaxDistance - navDistance) / navMaxDistance;
      setNavDotProgress(progress);
      updateNavigatingTitle();
    } else {
      navDistance = 0;
      stopNavTimer();
      arrivedEl.classList.remove("hidden");
      arrivedEl.textContent = t("arrived");
      setNavDotProgress(1);
      updateNavigatingTitle();
    }
  }, NAV_TICK_MS);
}

function goToNavigating(destination) {
  navDestination = destination === "lab2" ? "lab2" : "bk6";
  resetNavigatingUI();
  updateNavigatingTitle();
  showView("navigating");
}

function setMapScale(scale) {
  mapScale = Math.min(2.2, Math.max(0.55, scale));
  const canvas = $("#map-canvas");
  if (canvas) canvas.style.transform = `scale(${mapScale})`;
}

function setMapMode(is3d) {
  mapIs3D = is3d;
  const visual = $("#map-visual");
  const pills = $$(".mode-pill");
  if (!visual) return;

  visual.classList.toggle("map-buildings--2d", !is3d);
  visual.classList.toggle("map-buildings--3d", is3d);

  pills.forEach((p) => {
    const mode = p.getAttribute("data-mode");
    p.classList.toggle("mode-pill--active", (mode === "3d") === is3d);
  });
}

function openOverlay(id) {
  const el = $(`#overlay-${id}`);
  if (el) el.classList.remove("hidden");
}

function closeOverlay(id) {
  const el = $(`#overlay-${id}`);
  if (el) el.classList.add("hidden");
}

function closeAllOverlays() {
  $$(".overlay").forEach((o) => o.classList.add("hidden"));
}

function renderSidebarHistory() {
  const ul = $("#sidebar-history");
  if (!ul) return;
  ul.innerHTML = "";
  ["historyBk6", "historyLibrary", "historyLab2"].forEach((key) => {
    const li = document.createElement("li");
    li.setAttribute("data-key", key);
    li.textContent = t(key);
    ul.appendChild(li);
  });
}

function renderNotifications() {
  const ul = $("#notif-list");
  if (!ul) return;
  ul.innerHTML = "";
  ["notif1", "notif2", "notif3", "notif4"].forEach((key) => {
    const li = document.createElement("li");
    li.textContent = t(key);
    ul.appendChild(li);
  });
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("toast--visible");
  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.classList.add("hidden"), 320);
  }, 2200);
}

function bindToggles(container) {
  const root = container || document;
  if (root.__ukmToggleBound) return;
  root.__ukmToggleBound = true;

  root.addEventListener("click", (e) => {
    const toggle = e.target.closest(".toggle");
    if (!toggle) return;
    const on = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(on));
    toggle.classList.toggle("toggle--on", on);
  });
}

function bindEvents() {
  $("#btn-get-started")?.addEventListener("click", () => showView("login"));

  $("#login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    isLoggedIn = true;
    persistState();
    showView("menu");
  });

  $("#btn-forgot-password")?.addEventListener("click", () => openOverlay("forgot"));

  $("#lang-select-login")?.addEventListener("change", (e) => setLanguage(e.target.value));
  $("#lang-select-profile")?.addEventListener("change", (e) => setLanguage(e.target.value));

  $("#btn-notifications")?.addEventListener("click", () => {
    renderNotifications();
    openOverlay("notifications");
  });

  $("#btn-profile")?.addEventListener("click", () => {
    updateFavoritesList();
    showView("profile");
  });

  $$("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.getAttribute("data-nav");
      if (target === "map") showView("map");
      if (target === "timetable") showView("timetable");
    });
  });

  $("#btn-menu-settings")?.addEventListener("click", () => showView("profile"));

  $("#btn-accessible-route")?.addEventListener("click", () => {
    setAccessibleMode(true);
    showView("detail");
  });

  $("#btn-navigating-menu")?.addEventListener("click", () => goToNavigating("bk6"));

  const openSidebar = () => {
    renderSidebarHistory();
    openOverlay("sidebar");
  };
  $("#btn-sidebar-from-search")?.addEventListener("click", openSidebar);

  $(".sidebar-close")?.addEventListener("click", () => closeOverlay("sidebar"));
  $("#overlay-sidebar")?.addEventListener("click", (e) => {
    if (e.target.id === "overlay-sidebar") closeOverlay("sidebar");
  });

  $("#sidebar-history")?.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    closeOverlay("sidebar");
    showView("detail");
  });

  $("#btn-settings")?.addEventListener("click", () => openOverlay("settings"));

  $("#btn-map-mode")?.addEventListener("click", () => setMapMode(!mapIs3D));

  $("#btn-zoom-in")?.addEventListener("click", () => setMapScale(mapScale + 0.15));
  $("#btn-zoom-out")?.addEventListener("click", () => setMapScale(mapScale - 0.15));

  $("#btn-map-detail")?.addEventListener("click", () => showView("detail"));
  $("#btn-map-back")?.addEventListener("click", () => showView("menu", "back"));

  $("#map-search-input")?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    closeOverlay("sidebar");
    showView("detail");
  });

  $$("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showView(btn.getAttribute("data-back"), "back");
    });
  });

  $$(".btn-navigate-now").forEach((btn) => {
    btn.addEventListener("click", () => {
      goToNavigating(btn.getAttribute("data-destination"));
    });
  });

  $("#btn-nav-start")?.addEventListener("click", startNavTimer);

  $("#btn-nav-close")?.addEventListener("click", () => {
    stopNavTimer();
    resetNavigatingUI();
    showView("menu", "back");
  });

  $("#btn-detail-back")?.addEventListener("click", () => showView("menu", "back"));

  $("#btn-ar")?.addEventListener("click", () => openOverlay("ar"));
  $("#overlay-ar")?.addEventListener("click", () => closeOverlay("ar"));

  $("#btn-wheelchair")?.addEventListener("click", () => setAccessibleMode(true));

  $("#btn-favorite")?.addEventListener("click", () => {
    if (isFavorited) return;
    isFavorited = true;
    persistState();
    updateFavoriteUI();
    updateFavoritesList();
  });

  $("#btn-share")?.addEventListener("click", () => {
    const text = `BK6 Classroom – UKM Campus Navigator`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(t("shareToast")));
    } else {
      showToast(t("shareToast"));
    }
  });

  $("#btn-start-nav-detail")?.addEventListener("click", () => goToNavigating("bk6"));

  $("#btn-lang-settings")?.addEventListener("click", () => openOverlay("lang"));
  $("#btn-help")?.addEventListener("click", () => openOverlay("help"));
  $("#btn-about")?.addEventListener("click", () => openOverlay("about"));

  $("#btn-logout")?.addEventListener("click", () => {
    clearSession();
    stopNavTimer();
    resetNavigatingUI();
    setMapScale(1);
    setMapMode(false);
    setAccessibleMode(false);
    updateFavoriteUI();
    updateFavoritesList();
    closeAllOverlays();
    showView("login", "back");
  });

  $$(".modal-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-close");
      if (id) closeOverlay(id);
    });
  });

  $$(".overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && overlay.id !== "overlay-ar") {
        overlay.classList.add("hidden");
      }
    });
  });

  bindToggles(document);
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  initBoot();
  setMapMode(false);
  setMapScale(1);
  updateAccessibleUI();
  initNavMotion();
  setNavDotProgress(0);
});
