/*!
 * Tay Travels AI Chatbot Widget v1.1.0
 * Production-ready AI chatbot for the Tay Travels advisor website.
 * Communicates with any n8n (or compatible) webhook backend.
 *
 * @author    Tay Travels Widget
 * @version   1.0.0
 * @license   MIT
 * @see       https://github.com/tajeblack/travel-agent-chatbot
 *
 * No dependencies. Pure ES2022 + Shadow DOM.
 */
(function (window, document) {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // GUARD · Prevent double-execution if the script tag is accidentally
  // included more than once on the page (duplicate embed snippets, a CMS
  // injecting it on every partial, etc). Without this, every click fires
  // twice and you get duplicate messages/buttons in the chat.
  // ─────────────────────────────────────────────────────────────────────────────
  if (window.TayTravelsChatbot) {
    console.warn('[TayTravelsChatbot] Script already loaded on this page — skipping duplicate load. ' +
      'Check your HTML for more than one <script src=".../chatbot-travel.js"> tag.');
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1 · CONSTANTS & DEFAULTS
  // ─────────────────────────────────────────────────────────────────────────────

  const VERSION = '1.1.0';
  const STORAGE_PREFIX = 'ttc_';
  const MAX_INPUT_LENGTH = 1000;
  const MAX_MESSAGES_IN_DOM = 80;

  /** @type {ChatConfig} Default configuration */
  const DEFAULTS = {
    webhook:'https://islempharm.app.n8n.cloud/webhook/travel-chatbot',
    agencyName: 'Tay Travels',
    assistantName: 'Taje',
    logo: null,
    avatar: null,
    theme: {
      primary: '#1E255D',
      accent: '#D50032',
      mode: 'auto',
    },
    welcomeMessage: "Hi! I'm Taje's assistant — where would you like to go?",
    suggestedQuestions: [
      'Show me vacation deals',
      "I'd like a cruise recommendation",
      'Help me plan a trip',
      'Do I need a passport or visa?',
    ],
    bookingUrl: null,
    position: 'bottom-right',
    borderRadius: 16,
    businessHours: null,
    persistConversation: true,
    sessionMaxAge: 86400000,
    debug: false,
    locale: 'en-US',
    zIndex: 999999,
    handoffMessage: "You're being connected to a live agent. Please hold…",
    poweredBy: true,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2 · UTILITY FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate a UUID v4.
   * @returns {string}
   */
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /**
   * Deep-merge two plain objects.
   * @param {Object} target
   * @param {Object} source
   * @returns {Object}
   */
  function deepMerge(target, source) {
    const out = Object.assign({}, target);
    for (const key of Object.keys(source || {})) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        out[key] = deepMerge(target[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        out[key] = source[key];
      }
    }
    return out;
  }

  /**
   * Parse a hex color string to {r, g, b}.
   * @param {string} hex
   * @returns {{ r: number, g: number, b: number } | null}
   */
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : null;
  }

  /**
   * Determine if a hex color should be treated as "light" (for text contrast).
   * @param {string} hex
   * @returns {boolean}
   */
  function isLightColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 > 0.55;
  }

  /**
   * Format a number as currency.
   * @param {number} amount
   * @param {string} [currency='USD']
   * @param {string} [locale='en-US']
   * @returns {string}
   */
  function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `$${Number(amount).toLocaleString()}`;
    }
  }

  /**
   * Format a timestamp into a short "hh:mm am/pm" string.
   * @param {Date} [date]
   * @returns {string}
   */
  function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Debounce a function call.
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Safely escape HTML entities in a string.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, (c) => map[c]);
  }

  /**
   * Create an SVG element from an inline string.
   * @param {string} svgString
   * @returns {SVGElement}
   */
  function svgEl(svgString) {
    const div = document.createElement('div');
    div.innerHTML = svgString.trim();
    return div.firstChild;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3 · SVG ICON LIBRARY
  // ─────────────────────────────────────────────────────────────────────────────

  const Icons = {
    chat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    send: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    restart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.96"/></svg>`,
    minimize: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    bot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    home: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    bed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4v16"/><path d="M22 8H2"/><path d="M22 4v16"/><path d="M2 8h20v12H2z"/><path d="M6 8V4"/><path d="M18 8V4"/></svg>`,
    bath: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/><line x1="4" y1="21" x2="4" y2="22"/><line x1="20" y1="21" x2="20" y2="22"/></svg>`,
    garage: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 11h20"/><path d="M6 11v4"/><path d="M10 11v4"/><path d="M14 11v4"/><path d="M18 11v4"/></svg>`,
    sqft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3H3v18"/><path d="M21 9H9"/><path d="M21 15H9"/><path d="M9 3v18"/></svg>`,
    location: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    eye: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    externalLink: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    agent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    contact: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    arrow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    plane: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-1 .1-1.3.5l-.5.5c-.4.4-.3 1 .2 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.6 6.3c.3.5.9.6 1.3.2l.5-.5c.4-.3.6-.8.4-1.3Z"/></svg>`,
    clock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    users: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    ship: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 21c1.6 0 2.4-1 4-1s2.4 1 4 1 2.4-1 4-1 2.4 1 4 1 2.4-1 4-1"/><path d="M4 18l-1-6h18l-1 6"/><path d="M12 2v9"/><path d="M9 5h6l3 6H6l3-6z"/></svg>`,
    shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    idcard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M4 17c.6-1.6 2-2.5 4-2.5s3.4.9 4 2.5"/><line x1="14" y1="9" x2="19" y2="9"/><line x1="14" y1="13" x2="19" y2="13"/></svg>`,
    car: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13"/><rect x="2" y="13" width="20" height="6" rx="2"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>`,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4 · EVENT BUS
  // ─────────────────────────────────────────────────────────────────────────────

  const EventBus = (() => {
    const _listeners = Object.create(null);
    return {
      on(event, fn) {
        (_listeners[event] = _listeners[event] || []).push(fn);
      },
      off(event, fn) {
        if (_listeners[event]) {
          _listeners[event] = _listeners[event].filter((l) => l !== fn);
        }
      },
      emit(event, data) {
        (_listeners[event] || []).slice().forEach((fn) => {
          try { fn(data); } catch (e) { /* never crash the bus */ }
        });
      },
      clear() {
        Object.keys(_listeners).forEach((k) => delete _listeners[k]);
      },
    };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5 · HTML SANITIZER (XSS Prevention)
  // ─────────────────────────────────────────────────────────────────────────────

  const Sanitizer = (() => {
    const ALLOWED_TAGS = new Set([
      'a', 'b', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3',
      'h4', 'i', 'ins', 'li', 'mark', 'ol', 'p', 'pre', 'small', 'span',
      'strong', 'sub', 'sup', 'ul',
    ]);
    const GLOBAL_ATTRS = new Set(['class', 'id', 'title']);
    const TAG_ATTRS = {
      a: new Set(['href', 'target', 'rel']),
    };
    const DANGEROUS_SCHEMES = /^(javascript|vbscript|data|blob):/i;
    const BLOCK_TAGS = new Set([
      'script', 'style', 'iframe', 'object', 'embed', 'form',
      'input', 'button', 'textarea', 'select', 'template', 'svg',
    ]);

    function walk(node) {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.TEXT_NODE) continue;
        if (child.nodeType !== Node.ELEMENT_NODE) {
          child.parentNode?.removeChild(child);
          continue;
        }

        const tag = child.tagName.toLowerCase();

        if (BLOCK_TAGS.has(tag)) {
          child.parentNode?.removeChild(child);
          continue;
        }

        if (!ALLOWED_TAGS.has(tag)) {
          while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
          child.parentNode?.removeChild(child);
          continue;
        }

        const allowedForTag = TAG_ATTRS[tag] || new Set();
        for (const attr of Array.from(child.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith('on')) { child.removeAttribute(attr.name); continue; }
          if (!GLOBAL_ATTRS.has(name) && !allowedForTag.has(name)) {
            child.removeAttribute(attr.name);
            continue;
          }
          if ((name === 'href' || name === 'src' || name === 'action') &&
              DANGEROUS_SCHEMES.test(attr.value.trim())) {
            child.removeAttribute(attr.name);
          }
        }

        if (tag === 'a') {
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        }

        walk(child);
      }
    }

    function sanitize(html) {
      if (!html) return '';
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      walk(tpl.content);
      const div = document.createElement('div');
      div.appendChild(tpl.content.cloneNode(true));
      return div.innerHTML;
    }

    return { sanitize };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 6 · MARKDOWN PARSER
  // ─────────────────────────────────────────────────────────────────────────────

  const MarkdownParser = (() => {
    function parse(md) {
      if (!md) return '';

      const codeBlocks = [];
      let s = md.replace(/```([\s\S]*?)```/g, (_, code) => {
        codeBlocks.push(code.trim());
        return `\x00CODE${codeBlocks.length - 1}\x00`;
      });

      s = escapeHtml(s);

      s = s.replace(/\x00CODE(\d+)\x00/g, (_, i) =>
        `<pre><code>${escapeHtml(codeBlocks[parseInt(i, 10)])}</code></pre>`
      );

      s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');
      s = s.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
      s = s.replace(/^(?:[-*] )(.+)$/gm, '<li>$1</li>');
      s = s.replace(/(<li>[\s\S]*?<\/li>)(?![\s\S]*?<li>)/g, (m) => `<ul>${m}</ul>`);

      s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
      s = s.replace(/_(.+?)_/g, '<em>$1</em>');
      s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
      s = s.replace(/`(.+?)`/g, '<code>$1</code>');

      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, rawUrl) => {
        const url = rawUrl
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        return `<a href="${escapeHtml(url)}">${text}</a>`;
      });

      s = s.replace(/\n\n+/g, '</p><p>');
      s = s.replace(/\n/g, '<br>');

      if (!/<[a-z]/.test(s)) s = `<p>${s}</p>`;

      return Sanitizer.sanitize(s);
    }

    return { parse };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 7 · STORAGE MODULE
  // ─────────────────────────────────────────────────────────────────────────────

  const Storage = (() => {
    function set(key, value) {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      } catch { /* storage full or unavailable */ }
    }

    function get(key) {
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        return raw !== null ? JSON.parse(raw) : null;
      } catch { return null; }
    }

    function remove(key) {
      try { localStorage.removeItem(STORAGE_PREFIX + key); } catch { /* ignore */ }
    }

    function clearAll() {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(STORAGE_PREFIX))
          .forEach((k) => localStorage.removeItem(k));
      } catch { /* ignore */ }
    }

    return { set, get, remove, clearAll };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 8 · PAGE CONTEXT MODULE
  // ─────────────────────────────────────────────────────────────────────────────

  const Context = (() => {
    function detectProperty() {
      const prop = { url: null, title: null, price: null, id: null };
      try {
        for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
          try {
            const schemas = [].concat(JSON.parse(script.textContent));
            for (const schema of schemas) {
              if (['RealEstateListing', 'Product', 'Apartment', 'House'].includes(schema['@type'])) {
                prop.url = schema.url || window.location.href;
                prop.title = schema.name || prop.title;
                prop.price = schema.offers?.price?.toString() || prop.price;
                prop.id = schema.identifier?.toString() || schema['@id'] || prop.id;
              }
            }
          } catch { /* malformed JSON-LD — skip */ }
        }

        if (!prop.title) {
          prop.title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null;
        }
        if (!prop.url) {
          prop.url = document.querySelector('meta[property="og:url"]')?.getAttribute('content') || null;
        }

        if (!prop.price) {
          const priceSelectors = [
            '[data-price]', '[class*="listing-price"]', '[class*="property-price"]',
            '.price', '#price', '[itemprop="price"]',
          ];
          for (const sel of priceSelectors) {
            const el = document.querySelector(sel);
            if (!el) continue;
            const raw = el.getAttribute('data-price') || el.getAttribute('content') || el.textContent || '';
            const match = raw.replace(/,/g, '').match(/\d[\d.]+/);
            if (match) { prop.price = match[0]; break; }
          }
        }

        if (!prop.id) {
          const m = window.location.pathname.match(/(?:property|listing|home|prop)[-/]([a-z0-9-]{2,})/i);
          if (m) prop.id = m[1];
        }

        const propEl = document.querySelector('[data-property-id]');
        if (propEl) prop.id = propEl.getAttribute('data-property-id');
      } catch { /* never throw */ }
      return prop;
    }

    function getUtm() {
      const p = new URLSearchParams(window.location.search);
      return {
        source: p.get('utm_source'),
        medium: p.get('utm_medium'),
        campaign: p.get('utm_campaign'),
        term: p.get('utm_term'),
        content: p.get('utm_content'),
      };
    }

    function collect() {
      return {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer || null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        property: detectProperty(),
        utm: getUtm(),
        language: navigator.language || 'en-US',
        timestamp: new Date().toISOString(),
      };
    }

    return { collect };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 9 · BUSINESS HOURS MODULE
  // ─────────────────────────────────────────────────────────────────────────────

  const BusinessHours = (() => {
    function isOpen(cfg) {
      if (!cfg) return true;
      try {
        const tz = cfg.tz || 'UTC';
        const now = new Date();
        const fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit', minute: '2-digit',
          weekday: 'short', hour12: false,
        });
        const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
        const minuteNow = parseInt(parts.hour) * 60 + parseInt(parts.minute);

        const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const day = dayMap[parts.weekday] ?? now.getDay();
        const days = cfg.days || [1, 2, 3, 4, 5];
        if (!days.includes(day)) return false;

        const [sh, sm] = (cfg.start || '09:00').split(':').map(Number);
        const [eh, em] = (cfg.end || '18:00').split(':').map(Number);
        return minuteNow >= sh * 60 + sm && minuteNow < eh * 60 + em;
      } catch { return true; }
    }

    return { isOpen };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 10 · WEBHOOK CLIENT
  // ─────────────────────────────────────────────────────────────────────────────

  const WebhookClient = (() => {
    const MAX_RETRIES = 1;
    const TIMEOUT_MS = 30_000;

    async function send(webhookUrl, payload, { retries = MAX_RETRIES } = {}) {
      const t0 = Date.now();
      let lastErr;

      for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Widget-Version': VERSION,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

          const text = await res.text();
          if (!text || !text.trim()) {
            throw new Error('The assistant is thinking — please try again in a moment.');
          }
          let data;
          try {
            data = JSON.parse(text);
          } catch (_) {
            throw new Error('The assistant returned an unexpected response. Please try again.');
          }
          EventBus.emit('webhook:success', { payload, response: data, ms: Date.now() - t0 });
          return data;
        } catch (err) {
          clearTimeout(timer);
          lastErr = err;
          if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
          if (attempt < retries) await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        }
      }

      EventBus.emit('webhook:error', { error: lastErr, payload });
      throw lastErr;
    }

    return { send };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 11 · RESPONSE PARSER
  // ─────────────────────────────────────────────────────────────────────────────

  const ResponseParser = (() => {
    function parse(raw) {
      if (raw === null || raw === undefined) {
        return { messages: [{ type: 'error', content: 'No response from server.' }], sessionId: null };
      }

      if (typeof raw === 'string') {
        return { messages: [{ type: 'text', content: raw }], sessionId: null };
      }

      if (Array.isArray(raw)) {
        const msgs = raw.filter((m) => m && typeof m.type === 'string');
        return { messages: msgs.length ? msgs : [{ type: 'text', content: JSON.stringify(raw) }], sessionId: null };
      }

      if (typeof raw !== 'object') {
        return { messages: [{ type: 'error', content: 'Unexpected response format.' }], sessionId: null };
      }

      if (Array.isArray(raw.messages) && raw.messages.length) {
        const msgs = raw.messages.filter((m) => m && typeof m.type === 'string');
        return { messages: msgs, sessionId: raw.sessionId || null };
      }

      if (typeof raw.type === 'string') {
        return { messages: [raw], sessionId: raw.sessionId || null };
      }

      const textContent =
        raw.output ||
        raw.text ||
        raw.message ||
        raw.reply ||
        raw.response ||
        raw.answer;

      if (textContent) {
        return { messages: [{ type: 'text', content: String(textContent) }], sessionId: raw.sessionId || null };
      }

      return {
        messages: [{ type: 'error', content: "I couldn't understand the response. Please try again." }],
        sessionId: null,
      };
    }

    return { parse };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 12 · SHADOW DOM CSS
  // ─────────────────────────────────────────────────────────────────────────────

  const SHADOW_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:host{
  --rce-primary:#081A33;
  --rce-accent:#D4AF37;
  --rce-primary-rgb:8,26,51;
  --rce-accent-rgb:212,175,55;
  --rce-radius:16px;
  --rce-font:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;

  --rce-bg:#ffffff;
  --rce-bg2:#f8f9fb;
  --rce-surface:rgba(255,255,255,0.97);
  --rce-text:#0f172a;
  --rce-text2:#64748b;
  --rce-muted:#94a3b8;
  --rce-border:rgba(0,0,0,0.08);
  --rce-shadow:0 24px 60px rgba(8,26,51,.18),0 8px 24px rgba(8,26,51,.1);
  --rce-shadow-sm:0 4px 14px rgba(8,26,51,.1);
  --rce-user-bg:var(--rce-primary);
  --rce-user-color:#ffffff;
  --rce-bot-bg:#f1f5f9;
  --rce-bot-color:#0f172a;
  --rce-input-bg:#f4f6f9;
  --rce-scroll:#0000001a;
  --rce-card-bg:#ffffff;
  --rce-overlay:rgba(8,26,51,.55);
}

@media(prefers-color-scheme:dark){
  :host([data-theme="auto"]){
    --rce-bg:#0a1929;
    --rce-bg2:#0f2135;
    --rce-surface:rgba(10,25,41,.98);
    --rce-text:#f0f4f8;
    --rce-text2:#8da3b9;
    --rce-muted:#5a7590;
    --rce-border:rgba(255,255,255,.07);
    --rce-shadow:0 24px 60px rgba(0,0,0,.55),0 8px 24px rgba(0,0,0,.3);
    --rce-shadow-sm:0 4px 14px rgba(0,0,0,.3);
    --rce-user-bg:var(--rce-accent);
    --rce-user-color:var(--rce-primary);
    --rce-bot-bg:rgba(255,255,255,.07);
    --rce-bot-color:#f0f4f8;
    --rce-input-bg:rgba(255,255,255,.05);
    --rce-scroll:rgba(255,255,255,.1);
    --rce-card-bg:rgba(255,255,255,.05);
  }
}

:host([data-theme="dark"]){
  --rce-bg:#0a1929;
  --rce-bg2:#0f2135;
  --rce-surface:rgba(10,25,41,.98);
  --rce-text:#f0f4f8;
  --rce-text2:#8da3b9;
  --rce-muted:#5a7590;
  --rce-border:rgba(255,255,255,.07);
  --rce-shadow:0 24px 60px rgba(0,0,0,.55),0 8px 24px rgba(0,0,0,.3);
  --rce-shadow-sm:0 4px 14px rgba(0,0,0,.3);
  --rce-user-bg:var(--rce-accent);
  --rce-user-color:var(--rce-primary);
  --rce-bot-bg:rgba(255,255,255,.07);
  --rce-bot-color:#f0f4f8;
  --rce-input-bg:rgba(255,255,255,.05);
  --rce-scroll:rgba(255,255,255,.1);
  --rce-card-bg:rgba(255,255,255,.05);
}

/* ──────────── LAUNCHER ──────────── */
.ttc-launcher{
  position:fixed;bottom:24px;right:24px;
  width:62px;height:62px;border-radius:50%;
  background:linear-gradient(145deg,var(--rce-primary),rgba(var(--rce-primary-rgb),.8));
  border:2.5px solid var(--rce-accent);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  box-shadow:0 8px 28px rgba(var(--rce-primary-rgb),.45);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease;
  z-index:1;outline:none;
}
.ttc-launcher.pos-left{right:auto;left:24px}
.ttc-launcher:hover{transform:scale(1.1);box-shadow:0 12px 36px rgba(var(--rce-primary-rgb),.55),0 0 0 8px rgba(var(--rce-accent-rgb),.12)}
.ttc-launcher:focus-visible{outline:2.5px solid var(--rce-accent);outline-offset:3px}
.ttc-launcher:active{transform:scale(.96)}

.ttc-launcher-icon{
  width:28px;height:28px;color:var(--rce-accent);
  transition:opacity .2s,transform .3s cubic-bezier(.34,1.56,.64,1);
  position:absolute;
}
.ttc-launcher-icon.ttc-hidden{opacity:0;transform:rotate(80deg) scale(.5);pointer-events:none}

/* Badge */
.ttc-badge{
  position:absolute;top:-5px;right:-5px;
  min-width:20px;height:20px;border-radius:10px;
  background:#ef4444;color:#fff;
  font-family:var(--rce-font);font-size:11px;font-weight:700;
  display:flex;align-items:center;justify-content:center;
  padding:0 5px;border:2.5px solid var(--rce-bg,#fff);
  animation:ttc-pop .3s cubic-bezier(.34,1.56,.64,1);
}
.ttc-badge.ttc-hidden{display:none}

/* ──────────── PANEL ──────────── */
.ttc-panel{
  position:fixed;bottom:100px;right:24px;
  width:390px;height:620px;max-height:calc(100dvh - 110px);
  border-radius:var(--rce-radius);
  background:var(--rce-surface);
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid var(--rce-border);
  box-shadow:var(--rce-shadow);
  display:flex;flex-direction:column;overflow:hidden;
  z-index:1;transform-origin:bottom right;
  transform:scale(.85) translateY(24px);opacity:0;pointer-events:none;
  transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .25s ease;
}
.ttc-panel.pos-left{right:auto;left:24px;transform-origin:bottom left}
.ttc-panel.ttc-open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto}

@media(max-width:480px){
  .ttc-panel{width:100dvw;height:100dvh;max-height:100dvh;bottom:0;right:0;left:0;border-radius:0}
  .ttc-panel.pos-left{left:0;right:0}
  .ttc-launcher{bottom:16px;right:16px}
  .ttc-launcher.pos-left{left:16px;right:auto}
}

/* ──────────── HEADER ──────────── */
.ttc-header{
  padding:14px 18px;
  background:linear-gradient(140deg,var(--rce-primary) 0%,rgba(var(--rce-primary-rgb),.85) 100%);
  border-bottom:1px solid rgba(var(--rce-accent-rgb),.25);
  display:flex;align-items:center;gap:12px;flex-shrink:0;position:relative;
}
.ttc-header::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(var(--rce-accent-rgb),.6),transparent);
}

.ttc-avatar{
  width:46px;height:46px;border-radius:50%;
  border:2px solid var(--rce-accent);overflow:hidden;flex-shrink:0;
  background:linear-gradient(135deg,rgba(var(--rce-accent-rgb),.3),rgba(var(--rce-accent-rgb),.1));
  display:flex;align-items:center;justify-content:center;
}
.ttc-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.ttc-avatar svg{width:22px;height:22px;color:var(--rce-accent)}

.ttc-header-info{flex:1;min-width:0}
.ttc-agent-name{font-family:var(--rce-font);font-size:15px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ttc-status{display:flex;align-items:center;gap:5px;font-family:var(--rce-font);font-size:12px;color:rgba(255,255,255,.65);margin-top:2px}
.ttc-status-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;animation:ttc-pulse 2s infinite;flex-shrink:0}

.ttc-header-actions{display:flex;gap:4px}
.ttc-hbtn{
  width:34px;height:34px;border-radius:9px;border:none;
  background:rgba(255,255,255,.1);color:rgba(255,255,255,.75);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:background .2s,color .2s;outline:none;flex-shrink:0;
}
.ttc-hbtn:hover{background:rgba(255,255,255,.2);color:#fff}
.ttc-hbtn:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.ttc-hbtn svg{width:16px;height:16px}

/* ──────────── MESSAGES ──────────── */
.ttc-msgs{
  flex:1;overflow-y:auto;padding:18px 14px;
  display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;
}
.ttc-msgs::-webkit-scrollbar{width:4px}
.ttc-msgs::-webkit-scrollbar-track{background:transparent}
.ttc-msgs::-webkit-scrollbar-thumb{background:var(--rce-scroll);border-radius:2px}

.ttc-row{display:flex;gap:8px;max-width:100%;animation:rce-msgIn .32s cubic-bezier(.34,1.56,.64,1)}
.ttc-row.ttc-user{flex-direction:row-reverse}

.ttc-msg-av{
  width:28px;height:28px;border-radius:50%;flex-shrink:0;overflow:hidden;
  border:1px solid var(--rce-border);
  background:linear-gradient(135deg,rgba(var(--rce-accent-rgb),.3),rgba(var(--rce-accent-rgb),.1));
  display:flex;align-items:center;justify-content:center;align-self:flex-end;
}
.ttc-msg-av img{width:100%;height:100%;object-fit:cover}
.ttc-msg-av svg{width:13px;height:13px;color:var(--rce-accent)}

.ttc-msg-body{max-width:calc(100% - 42px);display:flex;flex-direction:column;gap:4px}
.ttc-row.ttc-user .ttc-msg-body{align-items:flex-end}

.ttc-bubble{
  padding:10px 14px;border-radius:18px;
  font-family:var(--rce-font);font-size:14px;line-height:1.55;word-break:break-word;
}
.ttc-bubble.ttc-bot{background:var(--rce-bot-bg);color:var(--rce-bot-color);border-bottom-left-radius:4px}
.ttc-bubble.ttc-user{background:var(--rce-user-bg);color:var(--rce-user-color);border-bottom-right-radius:4px}
.ttc-bubble a{color:var(--rce-accent);text-decoration:underline}
.ttc-bubble code{font-family:'Courier New',monospace;font-size:12px;background:rgba(var(--rce-primary-rgb),.08);padding:1px 5px;border-radius:4px}
.ttc-bubble pre{background:rgba(var(--rce-primary-rgb),.06);padding:10px;border-radius:8px;overflow-x:auto;margin-top:6px}
.ttc-bubble pre code{background:none;padding:0}
.ttc-bubble h1,.ttc-bubble h2,.ttc-bubble h3{margin-bottom:5px;font-weight:700;line-height:1.3}
.ttc-bubble ul,.ttc-bubble ol{padding-left:18px;margin:4px 0}
.ttc-bubble li{margin-bottom:2px}
.ttc-bubble blockquote{border-left:3px solid var(--rce-accent);padding-left:10px;margin:6px 0;opacity:.8;font-style:italic}

.ttc-ts{font-family:var(--rce-font);font-size:10px;color:var(--rce-muted);padding:0 4px}
.ttc-row.ttc-user .ttc-ts{text-align:right}

/* Typing indicator */
.ttc-typing{display:flex;align-items:center;gap:5px;padding:12px 14px;background:var(--rce-bot-bg);border-radius:18px;border-bottom-left-radius:4px;width:fit-content}
.ttc-dot{width:7px;height:7px;border-radius:50%;background:var(--rce-text2);animation:rce-bounce 1.3s infinite}
.ttc-dot:nth-child(2){animation-delay:.2s}
.ttc-dot:nth-child(3){animation-delay:.4s}

/* ──────────── QUICK REPLIES ──────────── */
.ttc-qrs{display:flex;flex-wrap:wrap;gap:8px;padding:2px 0}
.ttc-qr{
  padding:7px 15px;border-radius:20px;
  border:1.5px solid var(--rce-accent);background:transparent;
  color:var(--rce-text);font-family:var(--rce-font);font-size:13px;font-weight:500;
  cursor:pointer;transition:background .2s,color .2s,transform .15s;outline:none;white-space:nowrap;
}
.ttc-qr:hover{background:var(--rce-accent);color:var(--rce-primary);transform:translateY(-1px)}
.ttc-qr:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.ttc-qr:active{transform:scale(.97)}
.ttc-qr.ttc-used{opacity:.5;pointer-events:none}

/* ──────────── BUTTONS ──────────── */
.ttc-btns{display:flex;flex-direction:column;gap:9px;width:100%;max-width:300px;margin-top:4px}
.ttc-btn{
  width:100%;padding:13px 14px;border-radius:12px;border:1.5px solid var(--rce-border);
  font-family:var(--rce-font);font-size:13.5px;font-weight:600;
  cursor:pointer;transition:all .22s ease;text-align:left;text-decoration:none;
  display:flex;align-items:center;gap:10px;outline:none;
  background:var(--rce-bg);color:var(--rce-text);
  box-shadow:0 2px 8px rgba(var(--rce-primary-rgb),.05);
}
.ttc-btn-nav-icon{
  width:36px;height:36px;border-radius:9px;flex-shrink:0;
  background:rgba(var(--rce-primary-rgb),.08);
  display:flex;align-items:center;justify-content:center;
  transition:background .22s;
}
.ttc-btn-nav-icon svg{width:17px;height:17px;color:var(--rce-primary)}
.ttc-btn-nav-label{flex:1;min-width:0}
.ttc-btn-nav-label strong{display:block;font-size:13.5px;color:var(--rce-text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ttc-btn-nav-label span{display:block;font-size:11px;font-weight:400;color:var(--rce-text2);margin-top:1px}
.ttc-btn-nav-arrow{flex-shrink:0;color:var(--rce-muted);transition:transform .2s,color .2s}
.ttc-btn-nav-arrow svg{width:14px;height:14px;display:block}
.ttc-btn:hover{background:rgba(var(--rce-primary-rgb),.04);border-color:rgba(var(--rce-primary-rgb),.35);transform:translateX(2px)}
.ttc-btn:hover .ttc-btn-nav-arrow{transform:translateX(3px);color:var(--rce-primary)}
.ttc-btn:hover .ttc-btn-nav-icon{background:rgba(var(--rce-primary-rgb),.14)}
.ttc-btn-accent{
  background:linear-gradient(135deg,var(--rce-primary),rgba(var(--rce-primary-rgb),.85));
  color:#fff;border-color:transparent;
  box-shadow:0 4px 16px rgba(var(--rce-primary-rgb),.3);
}
.ttc-btn-accent .ttc-btn-nav-icon{background:rgba(255,255,255,.18)}
.ttc-btn-accent .ttc-btn-nav-icon svg{color:#fff}
.ttc-btn-accent .ttc-btn-nav-label strong{color:#fff}
.ttc-btn-accent .ttc-btn-nav-label span{color:rgba(255,255,255,.72)}
.ttc-btn-accent .ttc-btn-nav-arrow{color:rgba(255,255,255,.55)}
.ttc-btn-accent:hover{transform:translateX(2px);box-shadow:0 7px 22px rgba(var(--rce-primary-rgb),.42);border-color:transparent}
.ttc-btn-accent:hover .ttc-btn-nav-icon{background:rgba(255,255,255,.26)}
.ttc-btn-accent:hover .ttc-btn-nav-arrow{color:rgba(255,255,255,.95);transform:translateX(3px)}
.ttc-btn:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.ttc-btn:active{transform:scale(.98)!important}
.ttc-btn svg{width:15px;height:15px;flex-shrink:0}

/* ──────────── LEAD FORM ──────────── */
.ttc-form{
  background:var(--rce-bg2);border-radius:14px;
  border:1px solid var(--rce-border);padding:16px;max-width:300px;
}
.ttc-form-title{
  font-family:var(--rce-font);font-size:14px;font-weight:700;color:var(--rce-text);
  margin-bottom:14px;display:flex;align-items:center;gap:8px;
}
.ttc-form-title svg{width:16px;height:16px;color:var(--rce-accent)}

.ttc-field{margin-bottom:10px}
.ttc-label{
  display:block;font-family:var(--rce-font);font-size:10.5px;font-weight:700;
  color:var(--rce-text2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;
}
.ttc-input,.ttc-select,.ttc-textarea{
  width:100%;padding:8px 12px;border-radius:8px;
  border:1.5px solid var(--rce-border);background:var(--rce-bg);
  color:var(--rce-text);font-family:var(--rce-font);font-size:13px;
  outline:none;transition:border-color .2s;
}
.ttc-textarea{resize:vertical;min-height:60px}
.ttc-input:focus,.ttc-select:focus,.ttc-textarea:focus{border-color:var(--rce-accent)}
.ttc-input::placeholder,.ttc-textarea::placeholder{color:var(--rce-muted)}
.ttc-input.ttc-err,.ttc-select.ttc-err{border-color:#ef4444}
.ttc-ferr{font-family:var(--rce-font);font-size:11px;color:#ef4444;margin-top:3px}

.ttc-consent{display:flex;gap:9px;align-items:flex-start;margin-bottom:12px}
.ttc-consent input[type=checkbox]{accent-color:var(--rce-accent);width:14px;height:14px;flex-shrink:0;margin-top:1px;cursor:pointer}
.ttc-consent-lbl{font-family:var(--rce-font);font-size:11px;color:var(--rce-text2);line-height:1.5}

.ttc-form-ok{text-align:center;padding:12px 8px;font-family:var(--rce-font);font-size:13px;color:#22c55e;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:8px}
.ttc-form-ok svg{width:28px;height:28px;color:#22c55e}

/* ──────────── HANDOFF ──────────── */
.ttc-handoff{
  display:flex;flex-direction:column;align-items:center;gap:10px;
  padding:18px;background:rgba(var(--rce-accent-rgb),.05);
  border-radius:14px;border:1px solid rgba(var(--rce-accent-rgb),.2);max-width:260px;
}
.ttc-handoff-icon{
  width:42px;height:42px;border-radius:50%;
  background:linear-gradient(135deg,var(--rce-accent),rgba(var(--rce-accent-rgb),.7));
  display:flex;align-items:center;justify-content:center;
  animation:rce-handoff-pulse 2s infinite;
}
.ttc-handoff-icon svg{width:20px;height:20px;color:var(--rce-primary)}
.ttc-handoff-text{font-family:var(--rce-font);font-size:13px;color:var(--rce-text2);text-align:center;line-height:1.5}

/* ──────────── ERROR MSG ──────────── */
.ttc-errmsg{
  display:flex;align-items:flex-start;gap:8px;padding:10px 14px;
  background:rgba(239,68,68,.07);border-radius:12px;
  border:1px solid rgba(239,68,68,.2);max-width:270px;
}
.ttc-errmsg svg{width:16px;height:16px;color:#ef4444;flex-shrink:0;margin-top:1px}
.ttc-errmsg-text{font-family:var(--rce-font);font-size:13px;color:#ef4444;line-height:1.5}

/* ──────────── INPUT AREA ──────────── */
.ttc-input-area{
  padding:12px 14px;background:var(--rce-bg);
  border-top:1px solid var(--rce-border);
  display:flex;flex-direction:column;gap:8px;flex-shrink:0;
}
.ttc-input-row{display:flex;align-items:flex-end;gap:8px}
.ttc-textarea-msg{
  flex:1;min-height:40px;max-height:120px;padding:10px 14px;
  border-radius:20px;border:1.5px solid var(--rce-border);
  background:var(--rce-input-bg);color:var(--rce-text);
  font-family:var(--rce-font);font-size:14px;resize:none;
  outline:none;transition:border-color .2s;line-height:1.4;
  overflow-y:auto;
}
.ttc-textarea-msg:focus{border-color:var(--rce-accent)}
.ttc-textarea-msg::placeholder{color:var(--rce-muted)}
.ttc-textarea-msg:disabled{opacity:.5;cursor:not-allowed}

.ttc-send{
  width:42px;height:42px;border-radius:50%;border:none;
  background:linear-gradient(135deg,var(--rce-accent),rgba(var(--rce-accent-rgb),.8));
  color:var(--rce-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all .2s;flex-shrink:0;outline:none;
  box-shadow:0 3px 10px rgba(var(--rce-accent-rgb),.35);
}
.ttc-send:hover:not(:disabled){transform:scale(1.08);box-shadow:0 5px 14px rgba(var(--rce-accent-rgb),.45)}
.ttc-send:disabled{opacity:.4;cursor:not-allowed}
.ttc-send:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.ttc-send svg{width:18px;height:18px}

.ttc-footer{display:flex;align-items:center;justify-content:space-between}
.ttc-powered{font-family:var(--rce-font);font-size:10px;color:var(--rce-muted);opacity:.6}
.ttc-char{font-family:var(--rce-font);font-size:10px;color:var(--rce-muted)}
.ttc-char.ttc-over{color:#ef4444}

/* ──────────── WELCOME / EMPTY STATE ──────────── */
.ttc-welcome{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding:24px 16px 8px;animation:rce-msgIn .4s ease}
.ttc-welcome-logo{
  width:60px;height:60px;border-radius:18px;overflow:hidden;
  border:2px solid var(--rce-accent);
  background:linear-gradient(135deg,var(--rce-primary),rgba(var(--rce-primary-rgb),.7));
  display:flex;align-items:center;justify-content:center;
}
.ttc-welcome-logo img{width:100%;height:100%;object-fit:cover}
.ttc-welcome-logo svg{width:30px;height:30px;color:var(--rce-accent)}
.ttc-welcome-title{font-family:var(--rce-font);font-size:17px;font-weight:800;color:var(--rce-text)}
.ttc-welcome-msg{font-family:var(--rce-font);font-size:13.5px;color:var(--rce-text2);line-height:1.6;max-width:240px}
.ttc-suggested{display:flex;flex-direction:column;gap:7px;width:100%;margin-top:4px}
.ttc-sug-btn{
  width:100%;padding:10px 14px;border-radius:10px;
  border:1.5px solid var(--rce-border);background:var(--rce-bg2);
  color:var(--rce-text);font-family:var(--rce-font);font-size:13px;font-weight:500;
  cursor:pointer;transition:all .2s;text-align:left;display:flex;align-items:center;gap:8px;outline:none;
}
.ttc-sug-btn:hover{background:rgba(var(--rce-accent-rgb),.07);border-color:var(--rce-accent);transform:translateX(2px)}
.ttc-sug-btn:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.ttc-sug-arrow{margin-left:auto;color:var(--rce-accent);flex-shrink:0}
.ttc-sug-arrow svg{width:13px;height:13px}

/* ──────────── BUSINESS HOURS NOTICE ──────────── */
.ttc-hours-notice{
  margin:0 14px 10px;padding:9px 14px;
  background:rgba(var(--rce-accent-rgb),.07);
  border:1px solid rgba(var(--rce-accent-rgb),.2);
  border-radius:10px;font-family:var(--rce-font);font-size:12px;
  color:var(--rce-text2);text-align:center;flex-shrink:0;
}

/* ──────────── DEBUG PANEL ──────────── */
.ttc-debug{
  background:#0d1117;border-top:1px solid #30363d;
  padding:8px 12px;max-height:150px;overflow-y:auto;flex-shrink:0;
}
.ttc-debug-title{font-family:monospace;font-size:10px;font-weight:700;color:#58a6ff;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.ttc-debug-entry{font-family:monospace;font-size:10px;line-height:1.6;border-bottom:1px solid #21262d;padding-bottom:4px;margin-bottom:4px}
.ttc-debug-entry:last-child{border-bottom:none}
.ttc-dl{color:#8b949e}.ttc-dv{color:#e6edf3;word-break:break-all}
.ttc-d-ok{color:#3fb950}.ttc-d-err{color:#f85149}.ttc-d-info{color:#58a6ff}.ttc-d-ms{color:#d29922}

/* ──────────── ANIMATIONS ──────────── */
@keyframes rce-msgIn{from{opacity:0;transform:translateY(10px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes rce-bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-7px);opacity:1}}
@keyframes ttc-pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes ttc-pop{from{transform:scale(0)}to{transform:scale(1)}}
@keyframes rce-handoff-pulse{0%,100%{box-shadow:0 0 0 0 rgba(var(--rce-accent-rgb),.45)}50%{box-shadow:0 0 0 12px rgba(var(--rce-accent-rgb),0)}}

/* ──────────── REDIRECT MSG ──────────── */
.ttc-redirect{display:flex;flex-direction:column;gap:8px;max-width:280px}
.ttc-redirect-text{font-family:var(--rce-font);font-size:13px;color:var(--rce-text2)}

/* ──────────── ACCESSIBILITY ──────────── */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
}
`;

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 13 · MESSAGE RENDERERS
  // ─────────────────────────────────────────────────────────────────────────────

  const Renderers = {
    text(msg) {
      const el = document.createElement('div');
      el.className = 'ttc-bubble ttc-bot';
      el.textContent = msg.content || '';
      return el;
    },

    markdown(msg) {
      const el = document.createElement('div');
      el.className = 'ttc-bubble ttc-bot';
      el.innerHTML = MarkdownParser.parse(msg.content || '');
      return el;
    },

    quick_replies(msg, widget) {
      const items = Array.isArray(msg.items) ? msg.items : [];
      if (!items.length) return null;

      const wrap = document.createElement('div');
      wrap.className = 'ttc-qrs';
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Quick reply options');

      items.forEach((item) => {
        const btn = document.createElement('button');
        btn.className = 'ttc-qr';
        btn.textContent = item.label || item.value || '';
        btn.setAttribute('aria-label', `Quick reply: ${item.label || item.value}`);
        btn.addEventListener('click', () => {
          wrap.querySelectorAll('.ttc-qr').forEach((b) => b.classList.add('ttc-used'));
          widget.sendMessage(item.value || item.label);
        });
        wrap.appendChild(btn);
      });

      return wrap;
    },

    buttons(msg, widget) {
      const items = Array.isArray(msg.items) ? msg.items : [];
      if (!items.length) return null;

      function iconForItem(item) {
        const key = (item.icon || item.label || item.value || '').toLowerCase();
        if (/cruise|ship|sail|sea/.test(key))   return Icons.ship;
        if (/flight|fly|air|plane/.test(key))   return Icons.plane;
        if (/hotel|stay|resort|room|sleep/.test(key)) return Icons.bed;
        if (/group|team|party|people|friends/.test(key)) return Icons.users;
        if (/insur|protect|shield|cover/.test(key)) return Icons.shield;
        if (/passport|visa|id.?card/.test(key)) return Icons.idcard;
        if (/ride|car|transfer|taxi|shuttle/.test(key)) return Icons.car;
        if (/contact|email|reach/.test(key)) return Icons.contact;
        if (/book|reserve|enquire|quote/.test(key)) return Icons.calendar;
        if (/location|destination|where|place/.test(key)) return Icons.location;
        if (/plan|trip|vacation|package/.test(key)) return Icons.calendar;
        return Icons.arrow;
      }

      const wrap = document.createElement('div');
      wrap.className = 'ttc-btns';
      wrap.setAttribute('role', 'group');

      items.forEach((item, i) => {
        const tag = item.url ? 'a' : 'button';
        const btn = document.createElement(tag);
        btn.className = `ttc-btn${i === 0 ? ' ttc-btn-accent' : ''}`;

        if (item.url) {
          btn.href = item.url;
          btn.target = '_blank';
          btn.rel = 'noopener noreferrer';
        }

        const iconBox = document.createElement('div');
        iconBox.className = 'ttc-btn-nav-icon';
        iconBox.appendChild(svgEl(iconForItem(item)));
        btn.appendChild(iconBox);

        const labelWrap = document.createElement('div');
        labelWrap.className = 'ttc-btn-nav-label';
        const strong = document.createElement('strong');
        strong.textContent = item.label || item.value || '';
        labelWrap.appendChild(strong);
        if (item.subtitle) {
          const sub = document.createElement('span');
          sub.textContent = item.subtitle;
          labelWrap.appendChild(sub);
        }
        btn.appendChild(labelWrap);

        const arrow = document.createElement('div');
        arrow.className = 'ttc-btn-nav-arrow';
        arrow.appendChild(svgEl(Icons.arrow));
        btn.appendChild(arrow);

        if (!item.url) {
          btn.addEventListener('click', () => {
            if (item.formTrigger) {
              widget._openLeadForm(item);
            } else {
              widget.sendMessage(item.value || item.label);
            }
          });
        }

        wrap.appendChild(btn);
      });

      return wrap;
    },

    lead_form(msg, widget) {
      return _buildLeadForm(msg, widget);
    },

    handoff(msg) {
      const wrap = document.createElement('div');
      wrap.className = 'ttc-handoff';
      wrap.setAttribute('role', 'status');

      const icon = document.createElement('div');
      icon.className = 'ttc-handoff-icon';
      icon.appendChild(svgEl(Icons.agent));
      wrap.appendChild(icon);

      const text = document.createElement('div');
      text.className = 'ttc-handoff-text';
      text.textContent = msg.message || 'Connecting you to a live agent…';
      wrap.appendChild(text);

      return wrap;
    },

    redirect(msg, widget) {
      if (msg.auto && msg.url) {
        setTimeout(() => { window.open(msg.url, '_blank', 'noopener,noreferrer'); }, 800);
      }

      const wrap = document.createElement('div');
      wrap.className = 'ttc-redirect';

      if (msg.content) {
        const text = document.createElement('div');
        text.className = 'ttc-redirect-text';
        text.textContent = msg.content;
        wrap.appendChild(text);
      }

      if (msg.url) {
        const a = document.createElement('a');
        a.className = 'ttc-btn ttc-btn-accent';
        a.href = msg.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.appendChild(svgEl(Icons.externalLink));
        const lbl = document.createElement('span');
        lbl.textContent = msg.label || 'Open Link';
        a.appendChild(lbl);
        wrap.appendChild(a);
      }

      return wrap;
    },

    error(msg) {
      const wrap = document.createElement('div');
      wrap.className = 'ttc-errmsg';
      wrap.setAttribute('role', 'alert');
      wrap.appendChild(svgEl(Icons.alert));

      const text = document.createElement('div');
      text.className = 'ttc-errmsg-text';
      text.textContent = msg.content || 'Something went wrong. Please try again.';
      wrap.appendChild(text);

      return wrap;
    },
  };

  function _buildLeadForm(msg, widget) {
    const allowedFields = ['name', 'email', 'phone', 'destination', 'tripType', 'travelDates', 'message'];
    const fields = (Array.isArray(msg.fields) ? msg.fields : allowedFields)
      .filter((f) => allowedFields.includes(f));

    const form = document.createElement('div');
    form.className = 'ttc-form';
    form.setAttribute('role', 'form');
    form.setAttribute('aria-label', 'Lead capture form');

    const titleRow = document.createElement('div');
    titleRow.className = 'ttc-form-title';
    titleRow.appendChild(svgEl(Icons.contact));
    const titleTxt = document.createElement('span');
    titleTxt.textContent = msg.title || 'Get in Touch';
    titleRow.appendChild(titleTxt);
    form.appendChild(titleRow);

    const inputEls = {};

    const fieldDefs = {
      name:     { label: 'Full Name',        type: 'text',  placeholder: 'Your full name',      required: true },
      email:    { label: 'Email Address',     type: 'email', placeholder: 'your@email.com',      required: true },
      phone:    { label: 'Phone Number',      type: 'tel',   placeholder: '+1 (555) 000-0000',   required: false },
      destination: { label: 'Destination',    type: 'text',  placeholder: 'Where would you like to go?', required: false },
      tripType: { label: 'Trip Type',         type: 'select',options: ['Flight', 'Hotel / Stay', 'Cruise', 'Vacation Package', 'Not sure yet'], required: false },
      travelDates: { label: 'Travel Dates',   type: 'text',  placeholder: 'e.g. Aug 10–20, 2026 or Flexible', required: false },
      message:  { label: 'Message',           type: 'textarea', placeholder: 'Tell us more about your trip — number of travelers, budget, etc.', required: false },
    };

    fields.forEach((f) => {
      const def = fieldDefs[f];
      if (!def) return;

      const fieldWrap = document.createElement('div');
      fieldWrap.className = 'ttc-field';

      const label = document.createElement('label');
      label.className = 'ttc-label';
      label.textContent = def.label + (def.required ? ' *' : '');
      const inputId = `ttc-field-${f}`;
      label.setAttribute('for', inputId);
      fieldWrap.appendChild(label);

      let input;
      if (def.type === 'select') {
        input = document.createElement('select');
        input.className = 'ttc-select';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select an option';
        input.appendChild(placeholder);
        def.options.forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
      } else if (def.type === 'textarea') {
        input = document.createElement('textarea');
        input.className = 'ttc-textarea';
        input.placeholder = def.placeholder || '';
        input.rows = 3;
      } else {
        input = document.createElement('input');
        input.className = 'ttc-input';
        input.type = def.type;
        input.placeholder = def.placeholder || '';
        input.autocomplete = f === 'email' ? 'email' : f === 'name' ? 'name' : f === 'phone' ? 'tel' : 'off';
      }

      input.id = inputId;
      input.name = f;
      if (def.required) input.required = true;

      const errEl = document.createElement('div');
      errEl.className = 'ttc-ferr';
      errEl.setAttribute('role', 'alert');
      errEl.setAttribute('aria-live', 'polite');

      fieldWrap.appendChild(input);
      fieldWrap.appendChild(errEl);
      form.appendChild(fieldWrap);
      inputEls[f] = { input, errEl, def };
    });

    const consentWrap = document.createElement('div');
    consentWrap.className = 'ttc-consent';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'ttc-consent';
    checkbox.required = true;
    const consentLbl = document.createElement('label');
    consentLbl.className = 'ttc-consent-lbl';
    consentLbl.setAttribute('for', 'ttc-consent');
    consentLbl.textContent = `I agree to be contacted by ${widget._config.agencyName} regarding my enquiry.`;
    consentWrap.appendChild(checkbox);
    consentWrap.appendChild(consentLbl);
    form.appendChild(consentWrap);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'ttc-btn ttc-btn-accent';
    submitBtn.style.width = '100%';
    submitBtn.style.marginTop = '4px';
    submitBtn.textContent = msg.submitLabel || 'Send Enquiry';

    const consentErr = document.createElement('div');
    consentErr.className = 'ttc-ferr';
    consentErr.setAttribute('role', 'alert');

    form.appendChild(submitBtn);
    form.appendChild(consentErr);

    submitBtn.addEventListener('click', async () => {
      let valid = true;

      for (const [, { input: inp, errEl, def }] of Object.entries(inputEls)) {
        errEl.textContent = '';
        inp.classList.remove('ttc-err');
        const val = inp.value.trim();
        if (def.required && !val) {
          errEl.textContent = `${def.label} is required.`;
          inp.classList.add('ttc-err');
          valid = false;
        } else if (def.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          errEl.textContent = 'Please enter a valid email address.';
          inp.classList.add('ttc-err');
          valid = false;
        }
      }

      if (!checkbox.checked) {
        consentErr.textContent = 'Please accept the consent to continue.';
        valid = false;
      } else {
        consentErr.textContent = '';
      }

      if (!valid) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      const formData = {};
      for (const [key, { input: inp }] of Object.entries(inputEls)) {
        formData[key] = inp.value.trim();
      }

      try {
        await widget._sendToWebhook({
          messageType: 'lead_form_submit',
          content: `Lead form submitted by ${formData.name || 'visitor'}`,
          formData,
        });

        form.innerHTML = '';
        const ok = document.createElement('div');
        ok.className = 'ttc-form-ok';
        ok.appendChild(svgEl(Icons.check));
        const okText = document.createElement('span');
        okText.textContent = 'Enquiry sent';
        ok.appendChild(okText);
        form.appendChild(ok);
      } catch {
        submitBtn.disabled = false;
        submitBtn.textContent = msg.submitLabel || 'Send Enquiry';
        consentErr.textContent = 'Submission failed. Please try again.';
      }
    });

    return form;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 13b · AUTO-NAVIGATION — keyword → site buttons
  // ─────────────────────────────────────────────────────────────────────────────

  const AUTO_NAV = [
    {
      keywords: /cruise|ship|sail|caribbean|mediterranean|bahamas|alaska|voyage|royal|carnival|ncl|celebrity|disney cruise/i,
      items: [
        {
          label: 'Browse Cruises',
          subtitle: 'Caribbean, Mediterranean & more',
          url: 'https://tajeblack.inteletravel.com',
          icon: 'cruise',
        },
        {
          label: 'Get a Cruise Quote',
          subtitle: 'Fill out a quick form',
          formTrigger: true,
          formTitle: 'Get Your Cruise Quote',
          icon: 'contact',
        },
      ],
    },
    {
      keywords: /flight|fly|airline|airfare|ticket|airport|one.way|round.trip|nonstop|layover/i,
      items: [
        {
          label: 'Search Flights',
          subtitle: 'Best fares to any destination',
          url: 'https://tajeblack.inteletravel.com',
          icon: 'plane',
        },
        {
          label: 'Ask Taje About Flights',
          subtitle: 'Fill out a quick form',
          formTrigger: true,
          formTitle: 'Get Your Flight Quote',
          icon: 'contact',
        },
      ],
    },
    {
      keywords: /hotel|stay|resort|room|accommodation|airbnb|lodge|inn|suite|villa|all.inclusive/i,
      items: [
        {
          label: 'Browse Hotels & Stays',
          subtitle: 'Resorts, villas & curated stays',
          url: 'https://tajeblack.inteletravel.com',
          icon: 'bed',
        },
        {
          label: 'Ask Taje About Stays',
          subtitle: 'Fill out a quick form',
          formTrigger: true,
          formTitle: 'Get Your Stay Recommendation',
          icon: 'contact',
        },
      ],
    },
    {
      keywords: /group|party|reunion|corporate|team|friends|wedding|honeymoon|bachelorette|birthday|family trip|church|sorority|fraternity/i,
      items: [
        {
          label: 'Plan a Group Vacation',
          subtitle: 'Birthdays, reunions & group getaways',
          url: 'https://tajeblack.inteletravel.com',
          icon: 'group',
        },
        {
          label: 'Contact Taje for Groups',
          subtitle: 'Fill out a quick form',
          formTrigger: true,
          formTitle: 'Get Your Group Quote',
          icon: 'contact',
        },
      ],
    },
    {
      keywords: /insur|protect|cover|policy|cancel|emergency|medical|lost bag|refund/i,
      items: [
        {
          label: 'Travel Insurance',
          subtitle: 'Peace of mind for every journey',
          url: 'https://www.etravelprotection.com/allianz/home',
          icon: 'shield',
        },
        {
          label: 'Why You Need Insurance',
          subtitle: 'Read Taje\'s guide (PDF)',
          url: 'https://d3nyn9h0k44yua.cloudfront.net/media/backoffice/us/pdf/WhyPurchaseInsurance.pdf',
          icon: 'externalLink',
        },
      ],
    },
    {
      keywords: /activity|activities|excursion|tour|experience|things to do|adventure|event/i,
      items: [
        {
          label: 'Browse Activities & Tours',
          subtitle: 'Excursions & local experiences',
          url: 'https://tajeblack.inteletravel.com',
          icon: 'calendar',
        },
        {
          label: 'Ask Taje',
          subtitle: 'Fill out a quick form',
          formTrigger: true,
          formTitle: 'Get Activity Recommendations',
          icon: 'contact',
        },
      ],
    },
    {
      keywords: /ride|car service|airport pickup|airport transfer|shuttle|taxi|car rental|private driver/i,
      items: [
        {
          label: 'Browse Rides',
          subtitle: 'Airport transfers & private cars',
          url: 'https://tajeblack.inteletravel.com',
          icon: 'ride',
        },
        {
          label: 'Ask Taje About Rides',
          subtitle: 'Fill out a quick form',
          formTrigger: true,
          formTitle: 'Get Your Ride Quote',
          icon: 'contact',
        },
      ],
    },
    {
      keywords: /passport|visa|entry requirement|documentation needed|travel document/i,
      items: [
        {
          label: 'Passports & Visas',
          subtitle: '40% off service fees via CIBT',
          url: 'https://cibtvisas.com/?login=inteletravel',
          icon: 'idcard',
        },
        {
          label: 'Ask Taje',
          subtitle: 'Fill out a quick form',
          formTrigger: true,
          formTitle: 'Get Help With Your Documents',
          icon: 'contact',
        },
      ],
    },
    {
      keywords: /book|reserve|enquire|contact|quote|plan|help|vacation|trip|package|deal|where.*go|going.*to|travel/i,
      items: [
        {
          label: 'Book with Taje',
          subtitle: 'Start planning your dream trip',
          url: 'https://tajeblack.inteletravel.com',
          icon: 'calendar',
        },
        {
          label: 'Get a Quote',
          subtitle: 'Fill out a quick form',
          formTrigger: true,
          icon: 'contact',
        },
      ],
    },
  ];

  function _buildAutoNavButtons(text, widget) {
    if (!text || typeof text !== 'string') return null;
    for (let i = 0; i < AUTO_NAV.length; i++) {
      if (AUTO_NAV[i].keywords.test(text)) {
        if (widget._lastNavTopic === i) return null;
        widget._lastNavTopic = i;
        return Renderers.buttons({ items: AUTO_NAV[i].items }, widget);
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 14 · DEBUG PANEL
  // ─────────────────────────────────────────────────────────────────────────────

  const DebugPanel = (() => {
    let _el = null;
    const _entries = [];
    const MAX_ENTRIES = 20;

    function _row(label, value, cls = '') {
      const entry = document.createElement('div');
      entry.className = 'ttc-debug-entry';
      const lEl = document.createElement('span');
      lEl.className = 'ttc-dl';
      lEl.textContent = `[${label}] `;
      const vEl = document.createElement('span');
      vEl.className = `ttc-dv ${cls}`;
      vEl.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
      entry.appendChild(lEl);
      entry.appendChild(vEl);
      return entry;
    }

    function mount(shadow) {
      _el = shadow.querySelector('.ttc-debug');
      if (!_el) return null;
      const title = document.createElement('div');
      title.className = 'ttc-debug-title';
      title.textContent = `🛠 Debug — Widget v${VERSION}`;
      _el.appendChild(title);
      return _el;
    }

    function log(label, value, type = 'info') {
      if (!_el) return;
      const cls = type === 'ok' ? 'ttc-d-ok' : type === 'err' ? 'ttc-d-err' : type === 'ms' ? 'ttc-d-ms' : 'ttc-d-info';
      const row = _row(label, value, cls);
      _entries.push(row);
      if (_entries.length > MAX_ENTRIES) {
        const old = _entries.shift();
        old.parentNode?.removeChild(old);
      }
      _el.appendChild(row);
      _el.scrollTop = _el.scrollHeight;
    }

    function destroy() { _el = null; _entries.length = 0; }

    return { mount, log, destroy };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 15 · CHAT WIDGET (Main Controller)
  // ─────────────────────────────────────────────────────────────────────────────

  class ChatWidget {
    constructor(config) {
      this._config = config;
      this._sessionId = this._resolveSessionId();
      this._messages = [];
      this._open = false;
      this._visible = true;
      this._loading = false;
      this._handoff = false;
      this._lastNavTopic = -1;
      this._unread = 0;
      this._host = null;
      this._shadow = null;

      this._panel = null;
      this._launcher = null;
      this._badge = null;
      this._msgs = null;
      this._textarea = null;
      this._sendBtn = null;
      this._chatIcon = null;
      this._closeIcon = null;
      this._visitorInfo = null;

      this._boundKeyDown = this._onKeyDown.bind(this);
      this._boundResize = debounce(this._onResize.bind(this), 150);
    }

    mount() {
      const stale = document.getElementById('ttc-widget-root');
      if (stale) {
        console.warn('[TayTravelsChatbot] Found an existing #ttc-widget-root — removing it before mounting.');
        stale.remove();
      }

      this._host = document.createElement('div');
      this._host.id = 'ttc-widget-root';
      this._host.setAttribute('aria-label', 'Chat widget');
      document.body.appendChild(this._host);

      this._shadow = this._host.attachShadow({ mode: 'closed' });

      this._injectStyles();
      this._buildDOM();
      this._applyTheme();
      this._bindEvents();

      if (this._config.persistConversation) {
        this._restoreSession();
      }

      if (!this._messages.length) {
        this._sendWelcomeMessage();
      }

      if (this._config.debug) {
        DebugPanel.mount(this._shadow);
        DebugPanel.log('INIT', { version: VERSION, webhook: this._config.webhook }, 'info');
      }

      EventBus.on('webhook:success', ({ payload, response, ms }) => {
        if (!this._config.debug) return;
        DebugPanel.log('OUT', payload, 'info');
        DebugPanel.log('IN', response, 'ok');
        DebugPanel.log('ms', ms, 'ms');
      });
      EventBus.on('webhook:error', ({ error }) => {
        if (!this._config.debug) return;
        DebugPanel.log('ERR', error.message, 'err');
      });
    }

    _resolveSessionId() {
      const stored = Storage.get('session');
      if (stored && stored.id && stored.ts) {
        const age = Date.now() - stored.ts;
        if (age < this._config.sessionMaxAge) return stored.id;
      }
      const newId = generateUUID();
      Storage.set('session', { id: newId, ts: Date.now() });
      return newId;
    }

    _restoreSession() {
      const stored = Storage.get('messages');
      if (!Array.isArray(stored) || !stored.length) return;

      const sessionTs = Storage.get('session')?.ts || 0;
      const age = Date.now() - sessionTs;
      if (age > this._config.sessionMaxAge) return;

      this._visitorInfo = Storage.get('visitor') || null;
      this._messages = stored.slice();
      stored.forEach((msg) => this._rehydrateMessage(msg));
      if (this._handoff) {
        this._setInputDisabled(true, 'Connected to a live agent. Conversation continues here.');
      }
    }

    _persistMessages() {
      if (!this._config.persistConversation) return;
      Storage.set('messages', this._messages.slice(-60));
      if (this._visitorInfo) {
        Storage.set('visitor', this._visitorInfo);
      }
    }

    _injectStyles() {
      const style = document.createElement('style');
      style.textContent = SHADOW_CSS;
      this._shadow.appendChild(style);
    }

    _buildDOM() {
      const posClass = this._config.position === 'bottom-left' ? 'pos-left' : '';

      this._launcher = document.createElement('button');
      this._launcher.className = `ttc-launcher ${posClass}`;
      this._launcher.setAttribute('aria-label', `Open ${this._config.assistantName} chat`);
      this._launcher.setAttribute('aria-haspopup', 'dialog');
      this._launcher.setAttribute('aria-expanded', 'false');

      this._chatIcon = svgEl(Icons.chat);
      this._chatIcon.setAttribute('class', 'ttc-launcher-icon');
      this._closeIcon = svgEl(Icons.close);
      this._closeIcon.setAttribute('class', 'ttc-launcher-icon ttc-hidden');

      this._badge = document.createElement('span');
      this._badge.className = 'ttc-badge ttc-hidden';
      this._badge.setAttribute('aria-label', '0 unread messages');

      this._launcher.appendChild(this._chatIcon);
      this._launcher.appendChild(this._closeIcon);
      this._launcher.appendChild(this._badge);
      this._shadow.appendChild(this._launcher);

      this._panel = document.createElement('div');
      this._panel.className = `ttc-panel ${posClass}`;
      this._panel.setAttribute('role', 'dialog');
      this._panel.setAttribute('aria-modal', 'true');
      this._panel.setAttribute('aria-label', `${this._config.assistantName} – ${this._config.agencyName}`);

      this._panel.appendChild(this._buildHeader());

      this._msgs = document.createElement('div');
      this._msgs.className = 'ttc-msgs';
      this._msgs.setAttribute('role', 'log');
      this._msgs.setAttribute('aria-live', 'polite');
      this._msgs.setAttribute('aria-label', 'Conversation');
      this._panel.appendChild(this._msgs);

      if (!BusinessHours.isOpen(this._config.businessHours)) {
        const notice = document.createElement('div');
        notice.className = 'ttc-hours-notice';
        notice.textContent = "We're currently outside business hours. Leave a message and we'll get back to you.";
        this._panel.appendChild(notice);
      }

      this._panel.appendChild(this._buildInputArea());

      if (this._config.debug) {
        const debugEl = document.createElement('div');
        debugEl.className = 'ttc-debug';
        this._panel.appendChild(debugEl);
      }

      this._shadow.appendChild(this._panel);
    }

    _buildHeader() {
      const header = document.createElement('header');
      header.className = 'ttc-header';

      const avatar = document.createElement('div');
      avatar.className = 'ttc-avatar';
      if (this._config.avatar) {
        const img = document.createElement('img');
        img.src = this._config.avatar;
        img.alt = this._config.assistantName;
        avatar.appendChild(img);
      } else {
        avatar.appendChild(svgEl(Icons.bot));
      }
      header.appendChild(avatar);

      const info = document.createElement('div');
      info.className = 'ttc-header-info';

      const name = document.createElement('div');
      name.className = 'ttc-agent-name';
      name.textContent = this._config.assistantName;
      info.appendChild(name);

      const status = document.createElement('div');
      status.className = 'ttc-status';
      const dot = document.createElement('span');
      dot.className = 'ttc-status-dot';
      status.appendChild(dot);
      const statusText = document.createElement('span');
      statusText.textContent = BusinessHours.isOpen(this._config.businessHours)
        ? 'Online · Typically replies instantly'
        : 'Away · Will reply when back';
      status.appendChild(statusText);
      info.appendChild(status);
      header.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'ttc-header-actions';

      const restartBtn = document.createElement('button');
      restartBtn.className = 'ttc-hbtn';
      restartBtn.setAttribute('aria-label', 'Restart conversation');
      restartBtn.title = 'Restart conversation';
      restartBtn.appendChild(svgEl(Icons.restart));
      restartBtn.addEventListener('click', () => this.restart());
      actions.appendChild(restartBtn);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ttc-hbtn';
      closeBtn.setAttribute('aria-label', 'Close chat');
      closeBtn.title = 'Close chat';
      closeBtn.appendChild(svgEl(Icons.close));
      closeBtn.addEventListener('click', () => this.close());
      actions.appendChild(closeBtn);

      header.appendChild(actions);
      return header;
    }

    _buildInputArea() {
      const area = document.createElement('div');
      area.className = 'ttc-input-area';

      const row = document.createElement('div');
      row.className = 'ttc-input-row';

      this._textarea = document.createElement('textarea');
      this._textarea.className = 'ttc-textarea-msg';
      this._textarea.placeholder = 'Type a message…';
      this._textarea.rows = 1;
      this._textarea.setAttribute('aria-label', 'Message input');
      this._textarea.setAttribute('aria-multiline', 'true');
      this._textarea.setAttribute('maxlength', MAX_INPUT_LENGTH);

      this._sendBtn = document.createElement('button');
      this._sendBtn.className = 'ttc-send';
      this._sendBtn.setAttribute('aria-label', 'Send message');
      this._sendBtn.appendChild(svgEl(Icons.send));

      row.appendChild(this._textarea);
      row.appendChild(this._sendBtn);
      area.appendChild(row);

      const footer = document.createElement('div');
      footer.className = 'ttc-footer';

      if (this._config.poweredBy) {
        const powered = document.createElement('span');
        powered.className = 'ttc-powered';
        powered.textContent = `${this._config.agencyName} AI Assistant`;
        footer.appendChild(powered);
      }

      const charCount = document.createElement('span');
      charCount.className = 'ttc-char';
      charCount.setAttribute('aria-live', 'polite');
      footer.appendChild(charCount);

      this._charCountEl = charCount;
      area.appendChild(footer);

      return area;
    }

    _applyTheme() {
      const { primary, accent, mode = 'auto' } = this._config.theme;
      const host = this._shadow.host;

      host.setAttribute('data-theme', mode);

      if (this._config.zIndex) {
        this._launcher.style.zIndex = this._config.zIndex;
        this._panel.style.zIndex = this._config.zIndex;
      }

      if (this._config.borderRadius) {
        const radius = `${this._config.borderRadius}px`;
        this._panel.style.borderRadius = radius;
        this._shadow.host.style.setProperty('--rce-radius', radius);
      }

      if (primary) {
        const rgb = hexToRgb(primary);
        if (rgb) {
          this._shadow.host.style.setProperty('--rce-primary', primary);
          this._shadow.host.style.setProperty('--rce-primary-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
          this._shadow.host.style.setProperty('--rce-user-bg', primary);
          this._shadow.host.style.setProperty('--rce-user-color', isLightColor(primary) ? '#0f172a' : '#ffffff');
        }
      }

      if (accent) {
        const rgb = hexToRgb(accent);
        if (rgb) {
          this._shadow.host.style.setProperty('--rce-accent', accent);
          this._shadow.host.style.setProperty('--rce-accent-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
        }
      }
    }

    _bindEvents() {
      this._launcher.addEventListener('click', () => this._open ? this.close() : this.open());

      this._sendBtn.addEventListener('click', () => this._submitMessage());

      this._textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._submitMessage();
        }
      });

      this._textarea.addEventListener('input', () => {
        this._textarea.style.height = 'auto';
        this._textarea.style.height = Math.min(this._textarea.scrollHeight, 120) + 'px';
        this._updateCharCount();
      });

      document.addEventListener('keydown', this._boundKeyDown);
      window.addEventListener('resize', this._boundResize);
    }

    _onKeyDown(e) {
      if (e.key === 'Escape' && this._open) this.close();
    }

    _onResize() {
      // Nothing needed — CSS handles responsive breakpoints
    }

    _updateCharCount() {
      const len = this._textarea.value.length;
      if (len > MAX_INPUT_LENGTH * 0.8) {
        this._charCountEl.textContent = `${len}/${MAX_INPUT_LENGTH}`;
        this._charCountEl.classList.toggle('ttc-over', len >= MAX_INPUT_LENGTH);
      } else {
        this._charCountEl.textContent = '';
      }
    }

    open() {
      this._open = true;
      this._panel.classList.add('ttc-open');
      this._chatIcon.classList.add('ttc-hidden');
      this._closeIcon.classList.remove('ttc-hidden');
      this._launcher.setAttribute('aria-expanded', 'true');
      this._launcher.setAttribute('aria-label', 'Close chat');
      this._clearBadge();
      this._scrollToBottom();
      setTimeout(() => this._textarea?.focus(), 350);
      EventBus.emit('widget:open');
    }

    close() {
      this._open = false;
      this._panel.classList.remove('ttc-open');
      this._chatIcon.classList.remove('ttc-hidden');
      this._closeIcon.classList.add('ttc-hidden');
      this._launcher.setAttribute('aria-expanded', 'false');
      this._launcher.setAttribute('aria-label', `Open ${this._config.assistantName} chat`);
      this._launcher.focus();
      EventBus.emit('widget:close');
    }

    show() {
      this._visible = true;
      this._launcher.style.display = '';
    }

    hide() {
      this._visible = false;
      this._launcher.style.display = 'none';
      if (this._open) this.close();
    }

    destroy() {
      document.removeEventListener('keydown', this._boundKeyDown);
      window.removeEventListener('resize', this._boundResize);
      EventBus.clear();
      DebugPanel.destroy();
      this._host?.parentNode?.removeChild(this._host);
      this._host = null;
    }

    restart() {
      this._messages = [];
      this._sessionId = generateUUID();
      Storage.set('session', { id: this._sessionId, ts: Date.now() });
      Storage.remove('messages');
      Storage.remove('visitor');
      this._visitorInfo = null;
      this._handoff = false;
      this._loading = false;
      this._lastNavTopic = -1;
      this._unread = 0;
      this._setInputDisabled(false);
      this._msgs.innerHTML = '';
      this._sendWelcomeMessage();
      EventBus.emit('widget:restart');
    }

    _submitMessage() {
      const text = this._textarea.value.trim();
      if (!text || this._loading || this._handoff) return;
      this._textarea.value = '';
      this._textarea.style.height = 'auto';
      this._charCountEl.textContent = '';
      this.sendMessage(text);
    }

    async _openLeadForm(item = {}) {
      if (this._handoff) return;
      await this._renderBotMessage({
        type: 'lead_form',
        title: item.formTitle || 'Get Your Free Travel Quote',
        fields: item.formFields || ['name', 'email', 'phone', 'destination', 'tripType', 'travelDates', 'message'],
        submitLabel: item.formSubmitLabel || 'Send My Enquiry',
      });
      this._persistMessages();
    }

    async sendMessage(text, type = 'text') {
      if (!text || this._handoff || this._loading) return;

      const welcomeEl = this._msgs.querySelector('.ttc-welcome');
      if (welcomeEl) welcomeEl.remove();

      this._appendMessage({ role: 'user', content: text, ts: Date.now() });

      this._loading = true;
      this._setInputDisabled(true);
      const typingRow = this._appendTyping();

      const context = Context.collect();
      const payload = {
        chatInput: text,
        message: text,
        sessionId: this._sessionId,
        messageType: type,
        body: {
          agencyName: this._config.agencyName,
          assistantName: this._config.assistantName,
          propertyContext: context.property,
          page: {
            url: context.url,
            title: context.title,
            referrer: context.referrer,
            viewport: context.viewport,
            utm: context.utm,
            language: context.language,
            timestamp: context.timestamp
          },
          visitor: this._visitorInfo || { name: null, email: null, phone: null }
        }
      };

      if (this._config.debug) {
        DebugPanel.log('SEND', payload, 'info');
      }

      try {
        const raw = await WebhookClient.send(this._config.webhook, payload);
        typingRow.remove();

        const { messages, sessionId } = ResponseParser.parse(raw);
        if (sessionId) this._sessionId = sessionId;

        for (const msg of messages) {
          await this._renderBotMessage(msg);
          if (msg.type === 'handoff') {
            this._handoff = true;
            this._setInputDisabled(true, 'Connected to a live agent. Conversation continues here.');
          }
        }

        const aiAlreadyActed = messages.some(
          (m) => m.type === 'buttons' || m.type === 'lead_form' || m.type === 'quick_replies'
        );
        if (!this._handoff && !aiAlreadyActed) {
          const navNode = _buildAutoNavButtons(text, this);
          if (navNode) {
            await new Promise((r) => setTimeout(r, 180));
            const row = document.createElement('div');
            row.className = 'ttc-row';
            const body = document.createElement('div');
            body.className = 'ttc-msg-body';
            body.appendChild(navNode);
            row.appendChild(body);
            this._msgs.appendChild(row);
            this._scrollToBottom();
          }
        }

        this._persistMessages();
      } catch (err) {
        typingRow.remove();
        await this._renderBotMessage({ type: 'error', content: err.message || 'Connection failed. Please try again.' });
      } finally {
        this._loading = false;
        if (!this._handoff) this._setInputDisabled(false);
      }
    }

    async _sendToWebhook(extra = {}) {
      const context = Context.collect();

      if (extra.formData) {
        this._visitorInfo = {
          name: extra.formData.name || null,
          email: extra.formData.email || null,
          phone: extra.formData.phone || null
        };
      }

      const payload = {
        chatInput: extra.content || "",
        message: extra.content || "",
        sessionId: this._sessionId,
        messageType: extra.messageType || "text",
        formData: extra.formData || null,
        body: {
          agencyName: this._config.agencyName,
          assistantName: this._config.assistantName,
          propertyContext: context.property,
          page: {
            url: context.url,
            title: context.title,
            referrer: context.referrer,
            viewport: context.viewport,
            utm: context.utm,
            language: context.language,
            timestamp: context.timestamp
          },
          visitor: this._visitorInfo || { name: null, email: null, phone: null }
        }
      };

      const isLeadSubmit = extra.messageType === 'lead_form_submit';
      const raw = await WebhookClient.send(this._config.webhook, payload, { retries: isLeadSubmit ? 0 : 1 });
      const { messages } = ResponseParser.parse(raw);
      for (const msg of messages) await this._renderBotMessage(msg);
    }

    async _renderBotMessage(msg) {
      const renderer = Renderers[msg.type];
      if (!renderer) {
        if (this._config.debug) DebugPanel.log('UNKNOWN TYPE', msg.type, 'err');
        return;
      }

      const node = renderer(msg, this);
      if (!node) return;

      const row = document.createElement('div');
      row.className = 'ttc-row';

      const av = document.createElement('div');
      av.className = 'ttc-msg-av';
      av.setAttribute('aria-hidden', 'true');
      if (this._config.avatar) {
        const img = document.createElement('img');
        img.src = this._config.avatar;
        img.alt = '';
        av.appendChild(img);
      } else {
        av.appendChild(svgEl(Icons.bot));
      }
      row.appendChild(av);

      const body = document.createElement('div');
      body.className = 'ttc-msg-body';
      body.appendChild(node);

      const ts = document.createElement('div');
      ts.className = 'ttc-ts';
      ts.setAttribute('aria-label', `Sent at ${formatTime()}`);
      ts.textContent = formatTime();
      body.appendChild(ts);

      row.appendChild(body);

      this._msgs.appendChild(row);
      this._scrollToBottom();

      const msgRecord = { role: 'bot', type: msg.type, content: msg.content || null, ts: Date.now() };
      this._messages.push(msgRecord);

      if (!this._open) this._incrementBadge();

      this._trimMessages();

      await new Promise((r) => setTimeout(r, 120));
    }

    _appendMessage(msg, record = true) {
      const row = document.createElement('div');
      row.className = 'ttc-row ttc-user';

      const body = document.createElement('div');
      body.className = 'ttc-msg-body';

      const bubble = document.createElement('div');
      bubble.className = 'ttc-bubble ttc-user';
      bubble.textContent = msg.content;

      const ts = document.createElement('div');
      ts.className = 'ttc-ts';
      ts.textContent = formatTime(new Date(msg.ts));

      body.appendChild(bubble);
      body.appendChild(ts);
      row.appendChild(body);

      const av = document.createElement('div');
      av.className = 'ttc-msg-av';
      av.setAttribute('aria-hidden', 'true');
      av.appendChild(svgEl(Icons.user));
      row.appendChild(av);

      this._msgs.appendChild(row);
      this._scrollToBottom();
      if (record) this._messages.push(msg);
      this._trimMessages();
    }

    _rehydrateMessage(msg) {
      if (msg.role === 'user') {
        this._appendMessage(msg, false);
      } else if (msg.role === 'bot' && msg.type) {
        if (msg.type === 'lead_form' || msg.type === 'buttons' || msg.type === 'quick_replies') return;
        if (msg.type === 'handoff') this._handoff = true;
        const renderer = Renderers[msg.type];
        if (!renderer) return;
        const node = renderer(msg, this);
        if (!node) return;

        const row = document.createElement('div');
        row.className = 'ttc-row';

        const av = document.createElement('div');
        av.className = 'ttc-msg-av';
        av.setAttribute('aria-hidden', 'true');
        av.appendChild(svgEl(Icons.bot));
        row.appendChild(av);

        const body = document.createElement('div');
        body.className = 'ttc-msg-body';
        body.appendChild(node);
        if (msg.ts) {
          const ts = document.createElement('div');
          ts.className = 'ttc-ts';
          ts.textContent = formatTime(new Date(msg.ts));
          body.appendChild(ts);
        }
        row.appendChild(body);
        this._msgs.appendChild(row);
      }
    }

    _appendTyping() {
      const row = document.createElement('div');
      row.className = 'ttc-row';

      const av = document.createElement('div');
      av.className = 'ttc-msg-av';
      av.setAttribute('aria-hidden', 'true');
      av.appendChild(svgEl(Icons.bot));
      row.appendChild(av);

      const typing = document.createElement('div');
      typing.className = 'ttc-typing';
      typing.setAttribute('role', 'status');
      typing.setAttribute('aria-label', `${this._config.assistantName} is typing`);
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.className = 'ttc-dot';
        dot.setAttribute('aria-hidden', 'true');
        typing.appendChild(dot);
      }
      row.appendChild(typing);
      this._msgs.appendChild(row);
      this._scrollToBottom();
      return row;
    }

    /**
     * Send the welcome message as a real, first chat bubble — not a static
     * decorative panel. Shows a brief typing indicator, then the message,
     * then (optionally) suggested-question quick-replies. Both get pushed
     * into _messages and persisted, so this only fires once per session
     * (on restore, _restoreSession finds the saved messages and skips this).
     */
    async _sendWelcomeMessage() {
      const questions = this._config.suggestedQuestions || [];
      if (!this._config.welcomeMessage && !questions.length) return;

      const typingRow = this._appendTyping();
      await new Promise((r) => setTimeout(r, 500));
      typingRow.remove();

      if (this._config.welcomeMessage) {
        await this._renderBotMessage({ type: 'text', content: this._config.welcomeMessage });
      }

      if (questions.length) {
        await this._renderBotMessage({
          type: 'quick_replies',
          items: questions.map((q) => ({ label: q, value: q })),
        });
      }

      this._persistMessages();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    _setInputDisabled(disabled, placeholder = 'Type a message…') {
      if (this._textarea) {
        this._textarea.disabled = disabled;
        this._textarea.placeholder = disabled && placeholder ? placeholder : 'Type a message…';
      }
      if (this._sendBtn) this._sendBtn.disabled = disabled;
    }

    _scrollToBottom() {
      if (!this._msgs) return;
      requestAnimationFrame(() => {
        this._msgs.scrollTop = this._msgs.scrollHeight;
      });
    }

    _trimMessages() {
      let rows = this._msgs.querySelectorAll('.ttc-row');
      while (rows.length > MAX_MESSAGES_IN_DOM) {
        rows[0].remove();
        rows = this._msgs.querySelectorAll('.ttc-row');
      }
    }

    _incrementBadge() {
      this._unread++;
      this._badge.textContent = this._unread > 99 ? '99+' : String(this._unread);
      this._badge.setAttribute('aria-label', `${this._unread} unread message${this._unread !== 1 ? 's' : ''}`);
      this._badge.classList.remove('ttc-hidden');
    }

    _clearBadge() {
      this._unread = 0;
      this._badge.classList.add('ttc-hidden');
      this._badge.setAttribute('aria-label', '0 unread messages');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 16 · PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  let _instance = null;

  function _guard(method) {
    if (!_instance) {
      console.warn(`[TayTravelsChatbot] Call .init() before .${method}()`);
      return false;
    }
    return true;
  }

  const TayTravelsChatbot = {
    init(userConfig = {}) {
      if (_instance) {
        console.warn('[TayTravelsChatbot] Widget already initialised. Call .destroy() first.');
        return;
      }
      if (!userConfig.webhook) {
        console.error('[TayTravelsChatbot] `webhook` URL is required.');
        return;
      }

      const config = deepMerge(DEFAULTS, userConfig);
      _instance = new ChatWidget(config);
      _instance.mount();
    },

    open() {
      if (_guard('open')) _instance.open();
    },

    close() {
      if (_guard('close')) _instance.close();
    },

    restart() {
      if (_guard('restart')) _instance.restart();
    },

    show() {
      if (_guard('show')) _instance.show();
    },

    hide() {
      if (_guard('hide')) _instance.hide();
    },

    destroy() {
      if (_guard('destroy')) {
        _instance.destroy();
        _instance = null;
      }
    },

    sendMessage(text) {
      if (_guard('sendMessage') && text) {
        _instance.open();
        _instance.sendMessage(String(text));
      }
    },

    updateConfig(partial = {}) {
      if (!_guard('updateConfig')) return;
      _instance._config = deepMerge(_instance._config, partial);
    },

    setTheme(theme = {}) {
      if (!_guard('setTheme')) return;
      _instance._config.theme = deepMerge(_instance._config.theme, theme);
      _instance._applyTheme();
    },

    on(event, callback) {
      EventBus.on(event, callback);
    },

    off(event, callback) {
      EventBus.off(event, callback);
    },

    get version() { return VERSION; },
  };

  window.TayTravelsChatbot = TayTravelsChatbot;

})(window, document);
