/*!
 * Salon Chat Widget
 * A single-file, dependency-free embeddable chat widget for salon websites.
 * Talks to a single n8n webhook (multi-tenant via salonId in the payload).
 *
 * EMBED:
 *   <script>
 *     window.SalonChatConfig = {
 *       webhookUrl:   "https://your-n8n-instance.com/webhook/salon-chat", // required
 *       salonId:      "salon_123",                                        // required
 *       salonName:    "Glow Salon & Spa",
 *       primaryColor: "#b5495b",
 *       logoUrl:      "https://example.com/logo.png",
 *       greeting:     "Hi! Looking to book, or have a question?",
 *       mode:         "bubble",              // "bubble" | "inline"
 *       containerId:  "salon-chat-container", // required only when mode = "inline"
 *       poweredByText:"Powered by YourBrand", // set to "" to hide
 *       poweredByUrl: "https://yourbrand.com"
 *     };
 *   </script>
 *   <script src="https://cdn.yourbrand.com/salon-chat-widget.js" async></script>
 *
 * WEBHOOK CONTRACT (sent to n8n as JSON POST):
 *   { salonId, sessionId, event: "session_start"|"message"|"contact_submitted",
 *     message, contact: {name, phone, email}, pageUrl, referrer, timestamp }
 *
 * EXPECTED n8n RESPONSE (JSON):
 *   { reply: "text",
 *     quickReplies: ["Book a haircut", "See pricing"],   // optional
 *     requestContact: true,                               // optional, shows lead form
 *     end: false }                                        // optional, disables input
 */
