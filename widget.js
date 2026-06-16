/*!
 * ChatWidget — Embeddable AI chatbot widget for websites.
 * Single-file, dependency-free. Configure via data-* attributes on the <script> tag.
 *
 * Usage:
 *   <script src="https://your-cdn/widget.js"
 *           data-webhook="https://your-n8n-instance/webhook/xxxx"
 *           data-name="Acme Inc"
 *           data-color-primary="#c9a84c"
 *           defer></script>
 *
 * MIT-style license. (c) ChatWidget.
 */
(function () {
  'use strict';

  // Prevent double-initialisation if the script is included twice.
  if (window.__cwInitialized) {
    console.warn('[ChatWidget] Already initialised — skipping duplicate load.');
    return;
  }
  window.__cwInitialized = true;

  // ───────────────────────────────────────────────
  // RESOLVE THE <script> TAG (robust against async/defer/injection)
  // ───────────────────────────────────────────────
  function resolveScript() {
    // document.currentScript is the most reliable when available (sync execution).
    if (document.currentScript) return document.currentScript;
    // Fallback 1: explicit id.
    var byId = document.getElementById('cw-widget-script');
    if (byId) return byId;
    // Fallback 2: last <script> referencing a file that looks like our widget.
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].getAttribute('src') || '';
      if (scripts[i].hasAttribute('data-webhook') || /widget(\.min)?\.js/i.test(src)) {
        return scripts[i];
      }
    }
    // Last resort: the final script on the page.
    return scripts[scripts.length - 1] || document.createElement('script');
  }

  var currentScript = resolveScript();

  function attr(name, fallback) {
    var v = currentScript.getAttribute(name);
    return (v === null || v === undefined || v === '') ? fallback : v;
  }

  function attrBool(name, fallback) {
    var v = currentScript.getAttribute(name);
    if (v === null || v === undefined || v === '') return fallback;
    return /^(true|1|yes|on)$/i.test(v);
  }

  function attrInt(name, fallback) {
    var v = parseInt(currentScript.getAttribute(name), 10);
    return isNaN(v) ? fallback : v;
  }

  // ───────────────────────────────────────────────
  // THEME DETECTION
  // data-theme="auto" (default) | "light" | "dark"
  // ───────────────────────────────────────────────
  var themeSetting = attr('data-theme', 'auto');
  var isDark;
  if (themeSetting === 'dark') {
    isDark = true;
  } else if (themeSetting === 'light') {
    isDark = false;
  } else {
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var bodyBg = '';
    try {
      bodyBg = document.body ? getComputedStyle(document.body).backgroundColor : '';
    } catch (e) {}
    var bodyIsDark = false;
    var m = bodyBg && bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
    if (m) {
      var alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
      if (alpha > 0.2) { // ignore transparent backgrounds
        var r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
        var luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        bodyIsDark = luminance < 128;
      } else {
        bodyIsDark = prefersDark;
      }
    }
    isDark = (m ? bodyIsDark : prefersDark) || false;
  }

  // ───────────────────────────────────────────────
  // COLOR UTILITIES
  // ───────────────────────────────────────────────
  function hexToRgb(hex) {
    if (!hex) return null;
    hex = hex.trim();
    var short = /^#([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
    if (short) hex = '#' + short[1] + short[1] + short[2] + short[2] + short[3] + short[3];
    var full = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return full ? { r: parseInt(full[1], 16), g: parseInt(full[2], 16), b: parseInt(full[3], 16) } : null;
  }

  // Returns black or white depending on which contrasts best with the given color.
  function contrastColor(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return '#ffffff';
    var lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
    return lum > 150 ? '#0a0a0a' : '#ffffff';
  }

  // Darken a hex color by a percentage (used to auto-derive the gradient end).
  function darken(hex, pct) {
    var rgb = hexToRgb(hex);
    if (!rgb) return hex;
    var f = 1 - (pct / 100);
    return '#' + [rgb.r, rgb.g, rgb.b].map(function (c) {
      var v = Math.max(0, Math.min(255, Math.round(c * f)));
      return ('0' + v.toString(16)).slice(-2);
    }).join('');
  }

  // ───────────────────────────────────────────────
  // THEME COLOR DEFAULTS
  // ───────────────────────────────────────────────
  var THEME = isDark ? {
    surfaceBg: '#111111',
    panelBg: '#1a1a1a',
    headerBg: '#0a0a0a',
    border: 'rgba(255,255,255,0.08)',
    textPrimary: '#f5f0e8',
    textMuted: 'rgba(245,240,232,0.45)',
    aiBubbleBg: '#1e1e1e',
    inputBg: '#1a1a1a',
    placeholderColor: 'rgba(245,240,232,0.45)'
  } : {
    surfaceBg: '#ffffff',
    panelBg: '#f7f7f8',
    headerBg: '#ffffff',
    border: 'rgba(0,0,0,0.08)',
    textPrimary: '#1a1a1a',
    textMuted: 'rgba(26,26,26,0.5)',
    aiBubbleBg: '#f0f0f2',
    inputBg: '#f7f7f8',
    placeholderColor: 'rgba(26,26,26,0.4)'
  };

  var primaryColor = attr('data-color-primary', '#c9a84c');
  // Auto-derive a sensible darker shade for the gradient if not explicitly set.
  var primaryColorDark = attr('data-color-primary-dark', darken(primaryColor, 22));

  var CONFIG = {
    webhookUrl: attr('data-webhook', ''),
    businessName: attr('data-name', 'AI Assistant'),
    avatarLetter: attr('data-avatar', attr('data-name', 'A').trim().charAt(0).toUpperCase() || 'A'),
    avatarImage: attr('data-avatar-image', ''), // optional logo URL
    welcomeTitle: attr('data-welcome-title', 'Welcome to ' + attr('data-name', 'our site')),
    welcomeSub: attr('data-welcome-sub', "Ask me anything — I'm here to help."),
    initialMessage: attr('data-initial-message', "Hello! I'm your " + attr('data-name', '').trim() + ' assistant. How can I help you today?'),
    poweredByText: attr('data-powered-by', CONFIG_DEFAULT_POWERED()),
    poweredByUrl: attr('data-powered-by-url', ''),
    showPoweredBy: attrBool('data-show-powered-by', true),
    statusText: attr('data-status-text', 'Online · replies instantly'),
    headerBadge: attr('data-badge', 'AI'),
    placeholder: attr('data-placeholder', 'Type a message…'),

    // Brand / accent colors
    primaryColor: primaryColor,
    primaryColorDark: primaryColorDark,
    // Auto-pick readable text color on the accent gradient unless overridden.
    userTextColor: attr('data-color-user-text', contrastColor(primaryColor)),

    // Surface colors
    bgColor: attr('data-color-bg', THEME.surfaceBg),
    panelColor: attr('data-color-panel', THEME.panelBg),
    headerColor: attr('data-color-header', THEME.headerBg),
    borderColor: attr('data-color-border', THEME.border),
    textColor: attr('data-color-text', THEME.textPrimary),
    mutedColor: attr('data-color-muted', THEME.textMuted),
    aiBubbleColor: attr('data-color-ai-bubble', THEME.aiBubbleBg),
    inputBgColor: attr('data-color-input-bg', THEME.inputBg),

    // Shape
    bubbleRadius: attr('data-bubble-radius', '18px'),
    panelRadius: attr('data-panel-radius', '20px'),
    launcherSize: attrInt('data-launcher-size', 60),

    // Position: "bottom-right" (default) | "bottom-left"
    position: attr('data-position', 'bottom-right'),
    offsetX: attrInt('data-offset-x', 24),
    offsetY: attrInt('data-offset-y', 24),

    // Font
    fontFamily: attr('data-font', "system-ui, -apple-system, 'Segoe UI', Roboto, 'DM Sans', Arial, sans-serif"),

    // Behaviour
    timeoutMs: attrInt('data-timeout', 60000), // 60s — LLMs can be slow
    autoOpen: attrBool('data-auto-open', false),
    autoOpenDelay: attrInt('data-auto-open-delay', 3000),
    persistChat: attrBool('data-persist-chat', true),
    persistOpenState: attrBool('data-persist-open', false),
    sound: attrBool('data-sound', false),
    greetingBubble: attrBool('data-greeting-bubble', false), // little teaser bubble near launcher
    greetingBubbleText: attr('data-greeting-text', '👋 Need help? Chat with us!'),
    maxStored: attrInt('data-max-history', 50)
  };

  function CONFIG_DEFAULT_POWERED() {
    return attr('data-powered-by', attr('data-name', 'AI Assistant'));
  }

  // Suggestion chips — comma-separated "emoji:label" pairs, e.g.
  // data-chips="🍽️:View menu,📍:Location,🕐:Opening hours"
  var chipsAttr = currentScript.getAttribute('data-chips');
  var DEFAULT_CHIPS = [
    { emoji: '💬', label: 'What do you offer?' },
    { emoji: '💰', label: 'Pricing' },
    { emoji: '📞', label: 'Contact us' }
  ];
  var CHIPS = DEFAULT_CHIPS;
  if (chipsAttr !== null) {
    CHIPS = (chipsAttr || '').split(',').map(function (pair) {
      var parts = pair.split(':');
      // Allow "label" only (no emoji) too.
      if (parts.length === 1) return { emoji: '', label: parts[0].trim() };
      return { emoji: (parts[0] || '').trim(), label: (parts.slice(1).join(':') || '').trim() };
    }).filter(function (c) { return c.label; });
  }

  if (!CONFIG.webhookUrl) {
    console.error('[ChatWidget] Missing data-webhook attribute on the <script> tag. The widget cannot send messages.');
  }

  // ───────────────────────────────────────────────
  // STORAGE HELPERS (degrade gracefully if unavailable)
  // ───────────────────────────────────────────────
  var STORE_AVAILABLE = (function () {
    try {
      var k = '__cw_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function storeGet(key) {
    if (!STORE_AVAILABLE) return null;
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function storeSet(key, val) {
    if (!STORE_AVAILABLE) return;
    try { localStorage.setItem(key, val); } catch (e) {}
  }
  function storeRemove(key) {
    if (!STORE_AVAILABLE) return;
    try { localStorage.removeItem(key); } catch (e) {}
  }

  // Namespace storage per webhook so multiple sites/bots don't collide.
  var NS = 'cw_' + hashString(CONFIG.webhookUrl || CONFIG.businessName) + '_';
  function hashString(s) {
    var h = 0, i, chr;
    if (!s || s.length === 0) return '0';
    for (i = 0; i < s.length; i++) { chr = s.charCodeAt(i); h = ((h << 5) - h) + chr; h |= 0; }
    return Math.abs(h).toString(36);
  }

  // ───────────────────────────────────────────────
  // SESSION ID — unique per visitor, persisted
  // ───────────────────────────────────────────────
  var SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  var stored = storeGet(NS + 'session_id');
  if (stored) { SESSION_ID = stored; } else { storeSet(NS + 'session_id', SESSION_ID); }

  // ───────────────────────────────────────────────
  // POSITION HELPERS
  // ───────────────────────────────────────────────
  var SIDE = CONFIG.position === 'bottom-left' ? 'left' : 'right';
  var OTHER_SIDE = SIDE === 'left' ? 'right' : 'left';
  var LSIZE = CONFIG.launcherSize;

  // ───────────────────────────────────────────────
  // STYLES
  // ───────────────────────────────────────────────
  var css = `
  #cw-launcher, #cw-widget, #cw-widget *, #cw-greeting { box-sizing: border-box; }

  #cw-root {
    --cw-bg: ${CONFIG.bgColor};
    --cw-panel: ${CONFIG.panelColor};
    --cw-header: ${CONFIG.headerColor};
    --cw-border: ${CONFIG.borderColor};
    --cw-text: ${CONFIG.textColor};
    --cw-muted: ${CONFIG.mutedColor};
    --cw-gold: ${CONFIG.primaryColor};
    --cw-gold-dim: ${CONFIG.primaryColor}26;
    --cw-grad: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.primaryColorDark});
    --cw-bubble-user-text: ${CONFIG.userTextColor};
    --cw-bubble-ai-bg: ${CONFIG.aiBubbleColor};
    --cw-input-bg: ${CONFIG.inputBgColor};
    --cw-placeholder: ${THEME.placeholderColor};
    --cw-radius-lg: ${CONFIG.panelRadius};
    --cw-radius-sm: ${CONFIG.bubbleRadius};
    --cw-shadow: 0 32px 80px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15);
    --cw-font: ${CONFIG.fontFamily};
  }

  #cw-launcher {
    width: ${LSIZE}px; height: ${LSIZE}px;
    border-radius: 50%;
    background: var(--cw-grad);
    border: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 32px ${CONFIG.primaryColor}66;
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
    position: fixed;
    bottom: ${CONFIG.offsetY}px; ${SIDE}: ${CONFIG.offsetX}px;
    z-index: 2147483000;
    font-family: var(--cw-font);
    -webkit-tap-highlight-color: transparent;
  }
  #cw-launcher:hover {
    transform: scale(1.08);
    box-shadow: 0 12px 40px ${CONFIG.primaryColor}88;
  }
  #cw-launcher:focus-visible { outline: 3px solid ${CONFIG.primaryColor}66; outline-offset: 3px; }
  #cw-launcher svg { transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); pointer-events: none; }
  #cw-launcher.open svg.cw-chat-icon { transform: scale(0) rotate(90deg); position: absolute; }
  #cw-launcher.open svg.cw-close-icon { transform: scale(1) rotate(0deg); }
  #cw-launcher svg.cw-close-icon { transform: scale(0) rotate(-90deg); position: absolute; }

  #cw-badge {
    position: absolute;
    top: -2px; ${OTHER_SIDE}: -2px;
    min-width: 20px; height: 20px;
    padding: 0 5px;
    border-radius: 10px;
    background: #ef4444;
    color: #fff;
    font-size: 11px; font-weight: 700;
    display: none; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    border: 2px solid var(--cw-bg);
    animation: cw-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes cw-pop { from { transform: scale(0); } to { transform: scale(1); } }

  #cw-greeting {
    position: fixed;
    bottom: ${CONFIG.offsetY + LSIZE + 12}px;
    ${SIDE}: ${CONFIG.offsetX}px;
    max-width: 240px;
    background: var(--cw-bg);
    color: var(--cw-text);
    border: 1px solid var(--cw-border);
    border-radius: 14px;
    padding: 12px 36px 12px 14px;
    font-family: var(--cw-font);
    font-size: 13px; line-height: 1.4;
    box-shadow: var(--cw-shadow);
    z-index: 2147482999;
    opacity: 0; transform: translateY(10px);
    transition: opacity .3s ease, transform .3s ease;
    pointer-events: none;
  }
  #cw-greeting.show { opacity: 1; transform: translateY(0); pointer-events: all; }
  #cw-greeting-close {
    position: absolute; top: 6px; ${OTHER_SIDE}: 8px;
    background: none; border: none; cursor: pointer;
    color: var(--cw-muted); font-size: 16px; line-height: 1; padding: 2px;
  }

  #cw-widget {
    position: fixed;
    bottom: ${CONFIG.offsetY + LSIZE + 12}px; ${SIDE}: ${CONFIG.offsetX}px;
    width: min(400px, calc(100vw - 24px));
    height: min(620px, calc(100vh - 130px));
    background: var(--cw-bg);
    border-radius: var(--cw-radius-lg);
    border: 1px solid var(--cw-border);
    box-shadow: var(--cw-shadow);
    display: flex; flex-direction: column;
    overflow: hidden;
    transform: scale(0.85) translateY(40px);
    transform-origin: bottom ${SIDE};
    opacity: 0;
    pointer-events: none;
    transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
    z-index: 2147483000;
    font-family: var(--cw-font);
    color: var(--cw-text);
  }
  #cw-widget.open {
    transform: scale(1) translateY(0);
    opacity: 1;
    pointer-events: all;
  }

  @media (max-width: 480px) {
    #cw-widget {
      bottom: ${LSIZE + 24}px; left: 12px; right: 12px;
      width: auto;
      height: calc(100vh - ${LSIZE + 44}px);
      height: calc(100dvh - ${LSIZE + 44}px);
      border-radius: 16px;
    }
    #cw-launcher { bottom: 16px; ${SIDE}: 16px; }
    #cw-greeting { ${OTHER_SIDE}: 16px; ${SIDE}: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    #cw-launcher, #cw-widget, #cw-launcher svg, .cw-msg-row, #cw-greeting { transition: none !important; animation: none !important; }
  }

  .cw-header {
    padding: 16px 16px 16px 20px;
    background: var(--cw-header);
    border-bottom: 1px solid var(--cw-border);
    display: flex; align-items: center; gap: 12px;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  .cw-header::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, ${CONFIG.primaryColor}0f 0%, transparent 60%);
    pointer-events: none;
  }
  .cw-avatar {
    width: 44px; height: 44px;
    border-radius: 50%;
    background: var(--cw-grad);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 18px; font-weight: 600;
    color: ${CONFIG.userTextColor};
    letter-spacing: 0.5px;
    overflow: hidden;
    position: relative; z-index: 1;
  }
  .cw-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .cw-header-info { flex: 1; min-width: 0; position: relative; z-index: 1; }
  .cw-header-name {
    font-size: 16px; font-weight: 600;
    color: var(--cw-text);
    letter-spacing: 0.3px;
    line-height: 1.2;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cw-header-status { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
  .cw-status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 6px rgba(74,222,128,0.6);
    animation: cw-pulse-dot 2s infinite;
    flex-shrink: 0;
  }
  @keyframes cw-pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .cw-status-text {
    font-size: 11px; color: var(--cw-muted);
    font-weight: 400; letter-spacing: 0.3px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cw-header-actions { display: flex; align-items: center; gap: 4px; position: relative; z-index: 1; }
  .cw-icon-btn {
    width: 30px; height: 30px;
    border-radius: 8px;
    background: transparent;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--cw-muted);
    transition: background 0.2s ease, color 0.2s ease;
  }
  .cw-icon-btn:hover { background: var(--cw-gold-dim); color: var(--cw-gold); }
  .cw-icon-btn:focus-visible { outline: 2px solid ${CONFIG.primaryColor}66; outline-offset: 1px; }
  .cw-header-badge {
    font-size: 10px;
    color: var(--cw-gold);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    border: 1px solid ${CONFIG.primaryColor}4d;
    padding: 3px 8px;
    border-radius: 20px;
    background: var(--cw-gold-dim);
    flex-shrink: 0;
  }

  .cw-messages {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 20px 16px;
    display: flex; flex-direction: column; gap: 16px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  .cw-messages::-webkit-scrollbar { width: 5px; }
  .cw-messages::-webkit-scrollbar-track { background: transparent; }
  .cw-messages::-webkit-scrollbar-thumb { background: var(--cw-border); border-radius: 3px; }

  .cw-welcome-card {
    background: linear-gradient(135deg, ${CONFIG.primaryColor}14, ${CONFIG.primaryColor}08);
    border: 1px solid ${CONFIG.primaryColor}33;
    border-radius: var(--cw-radius-sm);
    padding: 16px;
    text-align: center;
    margin-bottom: 4px;
  }
  .cw-welcome-card .cw-wc-title {
    font-size: 18px; font-weight: 600;
    color: ${CONFIG.primaryColor};
    margin-bottom: 6px;
  }
  .cw-welcome-card .cw-wc-sub { font-size: 12px; color: var(--cw-muted); line-height: 1.5; }

  .cw-suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .cw-chip {
    background: var(--cw-panel);
    border: 1px solid var(--cw-border);
    border-radius: 20px;
    padding: 7px 14px;
    font-size: 12px; color: var(--cw-text);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    font-family: var(--cw-font);
  }
  .cw-chip:hover {
    background: var(--cw-gold-dim);
    border-color: ${CONFIG.primaryColor}66;
    color: ${CONFIG.primaryColor};
    transform: translateY(-1px);
  }
  .cw-chip:focus-visible { outline: 2px solid ${CONFIG.primaryColor}66; outline-offset: 1px; }

  .cw-msg-row {
    display: flex; align-items: flex-end; gap: 8px;
    animation: cw-fadeUp 0.3s ease forwards;
  }
  @keyframes cw-fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .cw-msg-row.user { flex-direction: row-reverse; }
  .cw-msg-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: var(--cw-grad);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: ${CONFIG.userTextColor}; font-weight: 600;
    flex-shrink: 0;
    overflow: hidden;
  }
  .cw-msg-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .cw-msg-avatar.user-av {
    background: var(--cw-panel);
    border: 1px solid var(--cw-border);
    color: var(--cw-muted);
    font-size: 13px;
  }
  .cw-bubble {
    max-width: 80%;
    padding: 11px 15px;
    border-radius: var(--cw-radius-sm);
    font-size: 13.5px;
    line-height: 1.6;
    position: relative;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .cw-bubble.ai {
    background: var(--cw-bubble-ai-bg);
    color: var(--cw-text);
    border: 1px solid var(--cw-border);
    border-bottom-left-radius: 4px;
  }
  .cw-bubble.user {
    background: var(--cw-grad);
    color: var(--cw-bubble-user-text);
    font-weight: 500;
    border-bottom-right-radius: 4px;
  }
  /* Markdown styling inside AI bubbles */
  .cw-bubble.ai p { margin: 0 0 8px; }
  .cw-bubble.ai p:last-child { margin-bottom: 0; }
  .cw-bubble.ai ul, .cw-bubble.ai ol { margin: 6px 0; padding-left: 20px; }
  .cw-bubble.ai li { margin: 3px 0; }
  .cw-bubble.ai a { color: ${CONFIG.primaryColor}; text-decoration: underline; text-underline-offset: 3px; word-break: break-all; }
  .cw-bubble.ai code {
    background: ${CONFIG.primaryColor}1a;
    padding: 1px 5px; border-radius: 4px;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 12px;
  }
  .cw-bubble.ai pre {
    background: ${isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.05)'};
    border: 1px solid var(--cw-border);
    border-radius: 8px;
    padding: 10px 12px; margin: 8px 0;
    overflow-x: auto;
  }
  .cw-bubble.ai pre code { background: none; padding: 0; font-size: 12px; }
  .cw-bubble.ai strong { font-weight: 700; }
  .cw-bubble.ai em { font-style: italic; }
  .cw-bubble.ai h1, .cw-bubble.ai h2, .cw-bubble.ai h3 { font-size: 14px; font-weight: 700; margin: 8px 0 4px; }
  .cw-bubble.ai blockquote {
    border-left: 3px solid ${CONFIG.primaryColor}66;
    margin: 6px 0; padding: 2px 0 2px 10px; color: var(--cw-muted);
  }
  .cw-bubble-time { font-size: 10px; color: var(--cw-muted); margin-top: 5px; text-align: right; }
  .cw-msg-row.ai .cw-bubble-time { text-align: left; }

  .cw-typing-row { display: flex; align-items: flex-end; gap: 8px; }
  .cw-typing-bubble {
    background: var(--cw-bubble-ai-bg);
    border: 1px solid var(--cw-border);
    border-radius: var(--cw-radius-sm); border-bottom-left-radius: 4px;
    padding: 14px 18px;
    display: flex; gap: 5px; align-items: center;
  }
  .cw-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--cw-gold);
    opacity: 0.4;
    animation: cw-typing 1.2s infinite;
  }
  .cw-dot:nth-child(2) { animation-delay: 0.2s; }
  .cw-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes cw-typing {
    0%, 60%, 100% { opacity: 0.4; transform: translateY(0); }
    30% { opacity: 1; transform: translateY(-4px); }
  }

  .cw-msg-divider {
    text-align: center; font-size: 10px;
    color: var(--cw-muted); letter-spacing: 0.8px;
    text-transform: uppercase; position: relative;
  }
  .cw-msg-divider::before, .cw-msg-divider::after {
    content: ''; position: absolute; top: 50%; width: 30%;
    height: 1px; background: var(--cw-border);
  }
  .cw-msg-divider::before { left: 0; }
  .cw-msg-divider::after { right: 0; }

  .cw-input-bar {
    padding: 14px 16px;
    background: var(--cw-header);
    border-top: 1px solid var(--cw-border);
    flex-shrink: 0;
  }
  .cw-input-wrap {
    display: flex; align-items: flex-end; gap: 10px;
    background: var(--cw-input-bg);
    border: 1px solid var(--cw-border);
    border-radius: 14px;
    padding: 9px 9px 9px 16px;
    transition: border-color 0.2s ease;
  }
  .cw-input-wrap:focus-within { border-color: ${CONFIG.primaryColor}66; }
  .cw-textarea {
    flex: 1;
    background: transparent;
    border: none; outline: none;
    font-family: var(--cw-font);
    font-size: 14px;
    color: var(--cw-text);
    resize: none;
    min-height: 22px;
    max-height: 100px;
    line-height: 1.5;
    padding: 0;
  }
  .cw-textarea::placeholder { color: var(--cw-placeholder); }
  .cw-send-btn {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: var(--cw-grad);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
    flex-shrink: 0;
  }
  .cw-send-btn:hover { transform: scale(1.08); }
  .cw-send-btn:active { transform: scale(0.95); }
  .cw-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .cw-send-btn:focus-visible { outline: 2px solid ${CONFIG.primaryColor}88; outline-offset: 2px; }
  .cw-input-footer {
    text-align: center; font-size: 10px;
    color: var(--cw-muted); opacity: 0.6;
    margin-top: 10px; letter-spacing: 0.3px;
  }
  .cw-input-footer a, .cw-input-footer span { color: ${CONFIG.primaryColor}; opacity: 0.9; text-decoration: none; }
  .cw-input-footer a:hover { text-decoration: underline; }

  .cw-error-bubble { border-color: rgba(255,100,100,0.35) !important; }
  .cw-error-text { color: #e06666; font-size: 12px; display: block; }
  .cw-retry-btn {
    display: inline-flex; align-items: center; gap: 4px; margin-top: 8px;
    background: var(--cw-gold-dim);
    border: 1px solid ${CONFIG.primaryColor}4d;
    color: ${CONFIG.primaryColor};
    font-family: var(--cw-font); font-size: 11px;
    padding: 5px 12px; border-radius: 20px; cursor: pointer;
  }
  .cw-retry-btn:hover { background: ${CONFIG.primaryColor}33; }

  .cw-sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }
  `;

  // ───────────────────────────────────────────────
  // HTML BUILDING / ESCAPING
  // ───────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Minimal, safe Markdown → HTML renderer. Escapes first, then applies
  // a whitelist of inline/block formats. No raw HTML from the model is allowed.
  function renderMarkdown(src) {
    var text = String(src == null ? '' : src);

    // Extract fenced code blocks first so their contents aren't transformed.
    var codeBlocks = [];
    text = text.replace(/```([\s\S]*?)```/g, function (_, code) {
      codeBlocks.push(code.replace(/^\n/, ''));
      return '\u0000CB' + (codeBlocks.length - 1) + '\u0000';
    });

    var inlineCodes = [];
    text = text.replace(/`([^`\n]+)`/g, function (_, code) {
      inlineCodes.push(code);
      return '\u0000IC' + (inlineCodes.length - 1) + '\u0000';
    });

    // Escape everything else.
    text = escapeHtml(text);

    // Headings (#, ##, ###)
    text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
               .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
               .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Blockquotes
    text = text.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');

    // Bold then italic (order matters)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
               .replace(/__([^_]+)__/g, '<strong>$1</strong>')
               .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
               .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');

    // Links [text](url) — only http/https/mailto allowed
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
      function (_, label, url) {
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
      });

    // Auto-link bare URLs (avoid those already inside an <a>)
    text = text.replace(/(^|[\s])((?:https?:\/\/)[^\s<]+)/g, function (full, pre, url) {
      return pre + '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });

    // Lists — group consecutive bullet / numbered lines.
    var lines = text.split('\n');
    var out = [];
    var listType = null;
    function closeList() { if (listType) { out.push('</' + listType + '>'); listType = null; } }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var ul = line.match(/^\s*[-*+]\s+(.+)$/);
      var ol = line.match(/^\s*\d+\.\s+(.+)$/);
      if (ul) {
        if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
        out.push('<li>' + ul[1] + '</li>');
      } else if (ol) {
        if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
        out.push('<li>' + ol[1] + '</li>');
      } else {
        closeList();
        out.push(line);
      }
    }
    closeList();
    text = out.join('\n');

    // Paragraphs: split on blank lines; single newlines → <br>.
    var blocks = text.split(/\n{2,}/).map(function (block) {
      var trimmed = block.trim();
      if (!trimmed) return '';
      // Don't wrap block-level elements in <p>.
      if (/^<(h\d|ul|ol|li|blockquote|pre)/.test(trimmed)) return trimmed;
      return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
    });
    text = blocks.join('');

    // Restore inline code.
    text = text.replace(/\u0000IC(\d+)\u0000/g, function (_, n) {
      return '<code>' + escapeHtml(inlineCodes[n]) + '</code>';
    });
    // Restore fenced code blocks.
    text = text.replace(/(?:<p>)?\u0000CB(\d+)\u0000(?:<\/p>)?/g, function (_, n) {
      return '<pre><code>' + escapeHtml(codeBlocks[n]) + '</code></pre>';
    });

    return text;
  }

  function avatarMarkup(extraClass) {
    extraClass = extraClass || '';
    if (CONFIG.avatarImage) {
      return '<div class="cw-avatar ' + extraClass + '"><img src="' + escapeHtml(CONFIG.avatarImage) + '" alt="" /></div>';
    }
    return '<div class="cw-avatar ' + extraClass + '">' + escapeHtml(CONFIG.avatarLetter) + '</div>';
  }
  function msgAvatarMarkup() {
    if (CONFIG.avatarImage) {
      return '<img src="' + escapeHtml(CONFIG.avatarImage) + '" alt="" />';
    }
    return escapeHtml(CONFIG.avatarLetter);
  }

  var chipsHtml = CHIPS.map(function (c) {
    var label = (c.emoji ? c.emoji + ' ' : '') + c.label;
    return '<button type="button" class="cw-chip" data-chip="' + escapeHtml(c.label) + '">' + escapeHtml(label) + '</button>';
  }).join('');

  var iconColor = CONFIG.userTextColor;
  var poweredHtml = CONFIG.poweredByUrl
    ? '<a href="' + escapeHtml(CONFIG.poweredByUrl) + '" target="_blank" rel="noopener">' + escapeHtml(CONFIG.poweredByText) + '</a>'
    : '<span>' + escapeHtml(CONFIG.poweredByText) + '</span>';

  var rootHtml = `
  <button id="cw-launcher" aria-label="Open chat" aria-expanded="false" aria-controls="cw-widget">
    <svg class="cw-chat-icon" width="24" height="24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <svg class="cw-close-icon" width="20" height="20" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
    <span id="cw-badge" aria-hidden="true">1</span>
  </button>

  <div id="cw-greeting" role="status">
    <button id="cw-greeting-close" aria-label="Dismiss">×</button>
    ${escapeHtml(CONFIG.greetingBubbleText)}
  </div>

  <div id="cw-widget" role="dialog" aria-label="${escapeHtml(CONFIG.businessName)} chat" aria-modal="false">
    <div class="cw-header">
      ${avatarMarkup()}
      <div class="cw-header-info">
        <div class="cw-header-name">${escapeHtml(CONFIG.businessName)}</div>
        <div class="cw-header-status">
          <div class="cw-status-dot"></div>
          <span class="cw-status-text">${escapeHtml(CONFIG.statusText)}</span>
        </div>
      </div>
      <div class="cw-header-actions">
        <button class="cw-icon-btn" id="cw-clear-btn" title="New conversation" aria-label="Start a new conversation">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>
        </button>
        ${CONFIG.headerBadge ? '<div class="cw-header-badge">' + escapeHtml(CONFIG.headerBadge) + '</div>' : ''}
        <button class="cw-icon-btn" id="cw-close-btn" title="Close" aria-label="Close chat">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="cw-messages" id="cw-messages" aria-live="polite" aria-atomic="false"></div>

    <div class="cw-input-bar">
      <div class="cw-input-wrap">
        <textarea class="cw-textarea" id="cw-input" placeholder="${escapeHtml(CONFIG.placeholder)}" rows="1" aria-label="Type your message"></textarea>
        <button class="cw-send-btn" id="cw-send-btn" title="Send" aria-label="Send message">
          <svg width="16" height="16" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      ${CONFIG.showPoweredBy ? '<div class="cw-input-footer">Powered by ' + poweredHtml + '</div>' : ''}
    </div>
  </div>
  `;

  // ───────────────────────────────────────────────
  // BOOTSTRAP — wait for <body>, inject styles + DOM
  // ───────────────────────────────────────────────
  function boot() {
    var styleTag = document.createElement('style');
    styleTag.id = 'cw-styles';
    styleTag.textContent = css;
    document.head.appendChild(styleTag);

    var root = document.createElement('div');
    root.id = 'cw-root';
    root.innerHTML = rootHtml;
    document.body.appendChild(root);

    init(root);
  }

  if (document.body) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    // readyState interactive/complete but body somehow missing — retry next tick.
    var tries = 0;
    var t = setInterval(function () {
      if (document.body) { clearInterval(t); boot(); }
      else if (++tries > 50) { clearInterval(t); console.error('[ChatWidget] document.body never became available.'); }
    }, 50);
  }

  // ───────────────────────────────────────────────
  // RUNTIME LOGIC
  // ───────────────────────────────────────────────
  function init(root) {
    var isOpen = false;
    var isLoading = false;
    var history = [];      // { role:'user'|'ai', text, time }
    var unread = 0;

    var launcher = root.querySelector('#cw-launcher');
    var widget = root.querySelector('#cw-widget');
    var messages = root.querySelector('#cw-messages');
    var input = root.querySelector('#cw-input');
    var sendBtn = root.querySelector('#cw-send-btn');
    var closeBtn = root.querySelector('#cw-close-btn');
    var clearBtn = root.querySelector('#cw-clear-btn');
    var badge = root.querySelector('#cw-badge');
    var greeting = root.querySelector('#cw-greeting');
    var greetingClose = root.querySelector('#cw-greeting-close');

    function now() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // ── Notification sound (tiny synthesised beep, no asset needed) ──
    var audioCtx = null;
    function playBeep() {
      if (!CONFIG.sound) return;
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'sine'; o.frequency.value = 660;
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
        o.start(); o.stop(audioCtx.currentTime + 0.26);
      } catch (e) {}
    }

    // ── Persistence ──
    function saveHistory() {
      if (!CONFIG.persistChat) return;
      var trimmed = history.slice(-CONFIG.maxStored);
      storeSet(NS + 'history', JSON.stringify(trimmed));
    }
    function loadHistory() {
      if (!CONFIG.persistChat) return [];
      var raw = storeGet(NS + 'history');
      if (!raw) return [];
      try { var arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; }
      catch (e) { return []; }
    }

    // ── Rendering ──
    function renderWelcome() {
      var div = document.createElement('div');
      div.className = 'cw-welcome-card';
      div.innerHTML = '<div class="cw-wc-title">' + escapeHtml(CONFIG.welcomeTitle) + '</div>' +
                      '<div class="cw-wc-sub">' + escapeHtml(CONFIG.welcomeSub) + '</div>';
      messages.appendChild(div);

      var divider = document.createElement('div');
      divider.className = 'cw-msg-divider';
      divider.textContent = 'Today';
      messages.appendChild(divider);
    }

    function renderChips() {
      if (!CHIPS.length) return;
      var wrap = document.createElement('div');
      wrap.className = 'cw-suggestions';
      wrap.id = 'cw-suggestions';
      wrap.innerHTML = chipsHtml;
      messages.appendChild(wrap);
    }

    function hideChips() {
      var s = root.querySelector('#cw-suggestions');
      if (s) s.remove();
    }

    function appendMessage(text, role, opts) {
      opts = opts || {};
      var row = document.createElement('div');
      row.className = 'cw-msg-row ' + role;

      var av = document.createElement('div');
      av.className = role === 'user' ? 'cw-msg-avatar user-av' : 'cw-msg-avatar';
      if (role === 'user') {
        av.textContent = '🙂';
      } else {
        av.innerHTML = msgAvatarMarkup();
      }

      var wrap = document.createElement('div');
      wrap.style.maxWidth = '100%';
      var bubble = document.createElement('div');
      bubble.className = 'cw-bubble ' + role;
      if (role === 'ai') {
        bubble.innerHTML = renderMarkdown(text);
      } else {
        bubble.textContent = text;
      }

      var time = document.createElement('div');
      time.className = 'cw-bubble-time';
      time.textContent = opts.time || now();

      wrap.appendChild(bubble);
      wrap.appendChild(time);
      row.appendChild(av);
      row.appendChild(wrap);
      messages.appendChild(row);
      scrollToBottom();

      if (!opts.skipStore) {
        history.push({ role: role, text: text, time: time.textContent });
        saveHistory();
      }
    }

    function scrollToBottom() {
      messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
      var row = document.createElement('div');
      row.className = 'cw-typing-row';
      row.id = 'cw-typing';
      var av = document.createElement('div');
      av.className = 'cw-msg-avatar';
      av.innerHTML = msgAvatarMarkup();
      var bubble = document.createElement('div');
      bubble.className = 'cw-typing-bubble';
      bubble.innerHTML = '<div class="cw-dot"></div><div class="cw-dot"></div><div class="cw-dot"></div>';
      row.appendChild(av);
      row.appendChild(bubble);
      messages.appendChild(row);
      scrollToBottom();
    }
    function removeTyping() {
      var t = root.querySelector('#cw-typing');
      if (t) t.remove();
    }

    function appendErrorMessage(errMsg, originalText) {
      var row = document.createElement('div');
      row.className = 'cw-msg-row ai';
      var av = document.createElement('div');
      av.className = 'cw-msg-avatar';
      av.innerHTML = msgAvatarMarkup();
      var wrap = document.createElement('div');
      var bubble = document.createElement('div');
      bubble.className = 'cw-bubble ai cw-error-bubble';
      var msgSpan = document.createElement('span');
      msgSpan.className = 'cw-error-text';
      msgSpan.textContent = '⚠️ ' + errMsg;
      var retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'cw-retry-btn';
      retryBtn.textContent = '↺ Retry';
      retryBtn.onclick = function () {
        row.remove();
        input.value = originalText;
        sendMessage();
      };
      bubble.appendChild(msgSpan);
      bubble.appendChild(retryBtn);
      wrap.appendChild(bubble);
      row.appendChild(av);
      row.appendChild(wrap);
      messages.appendChild(row);
      scrollToBottom();
    }

    // ── Open / close ──
    function setOpen(open) {
      isOpen = open;
      widget.classList.toggle('open', isOpen);
      launcher.classList.toggle('open', isOpen);
      launcher.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');
      launcher.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        unread = 0;
        updateBadge();
        hideGreeting();
        setTimeout(function () { input.focus(); }, 400);
        scrollToBottom();
      }
      if (CONFIG.persistOpenState) storeSet(NS + 'open', isOpen ? '1' : '0');
    }
    function toggleWidget() { setOpen(!isOpen); }

    function updateBadge() {
      if (unread > 0) {
        badge.textContent = unread > 9 ? '9+' : String(unread);
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    // ── Greeting teaser ──
    var greetingTimer;
    function showGreeting() {
      if (!CONFIG.greetingBubble || isOpen) return;
      if (storeGet(NS + 'greeting_dismissed') === '1') return;
      greeting.classList.add('show');
    }
    function hideGreeting() {
      greeting.classList.remove('show');
      clearTimeout(greetingTimer);
    }

    // ── Input helpers ──
    function autoResize() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    }

    // ── Send message ──
    function sendMessage() {
      var text = input.value.trim();
      if (!text || isLoading) return;
      if (!CONFIG.webhookUrl) {
        appendErrorMessage('Chat is not configured (missing webhook URL).', text);
        return;
      }

      isLoading = true;
      sendBtn.disabled = true;
      input.value = '';
      autoResize();
      hideChips();

      appendMessage(text, 'user');
      showTyping();

      var controller = new AbortController();
      var timedOut = false;
      var timeout = setTimeout(function () { timedOut = true; controller.abort(); }, CONFIG.timeoutMs);

      var payload = {
        chatInput: text,
        message: text,        // alias for flexibility with various n8n setups
        sessionId: SESSION_ID,
        page: location.href
      };

      fetch(CONFIG.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain' },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).then(function (res) {
        clearTimeout(timeout);
        removeTyping();
        if (!res.ok) {
          var msg = 'HTTP ' + res.status;
          var err = new Error(msg); err.httpStatus = res.status;
          throw err;
        }
        return res.text();
      }).then(function (rawText) {
        var reply = extractReply(rawText);
        if (reply && String(reply).trim()) {
          appendMessage(String(reply).trim(), 'ai');
        } else {
          appendMessage("I didn't get a response. Could you try rephrasing?", 'ai');
        }
        if (!isOpen) { unread++; updateBadge(); }
        playBeep();
      }).catch(function (err) {
        removeTyping();
        var errMsg;
        if (timedOut || err.name === 'AbortError') {
          errMsg = 'The response is taking too long. Please try again.';
        } else if (err.httpStatus) {
          errMsg = err.httpStatus >= 500
            ? 'The assistant is temporarily unavailable. Please try again shortly.'
            : 'Request failed (' + err.httpStatus + '). Please try again.';
        } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
          errMsg = 'Connection problem. Please check your internet and try again.';
        } else {
          errMsg = 'Something went wrong. Please try again.';
        }
        appendErrorMessage(errMsg, text);
        if (!isOpen) { unread++; updateBadge(); }
      }).finally(function () {
        isLoading = false;
        sendBtn.disabled = false;
        if (isOpen) input.focus();
      });
    }

    // Try hard to pull a human-readable reply out of whatever n8n returns.
    function extractReply(rawText) {
      var data;
      try { data = JSON.parse(rawText); }
      catch (e) { return rawText; } // plain text response

      function fromObj(o) {
        if (o == null) return null;
        if (typeof o === 'string') return o;
        return o.output || o.text || o.message || o.response || o.answer ||
               o.reply || o.content || o.data || null;
      }

      if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
          var r = fromObj(data[i]);
          if (r) return typeof r === 'string' ? r : JSON.stringify(r);
        }
        return rawText;
      }
      var res = fromObj(data);
      if (res && typeof res === 'object') return JSON.stringify(res);
      return res || rawText;
    }

    // ── Clear / new conversation ──
    function clearConversation() {
      history = [];
      saveHistory();
      messages.innerHTML = '';
      renderWelcome();
      appendMessage(CONFIG.initialMessage, 'ai');
      renderChips();
    }

    // ── Restore previous conversation or show defaults ──
    function bootstrapMessages() {
      var saved = loadHistory();
      renderWelcome();
      if (saved.length) {
        saved.forEach(function (m) {
          appendMessage(m.text, m.role, { time: m.time, skipStore: true });
        });
        history = saved.slice();
      } else {
        appendMessage(CONFIG.initialMessage, 'ai');
        renderChips();
      }
    }

    // ───────────────────────────────────────────────
    // EVENT LISTENERS
    // ───────────────────────────────────────────────
    launcher.addEventListener('click', toggleWidget);
    closeBtn.addEventListener('click', function () { setOpen(false); });
    sendBtn.addEventListener('click', sendMessage);
    clearBtn.addEventListener('click', clearConversation);

    input.addEventListener('input', autoResize);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Suggestion chip clicks (event delegation).
    messages.addEventListener('click', function (e) {
      var chip = e.target.closest('.cw-chip');
      if (!chip) return;
      input.value = chip.getAttribute('data-chip') || chip.textContent.trim();
      sendMessage();
    });

    // Greeting teaser interactions.
    greetingClose.addEventListener('click', function (e) {
      e.stopPropagation();
      hideGreeting();
      storeSet(NS + 'greeting_dismissed', '1');
    });
    greeting.addEventListener('click', function () { setOpen(true); });

    // Escape closes the widget.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) setOpen(false);
    });

    // ───────────────────────────────────────────────
    // INITIAL STATE
    // ───────────────────────────────────────────────
    bootstrapMessages();

    if (CONFIG.persistOpenState && storeGet(NS + 'open') === '1') {
      setOpen(true);
    } else if (CONFIG.autoOpen) {
      setTimeout(function () { if (!isOpen) setOpen(true); }, CONFIG.autoOpenDelay);
    }

    if (CONFIG.greetingBubble) {
      greetingTimer = setTimeout(showGreeting, Math.max(1000, CONFIG.autoOpenDelay - 500));
    }

    // ───────────────────────────────────────────────
    // PUBLIC API — window.ChatWidget
    // ───────────────────────────────────────────────
    window.ChatWidget = {
      open: function () { setOpen(true); },
      close: function () { setOpen(false); },
      toggle: toggleWidget,
      clear: clearConversation,
      sendMessage: function (text) {
        if (typeof text === 'string' && text.trim()) {
          input.value = text;
          if (!isOpen) setOpen(true);
          sendMessage();
        }
      },
      isOpen: function () { return isOpen; },
      config: CONFIG
    };
  }
})();
