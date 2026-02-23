/* assets/js/consent.js */

const PESTIFY = {
  GA4_ID: "G-XXXXXXXXXX",
  ADS_ID: "AW-XXXXXXXXXX",
  SENTRY_DSN: "SENTRY_DSN_HERE",

  // EU-safe: keep Sentry behind Analytics consent.
  // If you ever want Sentry always-on, set to false + update Privacy Policy.
  SENTRY_REQUIRES_ANALYTICS_CONSENT: true,

  CONSENT_KEY: "pestify_consent",
  CONSENT_MAX_DAYS: 180,
};

// ---------- Translation helpers ----------
let consentTranslations = {};

async function loadConsentTranslations() {
  const lang = localStorage.getItem('pestify_lang') || 'en';
  try {
    const response = await fetch(`/assets/lang/${lang}.json`);
    const data = await response.json();
    consentTranslations = data.consent || {};
  } catch (error) {
    console.error('Failed to load consent translations:', error);
    // Fallback English
    consentTranslations = {
      title: "Cookies & measurement",
      description: "We use necessary cookies for security. With your consent, we use analytics (Google Analytics 4, Sentry) and marketing cookies (Google Ads conversion tracking) to measure performance and improve the service.",
      accept_all: "Accept all",
      reject: "Reject non-essential",
      customize: "Customize",
      privacy: "Privacy",
      necessary: "Necessary",
      necessary_desc: "Required for security and basic functionality.",
      analytics: "Analytics",
      analytics_desc: "Helps us understand usage and fix issues (GA4, Sentry).",
      marketing: "Marketing",
      marketing_desc: "Helps us measure campaigns (Google Ads conversions).",
      enable: "Enable",
      always_on: "Always on",
      save: "Save preferences",
      cancel: "Cancel"
    };
  }
}

