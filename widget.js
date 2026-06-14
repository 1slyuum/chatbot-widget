(function () {
  // ───────────────────────────────────────────────
  // CONFIG — read from the <script> tag's data attributes
  // ───────────────────────────────────────────────
  var currentScript = document.currentScript;

  function attr(name, fallback) {
    var v = currentScript.getAttribute(name);
    return (v === null || v === undefined || v === '') ? fallback : v;
  }

  // ── Theme detection ──────────────────────────────
  // data-theme="auto" (default) | "light" | "dark"
  var themeSetting = attr('data-theme', 'auto');
  var isDark;
  if (themeSetting === 'dark') {
    isDark = true;
  } else if (themeSetting === 'light') {
    isDark = false;
  } else {
    // auto: check prefers-color-scheme, then fall back to inspecting <body> background
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var bodyBg = '';
    try {
      bodyBg = getComputedStyle(document.body).backgroundColor;
    } catch (e) {}
    var bodyIsDark = false;
    var m = bodyBg && bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      var r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
      var luminance = (0.299 * r + 0.587 * g + 0.114 * b);
      bodyIsDark = luminance < 128;
    }
    isDark = bodyIsDark || prefersDark;
  }

  // ── Theme color defaults ─────────────────────────
  var THEME = isDark ? {
    surfaceBg: '#111111',
    panelBg: '#1a1a1a',
    headerBg: '#0a0a0a',
    border: 'rgba(255,255,255,0.08)',
    textPrimary: '#f5f0e8',
    textMuted: 'rgba(245,240,232,0.45)',
    aiBubbleBg: '#1e1e1e',
    userBubbleText: '#0a0a0a',
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
    userBubbleText: '#ffffff',
    inputBg: '#f7f7f8',
    placeholderColor: 'rgba(26,26,26,0.4)'
  };

  var CONFIG = {
    webhookUrl: attr('data-webhook', ''),
    businessName: attr('data-name', 'AI Assistant'),
    avatarLetter: attr('data-avatar', attr('data-name', 'A').trim().charAt(0).toUpperCase()),
    welcomeTitle: attr('data-welcome-title', 'Welcome to ' + attr('data-name', 'our site')),
    welcomeSub: attr('data-welcome-sub', "Ask me anything — I'm here to help."),
    initialMessage: attr('data-initial-message', "Hello! I'm your " + attr('data-name', '') + ' assistant. How can I help you today?'),
    poweredByText: attr('data-powered-by', attr('data-name', 'AI Assistant')),

    // Brand / accent colors
    primaryColor: attr('data-color-primary', '#c9a84c'),
    primaryColorDark: attr('data-color-primary-dark', '#a8832a'),
    userTextColor: attr('data-color-user-text', isDark ? '#0a0a0a' : '#ffffff'),

    // Surface colors (override theme defaults if provided)
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

    // Position: "bottom-right" (default) | "bottom-left"
    position: attr('data-position', 'bottom-right'),

    // Font
    fontFamily: attr('data-font', "'DM Sans', Arial, sans-serif")
  };

  // Suggestion chips — comma-separated "emoji:label" pairs, e.g.
  // data-chips="🍽️:View menu,📍:Location,🕐:Opening hours"
  var chipsAttr = currentScript.getAttribute('data-chips');
  var DEFAULT_CHIPS = [
    { emoji: '💬', label: 'What do you offer?' },
    { emoji: '💰', label: 'Pricing' },
    { emoji: '📞', label: 'Contact us' }
  ];
  var CHIPS = DEFAULT_CHIPS;
  if (chipsAttr) {
    CHIPS = chipsAttr.split(',').map(function (pair) {
      var parts = pair.split(':');
      return { emoji: (parts[0] || '').trim(), label: (parts.slice(1).join(':') || '').trim() };
    }).filter(function (c) { return c.label; });
  }

  if (!CONFIG.webhookUrl) {
    console.error('[ChatWidget] Missing data-webhook attribute on script tag. Widget will not function.');
  }

  // ───────────────────────────────────────────────
  // SESSION ID — unique per visitor, persisted in localStorage
  // ───────────────────────────────────────────────
  var SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  try {
    var stored = localStorage.getItem('cw_session_id');
    if (stored) {
      SESSION_ID = stored;
    } else {
      localStorage.setItem('cw_session_id', SESSION_ID);
    }
  } catch (e) {
    console.warn('[ChatWidget] localStorage unavailable, using temporary session ID:', e.message);
  }

  // ───────────────────────────────────────────────
  // POSITION HELPERS
  // ───────────────────────────────────────────────
  var SIDE = CONFIG.position === 'bottom-left' ? 'left' : 'right';
  var OTHER_SIDE = SIDE === 'left' ? 'right' : 'left';

  // ───────────────────────────────────────────────
  // STYLES
  // ───────────────────────────────────────────────
  var css = `
  #cw-launcher, #cw-widget, #cw-widget * { box-sizing: border-box; }

  :root {
    --cw-bg: ${CONFIG.bgColor};
    --cw-panel: ${CONFIG.panelColor};
    --cw-header: ${CONFIG.headerColor};
    --cw-border: ${CONFIG.borderColor};
    --cw-text: ${CONFIG.textColor};
    --cw-muted: ${CONFIG.mutedColor};
    --cw-gold: ${CONFIG.primaryColor};
    --cw-gold-dim: ${CONFIG.primaryColor}26;
    --cw-bubble-user-bg: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.primaryColorDark});
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
    width: 60px; height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.primaryColorDark});
    border: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 32px ${CONFIG.primaryColor}66;
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
    position: fixed;
    bottom: 24px; ${SIDE}: 24px;
    z-index: 2147483000;
    font-family: var(--cw-font);
  }
  #cw-launcher:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 40px ${CONFIG.primaryColor}88;
  }
  #cw-launcher svg { transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); }
  #cw-launcher.open svg.cw-chat-icon { transform: scale(0) rotate(90deg); position: absolute; }
  #cw-launcher.open svg.cw-close-icon { transform: scale(1) rotate(0deg); }
  #cw-launcher svg.cw-close-icon { transform: scale(0) rotate(-90deg); position: absolute; }

  #cw-widget {
    position: fixed;
    bottom: 96px; ${SIDE}: 24px;
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
      bottom: 88px; ${SIDE}: 12px; ${OTHER_SIDE}: 12px;
      width: auto;
      height: calc(100vh - 110px);
      border-radius: 16px;
    }
    #cw-launcher { bottom: 16px; ${SIDE}: 16px; }
  }

  .cw-header {
    padding: 20px 24px 18px;
    background: var(--cw-header);
    border-bottom: 1px solid var(--cw-border);
    display: flex; align-items: center; gap: 14px;
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
    background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.primaryColorDark});
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 18px; font-weight: 600;
    color: ${CONFIG.userTextColor};
    letter-spacing: 0.5px;
  }
  .cw-header-info { flex: 1; min-width: 0; }
  .cw-header-name {
    font-size: 16px; font-weight: 600;
    color: var(--cw-text);
    letter-spacing: 0.3px;
    line-height: 1.2;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cw-header-status {
    display: flex; align-items: center; gap: 6px;
    margin-top: 3px;
  }
  .cw-status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 6px rgba(74,222,128,0.6);
    animation: cw-pulse-dot 2s infinite;
  }
  @keyframes cw-pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .cw-status-text {
    font-size: 11px; color: var(--cw-muted);
    font-weight: 400; letter-spacing: 0.3px;
  }
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
    padding: 20px 16px;
    display: flex; flex-direction: column; gap: 16px;
    scroll-behavior: smooth;
  }
  .cw-messages::-webkit-scrollbar { width: 4px; }
  .cw-messages::-webkit-scrollbar-track { background: transparent; }
  .cw-messages::-webkit-scrollbar-thumb { background: var(--cw-border); border-radius: 2px; }

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
  .cw-welcome-card .cw-wc-sub {
    font-size: 12px; color: var(--cw-muted);
    line-height: 1.5;
  }

  .cw-suggestions {
    display: flex; flex-wrap: wrap; gap: 8px;
    margin-top: 4px;
  }
  .cw-chip {
    background: var(--cw-panel);
    border: 1px solid var(--cw-border);
    border-radius: 20px;
    padding: 7px 14px;
    font-size: 12px; color: var(--cw-muted);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  .cw-chip:hover {
    background: var(--cw-gold-dim);
    border-color: ${CONFIG.primaryColor}66;
    color: ${CONFIG.primaryColor};
    transform: translateY(-1px);
  }

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
    background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.primaryColorDark});
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: ${CONFIG.userTextColor}; font-weight: 600;
    flex-shrink: 0;
  }
  .cw-msg-avatar.user-av {
    background: var(--cw-panel);
    border: 1px solid var(--cw-border);
    color: var(--cw-muted);
    font-size: 13px;
  }
  .cw-bubble {
    max-width: 78%;
    padding: 12px 16px;
    border-radius: var(--cw-radius-sm);
    font-size: 13.5px;
    line-height: 1.6;
    position: relative;
    word-wrap: break-word;
  }
  .cw-bubble.ai {
    background: var(--cw-bubble-ai-bg);
    color: var(--cw-text);
    border: 1px solid var(--cw-border);
    border-bottom-left-radius: 4px;
  }
  .cw-bubble.user {
    background: var(--cw-bubble-user-bg);
    color: var(--cw-bubble-user-text);
    font-weight: 500;
    border-bottom-right-radius: 4px;
  }
  .cw-bubble-time {
    font-size: 10px; color: var(--cw-muted);
    margin-top: 5px;
    text-align: right;
  }
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
    text-align: center;
    font-size: 10px;
    color: var(--cw-muted);
    letter-spacing: 0.8px;
    text-transform: uppercase;
    position: relative;
  }
  .cw-msg-divider::before, .cw-msg-divider::after {
    content: '';
    position: absolute;
    top: 50%; width: 30%;
    height: 1px;
    background: var(--cw-border);
  }
  .cw-msg-divider::before { left: 0; }
  .cw-msg-divider::after { right: 0; }

  .cw-input-bar {
    padding: 16px;
    background: var(--cw-header);
    border-top: 1px solid var(--cw-border);
    flex-shrink: 0;
  }
  .cw-input-wrap {
    display: flex; align-items: flex-end; gap: 10px;
    background: var(--cw-input-bg);
    border: 1px solid var(--cw-border);
    border-radius: 14px;
    padding: 10px 10px 10px 16px;
    transition: border-color 0.2s ease;
  }
  .cw-input-wrap:focus-within {
    border-color: ${CONFIG.primaryColor}66;
  }
  .cw-textarea {
    flex: 1;
    background: transparent;
    border: none; outline: none;
    font-family: var(--cw-font);
    font-size: 13.5px;
    color: var(--cw-text);
    resize: none;
    min-height: 22px;
    max-height: 100px;
    line-height: 1.5;
  }
  .cw-textarea::placeholder { color: var(--cw-placeholder); }
  .cw-send-btn {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.primaryColorDark});
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
    flex-shrink: 0;
  }
  .cw-send-btn:hover { transform: scale(1.08); }
  .cw-send-btn:active { transform: scale(0.95); }
  .cw-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .cw-input-footer {
    text-align: center;
    font-size: 10px;
    color: var(--cw-muted);
    opacity: 0.5;
    margin-top: 10px;
    letter-spacing: 0.3px;
  }
  .cw-input-footer span { color: ${CONFIG.primaryColor}; opacity: 0.8; }
  `;

  var styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // ───────────────────────────────────────────────
  // HTML — build chips markup
  // ───────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var chipsHtml = CHIPS.map(function (c) {
    return '<div class="cw-chip" data-chip="' + escapeHtml(c.emoji + ' ' + c.label) + '">' + escapeHtml(c.emoji) + ' ' + escapeHtml(c.label) + '</div>';
  }).join('');

  var sendIconColor = CONFIG.userTextColor;

  var wrapper = document.createElement('div');
  wrapper.innerHTML = `
  <button id="cw-launcher" aria-label="Open chat">
    <svg class="cw-chat-icon" width="24" height="24" fill="none" stroke="${sendIconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <svg class="cw-close-icon" width="20" height="20" fill="none" stroke="${sendIconColor}" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>

  <div id="cw-widget">
    <div class="cw-header">
      <div class="cw-avatar">${escapeHtml(CONFIG.avatarLetter)}</div>
      <div class="cw-header-info">
        <div class="cw-header-name">${escapeHtml(CONFIG.businessName)}</div>
        <div class="cw-header-status">
          <div class="cw-status-dot"></div>
          <span class="cw-status-text">Online · replies instantly</span>
        </div>
      </div>
      <div class="cw-header-badge">AI</div>
    </div>

    <div class="cw-messages" id="cw-messages">
      <div class="cw-welcome-card">
        <div class="cw-wc-title">${escapeHtml(CONFIG.welcomeTitle)}</div>
        <div class="cw-wc-sub">${escapeHtml(CONFIG.welcomeSub)}</div>
      </div>
      <div class="cw-msg-divider">Today</div>
      <div class="cw-msg-row ai">
        <div class="cw-msg-avatar">${escapeHtml(CONFIG.avatarLetter)}</div>
        <div>
          <div class="cw-bubble ai">${escapeHtml(CONFIG.initialMessage)}</div>
          <div class="cw-bubble-time" id="cw-init-time"></div>
        </div>
      </div>
      <div class="cw-suggestions">
        ${chipsHtml}
      </div>
    </div>

    <div class="cw-input-bar">
      <div class="cw-input-wrap">
        <textarea class="cw-textarea" id="cw-input" placeholder="Type a message..." rows="1"></textarea>
        <button class="cw-send-btn" id="cw-send-btn" title="Send">
          <svg width="16" height="16" fill="none" stroke="${sendIconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div class="cw-input-footer">Powered by <span>${escapeHtml(CONFIG.poweredByText)}</span></div>
    </div>
  </div>
  `;

  // Append all children (button + widget div) to body
  while (wrapper.firstChild) {
    if (wrapper.firstChild.nodeType === 3 && !wrapper.firstChild.textContent.trim()) {
      wrapper.removeChild(wrapper.firstChild);
      continue;
    }
    document.body.appendChild(wrapper.firstChild);
  }

  // ───────────────────────────────────────────────
  // LOGIC
  // ───────────────────────────────────────────────
  var isOpen = false;
  var isLoading = false;

  var launcher = document.getElementById('cw-launcher');
  var widget = document.getElementById('cw-widget');
  var messages = document.getElementById('cw-messages');
  var input = document.getElementById('cw-input');
  var sendBtn = document.getElementById('cw-send-btn');

  document.getElementById('cw-init-time').textContent = now();

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function toggleWidget() {
    isOpen = !isOpen;
    widget.classList.toggle('open', isOpen);
    launcher.classList.toggle('open', isOpen);
    if (isOpen) setTimeout(function () { input.focus(); }, 400);
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  function linkify(text) {
    var escaped = escapeHtml(text);
    return escaped.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener" style="color:' + CONFIG.primaryColor + ';text-decoration:underline;text-underline-offset:3px;word-break:break-all;">$1</a>'
    );
  }

  function appendMessage(text, role) {
    var row = document.createElement('div');
    row.className = 'cw-msg-row ' + role;

    var av = document.createElement('div');
    av.className = role === 'user' ? 'cw-msg-avatar user-av' : 'cw-msg-avatar';
    av.textContent = role === 'user' ? '🙂' : CONFIG.avatarLetter;

    var wrap = document.createElement('div');
    var bubble = document.createElement('div');
    bubble.className = 'cw-bubble ' + role;
    if (role === 'ai') {
      bubble.innerHTML = linkify(text);
    } else {
      bubble.textContent = text;
    }

    var time = document.createElement('div');
    time.className = 'cw-bubble-time';
    time.textContent = now();

    wrap.appendChild(bubble);
    wrap.appendChild(time);
    row.appendChild(av);
    row.appendChild(wrap);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    var row = document.createElement('div');
    row.className = 'cw-typing-row';
    row.id = 'cw-typing';
    var av = document.createElement('div');
    av.className = 'cw-msg-avatar';
    av.textContent = CONFIG.avatarLetter;
    var bubble = document.createElement('div');
    bubble.className = 'cw-typing-bubble';
    bubble.innerHTML = '<div class="cw-dot"></div><div class="cw-dot"></div><div class="cw-dot"></div>';
    row.appendChild(av);
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    var t = document.getElementById('cw-typing');
    if (t) t.remove();
  }

  function appendErrorMessage(errMsg, originalText) {
    var row = document.createElement('div');
    row.className = 'cw-msg-row ai';
    var av = document.createElement('div');
    av.className = 'cw-msg-avatar';
    av.textContent = CONFIG.avatarLetter;
    var wrap = document.createElement('div');
    var bubble = document.createElement('div');
    bubble.className = 'cw-bubble ai';
    bubble.style.borderColor = 'rgba(255,100,100,0.3)';
    var msgSpan = document.createElement('span');
    msgSpan.style.cssText = 'color:#e06666;font-size:12px;';
    msgSpan.textContent = '⚠️ ' + errMsg;
    var retryBtn = document.createElement('button');
    retryBtn.textContent = '↺ Retry';
    retryBtn.style.cssText = 'display:block;margin-top:8px;background:var(--cw-gold-dim);border:1px solid ' + CONFIG.primaryColor + '4d;color:' + CONFIG.primaryColor + ';font-family:var(--cw-font);font-size:11px;padding:5px 12px;border-radius:20px;cursor:pointer;';
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
    messages.scrollTop = messages.scrollHeight;
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;
    input.value = '';
    input.style.height = 'auto';

    appendMessage(text, 'user');
    showTyping();

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);

    var payload = { chatInput: text, sessionId: SESSION_ID };

    fetch(CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).then(function (res) {
      clearTimeout(timeout);
      removeTyping();
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (rawText) {
      var reply = rawText;
      try {
        var data = JSON.parse(rawText);
        reply = (data && (data.output || data.text || data.message || data.response || data.answer)) ||
          (Array.isArray(data) && data[0] && (data[0].output || data[0].text || data[0].message)) ||
          rawText;
      } catch (e) {
        reply = rawText;
      }
      if (reply && String(reply).trim()) appendMessage(reply, 'ai');
    }).catch(function (err) {
      removeTyping();
      var isCors = err.message === 'Failed to fetch' || err.name === 'TypeError';
      var isTimeout = err.name === 'AbortError';
      var errMsg = isTimeout
        ? 'Response timed out. Please try again.'
        : isCors
        ? 'Connection blocked. Please check your webhook settings.'
        : 'Error: ' + err.message;
      appendErrorMessage(errMsg, text);
    }).finally(function () {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    });
  }

  // Event listeners
  launcher.addEventListener('click', toggleWidget);
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('input', function () { autoResize(input); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Suggestion chip clicks (event delegation)
  messages.addEventListener('click', function (e) {
    var chip = e.target.closest('.cw-chip');
    if (!chip) return;
    var text = chip.getAttribute('data-chip') || chip.textContent;
    input.value = text.replace(/^[^\w]+/, '').trim();
    sendMessage();
    chip.style.display = 'none';
  });
})();
