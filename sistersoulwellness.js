(() => {
  "use strict";

  if (window.__SISTER_SOUL_WIDGET_LOADED__) return;
  window.__SISTER_SOUL_WIDGET_LOADED__ = true;

  const loader = document.currentScript;
  const config = {
    webhookUrl: loader?.dataset.webhookUrl || "",
    position: loader?.dataset.position === "left" ? "left" : "right",
    collectiveUrl:
      loader?.dataset.collectiveUrl ||
      "https://www.sistersoulwellness.com/join-the-collective",
    timeout: Number(loader?.dataset.timeout) || 30000,
  };

  const icons = {
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15a4 4 0 0 1-4 4H9l-5 3v-6a4 4 0 0 1-1-2.6V8a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v7Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    minimize: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  };

  const css = `
    :host { all: initial; color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    button, input, textarea { font: inherit; }
    button, a { -webkit-tap-highlight-color: transparent; }
    .ssw-root {
      --plum: #5b315f;
      --cream: #fbf6ed;
      --sand: #e7ddcf;
      --ink: #312630;
      --gold: #ba965b;
      position: fixed; z-index: 2147483000; bottom: 20px;
      ${config.position}: 20px;
      font-family: Arial, Helvetica, sans-serif; color: var(--ink);
      text-rendering: optimizeLegibility;
    }
    .ssw-launcher {
      width: 62px; height: 62px; border: 1px solid rgba(255,255,255,.32);
      border-radius: 50%; background: var(--plum); color: var(--cream);
      box-shadow: 0 12px 30px rgba(49,38,48,.24); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .ssw-launcher:hover { transform: translateY(-2px); box-shadow: 0 15px 34px rgba(49,38,48,.3); }
    .ssw-launcher svg { width: 27px; height: 27px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .ssw-panel {
      display: none; flex-direction: column; overflow: hidden;
      width: min(390px, calc(100vw - 32px)); height: min(650px, calc(100vh - 40px));
      margin-bottom: 12px; border: 1px solid var(--sand); border-radius: 18px;
      background: var(--cream); box-shadow: 0 22px 60px rgba(49,38,48,.25);
    }
    .ssw-panel[data-open="true"] { display: flex; animation: ssw-in .22s ease-out; }
    @keyframes ssw-in { from { opacity: 0; transform: translateY(10px) scale(.98); } }
    .ssw-header {
      min-height: 79px; padding: 16px 16px 14px 18px; background: var(--plum); color: var(--cream);
      display: flex; align-items: center; gap: 12px;
    }
    .ssw-mark {
      width: 39px; height: 39px; flex: 0 0 auto; border: 1px solid rgba(255,255,255,.38);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-family: Georgia, 'Times New Roman', serif; font-size: 21px;
    }
    .ssw-head-copy { min-width: 0; flex: 1; }
    .ssw-title { margin: 0; font: 600 19px/1.2 Georgia, 'Times New Roman', serif; letter-spacing: -.01em; }
    .ssw-status { margin: 5px 0 0; font-size: 12px; color: rgba(251,246,237,.82); }
    .ssw-icon-btn { width: 34px; height: 34px; border: 0; border-radius: 50%; color: inherit; background: transparent; cursor: pointer; display: grid; place-items: center; }
    .ssw-icon-btn:hover { background: rgba(255,255,255,.1); }
    .ssw-icon-btn svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
    .ssw-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 16px 14px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
    .ssw-message { max-width: 86%; padding: 11px 13px; border-radius: 14px; font-size: 14px; line-height: 1.52; white-space: pre-wrap; overflow-wrap: anywhere; }
    .ssw-message.bot { align-self: flex-start; background: #f1e8dc; border-bottom-left-radius: 4px; }
    .ssw-message.user { align-self: flex-end; background: var(--plum); color: var(--cream); border-bottom-right-radius: 4px; }
    .ssw-message.error { border: 1px solid var(--gold); background: var(--cream); }
    .ssw-retry { margin-top: 8px; border: 0; padding: 0; color: var(--plum); background: transparent; font-weight: 700; text-decoration: underline; cursor: pointer; }
    .ssw-suggestions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 2px; }
    .ssw-chip { border: 1px solid #cdbda9; border-radius: 999px; padding: 8px 11px; color: var(--plum); background: transparent; font-size: 12px; cursor: pointer; }
    .ssw-chip:hover { border-color: var(--plum); background: #f1e8dc; }
    .ssw-typing { display: flex; gap: 4px; align-items: center; width: 54px; }
    .ssw-typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--plum); opacity: .4; animation: ssw-dot 1.1s infinite; }
    .ssw-typing i:nth-child(2) { animation-delay: .15s; } .ssw-typing i:nth-child(3) { animation-delay: .3s; }
    @keyframes ssw-dot { 45% { opacity: 1; transform: translateY(-2px); } }
    .ssw-lead { margin-top: 3px; padding: 15px; border: 1px solid var(--sand); border-radius: 14px; background: #f1e8dc; }
    .ssw-lead h3 { margin: 0 0 5px; font: 600 18px/1.25 Georgia, 'Times New Roman', serif; color: var(--plum); }
    .ssw-lead p { margin: 0 0 12px; font-size: 12px; line-height: 1.45; }
    .ssw-fields { display: grid; gap: 9px; }
    .ssw-field label { display: block; margin-bottom: 4px; font-size: 12px; font-weight: 700; }
    .ssw-field input { width: 100%; min-height: 40px; border: 1px solid #cdbda9; border-radius: 8px; padding: 9px 10px; background: var(--cream); color: var(--ink); font-size: 14px; outline: none; }
    .ssw-field input:focus, .ssw-compose textarea:focus { border-color: var(--plum); box-shadow: 0 0 0 2px rgba(91,49,95,.13); }
    .ssw-consent { display: flex; align-items: flex-start; gap: 8px; margin: 11px 0; font-size: 11px; line-height: 1.4; }
    .ssw-consent input { width: 16px; height: 16px; margin: 0; accent-color: var(--plum); flex: 0 0 auto; }
    .ssw-submit { width: 100%; min-height: 40px; border: 0; border-radius: 999px; padding: 9px 14px; background: var(--plum); color: var(--cream); font-weight: 700; cursor: pointer; }
    .ssw-submit:disabled { opacity: .55; cursor: not-allowed; }
    .ssw-form-error { min-height: 16px; margin: 7px 0 0; color: #7c312e; font-size: 11px; }
    .ssw-footer { border-top: 1px solid var(--sand); background: var(--cream); }
    .ssw-collective { margin: 12px 14px 0; min-height: 38px; border: 1px solid var(--plum); border-radius: 999px; color: var(--plum); text-decoration: none; font: 700 12px/1 Arial, sans-serif; display: flex; align-items: center; justify-content: center; gap: 7px; }
    .ssw-collective svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .ssw-compose { padding: 10px 12px 8px; display: flex; gap: 8px; align-items: flex-end; }
    .ssw-compose textarea { flex: 1; min-height: 42px; max-height: 100px; resize: none; border: 1px solid #cdbda9; border-radius: 12px; padding: 10px 11px; color: var(--ink); background: #fffdf8; font-size: 14px; line-height: 1.35; outline: none; }
    .ssw-send { width: 42px; height: 42px; flex: 0 0 auto; border: 0; border-radius: 50%; background: var(--plum); color: var(--cream); cursor: pointer; display: grid; place-items: center; }
    .ssw-send:disabled { opacity: .5; cursor: not-allowed; }
    .ssw-send svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .ssw-note { margin: 0; padding: 0 15px 10px; text-align: center; font-size: 10px; line-height: 1.35; color: #716670; }
    .ssw-sr { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    :focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
    @media (max-width: 520px) {
      .ssw-root { bottom: 12px; ${config.position}: 12px; }
      .ssw-panel { width: calc(100vw - 24px); height: min(680px, calc(100dvh - 24px)); margin-bottom: 0; border-radius: 16px; }
      .ssw-launcher { width: 58px; height: 58px; margin-top: 10px; margin-${config.position}: 2px; }
    }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; scroll-behavior: auto !important; transition: none !important; } }
  `;

  const host = document.createElement("div");
  host.id = "sister-soul-wellness-widget";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${css}</style>
    <div class="ssw-root">
      <section class="ssw-panel" data-open="false" role="dialog" aria-modal="false" aria-label="Chat with Sister Soul Guide">
        <header class="ssw-header">
          <div class="ssw-mark" aria-hidden="true">S</div>
          <div class="ssw-head-copy"><h2 class="ssw-title">Sister Soul Guide</h2><p class="ssw-status">Here to help you find your next step</p></div>
          <button class="ssw-icon-btn ssw-minimize" type="button" aria-label="Minimize chat">${icons.minimize}</button>
          <button class="ssw-icon-btn ssw-close" type="button" aria-label="Close chat">${icons.close}</button>
        </header>
        <div class="ssw-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
        <footer class="ssw-footer">
          <a class="ssw-collective" href="${escapeAttr(config.collectiveUrl)}" target="_blank" rel="noopener noreferrer">Join the Collective ${icons.arrow}</a>
          <form class="ssw-compose">
            <label class="ssw-sr" for="ssw-input">Message Sister Soul Guide</label>
            <textarea id="ssw-input" rows="1" maxlength="1200" placeholder="Ask about wellness, resources, or products…"></textarea>
            <button class="ssw-send" type="submit" aria-label="Send message">${icons.send}</button>
          </form>
          <p class="ssw-note">General educational guidance only—not medical advice. For urgent concerns, contact local emergency services or a qualified professional.</p>
        </footer>
      </section>
      <button class="ssw-launcher" type="button" aria-label="Open Sister Soul Guide" aria-expanded="false">${icons.chat}</button>
    </div>`;

  const panel = shadow.querySelector(".ssw-panel");
  const launcher = shadow.querySelector(".ssw-launcher");
  const messages = shadow.querySelector(".ssw-messages");
  const form = shadow.querySelector(".ssw-compose");
  const input = shadow.querySelector("#ssw-input");
  const sendButton = shadow.querySelector(".ssw-send");
  let loading = false;
  let lastMessage = "";
  let leadShown = false;

  function escapeAttr(value) {
    return String(value).replace(/[&"'<>]/g, (char) => ({ "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" })[char]);
  }

  function sessionId() {
    const key = "sisterSoulWellnessSessionId";
    try {
      let id = window.localStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : `ssw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem(key, id);
      }
      return id;
    } catch (_) {
      return `ssw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
  const currentSessionId = sessionId();

  function scrollToEnd() { messages.scrollTop = messages.scrollHeight; }

  function addMessage(text, type = "bot", options = {}) {
    const item = document.createElement("div");
    item.className = `ssw-message ${type}${options.error ? " error" : ""}`;
    item.textContent = text;
    if (options.retry) {
      const retry = document.createElement("button");
      retry.type = "button"; retry.className = "ssw-retry"; retry.textContent = "Try again";
      retry.addEventListener("click", () => { item.remove(); sendMessage(options.retry); });
      item.appendChild(document.createElement("br")); item.appendChild(retry);
    }
    messages.appendChild(item); scrollToEnd(); return item;
  }

  function addSuggestions() {
    const wrap = document.createElement("div"); wrap.className = "ssw-suggestions";
    [
      ["Explore Soul Work", "What is Soul Work and where should I begin?"],
      ["Find my circle", "Tell me about Sister Circle."],
      ["Product guidance", "Can you help me find a wellness product or resource?"],
      ["Talk with the team", "I'd like the Sister Soul team to contact me."],
    ].forEach(([label, prompt]) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "ssw-chip"; button.textContent = label;
      button.addEventListener("click", () => { wrap.remove(); if (label === "Talk with the team") showLeadForm(); else sendMessage(prompt); });
      wrap.appendChild(button);
    });
    messages.appendChild(wrap); scrollToEnd();
  }

  function showLeadForm() {
    if (leadShown) return;
    leadShown = true;
    const card = document.createElement("form"); card.className = "ssw-lead"; card.noValidate = true;
    card.innerHTML = `<h3>Let&apos;s stay connected</h3><p>Share your contact details and the Sister Soul Wellness team can follow up. Please don&apos;t include private medical information.</p>
      <div class="ssw-fields">
        <div class="ssw-field"><label for="ssw-name">Name</label><input id="ssw-name" name="name" autocomplete="name" maxlength="80" required></div>
        <div class="ssw-field"><label for="ssw-email">Email</label><input id="ssw-email" name="email" type="email" autocomplete="email" maxlength="120" required></div>
        <div class="ssw-field"><label for="ssw-phone">Phone</label><input id="ssw-phone" name="phone" type="tel" autocomplete="tel" maxlength="30" required></div>
      </div>
      <label class="ssw-consent"><input name="consent" type="checkbox" required><span>I agree that Sister Soul Wellness may contact me about my request.</span></label>
      <button class="ssw-submit" type="submit">Send my details</button><p class="ssw-form-error" role="alert"></p>`;
    messages.appendChild(card); scrollToEnd(); card.querySelector("input").focus();
    card.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(card);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const error = card.querySelector(".ssw-form-error");
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || phone.replace(/\D/g, "").length < 7 || !data.get("consent")) {
        error.textContent = "Please enter a valid name, email, phone number, and confirm consent."; return;
      }
      const button = card.querySelector(".ssw-submit"); button.disabled = true; button.textContent = "Sending…"; error.textContent = "";
      try {
        await request("I'd like the Sister Soul Wellness team to contact me.", "lead", { name, email, phone, consent: true });
        card.remove(); addMessage("Thank you. Your details were shared with the Sister Soul Wellness team, and someone can follow up with you soon.");
      } catch (err) {
        error.textContent = friendlyError(err); button.disabled = false; button.textContent = "Send my details";
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
      source: "sister-soul-widget",
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),
      metadata: { source: "sister-soul-widget", pageUrl: window.location.href, pageTitle: document.title },
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
    if (error?.message === "SETUP") return "The guide is not connected yet. Add your n8n webhook URL to the widget script.";
    if (error?.name === "AbortError") return "The guide took too long to respond. Please try again.";
    return "I couldn't connect just now. Please try again or use the Join the Collective link below.";
  }

  async function sendMessage(text) {
    const value = String(text || "").trim();
    if (!value || loading) return;
    loading = true; lastMessage = value; sendButton.disabled = true; input.disabled = true;
    addMessage(value, "user"); input.value = ""; input.style.height = "auto";
    const typing = document.createElement("div"); typing.className = "ssw-message bot ssw-typing"; typing.setAttribute("aria-label", "Sister Soul Guide is typing"); typing.innerHTML = "<i></i><i></i><i></i>"; messages.appendChild(typing); scrollToEnd();
    try {
      const response = await request(value);
      typing.remove(); addMessage(response || "Thank you for reaching out.");
      if (/contact|call|email|speak|talk|reach out|follow up/i.test(value) && !leadShown) showLeadForm();
    } catch (error) {
      typing.remove(); addMessage(friendlyError(error), "bot", { error: true, retry: lastMessage });
    } finally { loading = false; sendButton.disabled = false; input.disabled = false; input.focus(); }
  }

  function openWidget() {
    panel.dataset.open = "true"; launcher.style.display = "none"; launcher.setAttribute("aria-expanded", "true");
    setTimeout(() => input.focus(), 0);
  }
  function closeWidget() {
    panel.dataset.open = "false"; launcher.style.display = "flex"; launcher.setAttribute("aria-expanded", "false"); launcher.focus();
  }

  launcher.addEventListener("click", openWidget);
  shadow.querySelector(".ssw-minimize").addEventListener("click", closeWidget);
  shadow.querySelector(".ssw-close").addEventListener("click", closeWidget);
  form.addEventListener("submit", (event) => { event.preventDefault(); sendMessage(input.value); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); form.requestSubmit(); }
  });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 100)}px`; });
  shadow.addEventListener("keydown", (event) => { if (event.key === "Escape" && panel.dataset.open === "true") closeWidget(); });

  addMessage("Welcome, Sister. I’m Sister Soul Guide, an AI assistant here to help you explore wellness resources, community offerings, and products. What gentle next step can I help you find?");
  addSuggestions();
})();