// ---------- Storage helpers ----------
function readCookie(name){
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function writeCookie(name, value, maxAgeSeconds){
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

function getConsent(){
  // localStorage preferred
  try {
    const raw = localStorage.getItem(PESTIFY.CONSENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // cookie fallback
  try {
    const raw = readCookie(PESTIFY.CONSENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return null;
}

function setConsent(consent){
  const payload = {
    necessary: true,
    analytics: !!consent.analytics,
    marketing: !!consent.marketing,
    ts: Date.now(),
  };

  try { localStorage.setItem(PESTIFY.CONSENT_KEY, JSON.stringify(payload)); } catch {}
  writeCookie(PESTIFY.CONSENT_KEY, JSON.stringify(payload), PESTIFY.CONSENT_MAX_DAYS * 24 * 60 * 60);

  return payload;
}

// ---------- Google Consent Mode ----------
function ensureDataLayer(){
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
}

// default deny (must happen before gtag config)
function googleConsentDefaultDeny(){
  ensureDataLayer();
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    security_storage: "granted",
  });
}

function googleConsentUpdate(consent){
  if (!window.gtag) return;
  window.gtag("consent", "update", {
    analytics_storage: consent.analytics ? "granted" : "denied",
    ad_storage: consent.marketing ? "granted" : "denied",
    ad_user_data: consent.marketing ? "granted" : "denied",
    ad_personalization: consent.marketing ? "granted" : "denied",
    security_storage: "granted",
  });
}

// ---------- Script loader ----------
function loadScriptOnce(id, src){
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ---------- Tag enablement ----------
let loaded = { ga: false, ads: false, sentry: false };

async function enableGA4(){
  if (loaded.ga) return;
  if (!PESTIFY.GA4_ID || PESTIFY.GA4_ID.includes("XXXX")) return;

  await loadScriptOnce("ga4-gtag", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(PESTIFY.GA4_ID)}`);
  ensureDataLayer();

  window.gtag("js", new Date());
  window.gtag("config", PESTIFY.GA4_ID, {
    anonymize_ip: true,
  });

  loaded.ga = true;
}

async function enableGoogleAds(){
  if (loaded.ads) return;
  if (!PESTIFY.ADS_ID || PESTIFY.ADS_ID.includes("XXXX")) return;

  // If GA4 already loaded gtag.js, no need to load again, but safe if it does.
  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    await loadScriptOnce("ads-gtag", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(PESTIFY.ADS_ID)}`);
    ensureDataLayer();
    window.gtag("js", new Date());
  }

  window.gtag("config", PESTIFY.ADS_ID);
  loaded.ads = true;
}

async function enableSentry(){
  if (loaded.sentry) return;
  if (!PESTIFY.SENTRY_DSN || PESTIFY.SENTRY_DSN.includes("SENTRY")) return;

  // CDN bundle (simple). You can later upgrade to Sentry Loader if desired.
  await loadScriptOnce("sentry-sdk", "https://browser.sentry-cdn.com/7.120.0/bundle.tracing.min.js");

  if (!window.Sentry) return;

  window.Sentry.init({
    dsn: PESTIFY.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });

  loaded.sentry = true;
}

// Performance monitoring (no cookies): basic Web Vitals to console
async function enablePerformanceMonitoring(consent){
  // If you want Web Vitals sent to GA4, do it only when analytics consent exists.
  // For now, we'll keep it cookie-free and lightweight.
  // (Optional next: add web-vitals library and send metrics to GA if consent.analytics)
}

// Apply consent to load correct tags
async function applyConsent(consent){
  googleConsentUpdate(consent);

  if (consent.analytics) {
    await enableGA4();
  }

  if (consent.marketing) {
    await enableGoogleAds();
  }

  const sentryAllowed = PESTIFY.SENTRY_REQUIRES_ANALYTICS_CONSENT ? consent.analytics : true;
  if (sentryAllowed) {
    await enableSentry();
  }

  await enablePerformanceMonitoring(consent);
}

// ---------- UI ----------
function bannerHtml(){
  return `
    <div class="cookie-banner" id="cookieBanner">
      <h4>${consentTranslations.title || 'Cookies & measurement'}</h4>
      <p>${consentTranslations.description || 'We use necessary cookies for security. With your consent, we use analytics and marketing cookies to measure performance and improve the service.'}</p>
      <div class="cookie-actions">
        <button class="primary" data-action="accept">${consentTranslations.accept_all || 'Accept all'}</button>
        <button data-action="reject">${consentTranslations.reject || 'Reject non-essential'}</button>
        <button data-action="customize">${consentTranslations.customize || 'Customize'}</button>
        <a href="privacy.html">${consentTranslations.privacy || 'Privacy'}</a>
      </div>
    </div>
  `;
}

function modalHtml(){
  return `
    <div class="cookie-modal" id="cookieModal" aria-hidden="true">
      <div class="cookie-panel">
        <h4 style="margin:0 0 10px;">${consentTranslations.title || 'Cookie preferences'}</h4>

        <div class="cookie-row">
          <div>
            <strong>${consentTranslations.necessary || 'Necessary'}</strong>
            <small>${consentTranslations.necessary_desc || 'Required for security and basic functionality.'}</small>
          </div>
          <div class="cookie-switch">
            <span>${consentTranslations.always_on || 'Always on'}</span>
            <input type="checkbox" checked disabled>
          </div>
        </div>

        <div class="cookie-row">
          <div>
            <strong>${consentTranslations.analytics || 'Analytics'}</strong>
            <small>${consentTranslations.analytics_desc || 'Helps us understand usage and fix issues (GA4, Sentry).'}</small>
          </div>
          <div class="cookie-switch">
            <label><input type="checkbox" id="toggleAnalytics"> ${consentTranslations.enable || 'Enable'}</label>
          </div>
        </div>

        <div class="cookie-row">
          <div>
            <strong>${consentTranslations.marketing || 'Marketing'}</strong>
            <small>${consentTranslations.marketing_desc || 'Helps us measure campaigns (Google Ads conversions).'}</small>
          </div>
          <div class="cookie-switch">
            <label><input type="checkbox" id="toggleMarketing"> ${consentTranslations.enable || 'Enable'}</label>
          </div>
        </div>

        <div class="cookie-actions" style="margin-top:14px;">
          <button class="primary" data-action="save">${consentTranslations.save || 'Save preferences'}</button>
          <button data-action="close">${consentTranslations.cancel || 'Cancel'}</button>
        </div>
      </div>
    </div>
  `;
}

function openModal(){
  const modal = document.getElementById("cookieModal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  // prefill from current consent if exists
  const c = getConsent();
  if (c) {
    const a = document.getElementById("toggleAnalytics");
    const m = document.getElementById("toggleMarketing");
    if (a) a.checked = !!c.analytics;
    if (m) m.checked = !!c.marketing;
  }
}

function closeModal(){
  const modal = document.getElementById("cookieModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

async function mountUI(){
  // Avoid duplicates
  if (document.getElementById("cookieBanner")) return;

  // Load translations first
  await loadConsentTranslations();

  document.body.insertAdjacentHTML("beforeend", bannerHtml());
  document.body.insertAdjacentHTML("beforeend", modalHtml());

  document.addEventListener("click", async (e) => {
    const action = e.target?.getAttribute?.("data-action");
    if (!action) return;

    if (action === "customize") return openModal();

    if (action === "close") return closeModal();

    if (action === "accept") {
      const c = setConsent({ analytics: true, marketing: true });
      document.getElementById("cookieBanner")?.remove();
      closeModal();
      await applyConsent(c);
      return;
    }

    if (action === "reject") {
      const c = setConsent({ analytics: false, marketing: false });
      document.getElementById("cookieBanner")?.remove();
      closeModal();
      await applyConsent(c);
      return;
    }

    if (action === "save") {
      const analytics = !!document.getElementById("toggleAnalytics")?.checked;
      const marketing = !!document.getElementById("toggleMarketing")?.checked;
      const c = setConsent({ analytics, marketing });
      document.getElementById("cookieBanner")?.remove();
      closeModal();
      await applyConsent(c);
      return;
    }
  });
}

// Expose a public API for "Cookie Settings" page/link
window.PestifyConsent = {
  open: openModal,
  reset: function(){
    // Clear cookie + storage (useful for testing)
    try { localStorage.removeItem(PESTIFY.CONSENT_KEY); } catch {}
    writeCookie(PESTIFY.CONSENT_KEY, "", 0);
    location.reload();
  }
};

// ---------- Boot ----------
(async function init(){
  // Must set default deny before any tag loads
  googleConsentDefaultDeny();

  const consent = getConsent();
  if (!consent) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mountUI);
    } else {
      await mountUI();
    }
    return;
  }

  // Consent already stored -> apply
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyConsent(consent));
  } else {
    await applyConsent(consent);
  }
})();