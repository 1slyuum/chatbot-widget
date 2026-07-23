/*!
 * blackstone-legal-chat.js
 * A self-contained chat widget for law firm websites.
 * Theme: "Midnight Chambers"
 *
 * EMBEDDING
 * ---------
 * Place this script tag on your page (typically before </body>):
 *
 *   <script
 *     src="blackstone-legal-chat.js"
 *     data-webhook-url="https://your-server.example.com/chat-webhook"
 *     data-position="right"
 *     data-cta-url="https://your-firm.com/contact"
 *     data-cta-label="Request a consultation"
 *     data-timeout="20000"
 *   ></script>
 *
 * All styling is encapsulated inside a Shadow DOM — it will not collide
 * with your page's CSS. No dependencies. No globals are exposed.
 */
(function () {
  'use strict';

  /* ================================================================
   * CONFIGURATION
   * ----------------------------------------------------------------
   * Every setting below is read from a data-* attribute on the
   * <script> tag that loads this file. A non-developer only needs
   * to edit the attributes in the HTML — there is no need to touch
   * the JavaScript itself.
   *
   * THE WEBHOOK URL
   *   Set  data-webhook-url  to the fully-qualified HTTPS endpoint
   *   that will receive chat messages. The endpoint must accept a
   *   POST request with a JSON body. The widget will read the reply
   *   from any of these keys (in any nesting): output, text,
   *   message, response, answer, content.
   *
   *   Until a real URL is provided — i.e. the attribute is empty
   *   or still contains the placeholder "example.com" — the widget
   *   runs in DEMO MODE. No network requests are made and a polite
   *   notice is shown inside the panel.
   * ================================================================ */

  var currentScript =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName('script');
      return s[s.length - 1];
    })();

  var CONFIG = {
    webhookUrl:    (currentScript.getAttribute('data-webhook-url') || '').trim(),
    position:      (currentScript.getAttribute('data-position') || 'right').toLowerCase() === 'left' ? 'left' : 'right',
    ctaUrl:        (currentScript.getAttribute('data-cta-url') || '').trim(),
    ctaLabel:      (currentScript.getAttribute('data-cta-label') || 'Request a consultation').trim(),
    timeout:       Math.max(3000, parseInt(currentScript.getAttribute('data-timeout') || '20000', 10)),
    firmName:      (currentScript.getAttribute('data-firm-name') || 'Blackstone & Chambers').trim(),
    firmInitials:  (currentScript.getAttribute('data-firm-initials') || 'BC').trim(),
    firmTagline:   (currentScript.getAttribute('data-firm-tagline') || 'Attorneys & Counselors at Law').trim(),
    source:        (currentScript.getAttribute('data-source') || 'blackstone-legal-chat').trim(),
    industry:      (currentScript.getAttribute('data-industry') || 'legal-services').trim(),
  };

  // Optional custom suggestion chips. Accepts JSON array or pipe-separated labels.
  var rawSuggestions = currentScript.getAttribute('data-suggestions');
  var suggestions = null;
  if (rawSuggestions) {
    try {
      suggestions = JSON.parse(rawSuggestions);
    } catch (e) {
      suggestions = rawSuggestions.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    }
  }
  if (!suggestions || !suggestions.length) {
    suggestions = [
      { label: 'Business matter',  text: "I'd like to discuss a business matter." },
      { label: 'Employment law',   text: 'I have a question about employment law.' },
      { label: 'Estate planning',  text: 'I would like assistance with estate planning.' },
      { label: 'Schedule a consultation', text: "I'd like to schedule a consultation." }
    ];
  }
  CONFIG.suggestions = suggestions;

  // Demo mode — no network calls, polite inline notice instead.
  var DEMO_MODE = !CONFIG.webhookUrl || /example\.com/i.test(CONFIG.webhookUrl);

  /* ================================================================
   * Constants & state
   * ================================================================ */
  var SESSION_KEY = 'bl_chat_session_id_v1';

  var state = {
    isOpen: false,
    isSending: false,
    hasInteracted: false,
    leadSubmitted: false,
    sessionId: getOrCreateSessionId()
  };

  var els = {};

  /* ================================================================
   * Utilities
   * ================================================================ */

  function getOrCreateSessionId() {
    try {
      var existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var id = 'bl_' +
        Date.now().toString(36) + '_' +
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 6);
      localStorage.setItem(SESSION_KEY, id);
      return id;
    } catch (e) {
      return 'bl_session_' + Date.now().toString(36) + '_tmp';
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Walk a response payload (string | object, possibly nested) and return the
  // first non-empty string found under one of the recognised keys.
  function extractResponseText(data) {
    if (typeof data === 'string') return data.trim();
    if (!data || typeof data !== 'object') return '';
    var keys = ['output', 'text', 'message', 'response', 'answer', 'content'];
    for (var i = 0; i < keys.length; i++) {
      var v = data[keys[i]];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (v && typeof v === 'object') {
        var nested = extractResponseText(v);
        if (nested) return nested;
      }
    }
    // Last resort: arrays of message objects with .text/.content
    if (Array.isArray(data)) {
      for (var j = 0; j < data.length; j++) {
        var r = extractResponseText(data[j]);
        if (r) return r;
      }
    }
    return '';
  }

  /* ================================================================
   * Styles — "Midnight Chambers" theme
   * Gold is used exclusively as hairlines, borders, and text — never
   * as a fill colour. Sharp corners. Quiet, engraved typography.
   * ================================================================ */
  var STYLES = [
    ':host { all: initial; }',

    '.bl-root, .bl-root *, .bl-root *::before, .bl-root *::after {',
    '  box-sizing: border-box; margin: 0; padding: 0;',
    '}',

    '.bl-root {',
    '  --bl-onyx:#0c0b09; --bl-onyx-2:#14120e; --bl-onyx-3:#1c1913;',
    '  --bl-ivory:#eae3d1; --bl-ivory-dim:#a39d8d; --bl-ivory-faint:#6e6a5f;',
    '  --bl-gold:#b6923f; --bl-gold-bright:#d0a655;',
    '  --bl-gold-dim:rgba(182,146,63,0.42); --bl-gold-faint:rgba(182,146,63,0.10);',
    '  --bl-line:rgba(234,227,209,0.12); --bl-line-strong:rgba(234,227,209,0.22);',
    '  --bl-rust:#8a3a3a;',
    '  --bl-serif:"Cormorant","Cormorant Garamond","Italiana",Georgia,"Times New Roman",serif;',
    '  --bl-sans:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;',
    '  position:fixed; bottom:22px; z-index:2147483645;',
    '  font-family:var(--bl-sans); font-size:14px; line-height:1.5;',
    '  color:var(--bl-ivory); letter-spacing:normal; text-align:left;',
    '  text-transform:none; font-weight:400; font-style:normal;',
    '  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;',
    '}',
    '.bl-root--right { right:22px; }',
    '.bl-root--left  { left:22px; }',

    /* ---------- Launcher ---------- */
    '.bl-launcher {',
    '  display:inline-flex; align-items:center; gap:11px;',
    '  padding:9px 18px 9px 9px; background:var(--bl-onyx);',
    '  border:1px solid var(--bl-gold-dim); border-radius:3px;',
    '  color:var(--bl-ivory); cursor:pointer;',
    '  font:500 11px/1 var(--bl-sans); letter-spacing:0.22em; text-transform:uppercase;',
    '  transition:background 240ms ease, border-color 240ms ease, color 240ms ease;',
    '  box-shadow:0 10px 30px rgba(0,0,0,0.45);',
    '}',
    '.bl-launcher:hover { background:var(--bl-onyx-3); border-color:var(--bl-gold); color:var(--bl-gold-bright); }',
    '.bl-launcher:focus-visible { outline:2px solid var(--bl-gold); outline-offset:3px; }',
    '.bl-launcher__mark {',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  width:30px; height:30px; border:1px solid var(--bl-gold); color:var(--bl-gold);',
    '  font:600 14px/1 var(--bl-serif); letter-spacing:0.06em;',
    '}',
    '.bl-launcher__label { white-space:nowrap; }',

    /* ---------- Panel ---------- */
    '.bl-panel {',
    '  position:absolute; bottom:70px; width:384px;',
    '  max-width:calc(100vw - 28px); max-height:min(720px, calc(100vh - 110px));',
    '  background:var(--bl-onyx); border:1px solid var(--bl-gold-dim); border-radius:3px;',
    '  display:flex; flex-direction:column; overflow:hidden;',
    '  opacity:0; transform:translateY(10px) scale(0.985); pointer-events:none;',
    '  transition:opacity 280ms ease, transform 280ms ease;',
    '  box-shadow:0 24px 80px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4);',
    '}',
    '.bl-root--right .bl-panel { right:0; }',
    '.bl-root--left  .bl-panel { left:0; }',
    '.bl-panel.is-open { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }',

    /* ---------- Header (brass nameplate) ---------- */
    '.bl-panel__header {',
    '  display:flex; align-items:center; gap:13px;',
    '  padding:16px 18px; position:relative;',
    '  border-top:1px solid var(--bl-gold-dim); border-bottom:1px solid var(--bl-gold-dim);',
    '  background:linear-gradient(180deg, var(--bl-onyx-2) 0%, var(--bl-onyx) 100%);',
    '}',
    '.bl-panel__header::before, .bl-panel__header::after {',
    '  content:""; position:absolute; left:0; right:0; height:0;',
    '  border-top:1px solid var(--bl-gold-faint); pointer-events:none;',
    '}',
    '.bl-panel__header::before { top:3px; }',
    '.bl-panel__header::after  { bottom:3px; }',

    '.bl-seal {',
    '  position:relative; flex-shrink:0;',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  width:38px; height:38px; background:var(--bl-onyx);',
    '  border:1px solid var(--bl-gold); color:var(--bl-gold);',
    '  font:600 16px/1 var(--bl-serif); letter-spacing:0.06em;',
    '}',
    '.bl-seal::after { content:""; position:absolute; inset:3px; border:1px solid var(--bl-gold-faint); }',

    '.bl-firm { flex:1; min-width:0; }',
    '.bl-firm__name {',
    '  font:600 17px/1.15 var(--bl-serif); letter-spacing:0.22em;',
    '  text-transform:uppercase; color:var(--bl-ivory);',
    '  text-shadow:0 1px 0 rgba(0,0,0,0.7);',
    '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
    '}',
    '.bl-firm__tagline {',
    '  font:500 9px/1 var(--bl-sans); letter-spacing:0.28em;',
    '  text-transform:uppercase; color:var(--bl-gold); margin-top:5px;',
    '}',

    '.bl-close {',
    '  width:28px; height:28px; flex-shrink:0;',
    '  background:transparent; border:1px solid var(--bl-line); color:var(--bl-ivory-dim);',
    '  cursor:pointer; border-radius:2px;',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  transition:color 200ms ease, border-color 200ms ease;',
    '}',
    '.bl-close:hover { color:var(--bl-ivory); border-color:var(--bl-gold-dim); }',
    '.bl-close:focus-visible { outline:2px solid var(--bl-gold); outline-offset:2px; }',

    /* ---------- Body (scrollable) ---------- */
    '.bl-panel__body {',
    '  flex:1; overflow-y:auto; padding:18px; background:var(--bl-onyx);',
    '  scrollbar-width:thin; scrollbar-color:var(--bl-gold-dim) transparent;',
    '}',
    '.bl-panel__body::-webkit-scrollbar { width:6px; }',
    '.bl-panel__body::-webkit-scrollbar-track { background:transparent; }',
    '.bl-panel__body::-webkit-scrollbar-thumb { background:var(--bl-gold-dim); border-radius:3px; }',

    /* ---------- Conversation log ---------- */
    '.bl-log { display:flex; flex-direction:column; gap:11px; }',

    '.bl-msg {',
    '  max-width:86%; padding:10px 13px; border-radius:3px;',
    '  font-size:13.5px; line-height:1.55; animation:bl-fade 280ms ease;',
    '}',
    '.bl-msg--in {',
    '  align-self:flex-start; background:var(--bl-onyx-2);',
    '  border:1px solid var(--bl-line); color:var(--bl-ivory);',
    '}',
    '.bl-msg--out {',
    '  align-self:flex-end; background:var(--bl-onyx);',
    '  border:1px solid var(--bl-gold-dim); color:var(--bl-ivory);',
    '}',
    '.bl-msg__meta {',
    '  font:500 9px/1 var(--bl-sans); letter-spacing:0.22em; text-transform:uppercase;',
    '  color:var(--bl-ivory-faint); margin-bottom:6px;',
    '}',
    '.bl-msg--out .bl-msg__meta { color:var(--bl-gold); }',
    '.bl-msg__body { white-space:pre-wrap; word-wrap:break-word; overflow-wrap:anywhere; }',
    '@keyframes bl-fade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }',

    /* ---------- Typing indicator (three quiet static dots) ---------- */
    '.bl-typing {',
    '  align-self:flex-start; display:inline-flex; align-items:center; gap:5px;',
    '  padding:13px 15px; background:var(--bl-onyx-2);',
    '  border:1px solid var(--bl-line); border-radius:3px;',
    '}',
    '.bl-typing__dot {',
    '  width:4px; height:4px; border-radius:50%;',
    '  background:var(--bl-ivory-dim); opacity:0.55;',
    '}',

    /* ---------- Suggestion chips ---------- */
    '.bl-chips { display:flex; flex-wrap:wrap; gap:7px; margin-top:18px; }',
    '.bl-chip {',
    '  background:transparent; border:1px solid var(--bl-line); color:var(--bl-ivory-dim);',
    '  padding:7px 11px; font:500 11px/1 var(--bl-sans); letter-spacing:0.08em;',
    '  border-radius:2px; cursor:pointer; transition:all 200ms ease;',
    '}',
    '.bl-chip:hover { border-color:var(--bl-gold-dim); color:var(--bl-ivory); }',
    '.bl-chip:focus-visible { outline:2px solid var(--bl-gold); outline-offset:2px; }',

    /* ---------- Lead form ---------- */
    '.bl-lead { margin-top:22px; padding-top:18px; border-top:1px solid var(--bl-line); }',
    '.bl-lead__title {',
    '  font:600 16px/1.2 var(--bl-serif); letter-spacing:0.18em; text-transform:uppercase;',
    '  color:var(--bl-ivory); text-shadow:0 1px 0 rgba(0,0,0,0.6);',
    '}',
    '.bl-lead__sub {',
    '  font-size:11.5px; color:var(--bl-ivory-dim); margin:5px 0 16px; line-height:1.55;',
    '}',

    '.bl-field { display:block; margin-bottom:12px; }',
    '.bl-field__label {',
    '  display:block; font:500 9.5px/1 var(--bl-sans); letter-spacing:0.22em;',
    '  text-transform:uppercase; color:var(--bl-ivory-dim); margin-bottom:6px;',
    '}',
    '.bl-field__label em {',
    '  font-style:italic; text-transform:none; letter-spacing:0.02em;',
    '  color:var(--bl-ivory-faint); font-size:11px;',
    '}',
    '.bl-field__input {',
    '  width:100%; background:var(--bl-onyx-2); border:1px solid var(--bl-line);',
    '  color:var(--bl-ivory); padding:10px 12px; font:400 13px/1.5 var(--bl-sans);',
    '  border-radius:2px; transition:border-color 200ms ease, background 200ms ease;',
    '}',
    '.bl-field__input::placeholder { color:var(--bl-ivory-faint); }',
    '.bl-field__input:focus { outline:none; border-color:var(--bl-gold); background:var(--bl-onyx-3); }',
    '.bl-field__input--area { resize:vertical; min-height:64px; font-family:var(--bl-sans); }',
    '.bl-field--error .bl-field__input { border-color:var(--bl-rust); }',
    '.bl-field__error { font-size:10.5px; color:#c87676; margin-top:5px; letter-spacing:0.02em; }',

    '.bl-consent {',
    '  display:flex; gap:9px; align-items:flex-start; cursor:pointer;',
    '  font-size:11px; color:var(--bl-ivory-dim); line-height:1.55; margin:6px 0 16px;',
    '}',
    '.bl-consent input[type="checkbox"] {',
    '  margin-top:2px; accent-color:var(--bl-gold); flex-shrink:0;',
    '  width:14px; height:14px; cursor:pointer;',
    '}',
    '.bl-consent--error { color:#c87676; }',

    '.bl-lead__submit {',
    '  width:100%; background:transparent; border:1px solid var(--bl-gold); color:var(--bl-gold);',
    '  padding:11px 16px; font:500 11px/1 var(--bl-sans); letter-spacing:0.24em;',
    '  text-transform:uppercase; border-radius:2px; cursor:pointer; transition:all 240ms ease;',
    '}',
    '.bl-lead__submit:hover { color:var(--bl-gold-bright); border-color:var(--bl-gold-bright); background:var(--bl-gold-faint); }',
    '.bl-lead__submit:focus-visible { outline:2px solid var(--bl-gold); outline-offset:2px; }',
    '.bl-lead__submit:disabled { opacity:0.5; cursor:not-allowed; }',

    /* ---------- Footer / compose / CTA ---------- */
    '.bl-panel__footer {',
    '  border-top:1px solid var(--bl-line); padding:12px 14px 13px; background:var(--bl-onyx-2);',
    '}',
    '.bl-compose {',
    '  display:flex; gap:8px; align-items:flex-end;',
    '  background:var(--bl-onyx); border:1px solid var(--bl-line); border-radius:2px;',
    '  padding:6px 6px 6px 12px; transition:border-color 200ms ease;',
    '}',
    '.bl-compose:focus-within { border-color:var(--bl-gold-dim); }',
    '.bl-compose__input {',
    '  flex:1; background:transparent; border:0; color:var(--bl-ivory);',
    '  font:400 13.5px/1.5 var(--bl-sans); resize:none; max-height:120px;',
    '  padding:5px 0; outline:none; min-height:22px;',
    '}',
    '.bl-compose__input::placeholder { color:var(--bl-ivory-faint); font-style:italic; }',

    '.bl-send {',
    '  width:34px; height:34px; flex-shrink:0;',
    '  background:transparent; border:1px solid var(--bl-gold-dim); color:var(--bl-gold);',
    '  cursor:pointer; border-radius:2px;',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  transition:all 200ms ease;',
    '}',
    '.bl-send:hover { color:var(--bl-gold-bright); border-color:var(--bl-gold); background:var(--bl-gold-faint); }',
    '.bl-send:focus-visible { outline:2px solid var(--bl-gold); outline-offset:2px; }',
    '.bl-send:disabled { opacity:0.4; cursor:not-allowed; }',

    '.bl-cta {',
    '  display:block; margin-top:11px; text-align:center; text-decoration:none;',
    '  color:var(--bl-ivory-dim); font:500 10px/1 var(--bl-sans); letter-spacing:0.26em;',
    '  text-transform:uppercase; padding:9px 8px; border:1px solid var(--bl-line);',
    '  border-radius:2px; transition:all 200ms ease;',
    '}',
    '.bl-cta:hover { color:var(--bl-gold); border-color:var(--bl-gold-dim); }',
    '.bl-cta:focus-visible { outline:2px solid var(--bl-gold); outline-offset:2px; }',

    /* ---------- Reduced motion ---------- */
    '@media (prefers-reduced-motion: reduce) {',
    '  .bl-root, .bl-root *, .bl-root *::before, .bl-root *::after {',
    '    transition-duration:0ms !important; animation-duration:0ms !important;',
    '    animation-iteration-count:1 !important;',
    '  }',
    '  .bl-msg { animation:none; }',
    '}',

    /* ---------- Mobile: panel becomes full-screen ---------- */
    '@media (max-width: 480px) {',
    '  .bl-root { bottom:16px; }',
    '  .bl-root--right { right:16px; }',
    '  .bl-root--left  { left:16px; }',
    '  .bl-panel {',
    '    position:fixed; bottom:0; left:0; right:0; top:auto;',
    '    width:100vw; max-width:100vw; max-height:100vh; height:100vh;',
    '    border:0; border-radius:0;',
    '  }',
    '  .bl-root--right .bl-panel, .bl-root--left .bl-panel { left:0; right:0; }',
    '  .bl-launcher__label { display:none; }',
    '}'
  ].join('\n');

  /* ================================================================
   * Markup builder
   * ================================================================ */

  function buildChipsHtml() {
    return CONFIG.suggestions.map(function (s) {
      if (typeof s === 'string') s = { label: s, text: s };
      return '<button class="bl-chip" type="button" data-suggestion="' +
             escapeHtml(s.text) + '">' + escapeHtml(s.label) + '</button>';
    }).join('');
  }

  function buildMarkup() {
    var chipsHtml = buildChipsHtml();
    var ctaHref = CONFIG.ctaUrl ? escapeHtml(CONFIG.ctaUrl) : '#';
    var ctaAttrs = CONFIG.ctaUrl ? ' target="_blank" rel="noopener"' : '';
    var ctaLabel = escapeHtml(CONFIG.ctaLabel || 'Request a consultation');

    return [
      '<button class="bl-launcher" type="button" aria-label="Open chat with ', escapeHtml(CONFIG.firmName), '" aria-expanded="false" aria-haspopup="dialog">',
        '<span class="bl-launcher__mark" aria-hidden="true">', escapeHtml(CONFIG.firmInitials), '</span>',
        '<span class="bl-launcher__label">Message chambers</span>',
      '</button>',
      '<section class="bl-panel" role="dialog" aria-modal="false" aria-label="Chat with ', escapeHtml(CONFIG.firmName), '" hidden>',
        '<header class="bl-panel__header">',
          '<div class="bl-seal" aria-hidden="true">', escapeHtml(CONFIG.firmInitials), '</div>',
          '<div class="bl-firm">',
            '<div class="bl-firm__name">', escapeHtml(CONFIG.firmName), '</div>',
            '<div class="bl-firm__tagline">', escapeHtml(CONFIG.firmTagline), '</div>',
          '</div>',
          '<button class="bl-close" type="button" aria-label="Close chat">',
            '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">',
              '<path d="M3 3 L13 13 M13 3 L3 13"/>',
            '</svg>',
          '</button>',
        '</header>',
        '<div class="bl-panel__body">',
          '<div class="bl-log" role="log" aria-live="polite" aria-label="Conversation transcript"></div>',
          '<div class="bl-chips" role="group" aria-label="Suggested opening inquiries">', chipsHtml, '</div>',
          '<form class="bl-lead" novalidate aria-label="Introduction form">',
            '<div class="bl-lead__title">Introduce yourself</div>',
            '<p class="bl-lead__sub">A brief introduction allows us to direct your inquiry to the appropriate chambers. Please do not include confidential or privileged information.</p>',

            '<div class="bl-field">',
              '<label class="bl-field__label" for="bl-fullName">Full name</label>',
              '<input class="bl-field__input" id="bl-fullName" name="fullName" type="text" autocomplete="name">',
            '</div>',
            '<div class="bl-field">',
              '<label class="bl-field__label" for="bl-email">Email</label>',
              '<input class="bl-field__input" id="bl-email" name="email" type="email" autocomplete="email" inputmode="email">',
            '</div>',
            '<div class="bl-field">',
              '<label class="bl-field__label" for="bl-phone">Phone</label>',
              '<input class="bl-field__input" id="bl-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel">',
            '</div>',
            '<div class="bl-field">',
              '<label class="bl-field__label" for="bl-matterType">Matter type</label>',
              '<select class="bl-field__input" id="bl-matterType" name="matterType">',
                '<option value="" disabled selected>Select…</option>',
                '<option>Business</option>',
                '<option>Employment</option>',
                '<option>Estate planning</option>',
                '<option>Family</option>',
                '<option>Litigation</option>',
                '<option>Real estate</option>',
                '<option>Other</option>',
              '</select>',
            '</div>',
            '<div class="bl-field">',
              '<label class="bl-field__label" for="bl-summary">Brief summary <em>(non-confidential)</em></label>',
              '<textarea class="bl-field__input bl-field__input--area" id="bl-summary" name="summary" rows="3"></textarea>',
            '</div>',
            '<label class="bl-consent">',
              '<input type="checkbox" name="consent">',
              '<span>I understand that submitting this form does not establish an attorney–client relationship and that no confidential information should be included.</span>',
            '</label>',
            '<button class="bl-lead__submit" type="submit">Submit introduction</button>',
          '</form>',
        '</div>',
        '<footer class="bl-panel__footer">',
          '<div class="bl-compose">',
            '<textarea class="bl-compose__input" rows="1" placeholder="Write a message…" aria-label="Message input"></textarea>',
            '<button class="bl-send" type="button" aria-label="Send message">',
              '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">',
                '<path d="M2 8 L14 8 M9 3 L14 8 L9 13"/>',
              '</svg>',
            '</button>',
          '</div>',
          '<a class="bl-cta" href="', ctaHref, '"', ctaAttrs, '>', ctaLabel, '</a>',
        '</footer>',
      '</section>'
    ].join('');
  }

  /* ================================================================
   * Font injection (Cormorant + Inter from Google Fonts)
   * ================================================================ */
  function injectFonts() {
    if (document.getElementById('bl-fonts-link')) return;
    var head = document.head || document.documentElement;
    var pre1 = document.createElement('link');
    pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com';
    var pre2 = document.createElement('link');
    pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com'; pre2.crossOrigin = '';
    var link = document.createElement('link');
    link.id = 'bl-fonts-link'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant:wght@500;600;700&family=Inter:wght@400;500;600&display=swap';
    head.appendChild(pre1); head.appendChild(pre2); head.appendChild(link);
  }

  /* ================================================================
   * Initialisation
   * ================================================================ */
  function init() {
    injectFonts();

    var host = document.createElement('div');
    host.className = 'bl-host';
    host.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;overflow:visible;' +
      'pointer-events:none;z-index:2147483645;';
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'open' });

    var styleEl = document.createElement('style');
    styleEl.textContent = STYLES;
    shadow.appendChild(styleEl);

    var root = document.createElement('div');
    root.className = 'bl-root bl-root--' + CONFIG.position;
    root.style.pointerEvents = 'auto';
    root.innerHTML = buildMarkup();
    shadow.appendChild(root);

    // Cache references
    els.host = host;
    els.root = root;
    els.launcher     = root.querySelector('.bl-launcher');
    els.panel        = root.querySelector('.bl-panel');
    els.closeBtn     = root.querySelector('.bl-close');
    els.body         = root.querySelector('.bl-panel__body');
    els.log          = root.querySelector('.bl-log');
    els.chips        = root.querySelector('.bl-chips');
    els.leadForm     = root.querySelector('.bl-lead');
    els.composeInput = root.querySelector('.bl-compose__input');
    els.sendBtn      = root.querySelector('.bl-send');
    els.cta          = root.querySelector('.bl-cta');

    if (!CONFIG.ctaUrl) els.cta.style.display = 'none';

    wireEvents();
    seedConversation();
  }

  function wireEvents() {
    els.launcher.addEventListener('click', togglePanel);
    els.closeBtn.addEventListener('click', closePanel);

    els.chips.addEventListener('click', function (e) {
      var chip = e.target.closest('.bl-chip');
      if (!chip) return;
      var text = chip.getAttribute('data-suggestion') || chip.textContent;
      els.composeInput.value = text;
      autoGrow(els.composeInput);
      els.composeInput.focus();
    });

    els.leadForm.addEventListener('submit', handleLeadSubmit);

    els.sendBtn.addEventListener('click', handleComposeSend);
    els.composeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleComposeSend();
      }
    });
    els.composeInput.addEventListener('input', function () { autoGrow(this); });

    // Escape closes the panel (document-level, since focus may be in shadow DOM)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isOpen) {
        e.preventDefault();
        closePanel();
      }
    });
  }

  function seedConversation() {
    addMessage(
      'Good evening, and welcome to ' + CONFIG.firmName + '. How may we be of assistance this evening?',
      'in',
      { meta: 'Chambers · Reception' }
    );
    if (DEMO_MODE) {
      addMessage(
        'The firm\'s secure intake system is being prepared. You may explore the interface freely — messages will not be transmitted until a webhook URL is configured.',
        'in',
        { meta: 'Notice' }
      );
    }
  }

  /* ================================================================
   * Panel open / close
   * ================================================================ */
  function togglePanel() { state.isOpen ? closePanel() : openPanel(); }

  function openPanel() {
    if (state.isOpen) return;
    state.isOpen = true;
    els.panel.hidden = false;
    void els.panel.offsetWidth; // force reflow so the transition runs
    els.panel.classList.add('is-open');
    els.launcher.setAttribute('aria-expanded', 'true');
    setTimeout(function () {
      if (state.isOpen) els.composeInput.focus();
    }, 280);
  }

  function closePanel() {
    if (!state.isOpen) return;
    state.isOpen = false;
    els.panel.classList.remove('is-open');
    els.launcher.setAttribute('aria-expanded', 'false');
    setTimeout(function () {
      if (!state.isOpen) els.panel.hidden = true;
    }, 280);
    els.launcher.focus();
  }

  /* ================================================================
   * Message rendering
   * ================================================================ */
  function addMessage(text, who, opts) {
    opts = opts || {};
    var msg = document.createElement('div');
    msg.className = 'bl-msg bl-msg--' + (who === 'out' ? 'out' : 'in');

    if (opts.meta) {
      var meta = document.createElement('div');
      meta.className = 'bl-msg__meta';
      meta.textContent = opts.meta;
      msg.appendChild(meta);
    }
    var body = document.createElement('div');
    body.className = 'bl-msg__body';
    body.textContent = text;
    msg.appendChild(body);

    els.log.appendChild(msg);
    scrollLogToBottom();
    return msg;
  }

  function addTypingIndicator() {
    var t = document.createElement('div');
    t.className = 'bl-typing';
    t.setAttribute('aria-hidden', 'true');
    t.innerHTML =
      '<span class="bl-typing__dot"></span>' +
      '<span class="bl-typing__dot"></span>' +
      '<span class="bl-typing__dot"></span>';
    els.log.appendChild(t);
    scrollLogToBottom();
    return t;
  }

  function scrollLogToBottom() {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () { els.body.scrollTop = els.body.scrollHeight; });
    } else {
      els.body.scrollTop = els.body.scrollHeight;
    }
  }

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function hideChips()    { if (els.chips)    els.chips.style.display = 'none'; }
  function hideLeadForm() { if (els.leadForm) els.leadForm.style.display = 'none'; }

  /* ================================================================
   * Compose box
   * ================================================================ */
  function handleComposeSend() {
    if (state.isSending) return;
    var text = (els.composeInput.value || '').trim();
    if (!text) return;

    addMessage(text, 'out');
    els.composeInput.value = '';
    autoGrow(els.composeInput);

    if (!state.hasInteracted) {
      state.hasInteracted = true;
      hideChips();
    }
    sendMessageToWebhook(text, { eventType: 'message' });
  }

  /* ================================================================
   * Lead-capture form
   * ================================================================ */
  function collectLeadData() {
    return {
      fullName:   (els.leadForm.fullName.value   || '').trim(),
      email:      (els.leadForm.email.value      || '').trim(),
      phone:      (els.leadForm.phone.value      || '').trim(),
      matterType: els.leadForm.matterType.value,
      summary:    (els.leadForm.summary.value    || '').trim(),
      consent:    els.leadForm.consent.checked
    };
  }

  function validateLead(d) {
    var errors = {};
    if (!d.fullName) errors.fullName = 'Your name is required.';
    if (!d.email) {
      errors.email = 'An email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    var digits = (d.phone.match(/\d/g) || []).length;
    if (!d.phone) {
      errors.phone = 'A contact number is required.';
    } else if (digits < 7) {
      errors.phone = 'The number provided must contain at least seven digits.';
    }
    if (!d.matterType) errors.matterType = 'Please select a matter type.';
    if (!d.summary)    errors.summary    = 'A brief summary is required.';
    if (!d.consent)    errors.consent    = 'Your acknowledgement is required to proceed.';
    return errors;
  }

  function clearLeadErrors() {
    var i, fields = els.leadForm.querySelectorAll('.bl-field--error');
    for (i = 0; i < fields.length; i++) fields[i].classList.remove('bl-field--error');
    var errs = els.leadForm.querySelectorAll('.bl-field__error');
    for (i = 0; i < errs.length; i++) errs[i].parentNode.removeChild(errs[i]);
    var consentErr = els.leadForm.querySelector('.bl-consent--error');
    if (consentErr) consentErr.classList.remove('bl-consent--error');
  }

  function showLeadErrors(errors) {
    clearLeadErrors();
    Object.keys(errors).forEach(function (name) {
      var field = els.leadForm[name];
      if (!field) return;
      var wrapper;
      if (name === 'consent') {
        wrapper = field.closest('.bl-consent');
        if (wrapper) wrapper.classList.add('bl-consent--error');
      } else {
        wrapper = field.closest('.bl-field');
        if (wrapper) wrapper.classList.add('bl-field--error');
      }
      if (!wrapper) return;
      var errEl = document.createElement('div');
      errEl.className = 'bl-field__error';
      errEl.textContent = errors[name];
      wrapper.appendChild(errEl);
    });
    var firstErr = els.leadForm.querySelector('.bl-field--error .bl-field__input, .bl-consent--error input');
    if (firstErr) firstErr.focus();
  }

  function handleLeadSubmit(e) {
    e.preventDefault();
    if (state.isSending) return;

    var data = collectLeadData();
    var errors = validateLead(data);
    if (Object.keys(errors).length) {
      showLeadErrors(errors);
      return;
    }
    clearLeadErrors();

    var summary =
      'Introduction submitted — ' + data.fullName +
      ' · ' + data.matterType + '. ' + data.summary;

    addMessage(summary, 'out', { meta: 'Introduction · ' + data.fullName });

    state.leadSubmitted = true;
    hideLeadForm();
    if (!state.hasInteracted) {
      state.hasInteracted = true;
      hideChips();
    }

    sendMessageToWebhook(summary, {
      eventType: 'lead-capture',
      metadata: { lead: data }
    });
  }

  /* ================================================================
   * Webhook communication
   * ================================================================ */
  function sendMessageToWebhook(text, opts) {
    opts = opts || {};

    // DEMO MODE: do not perform any network call. Show a polite inline
    // notice after a brief "composing" pause. No console output.
    if (DEMO_MODE) {
      var demoTyping = addTypingIndicator();
      setTimeout(function () {
        if (demoTyping.parentNode) demoTyping.parentNode.removeChild(demoTyping);
        addMessage(
          'The firm\'s secure intake system is not yet connected. Please telephone our chambers directly, or use the link below to request a consultation.',
          'in',
          { meta: 'System' }
        );
      }, 700);
      return;
    }

    state.isSending = true;
    els.sendBtn.disabled = true;
    var typing = addTypingIndicator();

    var payload = {
      chatInput:  text,
      sessionId:  state.sessionId,
      eventType:  opts.eventType || 'message',
      source:     CONFIG.source,
      industry:   CONFIG.industry,
      pageUrl:    location.href,
      pageTitle:  document.title,
      timestamp:  new Date().toISOString(),
      metadata:   Object.assign({}, opts.metadata || {})
    };

    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, CONFIG.timeout);

    fetch(CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'omit'
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text().then(function (txt) {
        var trimmed = (txt || '').trim();
        if (!trimmed) return '';
        try { return JSON.parse(trimmed); }
        catch (e) { return trimmed; }
      });
    }).then(function (data) {
      clearTimeout(timeoutId);
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      var reply = extractResponseText(data);
      addMessage(
        reply || 'Your message has been received. A member of the firm will respond shortly.',
        'in',
        { meta: 'Chambers' }
      );
    }).catch(function (err) {
      clearTimeout(timeoutId);
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      var isAbort = err && err.name === 'AbortError';
      addMessage(
        isAbort
          ? 'Our apologies — the response was delayed. Please try again in a moment.'
          : 'Our apologies — we were unable to deliver your message just now. Please try again, or contact the firm directly.',
        'in',
        { meta: 'System' }
      );
    }).then(function () {
      state.isSending = false;
      els.sendBtn.disabled = false;
    });
  }

  /* ================================================================
   * Boot
   * ================================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
