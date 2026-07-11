/*!
 * RealEstateWidget v2.0 — Embeddable AI chatbot widget for Real Estate websites.
 * Single-file, dependency-free. Configure via data-* attributes on the <script> tag.
 *
 * Usage:
 *   <script src="https://your-cdn/real-estate-widget.js"
 *           data-webhook="https://your-n8n-instance/webhook/xxxx"
 *           data-name="Your Real Estate Agency"
 *           data-color-primary="#1a3a5c"
 *           defer></script>
 *
 * MIT-style license.
 */
(function () {
  'use strict';

  // Prevent double-initialisation if the script is included twice.
  if (window.__cwInitialized) {
    console.warn('[RealEstateWidget] Already initialised — skipping duplicate load.');
    return;
  }
  window.__cwInitialized = true;

  // ───────────────────────────────────────────────
  // RESOLVE THE <script> TAG (robust against async/defer/injection)
  // ───────────────────────────────────────────────
  function resolveScript() {
    if (document.currentScript) return document.currentScript;
    var byId = document.getElementById('cw-widget-script');
    if (byId) return byId;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].getAttribute('src') || '';
      if (scripts[i].hasAttribute('data-webhook') || /real-estate-widget(\.min)?\.js/i.test(src)) {
        return scripts[i];
      }
    }
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
    try { bodyBg = document.body ? getComputedStyle(document.body).backgroundColor : ''; } catch (e) {}
    var bodyIsDark = false;
    var m = bodyBg && bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
    if (m) {
      var alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
      if (alpha > 0.2) {
        var r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
        bodyIsDark = (0.299 * r + 0.587 * g + 0.114 * b) < 128;
      } else { bodyIsDark = prefersDark; }
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
  function contrastColor(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return '#ffffff';
    return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) > 150 ? '#0a0a0a' : '#ffffff';
  }
  function darken(hex, pct) {
    var rgb = hexToRgb(hex);
    if (!rgb) return hex;
    var f = 1 - (pct / 100);
    return '#' + [rgb.r, rgb.g, rgb.b].map(function (c) {
      return ('0' + Math.max(0, Math.min(255, Math.round(c * f))).toString(16)).slice(-2);
    }).join('');
  }
  function lighten(hex, pct) {
    var rgb = hexToRgb(hex);
    if (!rgb) return hex;
    var f = pct / 100;
    return '#' + [rgb.r, rgb.g, rgb.b].map(function (c) {
      return ('0' + Math.max(0, Math.min(255, Math.round(c + (255 - c) * f))).toString(16)).slice(-2);
    }).join('');
  }

  // ───────────────────────────────────────────────
  // THEME COLOR DEFAULTS
  // ───────────────────────────────────────────────
  var THEME = isDark ? {
    surfaceBg: '#111213',
    panelBg: '#18191b',
    headerBg: '#0e0f10',
    border: 'rgba(255,255,255,0.07)',
    textPrimary: '#f0ede8',
    textMuted: 'rgba(240,237,232,0.42)',
    aiBubbleBg: '#1e2022',
    inputBg: '#18191b',
    placeholderColor: 'rgba(240,237,232,0.38)',
    codeBg: 'rgba(0,0,0,0.4)',
    tableBorderColor: 'rgba(255,255,255,0.1)'
  } : {
    surfaceBg: '#ffffff',
    panelBg: '#f8f8f9',
    headerBg: '#ffffff',
    border: 'rgba(0,0,0,0.07)',
    textPrimary: '#18191b',
    textMuted: 'rgba(24,25,27,0.48)',
    aiBubbleBg: '#f0f1f3',
    inputBg: '#f8f8f9',
    placeholderColor: 'rgba(24,25,27,0.38)',
    codeBg: 'rgba(0,0,0,0.055)',
    tableBorderColor: 'rgba(0,0,0,0.1)'
  };

  var primaryColor = attr('data-color-primary', '#1a3a5c');
  var primaryColorDark = attr('data-color-primary-dark', darken(primaryColor, 20));
  var primaryColorLight = lighten(primaryColor, 30);

  // ───────────────────────────────────────────────
  // LANGUAGE / TEXT DIRECTION
  // ───────────────────────────────────────────────
  var RTL_LANGS = /^(ar|he|fa|ur|ps|sd|ug|yi|dv|ckb|arc|nqo)\b/i;
  var RTL_CHAR = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u07FF\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

  var langSetting = attr('data-lang', '');
  var resolvedLang = langSetting ||
    (document.documentElement && document.documentElement.getAttribute('lang')) ||
    (navigator.language || navigator.userLanguage || 'en');

  function detectRtl(text) { return !!(text && RTL_CHAR.test(text)); }

  var dirSetting = (attr('data-dir', 'auto') || 'auto').toLowerCase();
  var businessNameRaw = attr('data-name', 'Your Real Estate Agency');
  var isRtl;
  if (dirSetting === 'rtl') { isRtl = true; }
  else if (dirSetting === 'ltr') { isRtl = false; }
  else {
    isRtl = RTL_LANGS.test(resolvedLang) ||
      detectRtl(businessNameRaw) ||
      detectRtl(attr('data-welcome-title', '')) ||
      detectRtl(attr('data-initial-message', ''));
  }
  var DIR = isRtl ? 'rtl' : 'ltr';

  function firstGrapheme(str) {
    str = (str || '').trim();
    if (!str) return 'A';
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        var seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        var it = seg.segment(str)[Symbol.iterator]();
        var first = it.next();
        if (!first.done) return first.value.segment;
      }
    } catch (e) {}
    var cp = str.codePointAt(0);
    return String.fromCodePoint(cp);
  }
  function avatarFrom(name) {
    var g = firstGrapheme(name);
    try { return g.toLocaleUpperCase(resolvedLang); } catch (e) { return g.toUpperCase(); }
  }

  // ───────────────────────────────────────────────
  // CONFIGURATION
  // ───────────────────────────────────────────────
  var CONFIG = {
    webhookUrl: attr('data-webhook', ''),
    businessName: businessNameRaw,
    lang: resolvedLang,
    dir: DIR,
    isRtl: isRtl,
    avatarLetter: attr('data-avatar', avatarFrom(businessNameRaw)),
    avatarImage: attr('data-avatar-image', ''),
    welcomeTitle: attr('data-welcome-title', 'Find Your Dream Home'),
    welcomeSub: attr('data-welcome-sub', "Ask about properties, viewings, pricing, or neighborhood info. We're here to help!"),
    initialMessage: attr('data-initial-message', "Hello! I'm your real estate assistant. How can I help you find your perfect home today?"),
    poweredByText: attr('data-powered-by', businessNameRaw),
    poweredByUrl: attr('data-powered-by-url', ''),
    showPoweredBy: attrBool('data-show-powered-by', true),
    statusText: attr('data-status-text', 'Online — Available 24/7'),
    headerBadge: attr('data-badge', 'REAL ESTATE'),
    placeholder: attr('data-placeholder', 'Ask about properties, viewings…'),
    textToday: attr('data-text-today', ''),
    textRetry: attr('data-text-retry', 'Retry'),
    textNewChat: attr('data-text-new-chat', 'New conversation'),
    textClose: attr('data-text-close', 'Close'),
    textSend: attr('data-text-send', 'Send'),
    textOpenAria: attr('data-text-open', 'Open chat'),
    textPoweredBy: attr('data-text-powered-by', 'Powered by'),
    errTimeout: attr('data-err-timeout', 'The response is taking too long. Please try again.'),
    errNetwork: attr('data-err-network', 'Connection problem. Please check your internet and try again.'),
    errServer: attr('data-err-server', 'Our assistant is temporarily unavailable. Please try again shortly.'),
    errGeneric: attr('data-err-generic', 'Something went wrong. Please try again.'),
    errEmpty: attr('data-err-empty', "I didn't get a response. Could you try rephrasing?"),

    primaryColor: primaryColor,
    primaryColorDark: primaryColorDark,
    userTextColor: attr('data-color-user-text', contrastColor(primaryColor)),

    bgColor: attr('data-color-bg', THEME.surfaceBg),
    panelColor: attr('data-color-panel', THEME.panelBg),
    headerColor: attr('data-color-header', THEME.headerBg),
    borderColor: attr('data-color-border', THEME.border),
    textColor: attr('data-color-text', THEME.textPrimary),
    mutedColor: attr('data-color-muted', THEME.textMuted),
    aiBubbleColor: attr('data-color-ai-bubble', THEME.aiBubbleBg),
    inputBgColor: attr('data-color-input-bg', THEME.inputBg),

    bubbleRadius: attr('data-bubble-radius', '18px'),
    panelRadius: attr('data-panel-radius', '20px'),
    launcherSize: attrInt('data-launcher-size', 60),

    position: attr('data-position', 'bottom-right'),
    offsetX: attrInt('data-offset-x', 24),
    offsetY: attrInt('data-offset-y', 24),

    fontFamily: attr('data-font', "system-ui, -apple-system, 'Segoe UI', Roboto, 'DM Sans', Arial, sans-serif"),

    timeoutMs: attrInt('data-timeout', 60000),
    autoOpen: attrBool('data-auto-open', false),
    autoOpenDelay: attrInt('data-auto-open-delay', 3000),
    persistChat: attrBool('data-persist-chat', true),
    persistOpenState: attrBool('data-persist-open', false),
    sound: attrBool('data-sound', false),
    greetingBubble: attrBool('data-greeting-bubble', false),
    greetingBubbleText: attr('data-greeting-text', '🏡 Looking for your dream home? Chat with us!'),
    maxStored: attrInt('data-max-history', 50)
  };

  if (!CONFIG.webhookUrl) {
    console.error('[RealEstateWidget] Missing data-webhook attribute on the <script> tag. The widget cannot send messages.');
  }

  // ───────────────────────────────────────────────
  // CHIPS — Real Estate specific
  // ───────────────────────────────────────────────
  var chipsAttr = currentScript.getAttribute('data-chips');
  var DEFAULT_CHIPS = [
    { emoji: '🏠', label: 'Browse Properties' },
    { emoji: '💰', label: 'Mortgage & Pricing' },
    { emoji: '📅', label: 'Schedule Viewing' }
  ];
  var CHIPS = DEFAULT_CHIPS;
  if (chipsAttr !== null) {
    CHIPS = (chipsAttr || '').split(',').map(function (pair) {
      var parts = pair.split(':');
      if (parts.length === 1) return { emoji: '', label: parts[0].trim() };
      return { emoji: (parts[0] || '').trim(), label: (parts.slice(1).join(':') || '').trim() };
    }).filter(function (c) { return c.label; });
  }

  // ───────────────────────────────────────────────
  // STORAGE HELPERS
  // ───────────────────────────────────────────────
  var STORE_AVAILABLE = (function () {
    try { var k = '__cw_test__'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  })();

  function storeGet(key) {
    if (!STORE_AVAILABLE) return null;
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function storeSet(key, val) {
    if (!STORE_AVAILABLE) return;
    try { localStorage.setItem(key, String(val)); } catch (e) {}
  }

  function hashString(s) {
    var h = 0, i, chr;
    if (!s || s.length === 0) return '0';
    for (i = 0; i < s.length; i++) { chr = s.charCodeAt(i); h = ((h << 5) - h) + chr; h |= 0; }
    return Math.abs(h).toString(36);
  }
  var NS = 'cw_' + hashString(CONFIG.webhookUrl || CONFIG.businessName) + '_';

  // ───────────────────────────────────────────────
  // SESSION ID
  // ───────────────────────────────────────────────
  var SESSION_ID = (function () {
    var stored = storeGet(NS + 'session_id');
    if (stored) return stored;
    var id = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    storeSet(NS + 'session_id', id);
    return id;
  })();

  // ───────────────────────────────────────────────
  // POSITION HELPERS
  // ───────────────────────────────────────────────
  var SIDE = (function () {
    var p = (CONFIG.position || 'bottom-right').toLowerCase();
    if (p === 'bottom-left' || p === 'top-left') return 'left';
    return 'right';
  })();
  var OTHER_SIDE = SIDE === 'left' ? 'right' : 'left';
  var LSIZE = CONFIG.launcherSize;

  // ───────────────────────────────────────────────
  // HTML ESCAPING (XSS prevention)
  // ───────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ───────────────────────────────────────────────
  // IMPROVED MARKDOWN RENDERER
  // Supports: paragraphs, headings, bold, italic, code, pre,
  //           links, auto-links, lists, blockquotes, tables, hr
  // ───────────────────────────────────────────────
  function renderMarkdown(src) {
    var text = String(src == null ? '' : src);

    // 1. Extract fenced code blocks (preserves language hint)
    var codeBlocks = [];
    text = text.replace(/```([^\n]*)\n?([\s\S]*?)```/g, function (_, lang, code) {
      codeBlocks.push({ lang: (lang || '').trim(), code: code.replace(/\n$/, '') });
      return '\u0000CB' + (codeBlocks.length - 1) + '\u0000';
    });

    // 2. Extract inline code
    var inlineCodes = [];
    text = text.replace(/`([^`\n]+)`/g, function (_, code) {
      inlineCodes.push(code);
      return '\u0000IC' + (inlineCodes.length - 1) + '\u0000';
    });

    // 3. Escape everything else
    text = escapeHtml(text);

    // 4. Tables — detect | separated lines
    text = text.replace(/((?:\|[^\n]+\|\n?)+)/g, function (block) {
      var rows = block.trim().split('\n').filter(function (r) { return r.trim(); });
      if (rows.length < 2) return block;
      var sepRow = rows[1];
      if (!/^\|[\s\-:|]+\|/.test(sepRow)) return block;
      var html = '<div class="cw-table-wrap"><table class="cw-table">';
      var isHead = true;
      for (var ri = 0; ri < rows.length; ri++) {
        if (ri === 1) { isHead = false; continue; }
        var cells = rows[ri].split('|').filter(function (_, idx, arr) { return idx > 0 && idx < arr.length; });
        var tag = (ri === 0) ? 'th' : 'td';
        html += '<tr>';
        cells.forEach(function (cell) { html += '<' + tag + '>' + cell.trim() + '</' + tag + '>'; });
        html += '</tr>';
      }
      html += '</table></div>';
      return html;
    });

    // 5. Horizontal rule
    text = text.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr class="cw-hr">');

    // 6. Headings
    text = text.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
               .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
               .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
               .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
               .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
               .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // 7. Blockquotes (multi-level support)
    text = text.replace(/^&gt;&gt;\s?(.+)$/gm, '<blockquote><blockquote>$1</blockquote></blockquote>');
    text = text.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');

    // 8. Bold / italic (order matters — bold first)
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?=[^*]|$)/g, '$1<em>$2</em>');
    text = text.replace(/(^|[^_])_([^_\n]+)_(?=[^_]|$)/g, '$1<em>$2</em>');

    // 9. Strikethrough
    text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

    // 10. Links [text](url) — only http/https/mailto
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
      function (_, label, url) {
        return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
      });

    // 11. Auto-link bare URLs — avoid double-linking
    text = text.replace(/(^|[\s(])(https?:\/\/[^\s<"')\]]+)/g, function (_, pre, url) {
      return pre + '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });

    // 12. Lists (nested bullet / numbered)
    var lines = text.split('\n');
    var out = [];
    var listStack = [];

    function openList(type, indent) {
      listStack.push({ type: type, indent: indent });
      out.push('<' + type + '>');
    }
    function closeLists(toIndent) {
      while (listStack.length > 0 && listStack[listStack.length - 1].indent >= toIndent) {
        out.push('</' + listStack.pop().type + '>');
      }
    }
    function closeAllLists() { while (listStack.length) out.push('</' + listStack.pop().type + '>'); }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
      var olMatch = line.match(/^(\s*)\d+[.)]\s+(.+)$/);
      if (ulMatch) {
        var indent = ulMatch[1].length;
        if (!listStack.length || listStack[listStack.length - 1].type !== 'ul') {
          closeLists(indent);
          openList('ul', indent);
        } else if (indent > listStack[listStack.length - 1].indent) {
          openList('ul', indent);
        } else if (indent < listStack[listStack.length - 1].indent) {
          closeLists(indent + 1);
        }
        out.push('<li>' + ulMatch[2] + '</li>');
      } else if (olMatch) {
        var oindent = olMatch[1].length;
        if (!listStack.length || listStack[listStack.length - 1].type !== 'ol') {
          closeLists(oindent);
          openList('ol', oindent);
        } else if (oindent > listStack[listStack.length - 1].indent) {
          openList('ol', oindent);
        } else if (oindent < listStack[listStack.length - 1].indent) {
          closeLists(oindent + 1);
        }
        out.push('<li>' + olMatch[2] + '</li>');
      } else {
        closeAllLists();
        out.push(line);
      }
    }
    closeAllLists();
    text = out.join('\n');

    // 13. Paragraphs
    var blocks = text.split(/\n{2,}/).map(function (block) {
      var trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|div|table|hr|thead|tbody|tr)/.test(trimmed)) return trimmed;
      return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
    });
    text = blocks.join('');

    // 14. Restore inline code (escaped)
    text = text.replace(/\u0000IC(\d+)\u0000/g, function (_, n) {
      return '<code>' + escapeHtml(inlineCodes[parseInt(n, 10)]) + '</code>';
    });

    // 15. Restore fenced code blocks (escaped, with optional language label)
    text = text.replace(/(?:<p>)?\u0000CB(\d+)\u0000(?:<\/p>)?/g, function (_, n) {
      var block = codeBlocks[parseInt(n, 10)];
      var langAttr = block.lang ? ' data-lang="' + escapeHtml(block.lang) + '"' : '';
      var langLabel = block.lang ? '<span class="cw-code-lang">' + escapeHtml(block.lang) + '</span>' : '';
      return '<div class="cw-pre-wrap">' + langLabel + '<pre' + langAttr + '><code>' + escapeHtml(block.code) + '</code></pre></div>';
    });

    return text;
  }

  // ───────────────────────────────────────────────
  // AVATAR HELPERS
  // ───────────────────────────────────────────────
  function avatarMarkup(extraClass) {
    extraClass = extraClass || '';
    if (CONFIG.avatarImage) {
      return '<div class="cw-avatar ' + extraClass + '"><img src="' + escapeHtml(CONFIG.avatarImage) + '" alt="" loading="lazy"/></div>';
    }
    return '<div class="cw-avatar ' + extraClass + '">' + escapeHtml(CONFIG.avatarLetter) + '</div>';
  }
  function msgAvatarInner() {
    if (CONFIG.avatarImage) {
      return '<img src="' + escapeHtml(CONFIG.avatarImage) + '" alt="" loading="lazy"/>';
    }
    return escapeHtml(CONFIG.avatarLetter);
  }

  // ───────────────────────────────────────────────
  // CHIPS HTML
  // ───────────────────────────────────────────────
  var chipsHtml = CHIPS.map(function (c) {
    var label = (c.emoji ? c.emoji + '\u2009' : '') + c.label;
    return '<button type="button" class="cw-chip" role="option" tabindex="0" data-chip="' + escapeHtml(c.label) + '">' + escapeHtml(label) + '</button>';
  }).join('');

  // ───────────────────────────────────────────────
  // POWERED-BY HTML
  // ───────────────────────────────────────────────
  var iconColor = CONFIG.userTextColor;
  var poweredHtml = CONFIG.poweredByUrl
    ? '<a href="' + escapeHtml(CONFIG.poweredByUrl) + '" target="_blank" rel="noopener">' + escapeHtml(CONFIG.poweredByText) + '</a>'
    : '<span>' + escapeHtml(CONFIG.poweredByText) + '</span>';

  // ───────────────────────────────────────────────
  // CSS
  // ───────────────────────────────────────────────
  var css = '\n' +
  /* Reset + box-sizing */
  '#cw-root,#cw-root *,#cw-greeting{box-sizing:border-box;}\n' +

  /* CSS Variables */
  '#cw-root{\n' +
  '  --cw-bg:' + CONFIG.bgColor + ';\n' +
  '  --cw-panel:' + CONFIG.panelColor + ';\n' +
  '  --cw-header:' + CONFIG.headerColor + ';\n' +
  '  --cw-border:' + CONFIG.borderColor + ';\n' +
  '  --cw-text:' + CONFIG.textColor + ';\n' +
  '  --cw-muted:' + CONFIG.mutedColor + ';\n' +
  '  --cw-accent:' + CONFIG.primaryColor + ';\n' +
  '  --cw-accent-dark:' + CONFIG.primaryColorDark + ';\n' +
  '  --cw-accent-dim:' + CONFIG.primaryColor + '1f;\n' +
  '  --cw-grad:linear-gradient(135deg,' + CONFIG.primaryColor + ',' + CONFIG.primaryColorDark + ');\n' +
  '  --cw-user-text:' + CONFIG.userTextColor + ';\n' +
  '  --cw-ai-bubble:' + CONFIG.aiBubbleColor + ';\n' +
  '  --cw-input-bg:' + CONFIG.inputBgColor + ';\n' +
  '  --cw-placeholder:' + THEME.placeholderColor + ';\n' +
  '  --cw-code-bg:' + THEME.codeBg + ';\n' +
  '  --cw-table-border:' + THEME.tableBorderColor + ';\n' +
  '  --cw-radius:' + CONFIG.panelRadius + ';\n' +
  '  --cw-bubble-r:' + CONFIG.bubbleRadius + ';\n' +
  '  --cw-shadow:0 24px 64px rgba(0,0,0,0.18),0 8px 24px rgba(0,0,0,0.10),0 2px 6px rgba(0,0,0,0.08);\n' +
  '  --cw-shadow-sm:0 4px 16px rgba(0,0,0,0.10),0 1px 4px rgba(0,0,0,0.06);\n' +
  '  --cw-font:' + CONFIG.fontFamily + ';\n' +
  '}\n' +

  /* ── Launcher ── */
  '#cw-launcher{\n' +
  '  width:' + LSIZE + 'px;height:' + LSIZE + 'px;\n' +
  '  border-radius:50%;\n' +
  '  background:var(--cw-grad);\n' +
  '  border:none;cursor:pointer;\n' +
  '  display:flex;align-items:center;justify-content:center;\n' +
  '  box-shadow:0 8px 28px ' + CONFIG.primaryColor + '55,var(--cw-shadow-sm);\n' +
  '  transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s ease,opacity 0.25s ease;\n' +
  '  position:fixed;\n' +
  '  bottom:calc(' + CONFIG.offsetY + 'px + env(safe-area-inset-bottom,0px));\n' +
  '  ' + SIDE + ':calc(' + CONFIG.offsetX + 'px + env(safe-area-inset-' + SIDE + ',0px));\n' +
  '  z-index:2147483000;\n' +
  '  font-family:var(--cw-font);\n' +
  '  -webkit-tap-highlight-color:transparent;\n' +
  '  touch-action:manipulation;\n' +
  '  padding:0;margin:0;\n' +
  '  will-change:transform;\n' +
  '}\n' +
  '#cw-launcher:hover{transform:scale(1.09);box-shadow:0 12px 36px ' + CONFIG.primaryColor + '77,var(--cw-shadow-sm);}\n' +
  '#cw-launcher:active{transform:scale(0.96);}\n' +
  '#cw-launcher:focus-visible{outline:3px solid ' + CONFIG.primaryColor + '66;outline-offset:3px;}\n' +
  '#cw-launcher svg{transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s ease;pointer-events:none;}\n' +
  '#cw-launcher .cw-chat-icon{opacity:1;transform:scale(1) rotate(0deg);}\n' +
  '#cw-launcher.open .cw-chat-icon{opacity:0;transform:scale(0.5) rotate(90deg);position:absolute;}\n' +
  '#cw-launcher .cw-close-icon{opacity:0;transform:scale(0.5) rotate(-90deg);position:absolute;}\n' +
  '#cw-launcher.open .cw-close-icon{opacity:1;transform:scale(1) rotate(0deg);}\n' +

  /* ── Badge ── */
  '#cw-badge{\n' +
  '  position:absolute;top:-3px;' + OTHER_SIDE + ':-3px;\n' +
  '  min-width:20px;height:20px;padding:0 5px;\n' +
  '  border-radius:10px;background:#ef4444;color:#fff;\n' +
  '  font-size:11px;font-weight:700;line-height:1;\n' +
  '  display:none;align-items:center;justify-content:center;\n' +
  '  box-shadow:0 2px 8px rgba(239,68,68,0.45);\n' +
  '  border:2px solid var(--cw-bg);\n' +
  '  animation:cw-pop 0.35s cubic-bezier(0.34,1.56,0.64,1);\n' +
  '  font-family:var(--cw-font);\n' +
  '}\n' +
  '@keyframes cw-pop{from{transform:scale(0) rotate(-15deg);}to{transform:scale(1) rotate(0deg);}}\n' +

  /* ── Greeting bubble ── */
  '#cw-greeting{\n' +
  '  position:fixed;\n' +
  '  bottom:calc(' + (CONFIG.offsetY + LSIZE + 14) + 'px + env(safe-area-inset-bottom,0px));\n' +
  '  ' + SIDE + ':calc(' + CONFIG.offsetX + 'px + env(safe-area-inset-' + SIDE + ',0px));\n' +
  '  max-width:260px;min-width:160px;\n' +
  '  background:var(--cw-bg);color:var(--cw-text);\n' +
  '  border:1px solid var(--cw-border);\n' +
  '  border-radius:16px;\n' +
  '  padding:13px 38px 13px 15px;\n' +
  '  font-family:var(--cw-font);\n' +
  '  font-size:13px;line-height:1.45;\n' +
  '  box-shadow:var(--cw-shadow);\n' +
  '  z-index:2147482999;\n' +
  '  opacity:0;transform:translateY(8px) scale(0.97);\n' +
  '  transition:opacity .3s ease,transform .3s cubic-bezier(0.34,1.56,0.64,1);\n' +
  '  pointer-events:none;\n' +
  '  cursor:pointer;\n' +
  '}\n' +
  '#cw-greeting.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}\n' +
  '#cw-greeting-close{\n' +
  '  position:absolute;top:7px;' + OTHER_SIDE + ':9px;\n' +
  '  background:none;border:none;cursor:pointer;\n' +
  '  color:var(--cw-muted);font-size:16px;line-height:1;padding:3px;\n' +
  '  border-radius:4px;display:flex;align-items:center;justify-content:center;\n' +
  '  transition:color 0.2s;\n' +
  '}\n' +
  '#cw-greeting-close:hover{color:var(--cw-text);}\n' +

  /* ── Widget panel ── */
  '#cw-widget{\n' +
  '  position:fixed;\n' +
  '  bottom:calc(' + (CONFIG.offsetY + LSIZE + 14) + 'px + env(safe-area-inset-bottom,0px));\n' +
  '  ' + SIDE + ':calc(' + CONFIG.offsetX + 'px + env(safe-area-inset-' + SIDE + ',0px));\n' +
  '  width:min(400px,calc(100vw - 24px));\n' +
  '  height:min(640px,calc(100vh - 120px));\n' +
  '  max-height:calc(100vh - 20px);\n' +
  '  background:var(--cw-bg);\n' +
  '  border-radius:var(--cw-radius);\n' +
  '  border:1px solid var(--cw-border);\n' +
  '  box-shadow:var(--cw-shadow);\n' +
  '  display:flex;flex-direction:column;\n' +
  '  overflow:hidden;\n' +
  '  transform:scale(0.88) translateY(32px);\n' +
  '  transform-origin:bottom ' + SIDE + ';\n' +
  '  opacity:0;\n' +
  '  pointer-events:none;\n' +
  '  transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;\n' +
  '  z-index:2147483000;\n' +
  '  font-family:var(--cw-font);\n' +
  '  color:var(--cw-text);\n' +
  '  -webkit-tap-highlight-color:transparent;\n' +
  '  will-change:transform,opacity;\n' +
  '}\n' +
  '#cw-widget.open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto;}\n' +

  /* ── Mobile: full-screen sheet ── */
  '@media(max-width:560px){\n' +
  '  #cw-widget{\n' +
  '    inset:auto 0 0 0;\n' +
  '    width:100%;max-width:100%;\n' +
  '    height:var(--cw-vh,100dvh);\n' +
  '    max-height:var(--cw-vh,100dvh);\n' +
  '    border-radius:20px 20px 0 0;\n' +
  '    border-left:none;border-right:none;border-bottom:none;\n' +
  '    transform-origin:bottom center;\n' +
  '    transform:translateY(100%);\n' +
  '  }\n' +
  '  #cw-widget.open{transform:translateY(0);}\n' +
  '  .cw-header{padding-top:calc(16px + env(safe-area-inset-top,0px));}\n' +
  '  .cw-input-bar{padding-bottom:calc(14px + env(safe-area-inset-bottom,0px));}\n' +
  '  #cw-launcher{bottom:calc(16px + env(safe-area-inset-bottom,0px));' + SIDE + ':calc(16px + env(safe-area-inset-' + SIDE + ',0px));}\n' +
  '  #cw-launcher.open{opacity:0;pointer-events:none;transform:scale(0.5);}\n' +
  '  #cw-greeting{' + OTHER_SIDE + ':16px;' + SIDE + ':auto;max-width:calc(100vw - 32px);}\n' +
  '  .cw-bubble{font-size:15px;}\n' +
  '  .cw-textarea{font-size:16px !important;}\n' +
  '  .cw-chip{padding:9px 16px;font-size:13px;}\n' +
  '  .cw-icon-btn{width:36px;height:36px;}\n' +
  '  .cw-send-btn{width:40px;height:40px;border-radius:12px;}\n' +
  '}\n' +

  /* ── Reduced motion ── */
  '@media(prefers-reduced-motion:reduce){\n' +
  '  #cw-launcher,#cw-widget,#cw-launcher svg,.cw-msg-row,#cw-greeting,.cw-chip,\n' +
  '  .cw-typing-bubble,.cw-dot,.cw-status-dot{transition:none !important;animation:none !important;}\n' +
  '}\n' +

  /* ── RTL ── */
  '#cw-widget[dir="rtl"] .cw-header{padding:16px 20px 16px 16px;}\n' +
  '#cw-widget[dir="rtl"] .cw-input-wrap{padding:9px 16px 9px 9px;}\n' +
  '#cw-widget[dir="rtl"] .cw-bubble.ai{border-bottom-left-radius:var(--cw-bubble-r);border-bottom-right-radius:4px;}\n' +
  '#cw-widget[dir="rtl"] .cw-bubble.user{border-bottom-right-radius:var(--cw-bubble-r);border-bottom-left-radius:4px;}\n' +
  '#cw-widget[dir="rtl"] .cw-bubble-time{text-align:left;}\n' +
  '#cw-widget[dir="rtl"] .cw-msg-row.ai .cw-bubble-time{text-align:right;}\n' +
  '#cw-widget[dir="rtl"] .cw-bubble.ai ul,#cw-widget[dir="rtl"] .cw-bubble.ai ol{padding-right:20px;padding-left:0;}\n' +
  '#cw-widget[dir="rtl"] .cw-bubble.ai blockquote{border-right:3px solid ' + CONFIG.primaryColor + '66;border-left:none;padding:4px 12px 4px 0;}\n' +
  '#cw-widget[dir="rtl"] .cw-send-icon{transform:scaleX(-1);}\n' +
  '#cw-widget[dir="rtl"] .cw-msg-row.user{flex-direction:row;}\n' +
  '#cw-widget[dir="rtl"] .cw-msg-row.ai{flex-direction:row-reverse;}\n' +

  /* Per-message auto-direction */
  '.cw-bubble{unicode-bidi:isolate;}\n' +

  /* ── Header ── */
  '.cw-header{\n' +
  '  padding:16px 16px 16px 20px;\n' +
  '  background:var(--cw-header);\n' +
  '  border-bottom:1px solid var(--cw-border);\n' +
  '  display:flex;align-items:center;gap:12px;\n' +
  '  flex-shrink:0;\n' +
  '  position:relative;overflow:hidden;\n' +
  '}\n' +
  '.cw-header::before{\n' +
  '  content:"";position:absolute;inset:0;\n' +
  '  background:radial-gradient(ellipse at 0% 0%,' + CONFIG.primaryColor + '12 0%,transparent 65%);\n' +
  '  pointer-events:none;\n' +
  '}\n' +
  '.cw-avatar{\n' +
  '  width:44px;height:44px;border-radius:50%;\n' +
  '  background:var(--cw-grad);\n' +
  '  display:flex;align-items:center;justify-content:center;\n' +
  '  flex-shrink:0;\n' +
  '  font-size:18px;font-weight:600;\n' +
  '  color:' + CONFIG.userTextColor + ';\n' +
  '  letter-spacing:0.5px;overflow:hidden;\n' +
  '  position:relative;z-index:1;\n' +
  '  box-shadow:0 2px 8px ' + CONFIG.primaryColor + '44;\n' +
  '}\n' +
  '.cw-avatar img{width:100%;height:100%;object-fit:cover;}\n' +
  '.cw-header-info{flex:1;min-width:0;position:relative;z-index:1;}\n' +
  '.cw-header-name{\n' +
  '  font-size:15.5px;font-weight:650;\n' +
  '  color:var(--cw-text);\n' +
  '  letter-spacing:0.1px;line-height:1.25;\n' +
  '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\n' +
  '}\n' +
  '.cw-header-status{display:flex;align-items:center;gap:6px;margin-top:3px;}\n' +
  '.cw-status-dot{\n' +
  '  width:7px;height:7px;border-radius:50%;\n' +
  '  background:#22c55e;\n' +
  '  box-shadow:0 0 0 0 rgba(34,197,94,0.5);\n' +
  '  animation:cw-pulse-dot 2.5s infinite;\n' +
  '  flex-shrink:0;\n' +
  '}\n' +
  '@keyframes cw-pulse-dot{\n' +
  '  0%{box-shadow:0 0 0 0 rgba(34,197,94,0.5);}\n' +
  '  60%{box-shadow:0 0 0 5px rgba(34,197,94,0);}\n' +
  '  100%{box-shadow:0 0 0 0 rgba(34,197,94,0);}\n' +
  '}\n' +
  '.cw-status-text{\n' +
  '  font-size:11.5px;color:var(--cw-muted);\n' +
  '  font-weight:400;letter-spacing:0.2px;\n' +
  '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\n' +
  '}\n' +
  '.cw-header-actions{display:flex;align-items:center;gap:3px;position:relative;z-index:1;}\n' +
  '.cw-icon-btn{\n' +
  '  width:32px;height:32px;\n' +
  '  border-radius:9px;\n' +
  '  background:transparent;border:none;cursor:pointer;\n' +
  '  display:flex;align-items:center;justify-content:center;\n' +
  '  color:var(--cw-muted);\n' +
  '  transition:background 0.18s ease,color 0.18s ease;\n' +
  '  -webkit-tap-highlight-color:transparent;\n' +
  '}\n' +
  '.cw-icon-btn:hover{background:var(--cw-accent-dim);color:var(--cw-accent);}\n' +
  '.cw-icon-btn:active{transform:scale(0.94);}\n' +
  '.cw-icon-btn:focus-visible{outline:2px solid ' + CONFIG.primaryColor + '66;outline-offset:1px;}\n' +
  '.cw-header-badge{\n' +
  '  font-size:10px;color:var(--cw-accent);\n' +
  '  letter-spacing:1.2px;text-transform:uppercase;\n' +
  '  border:1px solid ' + CONFIG.primaryColor + '44;\n' +
  '  padding:3px 8px;border-radius:20px;\n' +
  '  background:var(--cw-accent-dim);\n' +
  '  flex-shrink:0;font-weight:600;\n' +
  '}\n' +

  /* ── Messages area ── */
  '.cw-messages{\n' +
  '  flex:1;\n' +
  '  overflow-y:auto;\n' +
  '  overflow-x:hidden;\n' +
  '  padding:20px 16px 12px;\n' +
  '  display:flex;flex-direction:column;gap:4px;\n' +
  '  -webkit-overflow-scrolling:touch;\n' +
  '  overscroll-behavior:contain;\n' +
  '  scroll-behavior:smooth;\n' +
  '}\n' +
  '.cw-messages::-webkit-scrollbar{width:4px;}\n' +
  '.cw-messages::-webkit-scrollbar-track{background:transparent;}\n' +
  '.cw-messages::-webkit-scrollbar-thumb{background:var(--cw-border);border-radius:4px;}\n' +
  '.cw-messages::-webkit-scrollbar-thumb:hover{background:var(--cw-muted);}\n' +

  /* ── Welcome card ── */
  '.cw-welcome-card{\n' +
  '  background:linear-gradient(145deg,' + CONFIG.primaryColor + '12,' + CONFIG.primaryColor + '06);\n' +
  '  border:1px solid ' + CONFIG.primaryColor + '2a;\n' +
  '  border-radius:16px;\n' +
  '  padding:20px 18px;\n' +
  '  text-align:center;\n' +
  '  margin-bottom:8px;\n' +
  '}\n' +
  '.cw-wc-icon{\n' +
  '  width:48px;height:48px;border-radius:50%;\n' +
  '  background:var(--cw-grad);\n' +
  '  display:flex;align-items:center;justify-content:center;\n' +
  '  margin:0 auto 12px;\n' +
  '  font-size:20px;font-weight:600;\n' +
  '  color:' + CONFIG.userTextColor + ';\n' +
  '  box-shadow:0 4px 12px ' + CONFIG.primaryColor + '44;\n' +
  '  overflow:hidden;\n' +
  '}\n' +
  '.cw-wc-icon img{width:100%;height:100%;object-fit:cover;}\n' +
  '.cw-wc-title{\n' +
  '  font-size:17px;font-weight:700;\n' +
  '  color:var(--cw-text);\n' +
  '  margin-bottom:6px;line-height:1.3;\n' +
  '}\n' +
  '.cw-wc-sub{font-size:12.5px;color:var(--cw-muted);line-height:1.55;}\n' +

  /* ── Suggestion chips ── */
  '.cw-suggestions{\n' +
  '  display:flex;flex-wrap:wrap;gap:7px;\n' +
  '  margin-top:4px;margin-bottom:4px;\n' +
  '  padding:2px 0;\n' +
  '}\n' +
  '.cw-chip{\n' +
  '  background:var(--cw-panel);\n' +
  '  border:1px solid var(--cw-border);\n' +
  '  border-radius:20px;\n' +
  '  padding:7px 14px;\n' +
  '  font-size:12.5px;color:var(--cw-text);\n' +
  '  cursor:pointer;\n' +
  '  transition:background 0.18s ease,border-color 0.18s ease,color 0.18s ease,transform 0.18s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.18s ease;\n' +
  '  white-space:nowrap;\n' +
  '  font-family:var(--cw-font);\n' +
  '  font-weight:450;\n' +
  '  -webkit-tap-highlight-color:transparent;\n' +
  '}\n' +
  '.cw-chip:hover{\n' +
  '  background:var(--cw-accent-dim);\n' +
  '  border-color:' + CONFIG.primaryColor + '55;\n' +
  '  color:var(--cw-accent);\n' +
  '  transform:translateY(-2px);\n' +
  '  box-shadow:0 4px 12px ' + CONFIG.primaryColor + '22;\n' +
  '}\n' +
  '.cw-chip:active{transform:translateY(0) scale(0.97);}\n' +
  '.cw-chip:focus-visible{outline:2px solid ' + CONFIG.primaryColor + '66;outline-offset:2px;}\n' +

  /* ── Message rows ── */
  '.cw-msg-row{\n' +
  '  display:flex;\n' +
  '  align-items:flex-end;\n' +
  '  gap:8px;\n' +
  '  min-width:0;\n' +
  '  width:100%;\n' +
  '  animation:cw-fadeUp 0.28s ease both;\n' +
  '  margin-bottom:2px;\n' +
  '}\n' +
  '.cw-msg-row + .cw-msg-row{margin-top:2px;}\n' +
  '.cw-msg-row.user{flex-direction:row-reverse;}\n' +

  '@keyframes cw-fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}\n' +

  '.cw-msg-avatar{\n' +
  '  width:28px;height:28px;min-width:28px;\n' +
  '  border-radius:50%;\n' +
  '  background:var(--cw-grad);\n' +
  '  display:flex;align-items:center;justify-content:center;\n' +
  '  font-size:11px;color:' + CONFIG.userTextColor + ';font-weight:600;\n' +
  '  flex-shrink:0;\n' +
  '  overflow:hidden;\n' +
  '  align-self:flex-end;\n' +
  '}\n' +
  '.cw-msg-avatar img{width:100%;height:100%;object-fit:cover;}\n' +
  '.cw-msg-avatar.user-av{\n' +
  '  background:var(--cw-panel);\n' +
  '  border:1.5px solid var(--cw-border);\n' +
  '  color:var(--cw-muted);\n' +
  '  font-size:14px;\n' +
  '}\n' +

  /* Wrapper div that sits between row and bubble */
  '.cw-msg-wrap{\n' +
  '  display:flex;\n' +
  '  flex-direction:column;\n' +
  '  min-width:0;\n' +
  '  max-width:calc(100% - 44px);\n' +
  '  width:auto;\n' +
  '}\n' +
  '.cw-msg-row.user .cw-msg-wrap{align-items:flex-end;}\n' +
  '.cw-msg-row.ai .cw-msg-wrap{align-items:flex-start;}\n' +

  /* ── Bubbles ── */
  '.cw-bubble{\n' +
  '  max-width:100%;\n' +
  '  padding:10px 14px;\n' +
  '  border-radius:var(--cw-bubble-r);\n' +
  '  font-size:13.5px;\n' +
  '  line-height:1.65;\n' +
  '  position:relative;\n' +
  '  overflow-wrap:break-word;\n' +
  '  word-break:break-word;\n' +
  '  unicode-bidi:isolate;\n' +
  '}\n' +

  '.cw-bubble.ai{\n' +
  '  background:var(--cw-ai-bubble);\n' +
  '  color:var(--cw-text);\n' +
  '  border:1px solid var(--cw-border);\n' +
  '  border-bottom-left-radius:4px;\n' +
  '  width:auto;\n' +
  '}\n' +

  '.cw-bubble.user{\n' +
  '  background:var(--cw-grad);\n' +
  '  color:var(--cw-user-text);\n' +
  '  font-weight:500;\n' +
  '  border-bottom-right-radius:4px;\n' +
  '  width:-webkit-fit-content;\n' +
  '  width:fit-content;\n' +
  '  white-space:pre-wrap;\n' +
  '  word-spacing:normal;\n' +
  '  letter-spacing:normal;\n' +
  '}\n' +

  /* ── Markdown content inside AI bubbles ── */
  '.cw-bubble.ai p{margin:0 0 8px;}\n' +
  '.cw-bubble.ai p:last-child{margin-bottom:0;}\n' +
  '.cw-bubble.ai ul,.cw-bubble.ai ol{margin:6px 0;padding-left:22px;}\n' +
  '.cw-bubble.ai li{margin:4px 0;}\n' +
  '.cw-bubble.ai a{\n' +
  '  color:var(--cw-accent);\n' +
  '  text-decoration:underline;\n' +
  '  text-decoration-thickness:1px;\n' +
  '  text-underline-offset:3px;\n' +
  '  word-break:break-all;\n' +
  '}\n' +
  '.cw-bubble.ai a:hover{opacity:0.8;}\n' +
  '.cw-bubble.ai code{\n' +
  '  background:var(--cw-code-bg);\n' +
  '  padding:2px 6px;border-radius:5px;\n' +
  '  font-family:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;\n' +
  '  font-size:12px;letter-spacing:0;\n' +
  '  border:1px solid var(--cw-border);\n' +
  '}\n' +
  '.cw-pre-wrap{position:relative;margin:8px 0;}\n' +
  '.cw-code-lang{\n' +
  '  display:block;\n' +
  '  font-size:10px;font-weight:600;\n' +
  '  letter-spacing:0.8px;text-transform:uppercase;\n' +
  '  color:var(--cw-muted);\n' +
  '  padding:6px 12px 0;\n' +
  '  background:var(--cw-code-bg);\n' +
  '  border:1px solid var(--cw-border);\n' +
  '  border-bottom:none;\n' +
  '  border-radius:9px 9px 0 0;\n' +
  '  font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;\n' +
  '}\n' +
  '.cw-pre-wrap pre{\n' +
  '  background:var(--cw-code-bg);\n' +
  '  border:1px solid var(--cw-border);\n' +
  '  border-radius:0 0 9px 9px;\n' +
  '  padding:10px 12px;margin:0;\n' +
  '  overflow-x:auto;\n' +
  '  -webkit-overflow-scrolling:touch;\n' +
  '}\n' +
  '.cw-pre-wrap:not(:has(.cw-code-lang)) pre{border-radius:9px;}\n' +
  '.cw-pre-wrap pre code{\n' +
  '  background:none;padding:0;font-size:12px;\n' +
  '  border:none;white-space:pre;\n' +
  '  font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;\n' +
  '  display:block;\n' +
  '  overflow-x:auto;\n' +
  '}\n' +

  /* ── Tables ── */
  '.cw-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:8px 0;border-radius:8px;border:1px solid var(--cw-table-border);}\n' +
  '.cw-table{width:100%;border-collapse:collapse;font-size:12px;}\n' +
  '.cw-table th,.cw-table td{padding:7px 12px;text-align:left;border-bottom:1px solid var(--cw-table-border);white-space:nowrap;}\n' +
  '.cw-table th{font-weight:650;color:var(--cw-accent);background:' + CONFIG.primaryColor + '0d;}\n' +
  '.cw-table tr:last-child td{border-bottom:none;}\n' +
  '.cw-table tr:hover td{background:var(--cw-accent-dim);}\n' +

  /* ── Other markdown elements ── */
  '.cw-bubble.ai strong{font-weight:700;}\n' +
  '.cw-bubble.ai em{font-style:italic;}\n' +
  '.cw-bubble.ai del{text-decoration:line-through;opacity:0.7;}\n' +
  '.cw-bubble.ai h1,.cw-bubble.ai h2{font-size:14.5px;font-weight:700;margin:10px 0 5px;}\n' +
  '.cw-bubble.ai h3,.cw-bubble.ai h4,.cw-bubble.ai h5,.cw-bubble.ai h6{font-size:13.5px;font-weight:700;margin:8px 0 4px;}\n' +
  '.cw-bubble.ai blockquote{\n' +
  '  border-left:3px solid ' + CONFIG.primaryColor + '66;\n' +
  '  margin:8px 0;padding:4px 0 4px 12px;\n' +
  '  color:var(--cw-muted);\n' +
  '  font-style:italic;\n' +
  '}\n' +
  '.cw-hr{border:none;border-top:1px solid var(--cw-border);margin:10px 0;}\n' +

  /* ── Timestamp ── */
  '.cw-bubble-time{\n' +
  '  font-size:10px;color:var(--cw-muted);\n' +
  '  margin-top:4px;line-height:1;\n' +
  '  padding:0 2px;\n' +
  '  opacity:0.75;\n' +
  '}\n' +
  '.cw-msg-row.user .cw-bubble-time{text-align:right;}\n' +
  '.cw-msg-row.ai .cw-bubble-time{text-align:left;}\n' +

  /* ── Typing indicator ── */
  '.cw-typing-row{display:flex;align-items:flex-end;gap:8px;margin-bottom:2px;animation:cw-fadeUp 0.28s ease both;}\n' +
  '.cw-typing-bubble{\n' +
  '  background:var(--cw-ai-bubble);\n' +
  '  border:1px solid var(--cw-border);\n' +
  '  border-radius:var(--cw-bubble-r);border-bottom-left-radius:4px;\n' +
  '  padding:13px 16px;\n' +
  '  display:flex;gap:5px;align-items:center;\n' +
  '}\n' +
  '.cw-dot{\n' +
  '  width:7px;height:7px;border-radius:50%;\n' +
  '  background:var(--cw-accent);\n' +
  '  opacity:0.35;\n' +
  '  animation:cw-typing 1.4s infinite ease-in-out;\n' +
  '}\n' +
  '.cw-dot:nth-child(1){animation-delay:0s;}\n' +
  '.cw-dot:nth-child(2){animation-delay:0.18s;}\n' +
  '.cw-dot:nth-child(3){animation-delay:0.36s;}\n' +
  '@keyframes cw-typing{\n' +
  '  0%,60%,100%{opacity:0.35;transform:translateY(0) scale(1);}\n' +
  '  30%{opacity:1;transform:translateY(-4px) scale(1.15);}\n' +
  '}\n' +

  /* ── Date divider ── */
  '.cw-msg-divider{\n' +
  '  text-align:center;font-size:10.5px;\n' +
  '  color:var(--cw-muted);letter-spacing:0.6px;\n' +
  '  text-transform:uppercase;position:relative;\n' +
  '  margin:8px 0;flex-shrink:0;\n' +
  '}\n' +
  '.cw-msg-divider::before,.cw-msg-divider::after{\n' +
  '  content:"";position:absolute;top:50%;width:calc(50% - 36px);\n' +
  '  height:1px;background:var(--cw-border);\n' +
  '}\n' +
  '.cw-msg-divider::before{left:0;}\n' +
  '.cw-msg-divider::after{right:0;}\n' +

  /* ── Input bar ── */
  '.cw-input-bar{\n' +
  '  padding:12px 14px;\n' +
  '  background:var(--cw-header);\n' +
  '  border-top:1px solid var(--cw-border);\n' +
  '  flex-shrink:0;\n' +
  '}\n' +
  '.cw-input-wrap{\n' +
  '  display:flex;align-items:flex-end;gap:10px;\n' +
  '  background:var(--cw-input-bg);\n' +
  '  border:1.5px solid var(--cw-border);\n' +
  '  border-radius:14px;\n' +
  '  padding:8px 8px 8px 14px;\n' +
  '  transition:border-color 0.2s ease,box-shadow 0.2s ease;\n' +
  '}\n' +
  '.cw-input-wrap:focus-within{\n' +
  '  border-color:' + CONFIG.primaryColor + '88;\n' +
  '  box-shadow:0 0 0 3px ' + CONFIG.primaryColor + '18;\n' +
  '}\n' +
  '.cw-textarea{\n' +
  '  flex:1;\n' +
  '  min-width:0;\n' +
  '  background:transparent;\n' +
  '  border:none;outline:none;\n' +
  '  font-family:var(--cw-font);\n' +
  '  font-size:14px;\n' +
  '  color:var(--cw-text);\n' +
  '  resize:none;\n' +
  '  min-height:22px;\n' +
  '  max-height:120px;\n' +
  '  line-height:1.5;\n' +
  '  padding:0;margin:0;\n' +
  '  display:block;\n' +
  '  width:100%;\n' +
  '  overflow-wrap:break-word;\n' +
  '  overflow-y:auto;\n' +
  '}\n' +
  '.cw-textarea::placeholder{color:var(--cw-placeholder);opacity:1;}\n' +
  '.cw-textarea::-webkit-scrollbar{width:3px;}\n' +
  '.cw-textarea::-webkit-scrollbar-thumb{background:var(--cw-border);border-radius:2px;}\n' +

  /* ── Send button ── */
  '.cw-send-btn{\n' +
  '  width:36px;height:36px;min-width:36px;\n' +
  '  border-radius:10px;\n' +
  '  background:var(--cw-grad);\n' +
  '  border:none;cursor:pointer;\n' +
  '  display:flex;align-items:center;justify-content:center;\n' +
  '  transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s ease,box-shadow 0.2s ease;\n' +
  '  flex-shrink:0;\n' +
  '  -webkit-tap-highlight-color:transparent;\n' +
  '}\n' +
  '.cw-send-btn:hover{transform:scale(1.08);box-shadow:0 4px 12px ' + CONFIG.primaryColor + '55;}\n' +
  '.cw-send-btn:active{transform:scale(0.94);}\n' +
  '.cw-send-btn:disabled{opacity:0.38;cursor:not-allowed;transform:none;box-shadow:none;}\n' +
  '.cw-send-btn:focus-visible{outline:2px solid ' + CONFIG.primaryColor + '88;outline-offset:2px;}\n' +

  /* ── Footer ── */
  '.cw-input-footer{\n' +
  '  text-align:center;font-size:10px;\n' +
  '  color:var(--cw-muted);opacity:0.55;\n' +
  '  margin-top:9px;letter-spacing:0.2px;\n' +
  '}\n' +
  '.cw-input-footer a,.cw-input-footer span{color:var(--cw-accent);opacity:0.85;text-decoration:none;}\n' +
  '.cw-input-footer a:hover{text-decoration:underline;opacity:1;}\n' +

  /* ── Error bubble ── */
  '.cw-error-bubble{border-color:rgba(239,68,68,0.3) !important;}\n' +
  '.cw-error-text{color:#e05252;font-size:12.5px;display:block;line-height:1.5;}\n' +
  '.cw-retry-btn{\n' +
  '  display:inline-flex;align-items:center;gap:5px;margin-top:9px;\n' +
  '  background:var(--cw-accent-dim);\n' +
  '  border:1px solid ' + CONFIG.primaryColor + '44;\n' +
  '  color:var(--cw-accent);\n' +
  '  font-family:var(--cw-font);font-size:11.5px;font-weight:500;\n' +
  '  padding:5px 13px;border-radius:20px;cursor:pointer;\n' +
  '  transition:background 0.18s ease;\n' +
  '  -webkit-tap-highlight-color:transparent;\n' +
  '}\n' +
  '.cw-retry-btn:hover{background:' + CONFIG.primaryColor + '2e;}\n' +
  '.cw-retry-btn:active{transform:scale(0.97);}\n' +

  /* ── Empty state ── */
  '.cw-empty-state{\n' +
  '  display:flex;flex-direction:column;align-items:center;justify-content:center;\n' +
  '  flex:1;gap:10px;padding:32px 20px;\n' +
  '  color:var(--cw-muted);text-align:center;\n' +
  '}\n' +
  '.cw-empty-icon{font-size:36px;opacity:0.4;}\n' +
  '.cw-empty-text{font-size:13px;opacity:0.6;}\n' +

  /* ── Accessibility ── */
  '.cw-sr-only{\n' +
  '  position:absolute;width:1px;height:1px;padding:0;margin:-1px;\n' +
  '  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;\n' +
  '}\n';

  // ───────────────────────────────────────────────
  // HTML TEMPLATE
  // ───────────────────────────────────────────────
  var rootHtml =
  '<button id="cw-launcher"' +
  '  aria-label="' + escapeHtml(CONFIG.textOpenAria) + '"' +
  '  aria-expanded="false"' +
  '  aria-controls="cw-widget">' +
  '  <svg class="cw-chat-icon" width="22" height="22" fill="none" stroke="' + iconColor + '"' +
  '    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">' +
  '    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
  '  </svg>' +
  '  <svg class="cw-close-icon" width="20" height="20" fill="none" stroke="' + iconColor + '"' +
  '    stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24" aria-hidden="true">' +
  '    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
  '  </svg>' +
  '  <span id="cw-badge" aria-hidden="true">1</span>' +
  '</button>' +

  '<div id="cw-greeting" role="status" aria-live="polite">' +
  '  <button id="cw-greeting-close" aria-label="' + escapeHtml(CONFIG.textClose) + '">&#x2715;</button>' +
  '  ' + escapeHtml(CONFIG.greetingBubbleText) +
  '</div>' +

  '<div id="cw-widget"' +
  '  role="dialog"' +
  '  lang="' + escapeHtml(CONFIG.lang) + '"' +
  '  dir="' + CONFIG.dir + '"' +
  '  aria-label="' + escapeHtml(CONFIG.businessName) + ' chat"' +
  '  aria-modal="true">' +

  '  <div class="cw-header" role="banner">' +
  '    ' + avatarMarkup() +
  '    <div class="cw-header-info">' +
  '      <div class="cw-header-name">' + escapeHtml(CONFIG.businessName) + '</div>' +
  '      <div class="cw-header-status">' +
  '        <div class="cw-status-dot" aria-hidden="true"></div>' +
  '        <span class="cw-status-text">' + escapeHtml(CONFIG.statusText) + '</span>' +
  '      </div>' +
  '    </div>' +
  '    <div class="cw-header-actions">' +
  '      <button class="cw-icon-btn" id="cw-clear-btn"' +
  '        title="' + escapeHtml(CONFIG.textNewChat) + '"' +
  '        aria-label="' + escapeHtml(CONFIG.textNewChat) + '">' +
  '        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"' +
  '          stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">' +
  '          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>' +
  '          <path d="M3 3v5h5"/>' +
  '        </svg>' +
  '      </button>' +
  (CONFIG.headerBadge ? '<div class="cw-header-badge">' + escapeHtml(CONFIG.headerBadge) + '</div>' : '') +
  '      <button class="cw-icon-btn" id="cw-close-btn"' +
  '        title="' + escapeHtml(CONFIG.textClose) + '"' +
  '        aria-label="' + escapeHtml(CONFIG.textClose) + '">' +
  '        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"' +
  '          stroke-linecap="round" viewBox="0 0 24 24" aria-hidden="true">' +
  '          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
  '        </svg>' +
  '      </button>' +
  '    </div>' +
  '  </div>' +

  '  <div class="cw-messages" id="cw-messages"' +
  '    role="log"' +
  '    aria-live="polite"' +
  '    aria-atomic="false"' +
  '    aria-label="Conversation">' +
  '  </div>' +

  '  <div class="cw-input-bar" role="form">' +
  '    <div class="cw-input-wrap">' +
  '      <label for="cw-input" class="cw-sr-only">' + escapeHtml(CONFIG.placeholder) + '</label>' +
  '      <textarea' +
  '        class="cw-textarea"' +
  '        id="cw-input"' +
  '        placeholder="' + escapeHtml(CONFIG.placeholder) + '"' +
  '        rows="1"' +
  '        aria-label="' + escapeHtml(CONFIG.placeholder) + '"' +
  '        enterkeyhint="send"' +
  '        autocapitalize="sentences"' +
  '        autocomplete="off"' +
  '        autocorrect="on"' +
  '        spellcheck="true">' +
  '      </textarea>' +
  '      <button class="cw-send-btn" id="cw-send-btn"' +
  '        title="' + escapeHtml(CONFIG.textSend) + '"' +
  '        aria-label="' + escapeHtml(CONFIG.textSend) + '">' +
  '        <svg class="cw-send-icon" width="15" height="15" fill="none" stroke="' + iconColor + '"' +
  '          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"' +
  '          viewBox="0 0 24 24" aria-hidden="true">' +
  '          <line x1="22" y1="2" x2="11" y2="13"/>' +
  '          <polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
  '        </svg>' +
  '      </button>' +
  '    </div>' +
  (CONFIG.showPoweredBy
    ? '<div class="cw-input-footer" aria-hidden="true">' + escapeHtml(CONFIG.textPoweredBy) + ' ' + poweredHtml + '</div>'
    : '') +
  '  </div>' +

  '</div>';

  // ───────────────────────────────────────────────
  // BOOTSTRAP
  // ───────────────────────────────────────────────
  function boot() {
    // Inject styles
    var styleTag = document.createElement('style');
    styleTag.id = 'cw-styles';
    styleTag.textContent = css;
    document.head.appendChild(styleTag);

    // Inject DOM
    var root = document.createElement('div');
    root.id = 'cw-root';
    root.setAttribute('dir', CONFIG.dir);
    root.setAttribute('lang', CONFIG.lang);
    root.innerHTML = rootHtml;
    document.body.appendChild(root);

    // Viewport height tracking (follows on-screen keyboard)
    var _raf = null;
    function syncViewportHeight() {
      if (_raf) return;
      _raf = requestAnimationFrame(function () {
        _raf = null;
        var vp = window.visualViewport;
        var h = vp ? vp.height : window.innerHeight;
        root.style.setProperty('--cw-vh', h + 'px');
      });
    }
    syncViewportHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewportHeight);
      window.visualViewport.addEventListener('scroll', syncViewportHeight);
    }
    window.addEventListener('resize', syncViewportHeight, { passive: true });
    window.addEventListener('orientationchange', function () {
      setTimeout(syncViewportHeight, 200);
    });

    init(root, syncViewportHeight);
  }

  if (document.body) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    var _tries = 0;
    var _t = setInterval(function () {
      if (document.body) { clearInterval(_t); boot(); }
      else if (++_tries > 50) { clearInterval(_t); console.error('[RealEstateWidget] document.body never became available.'); }
    }, 50);
  }

  // ───────────────────────────────────────────────
  // RUNTIME LOGIC
  // ───────────────────────────────────────────────
  function init(root, syncViewportHeight) {
    var isOpen = false;
    var isLoading = false;
    var history = [];
    var unread = 0;
    var greetingTimer = null;

    // Cached DOM references
    var launcher    = root.querySelector('#cw-launcher');
    var widget      = root.querySelector('#cw-widget');
    var messages    = root.querySelector('#cw-messages');
    var input       = root.querySelector('#cw-input');
    var sendBtn     = root.querySelector('#cw-send-btn');
    var closeBtn    = root.querySelector('#cw-close-btn');
    var clearBtn    = root.querySelector('#cw-clear-btn');
    var badge       = root.querySelector('#cw-badge');
    var greeting    = root.querySelector('#cw-greeting');
    var greetClose  = root.querySelector('#cw-greeting-close');

    var isMobile = function () { return window.matchMedia('(max-width:560px)').matches; };

    // ── Time helpers ──
    function now() {
      try { return new Date().toLocaleTimeString(CONFIG.lang, { hour: '2-digit', minute: '2-digit' }); }
      catch (e) { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    }
    function todayLabel() {
      if (CONFIG.textToday) return CONFIG.textToday;
      try {
        if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
          return new Intl.RelativeTimeFormat(CONFIG.lang, { numeric: 'auto' }).format(0, 'day');
        }
      } catch (e) {}
      return 'Today';
    }

    // ── Audio ──
    var audioCtx = null;
    function playBeep() {
      if (!CONFIG.sound) return;
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'sine'; o.frequency.value = 700;
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);
        o.start(); o.stop(audioCtx.currentTime + 0.23);
      } catch (e) {}
    }

    // ── Persistence ──
    function saveHistory() {
      if (!CONFIG.persistChat) return;
      try {
        storeSet(NS + 'history', JSON.stringify(history.slice(-CONFIG.maxStored)));
      } catch (e) {}
    }
    function loadHistory() {
      if (!CONFIG.persistChat) return [];
      var raw = storeGet(NS + 'history');
      if (!raw) return [];
      try { var arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; }
      catch (e) { return []; }
    }

    // ── Scroll to bottom (debounced, uses rAF for no layout thrash) ──
    var _scrollRaf = null;
    function scrollToBottom(instant) {
      if (_scrollRaf) cancelAnimationFrame(_scrollRaf);
      _scrollRaf = requestAnimationFrame(function () {
        _scrollRaf = null;
        if (instant) {
          messages.scrollTop = messages.scrollHeight;
        } else {
          messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
        }
      });
    }

    // ── Welcome card ──
    function renderWelcome() {
      var card = document.createElement('div');
      card.className = 'cw-welcome-card';
      var iconDiv;
      if (CONFIG.avatarImage) {
        iconDiv = '<div class="cw-wc-icon"><img src="' + escapeHtml(CONFIG.avatarImage) + '" alt="" loading="lazy"/></div>';
      } else {
        iconDiv = '<div class="cw-wc-icon">' + escapeHtml(CONFIG.avatarLetter) + '</div>';
      }
      card.innerHTML = iconDiv +
        '<div class="cw-wc-title">' + escapeHtml(CONFIG.welcomeTitle) + '</div>' +
        '<div class="cw-wc-sub">' + escapeHtml(CONFIG.welcomeSub) + '</div>';
      messages.appendChild(card);

      var divider = document.createElement('div');
      divider.className = 'cw-msg-divider';
      divider.setAttribute('aria-hidden', 'true');
      divider.textContent = todayLabel();
      messages.appendChild(divider);
    }

    // ── Chips ──
    function renderChips() {
      if (!CHIPS.length) return;
      var wrap = document.createElement('div');
      wrap.className = 'cw-suggestions';
      wrap.id = 'cw-suggestions';
      wrap.setAttribute('role', 'listbox');
      wrap.setAttribute('aria-label', 'Suggested questions');
      wrap.innerHTML = chipsHtml;
      messages.appendChild(wrap);
    }
    function hideChips() {
      var s = messages.querySelector('#cw-suggestions');
      if (s) s.remove();
    }

    // ── Append message (the core rendering function) ──
    function appendMessage(text, role, opts) {
      opts = opts || {};
      var timeStr = opts.time || now();

      // Build DOM imperatively (avoids innerHTML on user content — XSS safe)
      var row = document.createElement('div');
      row.className = 'cw-msg-row ' + role;

      // Avatar
      var av = document.createElement('div');
      av.className = role === 'user' ? 'cw-msg-avatar user-av' : 'cw-msg-avatar';
      av.setAttribute('aria-hidden', 'true');
      if (role === 'user') {
        av.textContent = '🙂';
      } else {
        av.innerHTML = msgAvatarInner();
      }

      // Wrapper (flex column for bubble + timestamp)
      var wrap = document.createElement('div');
      wrap.className = 'cw-msg-wrap';

      // Bubble
      var bubble = document.createElement('div');
      bubble.className = 'cw-bubble ' + role;
      bubble.setAttribute('dir', 'auto');

      if (role === 'ai') {
        bubble.innerHTML = renderMarkdown(text);
      } else {
        bubble.textContent = text;
      }

      // Timestamp
      var time = document.createElement('div');
      time.className = 'cw-bubble-time';
      time.setAttribute('aria-hidden', 'true');
      time.textContent = timeStr;

      // Screen-reader announcement
      var srAnnounce = document.createElement('span');
      srAnnounce.className = 'cw-sr-only';
      srAnnounce.textContent = (role === 'user' ? 'You: ' : CONFIG.businessName + ': ') + text + ', ' + timeStr;

      wrap.appendChild(bubble);
      wrap.appendChild(time);

      row.appendChild(av);
      row.appendChild(wrap);
      row.appendChild(srAnnounce);
      messages.appendChild(row);

      // Scroll after paint (prevents layout thrash)
      scrollToBottom(opts.instant);

      if (!opts.skipStore) {
        history.push({ role: role, text: text, time: timeStr });
        saveHistory();
      }

      return row;
    }

    // ── Error message ──
    function appendErrorMessage(errMsg, originalText) {
      var row = document.createElement('div');
      row.className = 'cw-msg-row ai';
      row.setAttribute('role', 'alert');

      var av = document.createElement('div');
      av.className = 'cw-msg-avatar';
      av.setAttribute('aria-hidden', 'true');
      av.innerHTML = msgAvatarInner();

      var wrap = document.createElement('div');
      wrap.className = 'cw-msg-wrap';

      var bubble = document.createElement('div');
      bubble.className = 'cw-bubble ai cw-error-bubble';

      var msgSpan = document.createElement('span');
      msgSpan.className = 'cw-error-text';
      msgSpan.textContent = '⚠\uFE0F ' + errMsg;

      var retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'cw-retry-btn';
      retryBtn.setAttribute('aria-label', CONFIG.textRetry + ': ' + originalText);
      retryBtn.textContent = '↺ ' + CONFIG.textRetry;
      retryBtn.onclick = function () {
        row.remove();
        input.value = originalText;
        autoResize();
        input.focus();
      };

      bubble.appendChild(msgSpan);
      bubble.appendChild(retryBtn);
      wrap.appendChild(bubble);
      row.appendChild(av);
      row.appendChild(wrap);
      messages.appendChild(row);
      scrollToBottom();
    }

    // ── Typing indicator ──
    function showTyping() {
      var row = document.createElement('div');
      row.className = 'cw-typing-row';
      row.id = 'cw-typing';
      row.setAttribute('aria-label', CONFIG.businessName + ' is typing');
      row.setAttribute('role', 'status');

      var av = document.createElement('div');
      av.className = 'cw-msg-avatar';
      av.setAttribute('aria-hidden', 'true');
      av.innerHTML = msgAvatarInner();

      var bubble = document.createElement('div');
      bubble.className = 'cw-typing-bubble';
      bubble.setAttribute('aria-hidden', 'true');
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

    // ── Auto-resize textarea ──
    function autoResize() {
      input.style.height = 'auto';
      var h = input.scrollHeight;
      if (h > 0) input.style.height = Math.min(h, 120) + 'px';
    }

    // ── Badge ──
    function updateBadge() {
      if (unread > 0) {
        badge.textContent = unread > 9 ? '9+' : String(unread);
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    // ── Greeting ──
    function showGreeting() {
      if (!CONFIG.greetingBubble || isOpen) return;
      if (storeGet(NS + 'greeting_dismissed') === '1') return;
      greeting.classList.add('show');
    }
    function hideGreeting() {
      greeting.classList.remove('show');
      if (greetingTimer) { clearTimeout(greetingTimer); greetingTimer = null; }
    }

    // ── Body scroll lock (mobile only) ──
    var _scrollLockY = 0;
    function lockBodyScroll(lock) {
      if (!isMobile()) return;
      var body = document.body;
      if (lock) {
        _scrollLockY = window.scrollY || window.pageYOffset || 0;
        body.style.cssText += ';position:fixed;top:-' + _scrollLockY + 'px;left:0;right:0;width:100%;';
      } else {
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.width = '';
        window.scrollTo(0, _scrollLockY);
      }
    }

    // ── Open / close ──
    function setOpen(open) {
      isOpen = open;
      widget.classList.toggle('open', isOpen);
      launcher.classList.toggle('open', isOpen);
      launcher.setAttribute('aria-label', isOpen ? CONFIG.textClose : CONFIG.textOpenAria);
      launcher.setAttribute('aria-expanded', String(isOpen));
      widget.setAttribute('aria-hidden', String(!isOpen));

      if (typeof syncViewportHeight === 'function') syncViewportHeight();

      if (isOpen) {
        unread = 0;
        updateBadge();
        hideGreeting();
        lockBodyScroll(true);
        // Delay focus to let the open animation complete first (especially on iOS)
        var focusDelay = isMobile() ? 380 : 50;
        setTimeout(function () {
          try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
        }, focusDelay);
        // Scroll after animation settles
        setTimeout(function () { scrollToBottom(true); }, focusDelay);
      } else {
        lockBodyScroll(false);
        try { input.blur(); } catch (e) {}
      }

      if (CONFIG.persistOpenState) storeSet(NS + 'open', isOpen ? '1' : '0');
    }
    function toggleWidget() { setOpen(!isOpen); }

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
      sendBtn.setAttribute('aria-busy', 'true');
      input.value = '';
      input.style.height = 'auto';
      input.style.height = '22px';
      hideChips();

      appendMessage(text, 'user');
      showTyping();

      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timedOut = false;
      var timeout = setTimeout(function () {
        timedOut = true;
        if (controller) controller.abort();
      }, CONFIG.timeoutMs);

      var fetchOpts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain' },
        body: JSON.stringify({
          chatInput: text,
          message: text,
          sessionId: SESSION_ID,
          page: location.href
        })
      };
      if (controller) fetchOpts.signal = controller.signal;

      fetch(CONFIG.webhookUrl, fetchOpts)
        .then(function (res) {
          clearTimeout(timeout);
          removeTyping();
          if (!res.ok) {
            var err = new Error('HTTP ' + res.status);
            err.httpStatus = res.status;
            throw err;
          }
          return res.text();
        })
        .then(function (rawText) {
          var reply = extractReply(rawText);
          appendMessage(reply && String(reply).trim() ? String(reply).trim() : CONFIG.errEmpty, 'ai');
          if (!isOpen) { unread++; updateBadge(); }
          playBeep();
        })
        .catch(function (err) {
          clearTimeout(timeout);
          removeTyping();
          var errMsg;
          if (timedOut || err.name === 'AbortError') {
            errMsg = CONFIG.errTimeout;
          } else if (err.httpStatus) {
            errMsg = err.httpStatus >= 500 ? CONFIG.errServer : CONFIG.errGeneric;
          } else if (err.name === 'TypeError' || /failed to fetch/i.test(err.message || '')) {
            errMsg = CONFIG.errNetwork;
          } else {
            errMsg = CONFIG.errGeneric;
          }
          appendErrorMessage(errMsg, text);
          if (!isOpen) { unread++; updateBadge(); }
        })
        .finally(function () {
          isLoading = false;
          sendBtn.disabled = false;
          sendBtn.removeAttribute('aria-busy');
          if (isOpen) {
            try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
          }
        });
    }

    // ── Extract reply from webhook response ──
    function extractReply(rawText) {
      var data;
      try { data = JSON.parse(rawText); }
      catch (e) { return rawText; }

      function fromObj(o) {
        if (o == null) return null;
        if (typeof o === 'string') return o;
        return o.output || o.text || o.message || o.response ||
               o.answer || o.reply || o.content || o.data || null;
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

    // ── Clear conversation ──
    function clearConversation() {
      history = [];
      saveHistory();
      requestAnimationFrame(function () {
        messages.innerHTML = '';
        renderWelcome();
        appendMessage(CONFIG.initialMessage, 'ai', { instant: true });
        renderChips();
      });
    }

    // ── Bootstrap messages ──
    function bootstrapMessages() {
      var saved = loadHistory();
      renderWelcome();
      if (saved.length) {
        saved.forEach(function (m) {
          appendMessage(m.text, m.role, { time: m.time, skipStore: true, instant: true });
        });
        history = saved.slice();
      } else {
        appendMessage(CONFIG.initialMessage, 'ai', { instant: true });
        renderChips();
      }
    }

    // ───────────────────────────────────────────────
    // EVENT LISTENERS
    // ───────────────────────────────────────────────

    // Launcher
    launcher.addEventListener('click', toggleWidget);

    // Close button in header
    closeBtn.addEventListener('click', function () { setOpen(false); });

    // Send button
    sendBtn.addEventListener('click', sendMessage);

    // Clear / new conversation
    clearBtn.addEventListener('click', clearConversation);

    // Textarea auto-resize and send on Enter
    input.addEventListener('input', autoResize);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Composition events (CJK IME support — don't send mid-composition)
    var _composing = false;
    input.addEventListener('compositionstart', function () { _composing = true; });
    input.addEventListener('compositionend', function () { _composing = false; });

    // Chip clicks (event delegation)
    messages.addEventListener('click', function (e) {
      var chip = e.target.closest('.cw-chip');
      if (!chip) return;
      var chipText = chip.getAttribute('data-chip') || chip.textContent.trim();
      input.value = chipText;
      autoResize();
      sendMessage();
    });

    // Greeting bubble
    greetClose.addEventListener('click', function (e) {
      e.stopPropagation();
      hideGreeting();
      storeSet(NS + 'greeting_dismissed', '1');
    });
    greeting.addEventListener('click', function (e) {
      if (e.target === greetClose || greetClose.contains(e.target)) return;
      setOpen(true);
    });

    // Keyboard: Escape closes widget
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation();
        setOpen(false);
      }
    });

    // Mobile: keep messages scrolled when soft keyboard opens/closes
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () {
        if (isOpen && isMobile()) {
          requestAnimationFrame(function () {
            messages.scrollTop = messages.scrollHeight;
          });
        }
      });
    }

    // ── Trap focus inside open dialog (accessibility) ──
    widget.addEventListener('keydown', function (e) {
      if (!isOpen || e.key !== 'Tab') return;
      var focusable = widget.querySelectorAll(
        'button:not([disabled]),textarea,[href],[tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // ───────────────────────────────────────────────
    // INITIAL STATE
    // ───────────────────────────────────────────────
    widget.setAttribute('aria-hidden', 'true');

    bootstrapMessages();

    if (CONFIG.persistOpenState && storeGet(NS + 'open') === '1') {
      setOpen(true);
    } else if (CONFIG.autoOpen) {
      setTimeout(function () { if (!isOpen) setOpen(true); }, CONFIG.autoOpenDelay);
    }

    if (CONFIG.greetingBubble) {
      greetingTimer = setTimeout(showGreeting, Math.max(1200, CONFIG.autoOpenDelay - 500));
    }

    // ───────────────────────────────────────────────
    // PUBLIC API — window.ChatWidget
    // ───────────────────────────────────────────────
    window.ChatWidget = {
      open:   function () { setOpen(true); },
      close:  function () { setOpen(false); },
      toggle: toggleWidget,
      clear:  clearConversation,
      sendMessage: function (text) {
        if (typeof text !== 'string' || !text.trim()) return;
        input.value = text;
        if (!isOpen) setOpen(true);
        setTimeout(sendMessage, 50);
      },
      isOpen: function () { return isOpen; },
      config: CONFIG
    };
  }
})();
