/*!
 * Chatling Embeddable Widget
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
  if (window.__chatlingWidgetLoaded) return;
  window.__chatlingWidgetLoaded = true;

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
    title: attr("title", "Chat with us"),
    subtitle: attr("subtitle", "We typically reply in a few minutes"),
    primaryColor: attr("primary-color", "#6d28d9"),
    accentColor: attr("accent-color", ""),
    position: attr("position", "right"),
    welcome: attr("welcome", "Hi 👋 How can we help you today?"),
    placeholder: attr("placeholder", "Type your message..."),
    brandName: attr("brand-name", ""),
    avatarUrl: attr("avatar-url", ""),
    sessionKey: attr("session-key", "chatling:session"),
    historyKey: attr("history-key", "chatling:history"),
    leadCapture: attr("lead-capture", "auto"), // auto | off | required
    leadTitle: attr("lead-title", "Stay in touch"),
    leadSubtitle: attr(
      "lead-subtitle",
      "Leave your details and we'll follow up if we get disconnected.",
    ),
    leadSubmitLabel: attr("lead-submit-label", "Continue"),
    // pipe-separated field spec, each field: key:type:label[:required][:placeholder]
    // types: text | email | tel | url | number | textarea | select(opt1;opt2;opt3)
    leadFields: attr(
      "lead-fields",
      "name:text:Your name|email:email:Email address:required",
    ),
    analytics: attr("analytics", "on"),
    quickReplies: attr("quick-replies", ""), // pipe separated
    // Comma-separated field keys used when a "buttons" formTrigger is clicked
    // directly (i.e. not accompanied by an AI-issued lead_form message).
    formTriggerFields: attr("form-trigger-fields", "name,email,phone,message"),
    bgTheme: attr("bg-theme", "light"), // light|dark|sunset|ocean|mint|lavender|dots|grid|custom
    bgColor: attr("bg-color", ""),
    bgImage: attr("bg-image", ""),
  };

  if (!config.webhookUrl) {
    console.warn("[chatling] Missing data-webhook-url; widget disabled.");
    return;
  }

  // ---------- session + storage ----------
  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  var storage = {
    get: function (k) {
      try {
        return localStorage.getItem(k);
      } catch (_) {
        return null;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (_) {}
    },
    remove: function (k) {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    },
  };

  var sessionId = storage.get(config.sessionKey);
  if (!sessionId) {
    sessionId = uuid();
    storage.set(config.sessionKey, sessionId);
  }

  var history = [];
  try {
    history = JSON.parse(storage.get(config.historyKey) || "[]");
  } catch (_) {
    history = [];
  }
  var lead = null;
  try {
    lead = JSON.parse(storage.get(config.sessionKey + ":lead") || "null");
  } catch (_) {
    lead = null;
  }

  function saveHistory() {
    storage.set(config.historyKey, JSON.stringify(history.slice(-100)));
  }

  // ---------- host + shadow DOM ----------
  var host = document.createElement("div");
  host.id = "chatling-widget-host";
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
    "*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif}" +
    ".launcher{position:fixed;bottom:24px;" +
    (config.position === "left" ? "left:24px;" : "right:24px;") +
    "width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg," +
    primary +
    "," +
    accent +
    ");color:#fff;border:none;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s;animation:cl-pop .5s cubic-bezier(.34,1.56,.64,1)}" +
    ".launcher:hover{transform:scale(1.08)}" +
    ".launcher:active{transform:scale(.95)}" +
    ".launcher svg{width:28px;height:28px;transition:transform .3s}" +
    ".launcher .close-icon{position:absolute;opacity:0;transform:rotate(-90deg)}" +
    ".launcher.open .chat-icon{opacity:0;transform:rotate(90deg)}" +
    ".launcher.open .close-icon{opacity:1;transform:rotate(0)}" +
    ".badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:999px;min-width:20px;height:20px;padding:0 6px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.2)}" +
    ".panel{position:fixed;bottom:100px;" +
    (config.position === "left" ? "left:24px;" : "right:24px;") +
    "width:380px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 130px);background:#fff;border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.25),0 10px 30px rgba(0,0,0,.1);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(20px) scale(.96);transform-origin:bottom " +
    (config.position === "left" ? "left" : "right") +
    ";pointer-events:none;transition:opacity .3s cubic-bezier(.4,0,.2,1),transform .3s cubic-bezier(.34,1.56,.64,1)}" +
    ".panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}" +
    ".header{background:linear-gradient(135deg," +
    primary +
    "," +
    accent +
    ");color:#fff;padding:20px;display:flex;align-items:center;gap:12px;position:relative;overflow:hidden}" +
    ".header:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 0%,rgba(255,255,255,.2),transparent 50%);pointer-events:none}" +
    ".avatar{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;flex-shrink:0;overflow:hidden;position:relative;z-index:1}" +
    ".avatar img{width:100%;height:100%;object-fit:cover}" +
    ".header-text{flex:1;min-width:0;position:relative;z-index:1}" +
    ".title{font-weight:600;font-size:16px;line-height:1.2;margin:0 0 3px}" +
    ".subtitle{font-size:12px;opacity:.85;display:flex;align-items:center;gap:6px}" +
    ".dot{width:8px;height:8px;background:#22c55e;border-radius:50%;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:cl-pulse 2s infinite}" +
    ".header-actions{display:flex;gap:6px;position:relative;z-index:1}" +
    ".close-btn,.clear-btn{background:rgba(255,255,255,.15);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}" +
    ".close-btn:hover,.clear-btn:hover{background:rgba(255,255,255,.25)}" +
    ".confirm{background:#fff;padding:14px 16px;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.06);animation:cl-in .3s}" +
    ".confirm p{margin:0 0 10px;font-size:13px;color:#111827}" +
    ".confirm-actions{display:flex;gap:8px}" +
    ".confirm button{flex:1;padding:8px 10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:opacity .2s}" +
    ".confirm .yes{background:#ef4444;color:#fff}" +
    ".confirm .no{background:#f3f4f6;color:#374151}" +
    ".confirm button:hover{opacity:.9}" +
    ".messages{flex:1;overflow-y:auto;padding:20px;background:#f8fafc;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;transition:background .3s ease}" +
    ".messages::-webkit-scrollbar{width:6px}" +
    ".messages::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:3px}" +
    ".messages.theme-dark::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2)}" +
    ".msg{max-width:80%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.45;word-wrap:break-word;animation:cl-in .3s cubic-bezier(.34,1.56,.64,1);white-space:pre-wrap}" +
    ".msg.bot{align-self:flex-start;background:#fff;color:#111827;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.06)}" +
    ".messages.theme-dark .msg.bot{background:#1e293b;color:#f1f5f9;box-shadow:0 1px 2px rgba(0,0,0,.3)}" +
    ".messages.theme-dark .typing{background:#1e293b}" +
    ".messages.theme-dark .typing span{background:#64748b}" +
    ".messages.theme-dark .lead,.messages.theme-dark .confirm{background:#1e293b;color:#f1f5f9}" +
    ".messages.theme-dark .lead h4,.messages.theme-dark .confirm p{color:#f1f5f9}" +
    ".messages.theme-dark .lead p{color:#94a3b8}" +
    ".messages.theme-dark .lead input{background:#0f172a;border-color:#334155;color:#f1f5f9}" +
    ".messages.theme-dark .confirm .no{background:#334155;color:#f1f5f9}" +
    ".msg.user{align-self:flex-end;background:linear-gradient(135deg," +
    primary +
    "," +
    accent +
    ");color:#fff;border-bottom-right-radius:4px}" +
    ".typing{align-self:flex-start;background:#fff;padding:12px 16px;border-radius:16px;border-bottom-left-radius:4px;display:flex;gap:4px;box-shadow:0 1px 2px rgba(0,0,0,.06);animation:cl-in .2s ease}" +
    ".typing span{width:7px;height:7px;background:#9ca3af;border-radius:50%;animation:cl-bounce 1.4s infinite}" +
    ".typing span:nth-child(2){animation-delay:.15s}" +
    ".typing span:nth-child(3){animation-delay:.3s}" +
    ".quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}" +
    ".quick button{background:#fff;border:1px solid " +
    primary +
    "33;color:" +
    primary +
    ";padding:8px 12px;border-radius:999px;font-size:13px;cursor:pointer;transition:all .2s;font-weight:500}" +
    ".quick button:hover{background:" +
    primary +
    ";color:#fff;transform:translateY(-1px);box-shadow:0 4px 10px " +
    primary +
    "40}" +
    ".actions{display:flex;flex-direction:column;gap:8px;margin-top:2px}" +
    ".action-btn{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 14px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:2px;transition:border-color .2s,transform .15s;width:100%}" +
    ".action-btn:hover{border-color:" +
    primary +
    ";transform:translateY(-1px)}" +
    ".action-label{font-size:13px;font-weight:600;color:#111827}" +
    ".action-subtitle{font-size:12px;color:#6b7280}" +
    ".messages.theme-dark .action-btn{background:#1e293b;border-color:#334155}" +
    ".messages.theme-dark .action-label{color:#f1f5f9}" +
    ".messages.theme-dark .action-subtitle{color:#94a3b8}" +
    ".msg.bot strong{font-weight:700}" +
    ".msg.bot a{color:" +
    primary +
    ";text-decoration:underline}" +
    ".msg.bot ul{margin:4px 0;padding-left:18px}" +
    ".lead{background:#fff;padding:16px;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.06);animation:cl-in .3s}" +
    ".lead h4{margin:0 0 4px;font-size:14px;color:#111827}" +
    ".lead p{margin:0 0 12px;font-size:12px;color:#6b7280}" +
    ".lead input,.lead textarea,.lead select{width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:8px;outline:none;transition:border-color .2s;font-family:inherit;background:#fff;color:#111827;box-sizing:border-box}" +
    ".lead textarea{min-height:72px;resize:vertical}" +
    ".lead input:focus,.lead textarea:focus,.lead select:focus{border-color:" +
    primary +
    "}" +
    ".lead label.field{display:block;margin-bottom:8px}" +
    ".lead label.field .lbl{display:block;font-size:12px;font-weight:500;color:#374151;margin-bottom:4px}" +
    ".lead label.field .lbl .req{color:#ef4444;margin-left:2px}" +
    ".messages.theme-dark .lead textarea,.messages.theme-dark .lead select{background:#0f172a;border-color:#334155;color:#f1f5f9}" +
    ".messages.theme-dark .lead label.field .lbl{color:#cbd5e1}" +
    ".lead button{width:100%;background:" +
    primary +
    ";color:#fff;border:none;padding:10px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s}" +
    ".lead button:hover{opacity:.9}" +
    ".lead .skip{background:transparent;color:#6b7280;margin-top:4px;padding:6px;font-weight:400}" +
    ".composer{border-top:1px solid #e5e7eb;padding:12px;background:#fff;display:flex;gap:8px;align-items:flex-end}" +
    ".composer textarea{flex:1;border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;font-size:14px;resize:none;outline:none;max-height:100px;min-height:40px;font-family:inherit;transition:border-color .2s}" +
    ".composer textarea:focus{border-color:" +
    primary +
    "}" +
    ".send{background:" +
    primary +
    ";color:#fff;border:none;width:40px;height:40px;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s,opacity .2s}" +
    ".send:hover:not(:disabled){transform:scale(1.05)}" +
    ".send:disabled{opacity:.4;cursor:not-allowed}" +
    ".footer{text-align:center;padding:6px;font-size:11px;color:#9ca3af;background:#fff;border-top:1px solid #f3f4f6}" +
    ".footer a{color:#9ca3af;text-decoration:none}" +
    "@keyframes cl-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}" +
    "@keyframes cl-pop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}" +
    "@keyframes cl-pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}" +
    "@keyframes cl-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-6px);opacity:1}}" +
    "@media(max-width:480px){.panel{width:100vw;max-width:100vw;height:100vh;max-height:100vh;bottom:0;right:0;left:0;border-radius:0}}";
  root.appendChild(style);

  // ---------- markup ----------
  var wrap = document.createElement("div");
  wrap.innerHTML =
    '<button class="launcher" aria-label="Open chat">' +
    '<svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    '<svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
    '<span class="badge" style="display:none">1</span>' +
    "</button>" +
    '<div class="panel" role="dialog" aria-label="Chat">' +
    '<div class="header">' +
    '<div class="avatar">' +
    (config.avatarUrl
      ? '<img src="' + escapeAttr(config.avatarUrl) + '" alt="">'
      : escapeHtml((config.brandName || config.title || "C").charAt(0).toUpperCase())) +
    "</div>" +
    '<div class="header-text">' +
    '<div class="title">' +
    escapeHtml(config.title) +
    "</div>" +
    '<div class="subtitle"><span class="dot"></span>' +
    escapeHtml(config.subtitle) +
    "</div>" +
    "</div>" +
    '<div class="header-actions">' +
    '<button class="clear-btn" aria-label="Clear conversation" title="Clear conversation"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>' +
    '<button class="close-btn" aria-label="Close chat"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
    "</div>" +
    "</div>" +
    '<div class="messages" role="log" aria-live="polite"></div>' +
    '<form class="composer">' +
    '<textarea rows="1" placeholder="' +
    escapeAttr(config.placeholder) +
    '" aria-label="Message"></textarea>' +
    '<button type="submit" class="send" aria-label="Send"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-7-7 14-2-5-5-2z"/></svg></button>' +
    "</form>" +
    '<div class="footer">Powered by <a href="#" target="_blank" rel="noopener">Chatling</a></div>' +
    "</div>";
  root.appendChild(wrap);

  var launcher = root.querySelector(".launcher");
  var badge = root.querySelector(".badge");
  var panel = root.querySelector(".panel");
  var messagesEl = root.querySelector(".messages");

  // ---------- background theme ----------
  var THEMES = {
    light: { bg: "#f8fafc", dark: false },
    dark: { bg: "#0f172a", dark: true },
    sunset: { bg: "linear-gradient(160deg,#fef3c7 0%,#fecaca 60%,#fbcfe8 100%)", dark: false },
    ocean: { bg: "linear-gradient(160deg,#dbeafe 0%,#bfdbfe 60%,#c7d2fe 100%)", dark: false },
    mint: { bg: "linear-gradient(160deg,#ecfdf5 0%,#d1fae5 60%,#a7f3d0 100%)", dark: false },
    lavender: { bg: "linear-gradient(160deg,#ede9fe 0%,#ddd6fe 60%,#fbcfe8 100%)", dark: false },
    dots: {
      bg: "#f8fafc radial-gradient(circle,#cbd5e1 1px,transparent 1px) 0 0/16px 16px",
      dark: false,
    },
    grid: {
      bg: "#f8fafc linear-gradient(#e2e8f0 1px,transparent 1px) 0 0/22px 22px",
      dark: false,
    },
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
  var closeBtn = root.querySelector(".close-btn");
  var clearBtn = root.querySelector(".clear-btn");
  var form = root.querySelector(".composer");
  var textarea = root.querySelector("textarea");
  var sendBtn = root.querySelector(".send");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  // ---------- rendering ----------
  function scrollBottom() {
    requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function addMessage(role, text, save, isHtml) {
    var el = document.createElement("div");
    el.className = "msg " + (role === "user" ? "user" : "bot");
    if (isHtml) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
    messagesEl.appendChild(el);
    scrollBottom();
    if (save !== false) {
      history.push({ role: role, text: text, ts: Date.now(), html: !!isHtml });
      saveHistory();
    }
    if (role === "bot" && !isOpen) bumpBadge();
  }

  // Lightweight markdown -> safe HTML (bold, links, bullet lists, line breaks).
  // Input is escaped first, so this never introduces raw HTML from the model.
  function renderMarkdown(src) {
    var text = escapeHtml(String(src == null ? "" : src));
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, label, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener">' + label + "</a>";
    });
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    var out = [];
    var listBuf = [];
    function flushList() {
      if (listBuf.length) {
        out.push(
          "<ul>" +
            listBuf
              .map(function (i) {
                return "<li>" + i + "</li>";
              })
              .join("") +
            "</ul>",
        );
        listBuf = [];
      }
    }
    text.split("\n").forEach(function (line) {
      var m = /^\s*-\s+(.*)$/.exec(line);
      if (m) {
        listBuf.push(m[1]);
      } else {
        flushList();
        out.push(line);
      }
    });
    flushList();
    return out.join("<br>");
  }

  // Cards rendered from an AI "buttons" message: each item either opens a
  // URL in a new tab, or (formTrigger: true) opens the in-chat enquiry form.
  function addActionButtons(items) {
    if (!items || !items.length) return;
    var box = document.createElement("div");
    box.className = "actions";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "action-btn";
      var html = '<span class="action-label">' + escapeHtml(it.label || "") + "</span>";
      if (it.subtitle) {
        html += '<span class="action-subtitle">' + escapeHtml(it.subtitle) + "</span>";
      }
      b.innerHTML = html;
      b.onclick = function () {
        if (it.formTrigger) {
          renderBotForm({
            title: "Send Us Your Enquiry",
            submitLabel: "Send Enquiry",
            fields: config.formTriggerFields.split(",").map(function (s) { return s.trim(); }).filter(Boolean),
          });
        } else if (it.url) {
          window.open(it.url, "_blank", "noopener");
        }
      };
      box.appendChild(b);
    });
    messagesEl.appendChild(box);
    scrollBottom();
  }

  function addQuickReplies(items) {
    if (!items || !items.length) return;
    var box = document.createElement("div");
    box.className = "quick";
    items.forEach(function (label) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.onclick = function () {
        box.remove();
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

  // ---------- lead capture ----------
  var leadPromptShown = false;
  function maybeShowLeadCapture() {
    if (config.leadCapture === "off") return;
    if (lead) return;
    if (leadPromptShown) return;
    // trigger after 2 user messages, or immediately if required
    var userMsgs = history.filter(function (m) {
      return m.role === "user";
    }).length;
    if (config.leadCapture !== "required" && userMsgs < 2) return;
    leadPromptShown = true;
    renderLeadForm();
  }

  // Default field specs for the AI agent's lead_form contract, which only
  // sends plain field-name strings (name, email, phone, productInterest,
  // budget, message) rather than full field objects.
  var LEAD_FIELD_DEFAULTS = {
    name: { type: "text", label: "Full name", required: false, placeholder: "" },
    email: { type: "email", label: "Email address", required: true, placeholder: "" },
    phone: { type: "tel", label: "Phone number", required: false, placeholder: "" },
    productInterest: { type: "text", label: "Product interest", required: false, placeholder: "" },
    propertyInterest: { type: "text", label: "Buying, renting, or selling?", required: false, placeholder: "" },
    location: { type: "text", label: "Preferred location", required: false, placeholder: "" },
    budget: { type: "text", label: "Budget", required: false, placeholder: "" },
    message: { type: "textarea", label: "Message", required: false, placeholder: "" },
  };
  function expandLeadFields(keys) {
    return (keys || []).map(function (k) {
      var d = LEAD_FIELD_DEFAULTS[k] || { type: "text", label: k, required: false, placeholder: "" };
      return Object.assign({ key: k }, d);
    });
  }

  // Parse a pipe-separated field spec into a structured array.
  // Each field: "key:type:label[:required][:placeholder]"
  // Type may be "select(opt1;opt2;opt3)" for a dropdown.
  function parseFieldSpec(spec) {
    if (!spec) return [];
    return spec
      .split("|")
      .map(function (raw) {
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
        return {
          key: key,
          type: type,
          label: label,
          required: required,
          placeholder: placeholder,
          options: options,
        };
      })
      .filter(Boolean);
  }

  function escapeAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Render a form (lead capture or bot-triggered inline form).
  // opts: { title, subtitle, fields, submitLabel, allowSkip, onSubmit, onSkip }
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
        html +=
          '<textarea id="' + id + '" name="' + name + '" placeholder="' + ph + '"' + reqAttr +
          " rows=\"3\"></textarea>";
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
        html +=
          '<input id="' + id + '" type="' + t + '" name="' + name + '" placeholder="' + ph + '"' +
          autocomplete + reqAttr + ">";
      }
      html += "</label>";
    });
    html += '<button type="submit" data-act="submit">' +
      escapeAttr(opts.submitLabel || "Submit") + "</button>";
    if (opts.allowSkip) {
      html += '<button type="button" class="skip" data-act="skip">Not now</button>';
    }
    box.innerHTML = html;
    messagesEl.appendChild(box);
    scrollBottom();

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
      if (firstInvalid) {
        firstInvalid.focus();
        return null;
      }
      return values;
    }

    box.addEventListener("submit", function (e) {
      e.preventDefault();
      var values = collect();
      if (!values) return;
      opts.onSubmit(values, box);
    });
    var skipBtn = box.querySelector('[data-act="skip"]');
    if (skipBtn) {
      skipBtn.addEventListener("click", function () {
        opts.onSkip && opts.onSkip(box);
      });
    }
    return box;
  }

  function renderLeadForm() {
    var fields = parseFieldSpec(config.leadFields);
    if (!fields.length) {
      fields = [
        { key: "name", type: "text", label: "Your name", required: false, placeholder: "" },
        { key: "email", type: "email", label: "Email address", required: true, placeholder: "" },
      ];
    }
    renderForm({
      title: config.leadTitle,
      subtitle: config.leadSubtitle,
      fields: fields,
      submitLabel: config.leadSubmitLabel,
      allowSkip: config.leadCapture !== "required",
      onSubmit: function (values, box) {
        lead = Object.assign({}, values, { capturedAt: Date.now() });
        storage.set(config.sessionKey + ":lead", JSON.stringify(lead));
        box.remove();
        var greetName = values.name || values.firstName || "";
        addMessage(
          "bot",
          greetName
            ? "Thanks " + greetName + "! You're all set. 🎉"
            : "Thanks — we got your details. 🎉",
        );
        track("lead_captured", { fields: Object.keys(values) });
        postToWebhook({ type: "lead", lead: lead });
      },
      onSkip: function (box) {
        box.remove();
        track("lead_skipped");
      },
    });
  }

  // Render a bot-triggered inline form. Bot reply may include:
  //   { form: { id, title, description, submitLabel, fields: [...] } }
  // where each field matches parseFieldSpec output.
  function renderBotForm(form) {
    var rawFields = Array.isArray(form.fields) ? form.fields : [];
    // The AI agent's lead_form message sends plain strings, e.g. "email";
    // expand those into full field specs. Already-expanded objects pass through.
    var fields = rawFields
      .map(function (f) {
        if (typeof f === "string") return expandLeadFields([f])[0];
        return f && f.key ? f : null;
      })
      .filter(Boolean);
    if (!fields.length) return;
    renderForm({
      title: form.title || "",
      subtitle: form.description || form.subtitle || "",
      fields: fields,
      submitLabel: form.submitLabel || "Submit",
      allowSkip: false,
      onSubmit: function (values, box) {
        // Lock the form after submit
        box.querySelectorAll("input,select,textarea,button").forEach(function (el) {
          el.disabled = true;
        });
        addMessage("bot", "Thanks — sent. ✅");
        track("form_submitted", { formId: form.id || null, fields: Object.keys(values) });
        // Matches the n8n workflow's "Is Lead Form Submission?" check and the
        // fields its "Prepare Lead Data" node reads (body.formData.*, body.page.*).
        postToWebhook({
          messageType: "lead_form_submit",
          formData: values,
          page: { url: location.href, timestamp: new Date().toISOString() },
        });
      },
    });
  }


  // ---------- transport ----------
  function postToWebhook(extra) {
    var payload = Object.assign(
      {
        sessionId: sessionId,
        pageUrl: location.href,
        pageTitle: document.title,
        referrer: document.referrer || "",
        userAgent: navigator.userAgent,
        lang: navigator.language,
        lead: lead,
        timestamp: new Date().toISOString(),
      },
      extra || {},
    );
    return fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  function track(event, data) {
    if (config.analytics === "off") return;
    // fire-and-forget analytics event to same webhook
    try {
      postToWebhook({ type: "event", event: event, data: data || {} }).catch(function () {});
    } catch (_) {}
  }

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
          try {
            return JSON.parse(t);
          } catch (_) {
            return { reply: t };
          }
        });
      })
      .then(function (data) {
        typing.remove();
        // n8n sometimes wraps the payload in an array: [{...}]
        var first = Array.isArray(data) && data.length ? data[0] : data;
        first = first || {};

        // Primary contract (ShopNova workflow): { messages: [ {type, ...}, ... ] }
        // where type is one of text | markdown | buttons | lead_form.
        if (Array.isArray(first.messages) && first.messages.length) {
          var sawForm = false;
          first.messages.forEach(function (msg) {
            if (!msg || !msg.type) return;
            if (msg.type === "text") {
              addMessage("bot", String(msg.content || ""));
            } else if (msg.type === "markdown") {
              addMessage("bot", renderMarkdown(msg.content || ""), true, true);
            } else if (msg.type === "buttons") {
              addActionButtons(msg.items || []);
            } else if (msg.type === "lead_form") {
              sawForm = true;
              renderBotForm(msg);
            }
          });
          if (!sawForm) maybeShowLeadCapture();
          return;
        }

        // Fallback for a simpler { reply, quickReplies, form } contract.
        var reply =
          first.reply ||
          first.output ||
          first.text ||
          first.message ||
          "Thanks — we'll get back to you shortly.";
        addMessage("bot", String(reply));
        if (Array.isArray(first.quickReplies)) {
          addQuickReplies(first.quickReplies);
        }
        if (first.form && typeof first.form === "object") {
          renderBotForm(first.form);
        } else {
          maybeShowLeadCapture();
        }
      })
      .catch(function () {
        typing.remove();
        addMessage("bot", "Sorry — something went wrong. Please try again.");
      })
      .finally(function () {
        busy = false;
        sendBtn.disabled = false;
        textarea.focus();
      });
  }

  // ---------- interactions ----------
  var isOpen = false;
  function openPanel() {
    isOpen = true;
    panel.classList.add("open");
    launcher.classList.add("open");
    clearBadge();
    setTimeout(function () {
      textarea.focus();
    }, 200);
    track("open");
  }
  function closePanel() {
    isOpen = false;
    panel.classList.remove("open");
    launcher.classList.remove("open");
    track("close");
  }
  launcher.addEventListener("click", function () {
    isOpen ? closePanel() : openPanel();
  });
  closeBtn.addEventListener("click", closePanel);

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
      '<button type="button" class="no" data-act="no">Cancel</button>' +
      '<button type="button" class="yes" data-act="yes">Clear</button>' +
      "</div>";
    messagesEl.appendChild(box);
    scrollBottom();
    box.querySelector('[data-act="yes"]').onclick = function () {
      box.remove();
      clearConversation();
    };
    box.querySelector('[data-act="no"]').onclick = function () { box.remove(); };
  });

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
  function autosize() {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
  }
  textarea.addEventListener("input", autosize);

  // ---------- boot ----------
  if (history.length) {
    history.forEach(function (m) {
      addMessage(m.role, m.text, false, !!m.html);
    });
  } else {
    addMessage("bot", config.welcome, true);
    var quick = config.quickReplies
      ? config.quickReplies.split("|").map(function (s) {
          return s.trim();
        }).filter(Boolean)
      : [];
    if (quick.length) addQuickReplies(quick);
  }
  track("loaded");

  // public API
  window.Chatling = {
    open: openPanel,
    close: closePanel,
    send: sendMessage,
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
  };
})();
