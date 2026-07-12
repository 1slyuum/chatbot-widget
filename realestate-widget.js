/* Real Estate Chatbot Widget - https://github.com/YOUR_ORG/realestate-chatbot-widget - MIT License */
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/i18n.js
  var i18n_exports = {};
  __export(i18n_exports, {
    EN_STRINGS: () => EN_STRINGS,
    detectLocale: () => detectLocale,
    resolveUiStrings: () => resolveUiStrings
  });
  function detectLocale() {
    return navigator.languages && navigator.languages[0] || navigator.language || "en";
  }
  function cacheKey(locale) {
    return `${STORAGE_PREFIX}${locale}`;
  }
  function readCache(locale) {
    try {
      const raw = localStorage.getItem(cacheKey(locale));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function writeCache(locale, strings) {
    try {
      localStorage.setItem(cacheKey(locale), JSON.stringify(strings));
    } catch {
    }
  }
  async function resolveUiStrings(aiProvider, locale) {
    if (!locale || locale.toLowerCase().startsWith("en")) return { ...EN_STRINGS };
    const cached = readCache(locale);
    if (cached) return { ...EN_STRINGS, ...cached };
    const translated = await aiProvider.translateStrings(EN_STRINGS, locale);
    writeCache(locale, translated);
    return { ...EN_STRINGS, ...translated };
  }
  var EN_STRINGS, STORAGE_PREFIX;
  var init_i18n = __esm({
    "src/i18n.js"() {
      EN_STRINGS = {
        launcherLabel: "Chat with us",
        headerTitle: "Chat with us",
        headerSubtitle: "We typically reply in a few minutes",
        inputPlaceholder: "Type your message\u2026",
        send: "Send",
        close: "Close chat",
        minimize: "Minimize chat",
        typing: "Typing\u2026",
        quickFaq: "Ask a question",
        quickProperties: "Search properties",
        quickAgent: "Talk to an agent",
        quickSchedule: "Book a tour",
        leadFormTitle: "Let's get you connected",
        leadFormName: "Name",
        leadFormEmail: "Email",
        leadFormPhone: "Phone",
        leadFormSubmit: "Submit",
        leadFormCancel: "Cancel",
        leadFormSuccess: "Thanks! We've got your info and will be in touch.",
        handoffBanner: "We've notified an agent \u2014 they'll join shortly.",
        scheduleCta: "Book an appointment",
        scheduleRedirectNotice: "Taking you to our scheduling page\u2026",
        propertyResultsTitle: "Properties for you",
        propertyNoResults: "I couldn't find matches for that. Want to try different filters?",
        propertyFilterLocation: "Location",
        propertyFilterMinPrice: "Min price",
        propertyFilterMaxPrice: "Max price",
        propertyFilterBeds: "Bedrooms",
        propertySearch: "Search",
        viewListing: "View listing",
        errorGeneric: "Sorry, something went wrong on our end. Please try again.",
        a11yMessageLogLabel: "Conversation with support assistant",
        a11yNewMessage: "New message",
        poweredBy: "Powered by"
      };
      STORAGE_PREFIX = "rechat_i18n_";
    }
  });

  // src/styles.css
  var styles_default = '/* All colors/typography come from CSS custom properties set by theme.js,\n   so this file never hardcodes brand colors -- it only defines structure. */\n\n:host {\n  all: initial;\n  font-family: var(--rechat-font);\n  --rechat-z: 2147483000;\n}\n\n* {\n  box-sizing: border-box;\n}\n\n.root {\n  position: fixed;\n  z-index: var(--rechat-z);\n  bottom: 20px;\n  inset-inline-end: 20px;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  font-family: var(--rechat-font);\n}\n\n.root[data-position="bottom-left"] {\n  inset-inline-end: auto;\n  inset-inline-start: 20px;\n  align-items: flex-start;\n}\n\n/* ---------- Launcher button ---------- */\n.launcher {\n  display: inline-flex;\n  align-items: center;\n  gap: 10px;\n  border: none;\n  cursor: pointer;\n  background: var(--rechat-primary);\n  color: var(--rechat-primary-contrast);\n  padding: 14px 18px;\n  border-radius: 999px;\n  box-shadow: var(--rechat-shadow);\n  font-size: 15px;\n  font-weight: 600;\n  line-height: 1;\n  transition: transform 0.15s ease, box-shadow 0.15s ease;\n}\n.launcher:hover { transform: translateY(-1px); }\n.launcher:focus-visible {\n  outline: 3px solid var(--rechat-primary);\n  outline-offset: 3px;\n}\n.launcher .dot {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background: #22c55e;\n  box-shadow: 0 0 0 2px color-mix(in srgb, var(--rechat-primary-contrast) 30%, transparent);\n  flex: none;\n}\n.launcher svg { width: 20px; height: 20px; flex: none; }\n.launcher.is-open { display: none; }\n\n/* ---------- Panel ---------- */\n.panel {\n  width: 380px;\n  max-width: calc(100vw - 24px);\n  height: 600px;\n  max-height: calc(100vh - 100px);\n  background: var(--rechat-surface);\n  color: var(--rechat-text);\n  border: 1px solid var(--rechat-border);\n  border-radius: var(--rechat-radius);\n  box-shadow: var(--rechat-shadow);\n  display: none;\n  flex-direction: column;\n  overflow: hidden;\n  margin-bottom: 12px;\n}\n.panel.is-open { display: flex; }\n\n@media (max-width: 480px) {\n  .root {\n    bottom: 0;\n    inset-inline-end: 0;\n    inset-inline-start: 0;\n    align-items: stretch;\n    padding: 0 12px 12px;\n  }\n  .panel {\n    width: 100%;\n    max-width: 100%;\n    height: 100dvh;\n    max-height: 100dvh;\n    border-radius: 0;\n    margin-bottom: 0;\n  }\n  .launcher {\n    align-self: flex-end;\n    margin-bottom: 12px;\n  }\n}\n\n/* ---------- Header ---------- */\n.header {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 14px 16px;\n  background: var(--rechat-surface-raised);\n  border-bottom: 1px solid var(--rechat-border);\n  flex: none;\n}\n.header .avatar {\n  width: 34px;\n  height: 34px;\n  border-radius: 50%;\n  background: var(--rechat-primary);\n  color: var(--rechat-primary-contrast);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-weight: 700;\n  flex: none;\n}\n.header .titles { display: flex; flex-direction: column; min-width: 0; flex: 1; }\n.header .title { font-size: 14.5px; font-weight: 700; }\n.header .subtitle { font-size: 12px; color: var(--rechat-text-muted); }\n.header .icon-btn {\n  background: transparent;\n  border: none;\n  color: var(--rechat-text-muted);\n  cursor: pointer;\n  padding: 6px;\n  border-radius: var(--rechat-radius-sm);\n  display: flex;\n}\n.header .icon-btn:hover { background: var(--rechat-border); color: var(--rechat-text); }\n.header .icon-btn:focus-visible { outline: 2px solid var(--rechat-primary); outline-offset: 2px; }\n\n/* ---------- Quick actions ---------- */\n.quick-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  padding: 10px 14px;\n  border-bottom: 1px solid var(--rechat-border);\n  flex: none;\n}\n.chip {\n  border: 1px solid var(--rechat-border);\n  background: var(--rechat-surface-raised);\n  color: var(--rechat-text);\n  border-radius: 999px;\n  padding: 7px 12px;\n  font-size: 12.5px;\n  cursor: pointer;\n  font-family: inherit;\n}\n.chip:hover { border-color: var(--rechat-primary); }\n.chip:focus-visible { outline: 2px solid var(--rechat-primary); outline-offset: 1px; }\n\n/* ---------- Message log ---------- */\n.log {\n  flex: 1;\n  overflow-y: auto;\n  padding: 14px;\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  scroll-behavior: smooth;\n}\n.msg {\n  max-width: 84%;\n  padding: 10px 13px;\n  border-radius: var(--rechat-radius-sm);\n  font-size: 14px;\n  line-height: 1.45;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n.msg.user {\n  align-self: flex-end;\n  background: var(--rechat-primary);\n  color: var(--rechat-primary-contrast);\n  border-bottom-right-radius: 3px;\n}\n.msg.assistant {\n  align-self: flex-start;\n  background: var(--rechat-surface-raised);\n  border: 1px solid var(--rechat-border);\n  border-bottom-left-radius: 3px;\n}\n.msg.system {\n  align-self: center;\n  background: transparent;\n  color: var(--rechat-text-muted);\n  font-size: 12.5px;\n  text-align: center;\n  max-width: 100%;\n}\n.typing-indicator {\n  align-self: flex-start;\n  display: flex;\n  gap: 4px;\n  padding: 12px 14px;\n  background: var(--rechat-surface-raised);\n  border: 1px solid var(--rechat-border);\n  border-radius: var(--rechat-radius-sm);\n}\n.typing-indicator span {\n  width: 6px; height: 6px; border-radius: 50%;\n  background: var(--rechat-text-muted);\n  animation: rechat-bounce 1.2s infinite ease-in-out;\n}\n.typing-indicator span:nth-child(2) { animation-delay: 0.15s; }\n.typing-indicator span:nth-child(3) { animation-delay: 0.3s; }\n@keyframes rechat-bounce {\n  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }\n  30% { transform: translateY(-4px); opacity: 1; }\n}\n@media (prefers-reduced-motion: reduce) {\n  .typing-indicator span { animation: none; opacity: 0.8; }\n  .launcher, .chip { transition: none; }\n}\n\n/* ---------- Property cards ---------- */\n.property-list { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }\n.property-card {\n  border: 1px solid var(--rechat-border);\n  border-radius: var(--rechat-radius-sm);\n  padding: 10px;\n  background: var(--rechat-surface);\n  font-size: 13px;\n}\n.property-card .p-title { font-weight: 700; margin-bottom: 2px; }\n.property-card .p-meta { color: var(--rechat-text-muted); margin-bottom: 6px; }\n.property-card .p-price { font-weight: 700; color: var(--rechat-primary); }\n.property-card a.p-link {\n  display: inline-block;\n  margin-top: 6px;\n  color: var(--rechat-primary);\n  font-weight: 600;\n  text-decoration: none;\n  font-size: 12.5px;\n}\n.property-card a.p-link:hover { text-decoration: underline; }\n\n/* ---------- Lead form ---------- */\n.lead-form {\n  border: 1px solid var(--rechat-border);\n  border-radius: var(--rechat-radius-sm);\n  padding: 12px;\n  background: var(--rechat-surface-raised);\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  margin-top: 4px;\n}\n.lead-form .lf-title { font-weight: 700; font-size: 13.5px; }\n.field { display: flex; flex-direction: column; gap: 3px; }\n.field label { font-size: 12px; color: var(--rechat-text-muted); }\n.field input {\n  font-family: inherit;\n  font-size: 14px;\n  padding: 8px 10px;\n  border-radius: var(--rechat-radius-sm);\n  border: 1px solid var(--rechat-border);\n  background: var(--rechat-surface);\n  color: var(--rechat-text);\n}\n.field input:focus-visible { outline: 2px solid var(--rechat-primary); outline-offset: 1px; }\n.lead-form .lf-actions { display: flex; gap: 8px; margin-top: 2px; }\n\n/* ---------- Buttons ---------- */\n.btn {\n  font-family: inherit;\n  font-size: 13.5px;\n  font-weight: 600;\n  padding: 9px 14px;\n  border-radius: var(--rechat-radius-sm);\n  border: 1px solid transparent;\n  cursor: pointer;\n}\n.btn-primary { background: var(--rechat-primary); color: var(--rechat-primary-contrast); }\n.btn-primary:hover { background: var(--rechat-primary-hover); }\n.btn-secondary { background: transparent; border-color: var(--rechat-border); color: var(--rechat-text); }\n.btn-secondary:hover { background: var(--rechat-border); }\n.btn:focus-visible { outline: 2px solid var(--rechat-primary); outline-offset: 2px; }\n.btn:disabled { opacity: 0.6; cursor: not-allowed; }\n\n/* ---------- Handoff banner ---------- */\n.handoff-banner {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 12.5px;\n  padding: 8px 12px;\n  background: color-mix(in srgb, var(--rechat-primary) 12%, var(--rechat-surface));\n  border-bottom: 1px solid var(--rechat-border);\n  color: var(--rechat-text);\n  flex: none;\n}\n.handoff-banner .pulse {\n  width: 8px; height: 8px; border-radius: 50%;\n  background: var(--rechat-primary);\n  flex: none;\n  animation: rechat-pulse 1.6s infinite;\n}\n@keyframes rechat-pulse {\n  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--rechat-primary) 50%, transparent); }\n  70% { box-shadow: 0 0 0 6px transparent; }\n  100% { box-shadow: 0 0 0 0 transparent; }\n}\n\n/* ---------- Composer ---------- */\n.composer {\n  display: flex;\n  gap: 8px;\n  padding: 10px;\n  border-top: 1px solid var(--rechat-border);\n  background: var(--rechat-surface-raised);\n  flex: none;\n}\n.composer textarea {\n  flex: 1;\n  resize: none;\n  font-family: inherit;\n  font-size: 14px;\n  padding: 10px 12px;\n  border-radius: var(--rechat-radius-sm);\n  border: 1px solid var(--rechat-border);\n  background: var(--rechat-surface);\n  color: var(--rechat-text);\n  max-height: 110px;\n  line-height: 1.35;\n}\n.composer textarea:focus-visible { outline: 2px solid var(--rechat-primary); outline-offset: 1px; }\n.composer .send-btn {\n  flex: none;\n  width: 40px;\n  height: 40px;\n  border-radius: 50%;\n  background: var(--rechat-primary);\n  color: var(--rechat-primary-contrast);\n  border: none;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n}\n.composer .send-btn:hover { background: var(--rechat-primary-hover); }\n.composer .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }\n.composer .send-btn:focus-visible { outline: 2px solid var(--rechat-primary); outline-offset: 2px; }\n\n.footer-branding {\n  text-align: center;\n  font-size: 10.5px;\n  color: var(--rechat-text-muted);\n  padding: 4px 0 8px;\n  flex: none;\n}\n.footer-branding a { color: inherit; }\n\n.sr-only {\n  position: absolute;\n  width: 1px; height: 1px;\n  padding: 0; margin: -1px;\n  overflow: hidden;\n  clip: rect(0,0,0,0);\n  white-space: nowrap;\n  border: 0;\n}\n';

  // src/theme.js
  var CANDIDATE_SELECTORS = [
    '[class*="btn-primary"]',
    '[class*="button-primary"]',
    'button[type="submit"]',
    "a.button",
    "header nav a",
    "header",
    "nav",
    ".navbar",
    "a"
  ];
  function parseColor(str) {
    if (!str) return null;
    const el2 = document.createElement("div");
    el2.style.color = str;
    document.body.appendChild(el2);
    const computed = getComputedStyle(el2).color;
    document.body.removeChild(el2);
    const m = computed.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(",").map((n) => parseFloat(n.trim()));
    const [r, g, b, a = 1] = parts;
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
  }
  function relativeLuminance({ r, g, b }) {
    const srgb = [r, g, b].map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }
  function saturation({ r, g, b }) {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    return max === 0 ? 0 : (max - min) / max;
  }
  function isNearNeutral(rgb) {
    const sat = saturation(rgb);
    const lum = relativeLuminance(rgb);
    return sat < 0.12 || lum > 0.96 || lum < 0.04;
  }
  function toHex({ r, g, b }) {
    const h = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  }
  function mix(rgbA, rgbB, amount) {
    return {
      r: rgbA.r + (rgbB.r - rgbA.r) * amount,
      g: rgbA.g + (rgbB.g - rgbA.g) * amount,
      b: rgbA.b + (rgbB.b - rgbA.b) * amount
    };
  }
  var WHITE = { r: 255, g: 255, b: 255 };
  var BLACK = { r: 0, g: 0, b: 0 };
  function detectHostIsDark(explicitOverride) {
    if (explicitOverride === "dark") return true;
    if (explicitOverride === "light") return false;
    const html = document.documentElement;
    const body = document.body;
    const markers = [html.classList, body == null ? void 0 : body.classList].filter(Boolean);
    for (const list of markers) {
      if (list.contains("dark") || list.contains("dark-mode") || list.contains("theme-dark")) return true;
      if (list.contains("light") || list.contains("light-mode") || list.contains("theme-light")) return false;
    }
    const dataTheme = html.getAttribute("data-theme") || (body == null ? void 0 : body.getAttribute("data-theme"));
    if (dataTheme) {
      if (/dark/i.test(dataTheme)) return true;
      if (/light/i.test(dataTheme)) return false;
    }
    const bg = parseColor(getComputedStyle(body || html).backgroundColor);
    if (bg && bg.a > 0.5) {
      return relativeLuminance(bg) < 0.4;
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function detectBrandColor() {
    const seen = /* @__PURE__ */ new Set();
    for (const selector of CANDIDATE_SELECTORS) {
      let els;
      try {
        els = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      for (const el2 of els) {
        if (seen.has(el2)) continue;
        seen.add(el2);
        const style = getComputedStyle(el2);
        for (const prop of ["backgroundColor", "color"]) {
          const rgb = parseColor(style[prop]);
          if (rgb && rgb.a > 0.5 && !isNearNeutral(rgb)) {
            return rgb;
          }
        }
        if (seen.size > 40) break;
      }
    }
    return null;
  }
  var DEFAULT_BRAND = { r: 31, g: 111, b: 92 };
  function computeTheme(themeOverride = "auto", colorOverride) {
    const isDark = detectHostIsDark(themeOverride === "auto" ? null : themeOverride);
    const brand = colorOverride && parseColor(colorOverride) || detectBrandColor() || DEFAULT_BRAND;
    const primary = brand;
    const primaryContrast = relativeLuminance(primary) > 0.55 ? BLACK : WHITE;
    const surface = isDark ? mix(BLACK, primary, 0.06) : mix(WHITE, primary, 0.02);
    const surfaceRaised = isDark ? mix(BLACK, WHITE, 0.12) : WHITE;
    const text = isDark ? mix(WHITE, primary, 0.05) : mix(BLACK, primary, 0.02);
    const textMuted = isDark ? mix(WHITE, BLACK, 0.35) : mix(BLACK, WHITE, 0.4);
    const border = isDark ? mix(WHITE, BLACK, 0.78) : mix(BLACK, WHITE, 0.85);
    return {
      mode: isDark ? "dark" : "light",
      vars: {
        "--rechat-primary": toHex(primary),
        "--rechat-primary-contrast": toHex(primaryContrast),
        "--rechat-primary-hover": toHex(mix(primary, isDark ? WHITE : BLACK, 0.12)),
        "--rechat-surface": toHex(surface),
        "--rechat-surface-raised": toHex(surfaceRaised),
        "--rechat-text": toHex(text),
        "--rechat-text-muted": toHex(textMuted),
        "--rechat-border": toHex(border),
        "--rechat-danger": isDark ? "#f87171" : "#dc2626",
        "--rechat-radius": "14px",
        "--rechat-radius-sm": "8px",
        "--rechat-shadow": isDark ? "0 12px 32px rgba(0,0,0,0.55)" : "0 12px 32px rgba(15,23,42,0.16)",
        "--rechat-font": getComputedStyle(document.body || document.documentElement).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }
    };
  }
  function applyTheme(el2, theme) {
    for (const [key, value] of Object.entries(theme.vars)) {
      el2.style.setProperty(key, value);
    }
    el2.setAttribute("data-rechat-theme", theme.mode);
  }
  function watchHostTheme({ themeOverride, colorOverride, onChange }) {
    var _a;
    if (themeOverride !== "auto") return () => {
    };
    const recompute = () => onChange(computeTheme(themeOverride, colorOverride));
    const observer = new MutationObserver(recompute);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme"] });
    }
    let mql;
    if (window.matchMedia) {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
      (_a = mql.addEventListener) == null ? void 0 : _a.call(mql, "change", recompute);
    }
    return () => {
      var _a2;
      observer.disconnect();
      (_a2 = mql == null ? void 0 : mql.removeEventListener) == null ? void 0 : _a2.call(mql, "change", recompute);
    };
  }

  // src/widget.js
  init_i18n();

  // src/adapters/ai-provider.js
  var AIProvider = class {
    /**
     * @param {Array<{role: 'user'|'assistant'|'system', content: string}>} messages
     *        Full conversation history, oldest first.
     * @param {object} context
     * @param {string} context.locale        BCP-47 language tag the reply should be written in.
     * @param {object} context.visitor       Any known lead/visitor info collected so far.
     * @param {object} context.siteContext   { pageUrl, pageTitle, agencyName }
     * @returns {Promise<{
     *   reply: string,
     *   intent?: 'faq'|'lead_capture'|'property_search'|'handoff'|'schedule'|'chit_chat',
     *   entities?: object,
     *   suggestedActions?: Array<{label: string, action: string, payload?: object}>
     * }>}
     */
    // eslint-disable-next-line no-unused-vars
    async sendMessage(messages, context) {
      throw new Error("AIProvider.sendMessage() must be implemented by a subclass");
    }
    /**
     * Optional: translate a batch of short UI strings into `locale`.
     * Default implementation asks sendMessage() to do it as a structured task.
     * Providers may override this with something cheaper/faster.
     * @param {Record<string,string>} strings  key -> English source text
     * @param {string} locale
     * @returns {Promise<Record<string,string>>}
     */
    async translateStrings(strings, locale) {
      if (!locale || locale.startsWith("en")) return strings;
      try {
        const keys = Object.keys(strings);
        const prompt = `Translate each value in this JSON object into the language with BCP-47 tag "${locale}". Keep the same keys. Keep translations short (these are UI button/placeholder labels, not sentences). Respond with ONLY minified JSON, no prose, no markdown fences.

` + JSON.stringify(strings);
        const result = await this.sendMessage([{ role: "user", content: prompt }], {
          locale,
          visitor: {},
          siteContext: {}
        });
        const cleaned = result.reply.trim().replace(/^```json|```$/g, "").trim();
        const parsed = JSON.parse(cleaned);
        for (const key of keys) {
          if (typeof parsed[key] !== "string" || !parsed[key]) parsed[key] = strings[key];
        }
        return parsed;
      } catch (err) {
        console.warn("[realestate-chatbot] UI translation failed, falling back to English.", err);
        return strings;
      }
    }
  };
  var RestAIProvider = class extends AIProvider {
    /**
     * @param {object} opts
     * @param {string} opts.endpoint   Full URL to POST to.
     * @param {Record<string,string>} [opts.headers]  Extra headers (e.g. a public client key).
     * @param {number} [opts.timeoutMs]
     */
    constructor({ endpoint, headers = {}, timeoutMs = 2e4 }) {
      super();
      if (!endpoint) throw new Error("RestAIProvider requires an `endpoint` URL");
      this.endpoint = endpoint;
      this.headers = headers;
      this.timeoutMs = timeoutMs;
    }
    async sendMessage(messages, context) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(this.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...this.headers },
          body: JSON.stringify({ messages, ...context }),
          signal: controller.signal
        });
        if (!res.ok) {
          throw new Error(`AI endpoint responded with HTTP ${res.status}`);
        }
        const data = await res.json();
        if (typeof data.reply !== "string") {
          throw new Error('AI endpoint response is missing a string "reply" field');
        }
        return data;
      } finally {
        clearTimeout(timer);
      }
    }
  };
  var MockAIProvider = class extends AIProvider {
    async sendMessage(messages) {
      const last = [...messages].reverse().find((m) => m.role === "user");
      const text = ((last == null ? void 0 : last.content) || "").toLowerCase();
      if (/(schedule|book|tour|visit|appointment)/.test(text)) {
        return {
          reply: "I'd love to get you on the calendar. I'll take you to our scheduling page to pick a time that works for you.",
          intent: "schedule"
        };
      }
      if (/(agent|human|person|talk to someone|representative)/.test(text)) {
        return {
          reply: "Sure, I'm connecting you with one of our agents now \u2014 they'll jump in shortly. Feel free to keep chatting here in the meantime.",
          intent: "handoff"
        };
      }
      if (/(bed|bath|price|\$|budget|neighborhood|listing|house|condo|apartment|property)/.test(text)) {
        return {
          reply: "Let's find you some options. What area, budget, and number of bedrooms are you thinking?",
          intent: "property_search"
        };
      }
      if (/(email|phone|contact|name)/.test(text)) {
        return {
          reply: "Happy to have someone follow up. Could I get your name and best email or phone number?",
          intent: "lead_capture"
        };
      }
      return {
        reply: "Thanks for reaching out! I can answer questions about our listings, help you search properties, connect you with an agent, or get you scheduled for a tour. What can I help with?",
        intent: "faq"
      };
    }
  };

  // src/adapters/property-provider.js
  var PropertyProvider = class {
    /**
     * @param {object} filters
     * @param {string} [filters.location]
     * @param {number} [filters.minPrice]
     * @param {number} [filters.maxPrice]
     * @param {number} [filters.beds]
     * @param {number} [filters.baths]
     * @param {string} [filters.propertyType]
     * @param {number} [filters.limit]
     * @returns {Promise<Array<{
     *   id: string,
     *   title: string,
     *   price: number,
     *   currency?: string,
     *   beds?: number,
     *   baths?: number,
     *   sqft?: number,
     *   address?: string,
     *   imageUrl?: string,
     *   url?: string
     * }>>}
     */
    // eslint-disable-next-line no-unused-vars
    async search(filters) {
      throw new Error("PropertyProvider.search() must be implemented by a subclass");
    }
  };
  var RestPropertyProvider = class extends PropertyProvider {
    /**
     * @param {object} opts
     * @param {string} opts.endpoint  Base URL of your listings search API.
     * @param {Record<string,string>} [opts.headers]  Extra headers (public API key, etc).
     * @param {(filters: object) => Record<string,string>} [opts.mapFilters]
     *        Optional hook to rename/reshape filters to match your API's query
     *        param names before they're sent (e.g. { location } -> { city }).
     * @param {(raw: any) => Array<object>} [opts.mapResults]
     *        Optional hook to reshape your API's response into the listing
     *        shape the widget expects.
     * @param {number} [opts.timeoutMs]
     */
    constructor({ endpoint, headers = {}, mapFilters, mapResults, timeoutMs = 15e3 }) {
      super();
      if (!endpoint) throw new Error("RestPropertyProvider requires an `endpoint` URL");
      this.endpoint = endpoint;
      this.headers = headers;
      this.mapFilters = mapFilters || ((f) => f);
      this.mapResults = mapResults || ((raw) => Array.isArray(raw) ? raw : (raw == null ? void 0 : raw.results) || []);
      this.timeoutMs = timeoutMs;
    }
    async search(filters) {
      const params = new URLSearchParams();
      const mapped = this.mapFilters(filters) || {};
      for (const [key, value] of Object.entries(mapped)) {
        if (value !== void 0 && value !== null && value !== "") params.set(key, String(value));
      }
      const url = `${this.endpoint}${this.endpoint.includes("?") ? "&" : "?"}${params.toString()}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(url, { method: "GET", headers: this.headers, signal: controller.signal });
        if (!res.ok) throw new Error(`Property search API responded with HTTP ${res.status}`);
        const raw = await res.json();
        return this.mapResults(raw);
      } finally {
        clearTimeout(timer);
      }
    }
  };
  var MockPropertyProvider = class extends PropertyProvider {
    constructor() {
      super();
      this.listings = [
        { id: "demo-1", title: "Sunny 3BR Craftsman", price: 485e3, beds: 3, baths: 2, sqft: 1650, address: "212 Maple St", imageUrl: "", url: "#" },
        { id: "demo-2", title: "Downtown Loft with City Views", price: 349e3, beds: 1, baths: 1, sqft: 820, address: "88 5th Ave #12B", imageUrl: "", url: "#" },
        { id: "demo-3", title: "Modern 4BR Family Home", price: 612e3, beds: 4, baths: 3, sqft: 2400, address: "47 Willow Ct", imageUrl: "", url: "#" },
        { id: "demo-4", title: "Cozy 2BR Bungalow", price: 275e3, beds: 2, baths: 1, sqft: 980, address: "19 Oak Ln", imageUrl: "", url: "#" }
      ];
    }
    async search(filters) {
      let results = this.listings;
      if (filters.beds) results = results.filter((l) => l.beds >= filters.beds);
      if (filters.minPrice) results = results.filter((l) => l.price >= filters.minPrice);
      if (filters.maxPrice) results = results.filter((l) => l.price <= filters.maxPrice);
      return results.slice(0, filters.limit || 5);
    }
  };

  // src/adapters/n8n-client.js
  var N8nClient = class {
    /**
     * @param {object} opts
     * @param {string} [opts.leadsWebhookUrl]
     * @param {string} [opts.eventsWebhookUrl]
     * @param {string} [opts.conversationWebhookUrl]
     * @param {string} [opts.handoffWebhookUrl]
     * @param {string} opts.sessionId
     * @param {() => object} opts.getSiteContext
     * @param {(err: Error, kind: string) => void} [opts.onError]
     */
    constructor({
      leadsWebhookUrl,
      eventsWebhookUrl,
      conversationWebhookUrl,
      handoffWebhookUrl,
      sessionId,
      getSiteContext,
      onError
    }) {
      this.urls = { leadsWebhookUrl, eventsWebhookUrl, conversationWebhookUrl, handoffWebhookUrl };
      this.sessionId = sessionId;
      this.getSiteContext = getSiteContext || (() => ({}));
      this.onError = onError || (() => {
      });
    }
    async _post(url, body, kind) {
      if (!url) return;
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          keepalive: true
        });
      } catch (err) {
        console.warn(`[realestate-chatbot] n8n ${kind} webhook failed`, err);
        this.onError(err, kind);
      }
    }
    sendLead(lead, conversation) {
      return this._post(
        this.urls.leadsWebhookUrl,
        {
          type: "lead",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          sessionId: this.sessionId,
          lead,
          siteContext: this.getSiteContext(),
          conversation
        },
        "leads"
      );
    }
    sendEvent(event, data = {}) {
      return this._post(
        this.urls.eventsWebhookUrl,
        {
          type: "event",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          sessionId: this.sessionId,
          event,
          data,
          siteContext: this.getSiteContext()
        },
        "events"
      );
    }
    sendConversation(messages, locale) {
      return this._post(
        this.urls.conversationWebhookUrl,
        {
          type: "conversation",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          sessionId: this.sessionId,
          messages,
          locale,
          siteContext: this.getSiteContext()
        },
        "conversation"
      );
    }
    sendHandoff({ reason, lead = null, conversation }) {
      return this._post(
        this.urls.handoffWebhookUrl,
        {
          type: "handoff",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          sessionId: this.sessionId,
          reason,
          lead,
          conversation,
          siteContext: this.getSiteContext()
        },
        "handoff"
      );
    }
  };

  // src/widget.js
  var TAG_NAME = "realestate-chatbot-widget";
  function uuid() {
    var _a;
    if ((_a = window.crypto) == null ? void 0 : _a.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === void 0 || value === null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (key === "text") node.textContent = value;
      else if (key === "html") node.innerHTML = value;
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) {
      if (child === null || child === void 0 || child === false) continue;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }
  var ICONS = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    minimize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>'
  };
  var FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var RealEstateChatbotWidget = class extends HTMLElement {
    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: "open" });
      this.sessionId = this._loadOrCreateSessionId();
      this.aiMessages = [];
      this.isOpen = false;
      this.isSending = false;
      this.leadCollected = null;
      this._themeCleanup = null;
      this._conversationSyncTimer = null;
    }
    /** @param {object} config see README "Configuration reference" for full list */
    configure(config = {}) {
      this.config = {
        position: "bottom-right",
        // or 'bottom-left'
        theme: "auto",
        // 'auto' | 'light' | 'dark'
        primaryColor: null,
        // CSS color string override, e.g. '#0ea5e9'
        agencyName: "Real Estate Assistant",
        avatarInitial: null,
        greeting: "Hi! I'm here to help with listings, questions, or connecting you with an agent.",
        locale: null,
        // BCP-47 override; null = auto-detect from browser
        scheduleUrl: null,
        // required for the "Book a tour" action to work
        aiEndpoint: null,
        aiProvider: null,
        // pass an AIProvider instance to bypass aiEndpoint entirely
        propertyApiEndpoint: null,
        propertyProvider: null,
        // pass a PropertyProvider instance to bypass propertyApiEndpoint
        leadsWebhookUrl: null,
        eventsWebhookUrl: null,
        conversationWebhookUrl: null,
        handoffWebhookUrl: null,
        ...config
      };
      this.aiProvider = this.config.aiProvider || (this.config.aiEndpoint ? new RestAIProvider({ endpoint: this.config.aiEndpoint }) : new MockAIProvider());
      this.propertyProvider = this.config.propertyProvider || (this.config.propertyApiEndpoint ? new RestPropertyProvider({ endpoint: this.config.propertyApiEndpoint }) : new MockPropertyProvider());
      this.n8n = new N8nClient({
        leadsWebhookUrl: this.config.leadsWebhookUrl,
        eventsWebhookUrl: this.config.eventsWebhookUrl,
        conversationWebhookUrl: this.config.conversationWebhookUrl,
        handoffWebhookUrl: this.config.handoffWebhookUrl,
        sessionId: this.sessionId,
        getSiteContext: () => this._siteContext()
      });
      return this;
    }
    _loadOrCreateSessionId() {
      try {
        const existing = sessionStorage.getItem("rechat_session_id");
        if (existing) return existing;
        const fresh = uuid();
        sessionStorage.setItem("rechat_session_id", fresh);
        return fresh;
      } catch {
        return uuid();
      }
    }
    _siteContext() {
      return {
        pageUrl: location.href,
        pageTitle: document.title,
        agencyName: this.config.agencyName
      };
    }
    async connectedCallback() {
      this.locale = this.config.locale || detectLocale();
      this.strings = await resolveUiStrings(this.aiProvider, this.locale).catch(() => null);
      if (!this.strings) {
        const { EN_STRINGS: EN_STRINGS2 } = await Promise.resolve().then(() => (init_i18n(), i18n_exports));
        this.strings = EN_STRINGS2;
      }
      this._render();
      this._applyThemeNow();
      this._themeCleanup = watchHostTheme({
        themeOverride: this.config.theme,
        colorOverride: this.config.primaryColor,
        onChange: (theme) => applyTheme(this.rootEl, theme)
      });
      this._pushAssistantMessage(this.config.greeting, { skipHistory: false });
    }
    disconnectedCallback() {
      var _a;
      (_a = this._themeCleanup) == null ? void 0 : _a.call(this);
      clearTimeout(this._conversationSyncTimer);
    }
    _applyThemeNow() {
      const theme = computeTheme(this.config.theme, this.config.primaryColor);
      applyTheme(this.rootEl, theme);
    }
    // ---------------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------------
    _render() {
      const style = el("style", { text: styles_default });
      const t = this.strings;
      this.rootEl = el("div", { class: "root", part: "root", "data-position": this.config.position });
      this.launcherEl = el(
        "button",
        {
          class: "launcher",
          type: "button",
          "aria-label": t.launcherLabel,
          "aria-haspopup": "dialog",
          "aria-expanded": "false",
          onclick: () => this.open()
        },
        [el("span", { html: ICONS.chat, "aria-hidden": "true" }), el("span", { text: t.launcherLabel }), el("span", { class: "dot", "aria-hidden": "true" })]
      );
      const initial = (this.config.avatarInitial || this.config.agencyName || "A").trim().charAt(0).toUpperCase();
      this.headerEl = el("div", { class: "header" }, [
        el("div", { class: "avatar", "aria-hidden": "true", text: initial }),
        el("div", { class: "titles" }, [
          el("div", { class: "title", text: this.config.agencyName || t.headerTitle }),
          el("div", { class: "subtitle", text: t.headerSubtitle })
        ]),
        el("button", {
          class: "icon-btn",
          type: "button",
          "aria-label": t.minimize,
          title: t.minimize,
          html: ICONS.minimize,
          onclick: () => this.close()
        }),
        el("button", {
          class: "icon-btn",
          type: "button",
          "aria-label": t.close,
          title: t.close,
          html: ICONS.close,
          onclick: () => this.close()
        })
      ]);
      this.handoffBannerEl = el(
        "div",
        { class: "handoff-banner", role: "status", hidden: true },
        [el("span", { class: "pulse", "aria-hidden": "true" }), el("span", { text: t.handoffBanner })]
      );
      this.quickActionsEl = el("div", { class: "quick-actions", role: "group", "aria-label": t.quickFaq }, [
        this._chip(t.quickProperties, () => this._openPropertySearch()),
        this._chip(t.quickAgent, () => this._requestHandoff("user_requested")),
        this._chip(t.quickSchedule, () => this._handleSchedule())
      ]);
      this.logEl = el("div", {
        class: "log",
        role: "log",
        "aria-live": "polite",
        "aria-relevant": "additions",
        "aria-label": t.a11yMessageLogLabel
      });
      this.textareaEl = el("textarea", {
        rows: "1",
        placeholder: t.inputPlaceholder,
        "aria-label": t.inputPlaceholder,
        onkeydown: (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this._handleSend();
          }
        },
        oninput: (e) => {
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
          this.sendBtnEl.disabled = !e.target.value.trim() || this.isSending;
        }
      });
      this.sendBtnEl = el("button", {
        class: "send-btn",
        type: "button",
        disabled: true,
        "aria-label": t.send,
        html: ICONS.send,
        onclick: () => this._handleSend()
      });
      this.composerEl = el("div", { class: "composer" }, [this.textareaEl, this.sendBtnEl]);
      const footer = el("div", { class: "footer-branding" }, [`${t.poweredBy} `, this.config.agencyName || ""]);
      this.panelEl = el(
        "div",
        {
          class: "panel",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": this.config.agencyName || t.headerTitle,
          onkeydown: (e) => this._handlePanelKeydown(e)
        },
        [this.headerEl, this.handoffBannerEl, this.quickActionsEl, this.logEl, this.composerEl, footer]
      );
      this.rootEl.append(this.panelEl, this.launcherEl);
      this.shadow.append(style, this.rootEl);
    }
    _chip(label, handler) {
      return el("button", { class: "chip", type: "button", onclick: handler, text: label });
    }
    // ---------------------------------------------------------------------
    // Open / close + focus management (accessibility)
    // ---------------------------------------------------------------------
    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.panelEl.classList.add("is-open");
      this.launcherEl.classList.add("is-open");
      this.launcherEl.setAttribute("aria-expanded", "true");
      this._lastFocused = document.activeElement;
      this.textareaEl.focus();
      this.n8n.sendEvent("widget_opened");
    }
    close() {
      var _a;
      if (!this.isOpen) return;
      this.isOpen = false;
      this.panelEl.classList.remove("is-open");
      this.launcherEl.classList.remove("is-open");
      this.launcherEl.setAttribute("aria-expanded", "false");
      this.n8n.sendEvent("widget_closed");
      this._syncConversation(true);
      if ((_a = this._lastFocused) == null ? void 0 : _a.focus) this._lastFocused.focus();
      else this.launcherEl.focus();
    }
    _handlePanelKeydown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        this.close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(this.panelEl.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (elm) => elm.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    // ---------------------------------------------------------------------
    // Messaging
    // ---------------------------------------------------------------------
    _appendLogNode(node) {
      this.logEl.appendChild(node);
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }
    _pushUserMessage(text) {
      this.aiMessages.push({ role: "user", content: text, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      this._appendLogNode(el("div", { class: "msg user" }, text));
    }
    _pushAssistantMessage(text, { skipHistory = false } = {}) {
      if (!skipHistory) {
        this.aiMessages.push({ role: "assistant", content: text, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      }
      this._appendLogNode(el("div", { class: "msg assistant" }, text));
    }
    _pushSystemMessage(text) {
      this._appendLogNode(el("div", { class: "msg system", role: "status" }, text));
    }
    _showTyping() {
      this._typingEl = el("div", { class: "typing-indicator", "aria-hidden": "true" }, [
        el("span"),
        el("span"),
        el("span")
      ]);
      this._appendLogNode(this._typingEl);
    }
    _hideTyping() {
      var _a;
      (_a = this._typingEl) == null ? void 0 : _a.remove();
      this._typingEl = null;
    }
    async _handleSend() {
      const text = this.textareaEl.value.trim();
      if (!text || this.isSending) return;
      this.textareaEl.value = "";
      this.textareaEl.style.height = "auto";
      this.sendBtnEl.disabled = true;
      this._pushUserMessage(text);
      this.n8n.sendEvent("message_sent", { length: text.length });
      await this._requestAiReply();
    }
    async _requestAiReply() {
      this.isSending = true;
      this._showTyping();
      try {
        const result = await this.aiProvider.sendMessage(this.aiMessages, {
          locale: this.locale,
          visitor: this.leadCollected || {},
          siteContext: this._siteContext()
        });
        this._hideTyping();
        this._pushAssistantMessage(result.reply);
        await this._handleIntent(result);
      } catch (err) {
        console.error("[realestate-chatbot] AI provider error", err);
        this._hideTyping();
        this._pushAssistantMessage(this.strings.errorGeneric, { skipHistory: true });
      } finally {
        this.isSending = false;
        this._syncConversation();
      }
    }
    async _handleIntent(result) {
      switch (result.intent) {
        case "lead_capture":
          this._openLeadForm();
          break;
        case "property_search":
          this._openPropertySearch(result.entities);
          break;
        case "handoff":
          await this._requestHandoff("ai_low_confidence");
          break;
        case "schedule":
          this._handleSchedule();
          break;
        default:
          break;
      }
    }
    _syncConversation(immediate = false) {
      clearTimeout(this._conversationSyncTimer);
      const send = () => this.n8n.sendConversation(this.aiMessages, this.locale);
      if (immediate) send();
      else this._conversationSyncTimer = setTimeout(send, 1500);
    }
    // ---------------------------------------------------------------------
    // Lead capture
    // ---------------------------------------------------------------------
    _openLeadForm() {
      const t = this.strings;
      const nameInput = el("input", { type: "text", id: "rechat-name", autocomplete: "name" });
      const emailInput = el("input", { type: "email", id: "rechat-email", autocomplete: "email" });
      const phoneInput = el("input", { type: "tel", id: "rechat-phone", autocomplete: "tel" });
      const form = el(
        "form",
        {
          class: "lead-form",
          "aria-label": t.leadFormTitle,
          onsubmit: (e) => {
            e.preventDefault();
            this._submitLead({ name: nameInput.value.trim(), email: emailInput.value.trim(), phone: phoneInput.value.trim() }, form);
          }
        },
        [
          el("div", { class: "lf-title", text: t.leadFormTitle }),
          el("div", { class: "field" }, [el("label", { for: "rechat-name", text: t.leadFormName }), nameInput]),
          el("div", { class: "field" }, [el("label", { for: "rechat-email", text: t.leadFormEmail }), emailInput]),
          el("div", { class: "field" }, [el("label", { for: "rechat-phone", text: t.leadFormPhone }), phoneInput]),
          el("div", { class: "lf-actions" }, [
            el("button", { class: "btn btn-primary", type: "submit", text: t.leadFormSubmit }),
            el("button", {
              class: "btn btn-secondary",
              type: "button",
              text: t.leadFormCancel,
              onclick: () => form.remove()
            })
          ])
        ]
      );
      this._appendLogNode(form);
      nameInput.focus();
    }
    _submitLead(lead, formNode) {
      if (!lead.email && !lead.phone) {
        const emailField = formNode.querySelector("#rechat-email");
        emailField.setCustomValidity(this.strings.errorGeneric);
        emailField.reportValidity();
        emailField.setCustomValidity("");
        return;
      }
      this.leadCollected = lead;
      formNode.remove();
      this.n8n.sendLead(lead, this.aiMessages);
      this.n8n.sendEvent("lead_submitted", { hasEmail: !!lead.email, hasPhone: !!lead.phone });
      this._pushAssistantMessage(this.strings.leadFormSuccess);
    }
    // ---------------------------------------------------------------------
    // Property search
    // ---------------------------------------------------------------------
    _openPropertySearch(prefill = {}) {
      const t = this.strings;
      const locationInput = el("input", { type: "text", id: "rechat-loc", value: prefill.location || "" });
      const minInput = el("input", { type: "number", id: "rechat-min", value: prefill.minPrice || "", min: "0" });
      const maxInput = el("input", { type: "number", id: "rechat-max", value: prefill.maxPrice || "", min: "0" });
      const bedsInput = el("input", { type: "number", id: "rechat-beds", value: prefill.beds || "", min: "0" });
      const form = el(
        "form",
        {
          class: "lead-form",
          "aria-label": t.propertyResultsTitle,
          onsubmit: (e) => {
            e.preventDefault();
            this._runPropertySearch({
              location: locationInput.value.trim(),
              minPrice: minInput.value ? Number(minInput.value) : void 0,
              maxPrice: maxInput.value ? Number(maxInput.value) : void 0,
              beds: bedsInput.value ? Number(bedsInput.value) : void 0,
              limit: 5
            });
          }
        },
        [
          el("div", { class: "lf-title", text: t.propertyResultsTitle }),
          el("div", { class: "field" }, [el("label", { for: "rechat-loc", text: t.propertyFilterLocation }), locationInput]),
          el("div", { class: "field" }, [el("label", { for: "rechat-min", text: t.propertyFilterMinPrice }), minInput]),
          el("div", { class: "field" }, [el("label", { for: "rechat-max", text: t.propertyFilterMaxPrice }), maxInput]),
          el("div", { class: "field" }, [el("label", { for: "rechat-beds", text: t.propertyFilterBeds }), bedsInput]),
          el("div", { class: "lf-actions" }, [el("button", { class: "btn btn-primary", type: "submit", text: t.propertySearch })])
        ]
      );
      this._appendLogNode(form);
    }
    async _runPropertySearch(filters) {
      const t = this.strings;
      this.n8n.sendEvent("property_search", filters);
      this._showTyping();
      try {
        const results = await this.propertyProvider.search(filters);
        this._hideTyping();
        if (!results.length) {
          this._pushAssistantMessage(t.propertyNoResults);
          return;
        }
        const list = el(
          "div",
          { class: "property-list", role: "list", "aria-label": t.propertyResultsTitle },
          results.map((p) => this._propertyCard(p))
        );
        this._appendLogNode(list);
      } catch (err) {
        console.error("[realestate-chatbot] Property search failed", err);
        this._hideTyping();
        this._pushAssistantMessage(this.strings.errorGeneric, { skipHistory: true });
      }
    }
    _propertyCard(p) {
      const t = this.strings;
      const price = typeof p.price === "number" ? p.price.toLocaleString(this.locale, { style: "currency", currency: p.currency || "USD", maximumFractionDigits: 0 }) : "";
      const meta = [p.beds ? `${p.beds} bd` : null, p.baths ? `${p.baths} ba` : null, p.sqft ? `${p.sqft} sqft` : null, p.address].filter(Boolean).join(" \xB7 ");
      return el("div", { class: "property-card", role: "listitem" }, [
        el("div", { class: "p-title", text: p.title || "Listing" }),
        el("div", { class: "p-meta", text: meta }),
        el("div", { class: "p-price", text: price }),
        p.url ? el("a", { class: "p-link", href: p.url, target: "_blank", rel: "noopener noreferrer", text: t.viewListing }) : null
      ]);
    }
    // ---------------------------------------------------------------------
    // Human handoff
    // ---------------------------------------------------------------------
    async _requestHandoff(reason) {
      this.handoffBannerEl.hidden = false;
      this.n8n.sendEvent("handoff_requested", { reason });
      await this.n8n.sendHandoff({ reason, lead: this.leadCollected, conversation: this.aiMessages });
      this._pushSystemMessage(this.strings.handoffBanner);
    }
    // ---------------------------------------------------------------------
    // Scheduling (redirect-only, never books inside the widget)
    // ---------------------------------------------------------------------
    _handleSchedule() {
      const t = this.strings;
      this.n8n.sendEvent("schedule_click", {});
      if (!this.config.scheduleUrl) {
        console.warn("[realestate-chatbot] No `scheduleUrl` configured; cannot redirect to scheduling page.");
        this._pushAssistantMessage(this.strings.errorGeneric, { skipHistory: true });
        return;
      }
      this._pushSystemMessage(t.scheduleRedirectNotice);
      const win = window.open(this.config.scheduleUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        this._appendLogNode(
          el("div", { class: "msg assistant" }, [
            el("a", { href: this.config.scheduleUrl, target: "_blank", rel: "noopener noreferrer", class: "p-link", text: t.scheduleCta })
          ])
        );
      }
    }
  };
  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, RealEstateChatbotWidget);
  }

  // src/index.js
  function configFromScriptTag(scriptEl) {
    const ds = scriptEl.dataset;
    const config = {};
    const map = {
      position: "position",
      theme: "theme",
      primaryColor: "primaryColor",
      agencyName: "agencyName",
      avatarInitial: "avatarInitial",
      greeting: "greeting",
      locale: "locale",
      scheduleUrl: "scheduleUrl",
      aiEndpoint: "aiEndpoint",
      propertyApiEndpoint: "propertyApiEndpoint",
      leadsWebhookUrl: "leadsWebhookUrl",
      eventsWebhookUrl: "eventsWebhookUrl",
      conversationWebhookUrl: "conversationWebhookUrl",
      handoffWebhookUrl: "handoffWebhookUrl"
    };
    for (const [configKey, dataKey] of Object.entries(map)) {
      if (ds[dataKey] !== void 0) config[configKey] = ds[dataKey];
    }
    return config;
  }
  function findOwnScriptTag() {
    if (document.currentScript) return document.currentScript;
    const scripts = document.querySelectorAll('script[src*="widget.js"], script[data-realestate-chatbot]');
    return scripts[scripts.length - 1] || null;
  }
  function boot() {
    const scriptEl = findOwnScriptTag();
    const config = scriptEl ? configFromScriptTag(scriptEl) : {};
    const runtimeOverrides = window.RealEstateChatbotConfig || {};
    const el2 = document.createElement(TAG_NAME);
    el2.configure({ ...config, ...runtimeOverrides });
    document.body.appendChild(el2);
    window.RealEstateChatbot = {
      element: el2,
      open: () => el2.open(),
      close: () => el2.close()
    };
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
//# sourceMappingURL=widget.js.map
