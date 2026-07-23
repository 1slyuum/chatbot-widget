/*!
 * Blackstone Legal Intake — embeddable chat widget
 * Usage:
 *   <script
 *     src="https://your-domain.com/widgets/blackstone-legal-chat.js"
 *     data-webhook-url="https://your-n8n-instance/webhook/blackstone-legal"
 *     data-position="right"
 *     data-cta-url="https://your-law-firm.com/consultation"
 *     data-timeout="30000"
 *     defer></script>
 */
(() => {
  "use strict";

  if (window.__BLACKSTONE_LEGAL_WIDGET_LOADED__) return;
  window.__BLACKSTONE_LEGAL_WIDGET_LOADED__ = true;

  const loader = document.currentScript;
  const config = {
    webhookUrl: loader?.dataset.webhookUrl || "",
    position: loader?.dataset.position === "left" ? "left" : "right",
    ctaUrl: loader?.dataset.ctaUrl || "https://www.example-law.com/consultation",
    ctaLabel: loader?.dataset.ctaLabel || "Request a consultation",
    timeout: Number(loader?.dataset.timeout) || 30000,
  };

  const icons = {
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.2 3.5c-.6.5-1.5.1-1.5-.7V16h-.3A2.5 2.5 0 0 1 4 13.5v-8Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    minimize: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-6-6 6 6-6 6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
    seal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6.5v5.2C4 16.4 7.4 19.8 12 21c4.6-1.2 8-4.6 8-9.3V6.5L12 3Zm-2.2 9.4 1.7 1.7 3.7-4.1" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600;700&display=swap');
    :host { all: initial; color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    button, input, textarea, select { font: inherit; }
    button, a { -webkit-tap-highlight-color: transparent; }
    .bl-root {
      --ink: #17130d;
      --panel-deep: #1e1810;
      --paper: #faf6ec;
      --parchment: #f2e9d3;
      --hairline: #d9c9a0;
      --brass: #9c793f;
      --brass-deep: #7c5f30;
      --brass-soft: #cfb27e;
      --danger: #7c332a;
      position: fixed; z-index: 2147483000; bottom: 20px;
      ${config.position}: 20px;
      font-family: 'Inter', Arial, Helvetica, sans-serif; color: var(--ink);
      text-rendering: optimizeLegibility;
    }
    .bl-launcher {
      width: 60px; height: 60px; border: 1px solid var(--brass-soft);
      border-radius: 12px; background: var(--panel-deep); color: var(--parchment);
      box-shadow: 0 14px 28px rgba(23,19,13,.38), inset 0 0 0 3px rgba(207,178,126,.14);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .bl-launcher:hover { transform: translateY(-2px); box-shadow: 0 18px 32px rgba(23,19,13,.44), inset 0 0 0 3px rgba(207,178,126,.2); }
    .bl-launcher svg { width: 24px; height: 24px; fill: currentColor; }
    .bl-panel {
      display: none; flex-direction: column; overflow: hidden;
      width: min(390px, calc(100vw - 32px)); height: min(650px, calc(100vh - 40px));
      margin-bottom: 14px; border: 1px solid var(--hairline); border-radius: 8px;
      background: var(--paper); box-shadow: 0 26px 60px rgba(23,19,13,.28);
    }
    .bl-panel[data-open="true"] { display: flex; animation: bl-in .22s ease-out; }
    @keyframes bl-in { from { opacity: 0; transform: translateY(10px) scale(.98); } }
    .bl-header {
      min-height: 84px; padding: 16px 18px 13px; background: var(--panel-deep); color: var(--parchment);
      display: flex; align-items: center; gap: 13px; position: relative;
      border-bottom: 1px solid var(--brass-deep);
      box-shadow: 0 5px 0 -3px rgba(207,178,126,.35);
    }
    .bl-mark {
      width: 40px; height: 40px; flex: 0 0 auto; border: 1px solid var(--brass-soft);
      border-radius: 3px; display: flex; align-items: center; justify-content: center;
      font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 19px; color: var(--brass-soft);
    }
    .bl-head-copy { min-width: 0; flex: 1; }
    .bl-title { margin: 0; font: 600 21px/1.2 'Cormorant Garamond', Georgia, serif; letter-spacing: .01em; }
    .bl-status { margin: 6px 0 0; font-size: 10.5px; font-weight: 600; letter-spacing: .11em; text-transform: uppercase; color: var(--brass-soft); display: flex; align-items: center; gap: 7px; }
    .bl-dot { width: 5px; height: 5px; background: var(--brass-soft); transform: rotate(45deg); }
    .bl-icon-btn { width: 32px; height: 32px; border: 0; border-radius: 3px; color: inherit; background: transparent; cursor: pointer; display: grid; place-items: center; }
    .bl-icon-btn:hover { background: rgba(207,178,126,.16); }
    .bl-icon-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; }
    .bl-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 17px 14px; display: flex; flex-direction: column; gap: 13px; scroll-behavior: smooth; }
    .bl-message { max-width: 87%; padding: 12px 14px; border-radius: 3px; font-size: 14px; line-height: 1.56; white-space: pre-wrap; overflow-wrap: anywhere; }
    .bl-message.bot { align-self: flex-start; background: var(--parchment); border: 1px solid var(--hairline); }
    .bl-message.user { align-self: flex-end; background: var(--panel-deep); color: var(--parchment); }
    .bl-message.error { border: 1px solid var(--danger); background: var(--paper); }
    .bl-retry { margin-top: 8px; border: 0; padding: 0; color: var(--brass-deep); background: transparent; font-weight: 700; text-decoration: underline; cursor: pointer; }
    .bl-suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
    .bl-chip { border: 1px solid var(--hairline); border-radius: 2px; padding: 8px 12px; color: var(--panel-deep); background: transparent; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; }
    .bl-chip:hover { border-color: var(--brass); background: var(--parchment); }
    .bl-typing { display: flex; gap: 4px; align-items: center; width: 54px; }
    .bl-typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); opacity: .4; animation: bl-dot 1.1s infinite; }
    .bl-typing i:nth-child(2) { animation-delay: .15s; } .bl-typing i:nth-child(3) { animation-delay: .3s; }
    @keyframes bl-dot { 45% { opacity: 1; transform: translateY(-2px); } }
    .bl-lead { margin-top: 3px; padding: 16px; border: 1px solid var(--hairline); border-radius: 4px; background: var(--parchment); }
    .bl-lead h3 { margin: 0 0 5px; font: 600 19px/1.25 'Cormorant Garamond', Georgia, serif; color: var(--panel-deep); }
    .bl-lead p { margin: 0 0 13px; font-size: 12px; line-height: 1.5; }
    .bl-fields { display: grid; gap: 10px; }
    .bl-field label { display: block; margin-bottom: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--brass-deep); }
    .bl-field input, .bl-field select, .bl-field textarea { width: 100%; min-height: 40px; border: 1px solid var(--hairline); border-radius: 2px; padding: 9px 10px; background: var(--paper); color: var(--ink); font-size: 14px; outline: none; resize: vertical; }
    .bl-field input:focus, .bl-field select:focus, .bl-field textarea:focus, .bl-compose textarea:focus { border-color: var(--brass); box-shadow: 0 0 0 2px rgba(156,121,63,.16); }
    .bl-consent { display: flex; align-items: flex-start; gap: 8px; margin: 12px 0; font-size: 11px; line-height: 1.4; }
    .bl-consent input { width: 16px; height: 16px; margin: 0; accent-color: var(--brass-deep); flex: 0 0 auto; }
    .bl-submit { width: 100%; min-height: 42px; border: 0; border-radius: 2px; padding: 9px 14px; background: var(--panel-deep); color: var(--parchment); font-weight: 600; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
    .bl-submit:disabled { opacity: .55; cursor: not-allowed; }
    .bl-form-error { min-height: 16px; margin: 7px 0 0; color: var(--danger); font-size: 11px; }
    .bl-footer { border-top: 1px solid var(--hairline); background: var(--paper); }
    .bl-cta { margin: 13px 15px 0; min-height: 40px; border: 1px solid var(--panel-deep); border-radius: 2px; color: var(--panel-deep); text-decoration: none; font: 600 11px/1 'Inter', sans-serif; letter-spacing: .07em; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .bl-cta:hover { background: var(--panel-deep); color: var(--parchment); }
    .bl-cta svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .bl-compose { padding: 11px 13px 9px; display: flex; gap: 8px; align-items: flex-end; }
    .bl-compose textarea { flex: 1; min-height: 42px; max-height: 100px; resize: none; border: 1px solid var(--hairline); border-radius: 3px; padding: 10px 11px; color: var(--ink); background: #fff; font-size: 14px; line-height: 1.35; outline: none; }
    .bl-send { width: 42px; height: 42px; flex: 0 0 auto; border: 0; border-radius: 3px; background: var(--panel-deep); color: var(--parchment); cursor: pointer; display: grid; place-items: center; }
    .bl-send:disabled { opacity: .5; cursor: not-allowed; }
    .bl-send svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .bl-note { margin: 0; padding: 0 15px 11px; text-align: center; font-size: 10px; line-height: 1.4; color: #7a6c53; }
    .bl-sr { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    :focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }
    @media (max-width: 520px) {
      .bl-root { bottom: 12px; ${config.position}: 12px; }
      .bl-panel { width: calc(100vw - 24px); height: min(680px, calc(100dvh - 24px)); margin-bottom: 0; border-radius: 6px; }
      .bl-launcher { width: 56px; height: 56px; margin-top: 10px; margin-${config.position}: 2px; }
    }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; scroll-behavior: auto !important; transition: none !important; } }
  `;

  function escapeAttr(value) {
    return String(value).replace(/[&"'<>]/g, (char) => ({ "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" })[char]);
  }

  const host = document.createElement("div");
  host.id = "blackstone-legal-widget";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  shadow.innerHTML = `
    <style>${css}</style>
    <div class="bl-root">
      <section class="bl-panel" data-open="false" role="dialog" aria-modal="false" aria-label="Chat with Blackstone Legal Intake">
        <header class="bl-header">
          <div class="bl-mark" aria-hidden="true">B</div>
          <div class="bl-head-copy"><h2 class="bl-title">Blackstone Legal</h2><p class="bl-status"><span class="bl-dot"></span>Intake &amp; Consultations</p></div>
          <button class="bl-icon-btn bl-minimize" type="button" aria-label="Minimize chat">${icons.minimize}</button>
          <button class="bl-icon-btn bl-close" type="button" aria-label="Close chat">${icons.close}</button>
        </header>
        <div class="bl-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
        <footer class="bl-footer">
          <a class="bl-cta" href="${escapeAttr(config.ctaUrl)}" target="_blank" rel="noopener noreferrer">${escapeAttr(config.ctaLabel)} ${icons.arrow}</a>
          <form class="bl-compose">
            <label class="bl-sr" for="bl-input">Message Blackstone Legal Intake</label>
            <textarea id="bl-input" rows="1" maxlength="1200" placeholder="Ask about practice areas or consultations…"></textarea>
            <button class="bl-send" type="submit" aria-label="Send message">${icons.send}</button>
          </form>
          <p class="bl-note">General information only — not legal advice. Using this chat does not create an attorney-client relationship. Do not share confidential information or rely on chat for deadlines or emergencies.</p>
        </footer>
      </section>
      <button class="bl-launcher" type="button" aria-label="Open Blackstone Legal Intake" aria-expanded="false">${icons.chat}</button>
    </div>`;

  const panel = shadow.querySelector(".bl-panel");
  const launcher = shadow.querySelector(".bl-launcher");
  const messages = shadow.querySelector(".bl-messages");
  const form = shadow.querySelector(".bl-compose");
  const input = shadow.querySelector("#bl-input");
  const sendButton = shadow.querySelector(".bl-send");
  let loading = false;
  let lastMessage = "";
  let leadShown = false;
  let lastFocused = null;

  function sessionId() {
    const key = "blackstoneLegalSessionId";
    try {
      let id = window.localStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : `bl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem(key, id);
      }
      return id;
    } catch (_) {
      return `bl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
  const currentSessionId = sessionId();

  function scrollToEnd() { messages.scrollTop = messages.scrollHeight; }

  function addMessage(text, type = "bot", options = {}) {
    const item = document.createElement("div");
    item.className = `bl-message ${type}${options.error ? " error" : ""}`;
    item.textContent = text;
    if (options.retry) {
      const retry = document.createElement("button");
      retry.type = "button"; retry.className = "bl-retry"; retry.textContent = "Try again";
      retry.addEventListener("click", () => { item.remove(); sendMessage(options.retry); });
      item.appendChild(document.createElement("br")); item.appendChild(retry);
    }
    messages.appendChild(item); scrollToEnd(); return item;
  }

  function addSuggestions() {
    const wrap = document.createElement("div"); wrap.className = "bl-suggestions";
    [
      ["Practice areas", "What types of legal matters does the firm handle?"],
      ["Request consultation", "I'd like to request an initial consultation."],
      ["Is my case a fit?", "Can you help me understand whether my matter may fit the firm's practice?"],
      ["Office contact", "I'd like the firm to contact me about a legal matter."],
    ].forEach(([label, prompt]) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "bl-chip"; button.textContent = label;
      button.addEventListener("click", () => { wrap.remove(); if (label === "Request consultation" || label === "Office contact") showLeadForm(); else sendMessage(prompt); });
      wrap.appendChild(button);
    });
    messages.appendChild(wrap); scrollToEnd();
  }

  function showLeadForm() {
    if (leadShown) return;
    leadShown = true;
    const card = document.createElement("form"); card.className = "bl-lead"; card.noValidate = true;
    card.innerHTML = `<h3>Request a consultation</h3><p>Share basic, non-confidential details for an initial conflict check. Submitting this form does not create an attorney-client relationship.</p>
      <div class="bl-fields">
        <div class="bl-field"><label for="bl-name">Full name</label><input id="bl-name" name="name" autocomplete="name" maxlength="80" required></div>
        <div class="bl-field"><label for="bl-email">Email</label><input id="bl-email" name="email" type="email" autocomplete="email" maxlength="120" required></div>
        <div class="bl-field"><label for="bl-phone">Phone</label><input id="bl-phone" name="phone" type="tel" autocomplete="tel" maxlength="30" required></div>
        <div class="bl-field"><label for="bl-matter">Matter type</label><select id="bl-matter" name="matterType"><option value="">Select…</option><option>Business</option><option>Employment</option><option>Estate planning</option><option>Family</option><option>Litigation</option><option>Real estate</option><option>Other</option></select></div>
        <div class="bl-field"><label for="bl-summary">Brief non-confidential summary</label><textarea id="bl-summary" name="summary" maxlength="500" rows="3" placeholder="Please do not include confidential or sensitive details."></textarea></div>
      </div>
      <label class="bl-consent"><input name="consent" type="checkbox" required><span>I agree that Blackstone Legal may contact me about this consultation request.</span></label>
      <button class="bl-submit" type="submit">Request consultation</button><p class="bl-form-error" role="alert"></p>`;
    messages.appendChild(card); scrollToEnd(); card.querySelector("input").focus();
    card.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(card);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const matterType = String(data.get("matterType") || "").trim();
      const summary = String(data.get("summary") || "").trim();
      const error = card.querySelector(".bl-form-error");
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || phone.replace(/\D/g, "").length < 7 || !data.get("consent")) {
        error.textContent = "Please enter a valid name, email, phone number, and confirm consent."; return;
      }
      const button = card.querySelector(".bl-submit"); button.disabled = true; button.textContent = "Sending…"; error.textContent = "";
      try {
        await request("I'd like to request a legal consultation.", "lead", { name, email, phone, matterType, summary, consent: true });
        card.remove(); addMessage("Thank you. Your consultation request was sent to the intake team. They will review it and contact you about possible next steps. No attorney-client relationship has been formed.");
      } catch (err) {
        error.textContent = friendlyError(err); button.disabled = false; button.textContent = "Request consultation";
      }
    });
  }

  function endpointReady() {
    return /^https?:\/\//i.test(config.webhookUrl) && !/YOUR_|REPLACE|example\.com/i.test(config.webhookUrl);
  }

  async function request(chatInput, eventType = "message", lead = null) {
    if (!endpointReady()) throw new Error("SETUP");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeout);
    const payload = {
      chatInput,
      sessionId: currentSessionId,
      eventType,
      source: "blackstone-legal-widget",
      industry: "legal",
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),
      metadata: { source: "blackstone-legal-widget", industry: "legal", pageUrl: window.location.href, pageTitle: document.title },
      ...(lead ? { lead, name: lead.name, email: lead.email, phone: lead.phone, consent: lead.consent } : {}),
    };
    try {
      const response = await fetch(config.webhookUrl, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/plain" },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const raw = await response.text();
      if (eventType === "lead" && !raw.trim()) return "ok";
      let parsed;
      try { parsed = JSON.parse(raw); } catch (_) { parsed = raw; }
      const value = parseResponse(parsed);
      if (!value && eventType !== "lead") throw new Error("EMPTY");
      return value || "ok";
    } finally { clearTimeout(timer); }
  }

  function parseResponse(data) {
    if (typeof data === "string") return data.trim();
    if (Array.isArray(data)) return data.length ? parseResponse(data[0]) : "";
    if (!data || typeof data !== "object") return "";
    for (const key of ["output", "text", "message", "response", "answer", "content"]) {
      if (typeof data[key] === "string") return data[key].trim();
      if (data[key] && typeof data[key] === "object") {
        const nested = parseResponse(data[key]); if (nested) return nested;
      }
    }
    if (data.body) return parseResponse(data.body);
    return "";
  }

  function friendlyError(error) {
    if (error?.message === "SETUP") return "The concierge isn't connected yet. Add your n8n webhook URL to the widget script.";
    if (error?.name === "AbortError") return "The concierge took too long to respond. Please try again.";
    return "I couldn't connect just now. Please try again, or use the booking link below.";
  }

  async function sendMessage(text) {
    const value = String(text || "").trim();
    if (!value || loading) return;
    loading = true; lastMessage = value; sendButton.disabled = true; input.disabled = true;
    addMessage(value, "user"); input.value = ""; input.style.height = "auto";
    const typing = document.createElement("div"); typing.className = "bl-message bot bl-typing"; typing.setAttribute("aria-label", "Concierge is typing"); typing.innerHTML = "<i></i><i></i><i></i>"; messages.appendChild(typing); scrollToEnd();
    try {
      const response = await request(value);
      typing.remove(); addMessage(response || "Thank you for reaching out.");
      const wantsContact = /consult|attorney|lawyer|case|matter|contact|call me|reach out|follow up|get in touch/i;
      if ((wantsContact.test(value) || wantsContact.test(response)) && !leadShown) showLeadForm();
    } catch (error) {
      typing.remove(); addMessage(friendlyError(error), "bot", { error: true, retry: lastMessage });
    } finally { loading = false; sendButton.disabled = false; input.disabled = false; input.focus(); }
  }

  function openWidget() {
    lastFocused = document.activeElement;
    panel.dataset.open = "true"; launcher.style.display = "none"; launcher.setAttribute("aria-expanded", "true");
    setTimeout(() => input.focus(), 0);
  }
  function closeWidget() {
    panel.dataset.open = "false"; launcher.style.display = "flex"; launcher.setAttribute("aria-expanded", "false");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus(); else launcher.focus();
  }

  launcher.addEventListener("click", openWidget);
  shadow.querySelector(".bl-minimize").addEventListener("click", closeWidget);
  shadow.querySelector(".bl-close").addEventListener("click", closeWidget);
  form.addEventListener("submit", (event) => { event.preventDefault(); sendMessage(input.value); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); form.requestSubmit(); }
  });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 100)}px`; });
  shadow.addEventListener("keydown", (event) => { if (event.key === "Escape" && panel.dataset.open === "true") closeWidget(); });

  addMessage("Welcome to Blackstone Legal. I'm the firm's intake assistant — I can outline our practice areas and arrange a consultation. Please share only general, non-confidential information. How may I assist?");
  addSuggestions();
})();
