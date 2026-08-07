/*!
 * chatbotify Embeddable Widget — with Analytics
 * Usage:
 *   <script src="https://your-host/widget.js"
 *     data-webhook-url="https://n8n.example.com/webhook/xxxx"
 *     data-title="Chat with us"
 *     data-subtitle="We reply in a few minutes"
 *     data-primary-color="#6d28d9"
 *     data-position="right"
 *     data-welcome="Hi! How can we help?"
 *     data-placeholder="Type a message..."
 *     defer></script>
 */
(function () {
  "use strict";
  if (window.__chatbotifyWidgetLoaded) return;
  window.__chatbotifyWidgetLoaded = true;

  var script =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();

  function attr(name, fallback) {
    var v = script && script.getAttribute("data-" + name);
    return v == null || v === "" ? fallback : v;
  }

  var config = {
    webhookUrl: attr("webhook-url", ""),
    clientId: attr("client-id", "chatbotify-default"),
    widgetVersion: attr("widget-version", "3.0.0"),
    schemaVersion: attr("schema-version", "2.0.0"),
    title: attr("title", "Chat with us"),
    subtitle: attr("subtitle", "We typically reply in a few minutes"),
    primaryColor: attr("primary-color", "#6d28d9"),
    accentColor: attr("accent-color", ""),
    position: attr("position", "right"),
    welcome: attr("welcome", "Hi 👋 How can we help you today?"),
    placeholder: attr("placeholder", "Type your message..."),
    brandName: attr("brand-name", ""),
    avatarUrl: attr("avatar-url", ""),
    sessionKey: attr("session-key", "chatbotify:session"),
    historyKey: attr("history-key", "chatbotify:history"),
    leadCapture: attr("lead-capture", "auto"), // auto | off | required
    leadTitle: attr("lead-title", "Stay in touch"),
    leadSubtitle: attr(
      "lead-subtitle",
      "Leave your details and we'll follow up if we get disconnected."
    ),
    leadSubmitLabel: attr("lead-submit-label", "Continue"),
    leadFields: attr(
      "lead-fields",
      "name:text:Your name|email:email:Email address:required"
    ),
    analytics: attr("analytics", "on"),
    quickReplies: attr("quick-replies", ""),
    bgTheme: attr("bg-theme", "light"),
    bgColor: attr("bg-color", ""),
    bgImage: attr("bg-image", ""),
  };

  if (!config.webhookUrl) {
    console.warn("[chatbotify] Missing data-webhook-url; widget disabled.");
    return;
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  /** Generate a UUID */
  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /** Safe localStorage wrapper */
  var storage = {
    get: function (k) {
      try { return localStorage.getItem(k); } catch (_) { return null; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, v); } catch (_) {}
    },
    remove: function (k) {
      try { localStorage.removeItem(k); } catch (_) {}
    },
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function escapeAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ─── Identity & Session ───────────────────────────────────────────────────

  /** Persistent visitor ID (survives session resets) */
  var visitorId = storage.get("chatbotify:visitor");
  if (!visitorId) {
    visitorId = uuid();
    storage.set("chatbotify:visitor", visitorId);
  }

  /** Session ID — cleared on reset */
  var sessionId = storage.get(config.sessionKey);
  if (!sessionId) {
    sessionId = uuid();
    storage.set(config.sessionKey, sessionId);
  }

  var firstVisit = !storage.get("chatbotify:visitor_seen");
  if (firstVisit) storage.set("chatbotify:visitor_seen", "1");

  /** History & lead */
  var history = [];
  try { history = JSON.parse(storage.get(config.historyKey) || "[]"); } catch (_) { history = []; }
  var lead = null;
  try { lead = JSON.parse(storage.get(config.sessionKey + ":lead") || "null"); } catch (_) { lead = null; }

  function saveHistory() {
    storage.set(config.historyKey, JSON.stringify(history.slice(-100)));
  }

  // ─── Device / Environment Detection ──────────────────────────────────────

  /** Detect browser name */
  function detectBrowser() {
    var ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return "Edge";
    if (/OPR\//.test(ua) || /Opera/.test(ua)) return "Opera";
    if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
    if (/Firefox\//.test(ua)) return "Firefox";
    if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return "Safari";
    if (/MSIE|Trident/.test(ua)) return "IE";
    return "Unknown";
  }

  /** Detect OS name */
  function detectOS() {
    var ua = navigator.userAgent;
    if (/Windows NT/.test(ua)) return "Windows";
    if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) return "macOS";
    if (/iPhone/.test(ua)) return "iOS";
    if (/iPad/.test(ua)) return "iPadOS";
    if (/Android/.test(ua)) return "Android";
    if (/Linux/.test(ua)) return "Linux";
    return "Unknown";
  }

  /** Detect device type */
  function detectDevice() {
    var ua = navigator.userAgent;
    if (/Mobi|Android.*Mobile|iPhone/.test(ua)) return "mobile";
    if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return "tablet";
    return "desktop";
  }

  var env = {
    browser: detectBrowser(),
    os: detectOS(),
    device: detectDevice(),
    language: navigator.language || "unknown",
    referrer: document.referrer || "",
    pageUrl: location.href,
    pageTitle: document.title,
  };

  // ─── Analytics Engine ─────────────────────────────────────────────────────

  /**
   * Analytics state and event queue.
   * Events are batched and sent asynchronously.
   * Failed events are retried up to MAX_RETRY times.
   */
  var analytics = {
    queue: [],
    sending: false,
    sentIds: {},         // dedup guard: eventId → true
    sessionStartTs: Date.now(),
    conversationStartTs: null,
    firstResponseTs: null,
    totalUserMessages: 0,
    totalBotMessages: 0,
    messageLengths: [],
    leadShown: false,
    leadSkipped: false,
    leadCompleted: false,
    funnelStep: "widget_loaded", // current funnel step
    formStartTs: {},   // formId → start timestamp
    MAX_RETRY: 3,
    BATCH_SIZE: 10,
    FLUSH_INTERVAL: 5000, // ms
  };

  /**
   * Build the standard envelope every event must carry.
   * @returns {Object}
   */
  function buildEnvelope() {
    return {
      session_id: sessionId,
      visitor_id: visitorId,
      timestamp: new Date().toISOString(),
      page_url: location.href,
      page_title: document.title,
      language: env.language,
      device: env.device,
      browser: env.browser,
      os: env.os,
      referrer: env.referrer,
      first_visit: firstVisit,
      returning_visitor: !firstVisit,
    };
  }

  /**
   * Enqueue an analytics event for async delivery.
   * @param {string} eventName
   * @param {Object} [properties]
   */
  function track(eventName, properties) {
    if (config.analytics === "off") return;
    var id = uuid();
    var event = Object.assign(buildEnvelope(), {
      type: "event",
      event: eventName,
      event_id: id,
      event_name: eventName,
      client_id: config.clientId,
      widget_version: config.widgetVersion,
      schema_version: config.schemaVersion,
      properties: properties || {},
      _id: id,
      _retries: 0,
    });
    // Dedup guard: skip if we already sent this exact id
    if (analytics.sentIds[id]) return;
    analytics.queue.push(event);
    scheduleSend();
  }

  /**
   * Flush the analytics queue — sends up to BATCH_SIZE events,
   * retries failed ones. Non-blocking.
   */
  function flushQueue() {
    if (!analytics.queue.length || analytics.sending) return;
    analytics.sending = true;
    var batch = analytics.queue.splice(0, analytics.BATCH_SIZE);
    batch.forEach(function (event) {
      var id = event._id;
      var retries = event._retries;
      // Clean internal fields before sending
      var payload = Object.assign({}, event);
      delete payload._id;
      delete payload._retries;
      fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        analytics.sentIds[id] = true;
      }).catch(function () {
        if (retries < analytics.MAX_RETRY) {
          event._retries = retries + 1;
          analytics.queue.push(event); // re-queue for retry
        }
      });
    });
    analytics.sending = false;
    if (analytics.queue.length) scheduleSend();
  }

  var _flushTimer = null;
  function scheduleSend() {
    if (_flushTimer) return;
    _flushTimer = setTimeout(function () {
      _flushTimer = null;
      flushQueue();
    }, 100); // small delay to allow batching
  }

  // Periodic flush for long sessions
  setInterval(flushQueue, analytics.FLUSH_INTERVAL);

  // Flush on page unload
  window.addEventListener("beforeunload", function () {
    var payload = {
      type: "event",
      event: "session_end",
      event_id: uuid(),
      event_name: "session_end",
      client_id: config.clientId,
      widget_version: config.widgetVersion,
      schema_version: config.schemaVersion,
      session_duration: Math.round((Date.now() - analytics.sessionStartTs) / 1000),
      conversation_completed: analytics.totalUserMessages > 0,
    };
    Object.assign(payload, buildEnvelope());
    if (navigator.sendBeacon) {
      navigator.sendBeacon(config.webhookUrl, JSON.stringify(payload));
    }
    flushQueue();
  });

  // ─── CTA Click Interceptor ────────────────────────────────────────────────

  /**
   * Classify a URL/href into a CTA event type.
   * @param {string} href
   * @param {string} text
   * @returns {string} event name
   */
  function classifyCTA(href, text) {
    if (!href) return "custom_button_click";
    if (/^tel:/i.test(href)) return "phone_click";
    if (/^mailto:/i.test(href)) return "email_click";
    if (/whatsapp\.com|wa\.me/i.test(href)) return "whatsapp_click";
    if (/^sms:/i.test(href)) return "sms_click";
    if (/calendly\.com|cal\.com|tidycal\.com|acuity|zcal|savvycal/i.test(href))
      return "calendar_click";
    var t = (text || "").toLowerCase();
    if (/book|appointment|schedul/i.test(t)) return "booking_click";
    if (/download|pdf|doc|attachment/i.test(t)) return "download_click";
    return "external_link_click";
  }

  /**
   * Attach a CTA tracker to an anchor element.
   * @param {HTMLElement} el
   */
  function trackCTAElement(el) {
    el.addEventListener("click", function (e) {
      var href = el.getAttribute("href") || "";
      var text = (el.textContent || "").trim();
      var eventName = classifyCTA(href, text);
      track(eventName, {
        button_text: text,
        target_url: href,
      });
      // Advance funnel if booking click
      if (eventName === "booking_click") {
        advanceFunnel("booking_cta_clicked");
      }
    });
  }

  // ─── Funnel Tracking ──────────────────────────────────────────────────────

  /**
   * Advance the booking funnel to a new step.
   * Steps: widget_loaded → widget_opened → conversation_started →
   *        question_asked → booking_cta_shown → booking_cta_clicked →
   *        lead_submitted → booking_completed
   */
  var FUNNEL_ORDER = [
    "widget_loaded",
    "widget_opened",
    "conversation_started",
    "question_asked",
    "booking_cta_shown",
    "booking_cta_clicked",
    "lead_submitted",
    "booking_completed",
  ];

  function advanceFunnel(step) {
    var current = FUNNEL_ORDER.indexOf(analytics.funnelStep);
    var next = FUNNEL_ORDER.indexOf(step);
    if (next > current) {
      analytics.funnelStep = step;
      track("funnel_step", { step: step, funnel: "booking" });
    }
  }

  // ─── Shadow DOM & Styles ──────────────────────────────────────────────────

  var host = document.createElement("div");
  host.id = "chatbotify-widget-host";
  host.style.cssText =
    "position:fixed;z-index:2147483647;bottom:0;" +
    (config.position === "left" ? "left:0;" : "right:0;") +
    "width:0;height:0;";
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  var primary = config.primaryColor;
  var accent = config.accentColor || primary;

  var style = document.createElement("style");
  style.textContent =
    /* Base reset */
    "*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;-webkit-tap-highlight-color:transparent;}" +
    /* Launcher button */
    ".launcher{position:fixed;bottom:calc(20px + env(safe-area-inset-bottom));" +
    (config.position === "left" ? "left:20px;" : "right:20px;") +
    "width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg," +
    primary + "," + accent +
    ");color:#fff;border:none;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s;animation:cl-pop .5s cubic-bezier(.34,1.56,.64,1);-webkit-user-select:none;user-select:none;touch-action:manipulation;}" +
    ".launcher:hover{transform:scale(1.08)}" +
    ".launcher:active{transform:scale(.92)}" +
    ".launcher svg{width:28px;height:28px;transition:transform .3s;pointer-events:none;}" +
    ".launcher .close-icon{position:absolute;opacity:0;transform:rotate(-90deg)}" +
    ".launcher.open .chat-icon{opacity:0;transform:rotate(90deg)}" +
    ".launcher.open .close-icon{opacity:1;transform:rotate(0)}" +
    ".badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:999px;min-width:20px;height:20px;padding:0 6px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.2)}" +
    /* Panel — desktop */
    ".panel{position:fixed;bottom:calc(96px + env(safe-area-inset-bottom));" +
    (config.position === "left" ? "left:20px;" : "right:20px;") +
    "width:390px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100dvh - 130px);background:#fff;border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.25),0 10px 30px rgba(0,0,0,.1);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(20px) scale(.96);transform-origin:bottom " +
    (config.position === "left" ? "left" : "right") +
    ";pointer-events:none;transition:opacity .3s cubic-bezier(.4,0,.2,1),transform .3s cubic-bezier(.34,1.56,.64,1);}" +
    ".panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}" +
    /* Header */
    ".header{background:linear-gradient(135deg," + primary + "," + accent +
    ");color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px;position:relative;overflow:hidden;flex-shrink:0;}" +
    ".header:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 0%,rgba(255,255,255,.2),transparent 50%);pointer-events:none}" +
    ".avatar{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;flex-shrink:0;overflow:hidden;position:relative;z-index:1}" +
    ".avatar img{width:100%;height:100%;object-fit:cover}" +
    ".header-text{flex:1;min-width:0;position:relative;z-index:1}" +
    ".title{font-weight:600;font-size:15px;line-height:1.2;margin:0 0 3px}" +
    ".subtitle{font-size:12px;opacity:.85;display:flex;align-items:center;gap:6px}" +
    ".dot{width:8px;height:8px;background:#22c55e;border-radius:50%;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:cl-pulse 2s infinite;flex-shrink:0;}" +
    ".header-actions{display:flex;gap:6px;position:relative;z-index:1}" +
    ".close-btn,.clear-btn{background:rgba(255,255,255,.15);border:none;color:#fff;min-width:36px;height:36px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;touch-action:manipulation;padding:0;}" +
    ".close-btn:hover,.clear-btn:hover{background:rgba(255,255,255,.25)}" +
    ".close-btn:active,.clear-btn:active{background:rgba(255,255,255,.35)}" +
    /* Confirm dialog */
    ".confirm{background:#fff;padding:14px 16px;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.06);animation:cl-in .3s}" +
    ".confirm p{margin:0 0 10px;font-size:14px;color:#111827}" +
    ".confirm-actions{display:flex;gap:8px}" +
    ".confirm button{flex:1;padding:10px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:opacity .2s;min-height:44px;touch-action:manipulation;}" +
    ".confirm .yes{background:#ef4444;color:#fff}" +
    ".confirm .no{background:#f3f4f6;color:#374151}" +
    ".confirm button:hover{opacity:.88}" +
    /* Messages area */
    ".messages{flex:1;overflow-y:auto;overflow-x:hidden;padding:16px;background:#f8fafc;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;transition:background .3s ease;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}" +
    ".messages::-webkit-scrollbar{width:4px}" +
    ".messages::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:2px}" +
    ".messages.theme-dark::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2)}" +
    /* Message bubbles */
    ".msg{max-width:82%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.5;word-wrap:break-word;word-break:break-word;animation:cl-in .3s cubic-bezier(.34,1.56,.64,1);white-space:pre-wrap}" +
    ".msg.bot{align-self:flex-start;background:#fff;color:#111827;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.07)}" +
    ".msg.user{align-self:flex-end;background:linear-gradient(135deg," + primary + "," + accent +
    ");color:#fff;border-bottom-right-radius:4px}" +
    /* Dark theme overrides */
    ".messages.theme-dark{background:#0f172a}" +
    ".messages.theme-dark .msg.bot{background:#1e293b;color:#f1f5f9;box-shadow:0 1px 2px rgba(0,0,0,.3)}" +
    ".messages.theme-dark .typing{background:#1e293b}" +
    ".messages.theme-dark .typing span{background:#64748b}" +
    ".messages.theme-dark .lead,.messages.theme-dark .confirm{background:#1e293b;color:#f1f5f9}" +
    ".messages.theme-dark .lead h4,.messages.theme-dark .confirm p{color:#f1f5f9}" +
    ".messages.theme-dark .lead p{color:#94a3b8}" +
    ".messages.theme-dark .lead input,.messages.theme-dark .lead textarea,.messages.theme-dark .lead select{background:#0f172a;border-color:#334155;color:#f1f5f9}" +
    ".messages.theme-dark .confirm .no{background:#334155;color:#f1f5f9}" +
    ".messages.theme-dark .lead label.field .lbl{color:#cbd5e1}" +
    /* Typing indicator */
    ".typing{align-self:flex-start;background:#fff;padding:12px 16px;border-radius:18px;border-bottom-left-radius:4px;display:flex;gap:5px;align-items:center;box-shadow:0 1px 2px rgba(0,0,0,.07);animation:cl-in .2s ease}" +
    ".typing span{width:7px;height:7px;background:#9ca3af;border-radius:50%;animation:cl-bounce 1.4s infinite}" +
    ".typing span:nth-child(2){animation-delay:.15s}" +
    ".typing span:nth-child(3){animation-delay:.3s}" +
    /* Quick replies */
    ".quick{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}" +
    ".quick button{background:#fff;border:1.5px solid " + primary +
    "44;color:" + primary +
    ";padding:9px 14px;border-radius:999px;font-size:13px;cursor:pointer;transition:all .2s;font-weight:500;min-height:38px;touch-action:manipulation;line-height:1.2;}" +
    ".quick button:hover{background:" + primary + ";color:#fff;transform:translateY(-1px);box-shadow:0 4px 10px " + primary + "40}" +
    ".quick button:active{transform:scale(.96)}" +
    /* Lead / form */
    ".lead{background:#fff;padding:16px;border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.07);animation:cl-in .3s}" +
    ".lead h4{margin:0 0 4px;font-size:14px;color:#111827;font-weight:600}" +
    ".lead p{margin:0 0 12px;font-size:12px;color:#6b7280;line-height:1.4}" +
    ".lead input,.lead textarea,.lead select{width:100%;padding:11px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;margin-bottom:8px;outline:none;transition:border-color .2s;font-family:inherit;background:#fff;color:#111827;box-sizing:border-box;-webkit-appearance:none;appearance:none;}" +
    ".lead textarea{min-height:72px;resize:vertical}" +
    ".lead input:focus,.lead textarea:focus,.lead select:focus{border-color:" + primary + ";}" +
    ".lead label.field{display:block;margin-bottom:8px}" +
    ".lead label.field .lbl{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px}" +
    ".lead label.field .lbl .req{color:#ef4444;margin-left:2px}" +
    ".lead button{width:100%;background:" + primary +
    ";color:#fff;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s;min-height:44px;touch-action:manipulation;}" +
    ".lead button:hover{opacity:.9}" +
    ".lead button:active{opacity:.8}" +
    ".lead .skip{background:transparent;color:#6b7280;margin-top:4px;padding:8px;font-weight:400;font-size:13px;}" +
    /* CTA links inside bot messages */
    ".msg.bot a{color:" + primary + ";text-decoration:underline;word-break:break-all;}" +
    /* Composer */
    ".composer{border-top:1px solid #e5e7eb;padding:10px 12px;padding-bottom:calc(10px + env(safe-area-inset-bottom));background:#fff;display:flex;gap:8px;align-items:flex-end;flex-shrink:0;}" +
    ".composer textarea{flex:1;border:1.5px solid #e5e7eb;border-radius:12px;padding:10px 12px;font-size:16px;resize:none;outline:none;max-height:120px;min-height:42px;font-family:inherit;transition:border-color .2s;-webkit-appearance:none;appearance:none;line-height:1.4;}" +
    ".composer textarea:focus{border-color:" + primary + "}" +
    ".send{background:" + primary +
    ";color:#fff;border:none;width:42px;height:42px;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s,opacity .2s;touch-action:manipulation;}" +
    ".send:hover:not(:disabled){transform:scale(1.05)}" +
    ".send:active:not(:disabled){transform:scale(.92)}" +
    ".send:disabled{opacity:.4;cursor:not-allowed}" +
    /* Footer */
    ".footer{text-align:center;padding:6px;font-size:11px;color:#9ca3af;background:#fff;border-top:1px solid #f3f4f6;flex-shrink:0;}" +
    ".footer a{color:#9ca3af;text-decoration:none}" +
    /* Animations */
    "@keyframes cl-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}" +
    "@keyframes cl-pop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}" +
    "@keyframes cl-pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}" +
    "@keyframes cl-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-6px);opacity:1}}" +
    /* ── Mobile full-screen ─────────────────────────────────────────────────
       Uses 100dvh (dynamic viewport height) so the panel fills correctly
       even when the browser address bar is visible or the keyboard is open.
       Safe area insets handle notched/rounded phones (iPhone X+, Android).  */
    "@media(max-width:600px){" +
    ".launcher{bottom:calc(16px + env(safe-area-inset-bottom));right:16px;left:auto;}" +
    ".panel{position:fixed;inset:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0;bottom:0;right:0;left:0;top:0;transform-origin:bottom center;}" +
    ".panel.open{transform:translateY(0) scale(1);}" +
    ".panel:not(.open){transform:translateY(100%);}" +
    ".header{padding:12px 16px;padding-top:calc(12px + env(safe-area-inset-top));}" +
    ".composer{padding:10px 12px;padding-bottom:calc(10px + env(safe-area-inset-bottom));}" +
    ".composer textarea{font-size:16px;}" + /* prevent iOS zoom on focus */
    ".messages{padding:12px;}" +
    ".footer{padding-bottom:calc(6px + env(safe-area-inset-bottom));}" +
    "}";

  root.appendChild(style);

  // ─── Markup ───────────────────────────────────────────────────────────────

  var wrap = document.createElement("div");
  wrap.innerHTML =
    '<button class="launcher" aria-label="Open chat">' +
    '<svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    '<svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
    '<span class="badge" style="display:none">1</span>' +
    "</button>" +
    '<div class="panel" role="dialog" aria-label="Chat" aria-modal="true">' +
    '<div class="header">' +
    '<div class="avatar">' +
    (config.avatarUrl
      ? '<img src="' + escapeAttr(config.avatarUrl) + '" alt="">'
      : escapeHtml((config.brandName || config.title || "C").charAt(0).toUpperCase())) +
    "</div>" +
    '<div class="header-text">' +
    '<div class="title">' + escapeHtml(config.title) + "</div>" +
    '<div class="subtitle"><span class="dot"></span>' + escapeHtml(config.subtitle) + "</div>" +
    "</div>" +
    '<div class="header-actions">' +
    '<button class="clear-btn" aria-label="Clear conversation" title="Clear conversation">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>' +
    "</button>" +
    '<button class="close-btn" aria-label="Close chat">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
    "</button>" +
    "</div>" +
    "</div>" +
    '<div class="messages" role="log" aria-live="polite"></div>' +
    '<form class="composer" novalidate>' +
    '<textarea rows="1" placeholder="' + escapeAttr(config.placeholder) + '" aria-label="Message"></textarea>' +
    '<button type="submit" class="send" aria-label="Send">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-7-7 14-2-5-5-2z"/></svg>' +
    "</button>" +
    "</form>" +
    '<div class="footer">Powered by <a href="#" target="_blank" rel="noopener">chatbotify</a></div>' +
    "</div>";
  root.appendChild(wrap);

  var launcher  = root.querySelector(".launcher");
  var badge     = root.querySelector(".badge");
  var panel     = root.querySelector(".panel");
  var messagesEl = root.querySelector(".messages");
  var closeBtn  = root.querySelector(".close-btn");
  var clearBtn  = root.querySelector(".clear-btn");
  var form      = root.querySelector(".composer");
  var textarea  = root.querySelector("textarea");
  var sendBtn   = root.querySelector(".send");

  // ─── Background Theme ─────────────────────────────────────────────────────

  var THEMES = {
    light:    { bg: "#f8fafc",         dark: false },
    dark:     { bg: "#0f172a",         dark: true  },
    sunset:   { bg: "linear-gradient(160deg,#fef3c7 0%,#fecaca 60%,#fbcfe8 100%)", dark: false },
    ocean:    { bg: "linear-gradient(160deg,#dbeafe 0%,#bfdbfe 60%,#c7d2fe 100%)", dark: false },
    mint:     { bg: "linear-gradient(160deg,#ecfdf5 0%,#d1fae5 60%,#a7f3d0 100%)", dark: false },
    lavender: { bg: "linear-gradient(160deg,#ede9fe 0%,#ddd6fe 60%,#fbcfe8 100%)", dark: false },
    dots:     { bg: "#f8fafc radial-gradient(circle,#cbd5e1 1px,transparent 1px) 0 0/16px 16px", dark: false },
    grid:     { bg: "#f8fafc linear-gradient(#e2e8f0 1px,transparent 1px) 0 0/22px 22px",        dark: false },
  };

  function applyTheme() {
    var t = THEMES[config.bgTheme] || THEMES.light;
    var bg = t.bg;
    if (config.bgTheme === "custom" || config.bgColor || config.bgImage) {
      bg = config.bgColor || "#f8fafc";
      if (config.bgImage) bg += " url('" + config.bgImage + "') center/cover no-repeat";
    }
    messagesEl.style.background = bg;
    messagesEl.classList.toggle("theme-dark", !!t.dark);
  }
  applyTheme();

  // ─── Rendering Helpers ────────────────────────────────────────────────────

  function scrollBottom() {
    requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  /**
   * Detect links/CTAs in bot text and wrap them in trackable anchors.
   * @param {string} text
   * @returns {DocumentFragment}
   */
  function renderBotText(text) {
    var URL_RE = /(https?:\/\/[^\s<>"]+|tel:[^\s<>"]+|mailto:[^\s<>"]+)/g;
    var fragment = document.createDocumentFragment();
    var last = 0;
    var m;
    while ((m = URL_RE.exec(text)) !== null) {
      if (m.index > last) {
        fragment.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      var a = document.createElement("a");
      a.href = m[0];
      a.textContent = m[0];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      trackCTAElement(a);
      track("cta_displayed", { href: m[0] });
      fragment.appendChild(a);
      last = URL_RE.lastIndex;
    }
    if (last < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(last)));
    }
    return fragment;
  }

  function addMessage(role, text, save) {
    var el = document.createElement("div");
    el.className = "msg " + (role === "user" ? "user" : "bot");
    if (role === "bot") {
      el.appendChild(renderBotText(String(text)));
    } else {
      el.textContent = text;
    }
    messagesEl.appendChild(el);
    scrollBottom();
    if (save !== false) {
      history.push({ role: role, text: text, ts: Date.now() });
      saveHistory();
    }
    if (role === "bot" && !isOpen) bumpBadge();

    // Analytics
    if (role === "user") {
      analytics.totalUserMessages++;
      analytics.messageLengths.push(text.length);
      track("message_sent", { length: text.length });
      if (analytics.totalUserMessages === 1) {
        analytics.conversationStartTs = Date.now();
        advanceFunnel("conversation_started");
      }
      if (analytics.totalUserMessages === 1 || analytics.totalUserMessages === 2) {
        advanceFunnel("question_asked");
      }
    }
    if (role === "bot") {
      analytics.totalBotMessages++;
      if (!analytics.firstResponseTs && analytics.totalUserMessages > 0) {
        analytics.firstResponseTs = Date.now();
      }
      track("message_received", { length: text.length });
    }
  }

  function addQuickReplies(items) {
    if (!items || !items.length) return;
    var box = document.createElement("div");
    box.className = "quick";
    track("quick_reply_displayed", { options: items });
    items.forEach(function (label) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.onclick = function () {
        box.remove();
        track("quick_reply_clicked", { selected: label });
        sendMessage(label);
      };
      box.appendChild(b);
    });
    messagesEl.appendChild(box);
    scrollBottom();
  }

  function showTyping() {
    var t = document.createElement("div");
    t.className = "typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    t.dataset.typing = "1";
    messagesEl.appendChild(t);
    scrollBottom();
    return t;
  }

  function bumpBadge() {
    var n = parseInt(badge.textContent || "0", 10) + 1;
    badge.textContent = n;
    badge.style.display = "flex";
  }
  function clearBadge() {
    badge.textContent = "0";
    badge.style.display = "none";
  }

  // ─── Lead Capture ─────────────────────────────────────────────────────────

  var leadPromptShown = false;

  function maybeShowLeadCapture() {
    if (config.leadCapture === "off") return;
    if (lead) return;
    if (leadPromptShown) return;
    var userMsgs = history.filter(function (m) { return m.role === "user"; }).length;
    if (config.leadCapture !== "required" && userMsgs < 2) return;
    leadPromptShown = true;
    analytics.leadShown = true;
    track("lead_shown");
    renderLeadForm();
  }

  /** Parse pipe-separated field spec into structured array */
  function parseFieldSpec(spec) {
    if (!spec) return [];
    return spec.split("|").map(function (raw) {
      var s = raw.trim();
      if (!s) return null;
      var parts = s.split(":");
      var key = (parts[0] || "").trim();
      if (!key) return null;
      var typeRaw = (parts[1] || "text").trim();
      var label = (parts[2] || key).trim();
      var required = false;
      var placeholder = "";
      for (var i = 3; i < parts.length; i++) {
        var p = parts[i].trim();
        if (p === "required") required = true;
        else if (p) placeholder = p;
      }
      var options = null;
      var type = typeRaw;
      var selMatch = /^select\((.+)\)$/i.exec(typeRaw);
      if (selMatch) {
        type = "select";
        options = selMatch[1].split(";").map(function (o) { return o.trim(); }).filter(Boolean);
      }
      return { key: key, type: type, label: label, required: required, placeholder: placeholder, options: options };
    }).filter(Boolean);
  }

  /**
   * Render a form (lead capture or bot-triggered inline form).
   * opts: { title, subtitle, fields, submitLabel, allowSkip, onSubmit, onSkip }
   */
  function renderForm(opts) {
    var box = document.createElement("form");
    box.className = "lead";
    box.setAttribute("novalidate", "");
    var html = "";
    if (opts.title) html += "<h4>" + escapeAttr(opts.title) + "</h4>";
    if (opts.subtitle) html += "<p>" + escapeAttr(opts.subtitle) + "</p>";
    opts.fields.forEach(function (f) {
      var id = "cl-f-" + Math.random().toString(36).slice(2, 8);
      var req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : "";
      html += '<label class="field" for="' + id + '">';
      html += '<span class="lbl">' + escapeAttr(f.label) + req + "</span>";
      var ph = escapeAttr(f.placeholder || "");
      var reqAttr = f.required ? " required" : "";
      var name = escapeAttr(f.key);
      if (f.type === "textarea") {
        html += '<textarea id="' + id + '" name="' + name + '" placeholder="' + ph + '"' + reqAttr + ' rows="3"></textarea>';
      } else if (f.type === "select") {
        html += '<select id="' + id + '" name="' + name + '"' + reqAttr + ">";
        if (!f.required) html += '<option value="">Select…</option>';
        (f.options || []).forEach(function (o) {
          html += '<option value="' + escapeAttr(o) + '">' + escapeAttr(o) + "</option>";
        });
        html += "</select>";
      } else {
        var t = ["email", "tel", "url", "number"].indexOf(f.type) >= 0 ? f.type : "text";
        var autocomplete = "";
        if (f.key === "name") autocomplete = ' autocomplete="name"';
        else if (t === "email") autocomplete = ' autocomplete="email"';
        else if (t === "tel") autocomplete = ' autocomplete="tel"';
        html += '<input id="' + id + '" type="' + t + '" name="' + name + '" placeholder="' + ph + '"' + autocomplete + reqAttr + ">";
      }
      html += "</label>";
    });
    html += '<button type="submit">' + escapeAttr(opts.submitLabel || "Submit") + "</button>";
    if (opts.allowSkip) {
      html += '<button type="button" class="skip">Not now</button>';
    }
    box.innerHTML = html;
    messagesEl.appendChild(box);
    scrollBottom();

    // Track first input as form_started
    var formStarted = false;
    box.addEventListener("input", function () {
      if (!formStarted) {
        formStarted = true;
        track("form_started", { formId: opts.formId || "lead", fieldCount: opts.fields.length });
      }
    }, { once: false });

    function collect() {
      var values = {};
      var firstInvalid = null;
      opts.fields.forEach(function (f) {
        var el = box.querySelector('[name="' + f.key + '"]');
        if (!el) return;
        var v = String(el.value || "").trim();
        el.style.borderColor = "";
        var bad = false;
        if (f.required && !v) bad = true;
        else if (v && f.type === "email" && !/^\S+@\S+\.\S+$/.test(v)) bad = true;
        else if (v && f.type === "url" && !/^https?:\/\//i.test(v)) bad = true;
        if (bad) {
          el.style.borderColor = "#ef4444";
          if (!firstInvalid) firstInvalid = el;
        }
        values[f.key] = v;
      });
      if (firstInvalid) { firstInvalid.focus(); return null; }
      return values;
    }

    var formShownTs = Date.now();
    box.addEventListener("submit", function (e) {
      e.preventDefault();
      var values = collect();
      if (!values) return;
      opts.onSubmit(values, box);
    });
    var skipBtn = box.querySelector(".skip");
    if (skipBtn) {
      skipBtn.addEventListener("click", function () {
        track("form_abandoned", {
          formId: opts.formId || "lead",
          fieldCount: opts.fields.length,
          timeSpent: Math.round((Date.now() - formShownTs) / 1000),
        });
        opts.onSkip && opts.onSkip(box);
      });
    }
    return box;
  }

  function renderLeadForm() {
    var fields = parseFieldSpec(config.leadFields);
    if (!fields.length) {
      fields = [
        { key: "name",  type: "text",  label: "Your name",     required: false, placeholder: "" },
        { key: "email", type: "email", label: "Email address", required: true,  placeholder: "" },
      ];
    }
    var formShownTs = Date.now();
    track("lead_shown", { fieldCount: fields.length });
    renderForm({
      title: config.leadTitle,
      subtitle: config.leadSubtitle,
      fields: fields,
      submitLabel: config.leadSubmitLabel,
      allowSkip: config.leadCapture !== "required",
      formId: "lead",
      onSubmit: function (values, box) {
        lead = Object.assign({}, values, { capturedAt: Date.now() });
        storage.set(config.sessionKey + ":lead", JSON.stringify(lead));
        box.remove();
        var greetName = values.name || values.firstName || "";
        addMessage("bot", greetName ? "Thanks " + greetName + "! You're all set. 🎉" : "Thanks — we got your details. 🎉");
        analytics.leadCompleted = true;
        track("lead_completed", {
          fields: Object.keys(values),
          fieldCount: Object.keys(values).length,
          completionTime: Math.round((Date.now() - formShownTs) / 1000),
        });
        advanceFunnel("lead_submitted");
        postToWebhook({
          type: "lead",
          messageType: "lead_form_submit",
          leadSubmissionId: uuid(),
          lead: lead
        });
      },
      onSkip: function (box) {
        box.remove();
        analytics.leadSkipped = true;
        track("lead_skipped");
      },
    });
  }

  /** Render a bot-triggered inline form */
  function renderBotForm(formDef) {
    var fields = Array.isArray(formDef.fields) ? formDef.fields.filter(function (f) { return f && f.key; }) : [];
    if (!fields.length) return;
    var formShownTs = Date.now();
    track("form_displayed", { formId: formDef.id || null, fieldCount: fields.length });
    renderForm({
      title: formDef.title || "",
      subtitle: formDef.description || formDef.subtitle || "",
      fields: fields,
      submitLabel: formDef.submitLabel || "Submit",
      allowSkip: false,
      formId: formDef.id || "bot_form",
      onSubmit: function (values, box) {
        box.querySelectorAll("input,select,textarea,button").forEach(function (el) { el.disabled = true; });
        addMessage("bot", "Thanks — sent. ✅");
        track("form_completed", {
          formId: formDef.id || null,
          fields: Object.keys(values),
          fieldCount: Object.keys(values).length,
          completionTime: Math.round((Date.now() - formShownTs) / 1000),
        });
        postToWebhook({
          type: "form_submission",
          messageType: "lead_form_submit",
          leadSubmissionId: uuid(),
          formId: formDef.id || null,
          form: { title: formDef.title || "", fields: fields.map(function (f) { return f.key; }) },
          values: values,
        });
      },
    });
  }

  function normalizeFormFields(fields) {
    if (!Array.isArray(fields)) return [];
    return fields.map(function (f) {
      if (typeof f === "string") {
        var parts = f.split(":");
        return {
          key: (parts[0] || "").trim(),
          type: (parts[1] || "text").trim(),
          label: (parts[2] || parts[0] || "").trim(),
          required: parts.indexOf("required") >= 0,
        };
      }
      return f;
    }).filter(function (f) { return f && f.key; });
  }

  function renderStructuredMessages(messages) {
    if (!Array.isArray(messages) || !messages.length) return false;
    messages.forEach(function (msg) {
      if (!msg) return;
      var type = msg.type || "text";
      if (type === "lead_form" || type === "form") {
        renderBotForm(Object.assign({}, msg, { fields: normalizeFormFields(msg.fields) }));
      } else if (type === "buttons") {
        var items = Array.isArray(msg.items) ? msg.items : [];
        addQuickReplies(items.map(function (item) {
          return typeof item === "string" ? item : (item.label || item.value || "");
        }).filter(Boolean));
      } else {
        addMessage("bot", String(msg.content || msg.text || ""), true);
      }
    });
    return true;
  }

  // ─── Transport ────────────────────────────────────────────────────────────

  function postToWebhook(extra) {
    var payload = Object.assign(
      {
        clientId: config.clientId,
        widgetVersion: config.widgetVersion,
        schemaVersion: config.schemaVersion,
        sessionId: sessionId,
        visitorId: visitorId,
        pageUrl: location.href,
        pageTitle: document.title,
        referrer: document.referrer || "",
        userAgent: navigator.userAgent,
        lang: navigator.language,
        device: env.device,
        browser: env.browser,
        os: env.os,
        lead: lead,
        timestamp: new Date().toISOString(),
      },
      extra || {}
    );
    return fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  // ─── Message Sending ──────────────────────────────────────────────────────

  var busy = false;
  function sendMessage(text) {
    text = String(text || "").trim();
    if (!text || busy) return;
    addMessage("user", text);
    textarea.value = "";
    autosize();
    busy = true;
    sendBtn.disabled = true;
    var typing = showTyping();

    postToWebhook({ type: "message", message: text, history: history.slice(-20) })
      .then(function (r) {
        return r.text().then(function (t) {
          try { return JSON.parse(t); } catch (_) { return { reply: t }; }
        });
      })
      .then(function (data) {
        typing.remove();
        var first = Array.isArray(data) && data.length ? data[0] : null;
        var payloadForExtras = first || data || {};
        var structured = payloadForExtras && payloadForExtras.messages;
        var renderedStructured = renderStructuredMessages(structured);
        var reply =
          (payloadForExtras && (payloadForExtras.reply || payloadForExtras.text || payloadForExtras.message)) ||
          "Thanks — we'll get back to you shortly.";
        if (!renderedStructured) addMessage("bot", String(reply));

        // AI Metrics from webhook response
        if (payloadForExtras.intent || payloadForExtras.confidence != null) {
          track("ai_response", {
            intent: payloadForExtras.intent || null,
            confidence: payloadForExtras.confidence != null ? payloadForExtras.confidence : null,
            knowledge_source: payloadForExtras.knowledgeSource || null,
            fallback_used: !!payloadForExtras.fallback,
            human_requested: !!payloadForExtras.humanRequested,
            handoff_triggered: !!payloadForExtras.handoff,
          });
        }
        if (payloadForExtras.bookingCta) {
          track("booking_cta_shown");
          advanceFunnel("booking_cta_shown");
        }
        if (Array.isArray(payloadForExtras.quickReplies)) {
          addQuickReplies(payloadForExtras.quickReplies);
        }
        if (payloadForExtras.form && typeof payloadForExtras.form === "object") {
          renderBotForm(payloadForExtras.form);
        } else {
          maybeShowLeadCapture();
        }
      })
      .catch(function () {
        typing.remove();
        addMessage("bot", "Sorry — something went wrong. Please try again.");
        track("error", { context: "message_send_failed" });
      })
      .finally(function () {
        busy = false;
        sendBtn.disabled = false;
        textarea.focus();
      });
  }

  // ─── Panel Open / Close ───────────────────────────────────────────────────

  var isOpen = false;

  function openPanel() {
    isOpen = true;
    panel.classList.add("open");
    launcher.classList.add("open");
    clearBadge();
    // Prevent body scroll on mobile when chat is open
    if (env.device === "mobile" || env.device === "tablet") {
      document.body.style.overflow = "hidden";
    }
    setTimeout(function () { textarea.focus(); }, 200);
    track("widget_opened");
    advanceFunnel("widget_opened");
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove("open");
    launcher.classList.remove("open");
    document.body.style.overflow = "";
    track("widget_closed", {
      session_duration: Math.round((Date.now() - analytics.sessionStartTs) / 1000),
      total_messages: analytics.totalUserMessages + analytics.totalBotMessages,
      user_messages: analytics.totalUserMessages,
      bot_messages: analytics.totalBotMessages,
      avg_message_length: analytics.messageLengths.length
        ? Math.round(analytics.messageLengths.reduce(function (a, b) { return a + b; }, 0) / analytics.messageLengths.length)
        : 0,
    });
  }

  launcher.addEventListener("click", function () {
    isOpen ? closePanel() : openPanel();
  });
  closeBtn.addEventListener("click", closePanel);

  // ─── Clear Conversation ───────────────────────────────────────────────────

  function clearConversation() {
    history = [];
    lead = null;
    leadPromptShown = false;
    storage.remove(config.historyKey);
    storage.remove(config.sessionKey + ":lead");
    messagesEl.innerHTML = "";
    clearBadge();
    addMessage("bot", config.welcome, true);
    var quick = config.quickReplies
      ? config.quickReplies.split("|").map(function (s) { return s.trim(); }).filter(Boolean)
      : [];
    if (quick.length) addQuickReplies(quick);
    track("conversation_cleared");
  }

  clearBtn.addEventListener("click", function () {
    if (messagesEl.querySelector(".confirm")) return;
    var box = document.createElement("div");
    box.className = "confirm";
    box.innerHTML =
      "<p>Clear this conversation? This can't be undone.</p>" +
      '<div class="confirm-actions">' +
      '<button type="button" class="no">Cancel</button>' +
      '<button type="button" class="yes">Clear</button>' +
      "</div>";
    messagesEl.appendChild(box);
    scrollBottom();
    box.querySelector(".yes").onclick = function () { box.remove(); clearConversation(); };
    box.querySelector(".no").onclick  = function () { box.remove(); };
  });

  // ─── Composer ─────────────────────────────────────────────────────────────

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    sendMessage(textarea.value);
  });

  textarea.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textarea.value);
    }
  });

  var typingTimer = null;
  textarea.addEventListener("input", function () {
    autosize();
    if (!typingTimer) track("typing_started");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      typingTimer = null;
      track("typing_finished");
    }, 1500);
  });

  function autosize() {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }

  // ─── Mobile Viewport / Keyboard Fix ──────────────────────────────────────
  // On iOS, the visual viewport shrinks when the keyboard opens.
  // We listen for visualViewport resize and shift the panel up accordingly.

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      if (!isOpen) return;
      var vh = window.visualViewport.height;
      panel.style.height = vh + "px";
      panel.style.top = "0";
      scrollBottom();
    });
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  if (history.length) {
    history.forEach(function (m) { addMessage(m.role, m.text, false); });
  } else {
    addMessage("bot", config.welcome, true);
    var quickList = config.quickReplies
      ? config.quickReplies.split("|").map(function (s) { return s.trim(); }).filter(Boolean)
      : [];
    if (quickList.length) addQuickReplies(quickList);
  }

  track("widget_loaded", {
    first_visit: firstVisit,
    returning_visitor: !firstVisit,
    has_history: history.length > 0,
    page_url: location.href,
    page_title: document.title,
  });
  advanceFunnel("widget_loaded");

  // ─── Session End Tracking ─────────────────────────────────────────────────

  // Heartbeat: send session summary every 60s while open
  setInterval(function () {
    if (!isOpen) return;
    track("session_heartbeat", {
      session_duration: Math.round((Date.now() - analytics.sessionStartTs) / 1000),
      user_messages: analytics.totalUserMessages,
      bot_messages: analytics.totalBotMessages,
    });
  }, 60000);

  // ─── Public API ───────────────────────────────────────────────────────────

  window.chatbotify = {
    open: openPanel,
    close: closePanel,
    send: sendMessage,
    track: track,
    reset: function () {
      history = [];
      lead = null;
      storage.remove(config.historyKey);
      storage.remove(config.sessionKey + ":lead");
      messagesEl.innerHTML = "";
      addMessage("bot", config.welcome, true);
    },
    setLead: function (l) {
      lead = l;
      storage.set(config.sessionKey + ":lead", JSON.stringify(l));
    },
    getAnalytics: function () {
      return {
        sessionId: sessionId,
        visitorId: visitorId,
        sessionDuration: Math.round((Date.now() - analytics.sessionStartTs) / 1000),
        totalUserMessages: analytics.totalUserMessages,
        totalBotMessages: analytics.totalBotMessages,
        avgMessageLength: analytics.messageLengths.length
          ? Math.round(analytics.messageLengths.reduce(function (a, b) { return a + b; }, 0) / analytics.messageLengths.length)
          : 0,
        firstResponseTime: analytics.firstResponseTs
          ? analytics.firstResponseTs - analytics.conversationStartTs
          : null,
        leadShown: analytics.leadShown,
        leadSkipped: analytics.leadSkipped,
        leadCompleted: analytics.leadCompleted,
        funnelStep: analytics.funnelStep,
        device: env.device,
        browser: env.browser,
        os: env.os,
      };
    },
  };
})();