(function () {
  "use strict";

  if (window.__salonChatWidgetLoaded) return;
  window.__salonChatWidgetLoaded = true;

  var cfg = Object.assign(
    {
      webhookUrl: "",
      salonId: "",
      salonName: "Salon Assistant",
      primaryColor: "#b5495b",
      logoUrl: "",
      greeting: "Hi there! Are you looking to book an appointment, or do you have a question?",
      mode: "bubble",
      containerId: "",
      poweredByText: "Powered by SalonChat",
      poweredByUrl: "",
      storageKey: null
    },
    window.SalonChatConfig || {}
  );

  if (!cfg.webhookUrl || !cfg.salonId) {
    console.error("[SalonChatWidget] Missing required config: webhookUrl and salonId.");
    return;
  }

  var STORAGE_KEY = cfg.storageKey || "salon_chat_" + cfg.salonId;
  var uid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  function getSession() {
    var raw = null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return { sessionId: uid(), history: [], contactCaptured: false, ended: false };
  }

  function saveSession(s) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  var session = getSession();

  /* ---------- styles ---------- */
  var CSS =
    ".scw-root{--scw-primary:" +
    cfg.primaryColor +
    ";--scw-radius:16px;--scw-font:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;box-sizing:border-box;font-family:var(--scw-font);}" +
    ".scw-root *{box-sizing:border-box;}" +
    ".scw-bubble{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;background:var(--scw-primary);box-shadow:0 6px 20px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999998;transition:transform .18s ease;}" +
    ".scw-bubble:hover{transform:scale(1.06);}" +
    ".scw-bubble svg{width:26px;height:26px;fill:#fff;}" +
    ".scw-bubble img{width:32px;height:32px;border-radius:50%;object-fit:cover;}" +
    ".scw-panel{position:fixed;bottom:96px;right:24px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 140px);background:#fff;border-radius:var(--scw-radius);box-shadow:0 12px 40px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;z-index:999999;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease;}" +
    ".scw-panel.scw-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}" +
    ".scw-root.scw-inline .scw-panel{position:static;width:100%;max-width:100%;height:560px;max-height:none;box-shadow:0 1px 3px rgba(0,0,0,.12);opacity:1;transform:none;pointer-events:auto;border:1px solid #eee;}" +
    ".scw-header{background:var(--scw-primary);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}" +
    ".scw-header img{width:30px;height:30px;border-radius:50%;object-fit:cover;background:#fff;}" +
    ".scw-header-text{flex:1;min-width:0;}" +
    ".scw-header-name{font-weight:600;font-size:14.5px;line-height:1.2;}" +
    ".scw-header-status{font-size:11.5px;opacity:.85;display:flex;align-items:center;gap:5px;margin-top:1px;}" +
    ".scw-header-status:before{content:'';width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block;}" +
    ".scw-close{cursor:pointer;opacity:.85;padding:4px;line-height:0;}" +
    ".scw-close:hover{opacity:1;}" +
    ".scw-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#faf9f7;}" +
    ".scw-msg{max-width:82%;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.42;white-space:pre-wrap;word-wrap:break-word;}" +
    ".scw-msg-bot{align-self:flex-start;background:#fff;border:1px solid #eee;color:#222;border-bottom-left-radius:4px;}" +
    ".scw-msg-user{align-self:flex-end;background:var(--scw-primary);color:#fff;border-bottom-right-radius:4px;}" +
    ".scw-quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;align-self:flex-start;max-width:100%;}" +
    ".scw-quick button{border:1px solid var(--scw-primary);color:var(--scw-primary);background:#fff;border-radius:999px;padding:6px 12px;font-size:12.5px;cursor:pointer;transition:background .15s;}" +
    ".scw-quick button:hover{background:var(--scw-primary);color:#fff;}" +
    ".scw-typing{align-self:flex-start;background:#fff;border:1px solid #eee;border-radius:14px;border-bottom-left-radius:4px;padding:10px 14px;display:flex;gap:4px;}" +
    ".scw-typing span{width:6px;height:6px;background:#bbb;border-radius:50%;animation:scw-bounce 1.2s infinite ease-in-out;}" +
    ".scw-typing span:nth-child(2){animation-delay:.15s;}.scw-typing span:nth-child(3){animation-delay:.3s;}" +
    "@keyframes scw-bounce{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-4px);opacity:1;}}" +
    ".scw-form{align-self:stretch;background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;}" +
    ".scw-form input{border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:var(--scw-font);}" +
    ".scw-form input:focus{outline:2px solid var(--scw-primary);outline-offset:1px;}" +
    ".scw-form button{background:var(--scw-primary);color:#fff;border:none;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;}" +
    ".scw-form-note{font-size:11px;color:#888;}" +
    ".scw-footer{flex-shrink:0;border-top:1px solid #eee;padding:10px;display:flex;gap:8px;align-items:flex-end;background:#fff;}" +
    ".scw-input{flex:1;border:1px solid #ddd;border-radius:20px;padding:9px 14px;font-size:13.5px;font-family:var(--scw-font);resize:none;max-height:80px;}" +
    ".scw-input:focus{outline:2px solid var(--scw-primary);outline-offset:1px;}" +
    ".scw-send{background:var(--scw-primary);border:none;width:36px;height:36px;border-radius:50%;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;}" +
    ".scw-send:disabled{opacity:.5;cursor:default;}" +
    ".scw-send svg{width:16px;height:16px;fill:#fff;}" +
    ".scw-powered{text-align:center;font-size:10.5px;color:#aaa;padding:5px 0 8px;}" +
    ".scw-powered a{color:#aaa;text-decoration:none;}" +
    "@media (max-width:480px){.scw-panel{right:0;bottom:0;width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0;}}";

  var styleTag = document.createElement("style");
  styleTag.setAttribute("data-scw", "1");
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  /* ---------- DOM scaffold ---------- */
  var root = document.createElement("div");
  root.className = "scw-root" + (cfg.mode === "inline" ? " scw-inline" : "");

  var bubble = null;
  if (cfg.mode !== "inline") {
    bubble = document.createElement("div");
    bubble.className = "scw-bubble";
    bubble.setAttribute("role", "button");
    bubble.setAttribute("aria-label", "Open chat");
    bubble.innerHTML = cfg.logoUrl
      ? '<img src="' + escapeAttr(cfg.logoUrl) + '" alt="">'
      : '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';
    root.appendChild(bubble);
  }

  var panel = document.createElement("div");
  panel.className = "scw-panel";

  panel.innerHTML =
    '<div class="scw-header">' +
    (cfg.logoUrl ? '<img src="' + escapeAttr(cfg.logoUrl) + '" alt="">' : "") +
    '<div class="scw-header-text"><div class="scw-header-name">' +
    escapeHtml(cfg.salonName) +
    '</div><div class="scw-header-status">Online now</div></div>' +
    (cfg.mode !== "inline"
      ? '<div class="scw-close" tabindex="0" role="button" aria-label="Close chat"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M18.3 5.71L12 12.01l-6.3-6.3-1.41 1.41 6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.3 6.3 1.41-1.41-6.3-6.3 6.3-6.3z"/></svg></div>'
      : "") +
    "</div>" +
    '<div class="scw-body" id="scw-body"></div>' +
    '<div class="scw-footer">' +
    '<textarea class="scw-input" id="scw-input" rows="1" placeholder="Type your message..."></textarea>' +
    '<button class="scw-send" id="scw-send" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button>' +
    "</div>" +
    (cfg.poweredByText
      ? '<div class="scw-powered">' +
        (cfg.poweredByUrl
          ? '<a href="' + escapeAttr(cfg.poweredByUrl) + '" target="_blank" rel="noopener">' + escapeHtml(cfg.poweredByText) + "</a>"
          : escapeHtml(cfg.poweredByText)) +
        "</div>"
      : "");

  root.appendChild(panel);

  if (cfg.mode === "inline") {
    var container = document.getElementById(cfg.containerId);
    if (!container) {
      console.error('[SalonChatWidget] containerId "' + cfg.containerId + '" not found.');
      return;
    }
    container.appendChild(root);
    panel.classList.add("scw-open");
  } else {
    document.body.appendChild(root);
  }

  var body = panel.querySelector("#scw-body");
  var input = panel.querySelector("#scw-input");
  var sendBtn = panel.querySelector("#scw-send");
  var closeBtn = panel.querySelector(".scw-close");

  /* ---------- helpers ---------- */
  function escapeHtml(str) {
    var d = document.createElement("div");
    d.textContent = String(str == null ? "" : str);
    return d.innerHTML;
  }
  function escapeAttr(str) {
    return String(str == null ? "" : str).replace(/"/g, "&quot;");
  }
  function scrollBottom() {
    body.scrollTop = body.scrollHeight;
  }

  function addMessage(role, text, opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "scw-msg " + (role === "user" ? "scw-msg-user" : "scw-msg-bot");
    el.textContent = text;
    body.appendChild(el);
    if (!opts.skipSave) {
      session.history.push({ role: role, text: text, t: Date.now() });
      saveSession(session);
    }
    scrollBottom();
    return el;
  }

  function addQuickReplies(options) {
    if (!options || !options.length) return;
    var wrap = document.createElement("div");
    wrap.className = "scw-quick";
    options.forEach(function (label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.addEventListener("click", function () {
        wrap.remove();
        sendMessage(label);
      });
      wrap.appendChild(btn);
    });
    body.appendChild(wrap);
    scrollBottom();
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "scw-typing";
    el.id = "scw-typing-indicator";
    el.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(el);
    scrollBottom();
  }
  function hideTyping() {
    var el = document.getElementById("scw-typing-indicator");
    if (el) el.remove();
  }

  function setInputEnabled(enabled) {
    input.disabled = !enabled;
    sendBtn.disabled = !enabled;
    input.placeholder = enabled ? "Type your message..." : "This conversation has ended";
  }

  function addContactForm() {
    var wrap = document.createElement("div");
    wrap.className = "scw-form";
    wrap.innerHTML =
      '<input type="text" placeholder="Your name" id="scw-c-name" autocomplete="name">' +
      '<input type="tel" placeholder="Phone number" id="scw-c-phone" autocomplete="tel">' +
      '<input type="email" placeholder="Email (optional)" id="scw-c-email" autocomplete="email">' +
      '<button type="button" id="scw-c-submit">Send my details</button>' +
      '<div class="scw-form-note">We\'ll only use this to follow up about your visit.</div>';
    body.appendChild(wrap);
    scrollBottom();

    wrap.querySelector("#scw-c-submit").addEventListener("click", function () {
      var name = wrap.querySelector("#scw-c-name").value.trim();
      var phone = wrap.querySelector("#scw-c-phone").value.trim();
      var email = wrap.querySelector("#scw-c-email").value.trim();
      if (!name || !phone) {
        wrap.querySelector(".scw-form-note").textContent = "Please enter your name and phone number.";
        wrap.querySelector(".scw-form-note").style.color = "#c0392b";
        return;
      }
      wrap.remove();
      addMessage("user", name + " — " + phone + (email ? " — " + email : ""));
      session.contactCaptured = true;
      saveSession(session);
      callWebhook({ event: "contact_submitted", message: "", contact: { name: name, phone: phone, email: email } });
    });
  }

  /* ---------- networking ---------- */
  function callWebhook(payload) {
    showTyping();
    var body_ = Object.assign(
      {
        salonId: cfg.salonId,
        sessionId: session.sessionId,
        pageUrl: window.location.href,
        referrer: document.referrer || "",
        timestamp: new Date().toISOString()
      },
      payload
    );

    fetch(cfg.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body_)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Webhook error " + res.status);
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        handleBotResponse(data || {});
      })
      .catch(function (err) {
        hideTyping();
        console.error("[SalonChatWidget] webhook error:", err);
        addMessage("bot", "Sorry, something went wrong on our end. Please try again in a moment.");
      });
  }

  function handleBotResponse(data) {
    if (data.reply) addMessage("bot", data.reply);
    if (data.requestContact && !session.contactCaptured) addContactForm();
    if (data.quickReplies) addQuickReplies(data.quickReplies);
    if (data.end) {
      session.ended = true;
      saveSession(session);
      setInputEnabled(false);
    }
  }

  function sendMessage(text) {
    text = (text || "").trim();
    if (!text || session.ended) return;
    addMessage("user", text);
    input.value = "";
    autoGrow();
    callWebhook({ event: "message", message: text });
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 80) + "px";
  }

  /* ---------- wire up events ---------- */
  sendBtn.addEventListener("click", function () {
    sendMessage(input.value);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });
  input.addEventListener("input", autoGrow);

  if (bubble) {
    bubble.addEventListener("click", function () {
      panel.classList.toggle("scw-open");
      if (panel.classList.contains("scw-open")) {
        input.focus();
        scrollBottom();
      }
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      panel.classList.remove("scw-open");
    });
  }

  /* ---------- boot ---------- */
  function replay() {
    session.history.forEach(function (m) {
      addMessage(m.role, m.text, { skipSave: true });
    });
    if (session.ended) setInputEnabled(false);
  }

  if (session.history.length) {
    replay();
  } else {
    addMessage("bot", cfg.greeting, { skipSave: true });
    session.history.push({ role: "bot", text: cfg.greeting, t: Date.now() });
    saveSession(session);
    callWebhook({ event: "session_start", message: "" });
  }
})();
