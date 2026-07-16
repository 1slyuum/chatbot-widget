/*!
 * Real Estate AI Chatbot Widget v1.0.0
 * Production-ready white-label AI chatbot for real estate websites.
 * Communicates with any n8n (or compatible) webhook backend.
 *
 * @author    RealEstate Widget
 * @version   1.0.0
 * @license   MIT
 * @see       https://github.com/yourusername/real-estate-widget
 *
 * No dependencies. Pure ES2022 + Shadow DOM.
 */
(function (window, document) {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1 · CONSTANTS & DEFAULTS
  // ─────────────────────────────────────────────────────────────────────────────

  const VERSION = '1.0.0';
  const STORAGE_PREFIX = 'rce_';
  const MAX_INPUT_LENGTH = 1000;
  const MAX_MESSAGES_IN_DOM = 80;

  /** @type {ChatConfig} Default configuration */
  const DEFAULTS = {
    webhook:'https://islempharm.app.n8n.cloud/webhook/travel-chatbot/chat',
    agencyName: 'Travel Advisor',
    assistantName: 'Alex',
    logo: null,
    avatar: null,
    theme: {
      primary: '#0B3D5C',
      accent: '#F2A93B',
      mode: 'auto',
    },
    welcomeMessage: "Hi! I'm here to help you plan your next trip. Where would you like to go?",
    suggestedQuestions: [
      'Show me vacation deals',
      "I'd like a cruise recommendation",
      'Help me plan a trip',
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
    star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4 · EVENT BUS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lightweight internal publish/subscribe system.
   * Decouples modules from each other.
   */
  const EventBus = (() => {
    /** @type {Record<string, Function[]>} */
    const _listeners = Object.create(null);

    return {
      /**
       * Subscribe to an event.
       * @param {string} event
       * @param {Function} fn
       */
      on(event, fn) {
        (_listeners[event] = _listeners[event] || []).push(fn);
      },

      /**
       * Unsubscribe from an event.
       * @param {string} event
       * @param {Function} fn
       */
      off(event, fn) {
        if (_listeners[event]) {
          _listeners[event] = _listeners[event].filter((l) => l !== fn);
        }
      },

      /**
       * Emit an event with optional data payload.
       * @param {string} event
       * @param {*} [data]
       */
      emit(event, data) {
        (_listeners[event] || []).slice().forEach((fn) => {
          try { fn(data); } catch (e) { /* never crash the bus */ }
        });
      },

      /** Remove all listeners. */
      clear() {
        Object.keys(_listeners).forEach((k) => delete _listeners[k]);
      },
    };
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5 · HTML SANITIZER (XSS Prevention)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * A zero-dependency HTML sanitizer.
   * Uses an allowlist of tags and attributes.
   * Strips all event handlers, dangerous URL schemes, and unknown elements.
   */
  const Sanitizer = (() => {
    const ALLOWED_TAGS = new Set([
      'a', 'b', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3',
      'h4', 'i', 'ins', 'li', 'mark', 'ol', 'p', 'pre', 'small', 'span',
      'strong', 'sub', 'sup', 'ul',
    ]);

    /** Attributes allowed globally on any permitted element */
    const GLOBAL_ATTRS = new Set(['class', 'id', 'title']);

    /** Per-element attribute allowlists */
    const TAG_ATTRS = {
      a: new Set(['href', 'target', 'rel']),
    };

    const DANGEROUS_SCHEMES = /^(javascript|vbscript|data|blob):/i;

    /** Tags that must be completely removed (content too) */
    const BLOCK_TAGS = new Set([
      'script', 'style', 'iframe', 'object', 'embed', 'form',
      'input', 'button', 'textarea', 'select', 'template', 'svg',
    ]);

    /**
     * Walk and sanitize a DOM node in-place.
     * @param {Node} node
     */
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
          // Unwrap: keep text children, discard the element shell
          while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
          child.parentNode?.removeChild(child);
          continue;
        }

        // Strip unsafe attributes
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

        // Force safe link behavior
        if (tag === 'a') {
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        }

        walk(child);
      }
    }

    /**
     * Sanitize an HTML string and return safe HTML.
     * @param {string} html
     * @returns {string}
     */
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

  /**
   * Lightweight Markdown → sanitized HTML converter.
   * Supports: headers, bold, italic, code, links, blockquotes, lists, strikethrough.
   */
  const MarkdownParser = (() => {
    /**
     * @param {string} md
     * @returns {string}
     */
    function parse(md) {
      if (!md) return '';

      // Step 1: extract and protect code blocks before escaping
      const codeBlocks = [];
      let s = md.replace(/```([\s\S]*?)```/g, (_, code) => {
        codeBlocks.push(code.trim());
        return `\x00CODE${codeBlocks.length - 1}\x00`;
      });

      // Step 2: escape HTML entities
      s = escapeHtml(s);

      // Step 3: restore protected code blocks as safe HTML
      s = s.replace(/\x00CODE(\d+)\x00/g, (_, i) =>
        `<pre><code>${escapeHtml(codeBlocks[parseInt(i, 10)])}</code></pre>`
      );

      // Step 4: block-level elements
      s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');
      s = s.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
      s = s.replace(/^(?:[-*] )(.+)$/gm, '<li>$1</li>');
      // Wrap consecutive <li> in <ul>
      s = s.replace(/(<li>[\s\S]*?<\/li>)(?![\s\S]*?<li>)/g, (m) => `<ul>${m}</ul>`);

      // Step 5: inline elements
      s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
      s = s.replace(/_(.+?)_/g, '<em>$1</em>');
      s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
      s = s.replace(/`(.+?)`/g, '<code>$1</code>');

      // Links — the URL was HTML-entity-escaped; decode & re-sanitize
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, rawUrl) => {
        const url = rawUrl
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        return `<a href="${escapeHtml(url)}">${text}</a>`;
      });

      // Step 6: line breaks
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

  /**
   * Thin wrapper around localStorage with a namespaced key prefix.
   * Silently degrades if storage is unavailable (private browsing, etc.).
   */
  const Storage = (() => {
    /**
     * @param {string} key
     * @param {*} value
     */
    function set(key, value) {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      } catch { /* storage full or unavailable */ }
    }

    /**
     * @param {string} key
     * @returns {*}
     */
    function get(key) {
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        return raw !== null ? JSON.parse(raw) : null;
      } catch { return null; }
    }

    /** @param {string} key */
    function remove(key) {
      try { localStorage.removeItem(STORAGE_PREFIX + key); } catch { /* ignore */ }
    }

    /** Remove all widget-namespaced keys. */
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

  /**
   * Collects contextual information about the host page to attach to every
   * webhook request. Enables n8n to understand the visitor's context.
   */
  const Context = (() => {
    /**
     * Attempt to detect property information from page metadata/DOM.
     * @returns {{ url: string|null, title: string|null, price: string|null, id: string|null }}
     */
    function detectProperty() {
      const prop = { url: null, title: null, price: null, id: null };
      try {
        // JSON-LD structured data
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

        // Open Graph tags
        if (!prop.title) {
          prop.title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null;
        }
        if (!prop.url) {
          prop.url = document.querySelector('meta[property="og:url"]')?.getAttribute('content') || null;
        }

        // Common real estate DOM patterns for price
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

        // Property ID from URL path
        if (!prop.id) {
          const m = window.location.pathname.match(/(?:property|listing|home|prop)[-/]([a-z0-9-]{2,})/i);
          if (m) prop.id = m[1];
        }

        // data-* attributes on any element
        const propEl = document.querySelector('[data-property-id]');
        if (propEl) prop.id = propEl.getAttribute('data-property-id');
      } catch { /* never throw */ }
      return prop;
    }

    /**
     * Extract UTM query parameters from the current URL.
     * @returns {Record<string, string|null>}
     */
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

    /**
     * Build the full context payload.
     * @returns {Object}
     */
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

  /**
   * Determines whether the widget is within configured business hours.
   */
  const BusinessHours = (() => {
    /**
     * @param {{ days: number[], start: string, end: string, tz: string } | null} cfg
     * @returns {boolean} true = open; false = outside hours
     */
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

  /**
   * Handles all communication with the n8n webhook backend.
   * Supports automatic retry with exponential back-off and request timeout.
   */
  const WebhookClient = (() => {
    const MAX_RETRIES = 1;
    const TIMEOUT_MS = 30_000;

    /**
     * Send a payload to the webhook URL.
     * @param {string} webhookUrl
     * @param {Object} payload
     * @returns {Promise<Object>}
     */
    async function send(webhookUrl, payload) {
      const t0 = Date.now();
      let lastErr;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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

          const data = await res.json();
          EventBus.emit('webhook:success', { payload, response: data, ms: Date.now() - t0 });
          return data;
        } catch (err) {
          clearTimeout(timer);
          lastErr = err;
          if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
          if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
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

  /**
   * Normalises diverse webhook response shapes into a consistent
   * { messages: MessageObject[], sessionId: string|null } structure.
   *
   * Designed to be easily extended: add new type handlers in the renderers below
   * without touching the parser.
   */
  const ResponseParser = (() => {
    /**
     * @param {*} raw  Raw value from fetch().json()
     * @returns {{ messages: Object[], sessionId: string|null }}
     */
    function parse(raw) {
      if (raw === null || raw === undefined) {
        return { messages: [{ type: 'error', content: 'No response from server.' }], sessionId: null };
      }

      // Plain string
      if (typeof raw === 'string') {
        return { messages: [{ type: 'text', content: raw }], sessionId: null };
      }

      // Array of messages
      if (Array.isArray(raw)) {
        const msgs = raw.filter((m) => m && typeof m.type === 'string');
        return { messages: msgs.length ? msgs : [{ type: 'text', content: JSON.stringify(raw) }], sessionId: null };
      }

      if (typeof raw !== 'object') {
        return { messages: [{ type: 'error', content: 'Unexpected response format.' }], sessionId: null };
      }

      // { messages: [...] }
      if (Array.isArray(raw.messages) && raw.messages.length) {
        const msgs = raw.messages.filter((m) => m && typeof m.type === 'string');
        return { messages: msgs, sessionId: raw.sessionId || null };
      }

      // Single message object { type: 'text', content: '...' }
      if (typeof raw.type === 'string') {
        return { messages: [raw], sessionId: raw.sessionId || null };
      }

      // Common n8n output field patterns
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

      // Last resort
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

  /**
   * Complete stylesheet injected into the Shadow DOM.
   * Uses CSS custom properties (variables) derived from the config theme.
   * Includes: layout, typography, all components, animations, dark mode,
   * accessibility, responsive breakpoints.
   */
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

  /* Light mode defaults */
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
.rce-launcher{
  position:fixed;bottom:24px;right:24px;
  width:62px;height:62px;border-radius:50%;
  background:linear-gradient(145deg,var(--rce-primary),rgba(var(--rce-primary-rgb),.8));
  border:2.5px solid var(--rce-accent);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  box-shadow:0 8px 28px rgba(var(--rce-primary-rgb),.45);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease;
  z-index:1;outline:none;
}
.rce-launcher.pos-left{right:auto;left:24px}
.rce-launcher:hover{transform:scale(1.1);box-shadow:0 12px 36px rgba(var(--rce-primary-rgb),.55),0 0 0 8px rgba(var(--rce-accent-rgb),.12)}
.rce-launcher:focus-visible{outline:2.5px solid var(--rce-accent);outline-offset:3px}
.rce-launcher:active{transform:scale(.96)}

.rce-launcher-icon{
  width:28px;height:28px;color:var(--rce-accent);
  transition:opacity .2s,transform .3s cubic-bezier(.34,1.56,.64,1);
  position:absolute;
}
.rce-launcher-icon.rce-hidden{opacity:0;transform:rotate(80deg) scale(.5);pointer-events:none}

/* Badge */
.rce-badge{
  position:absolute;top:-5px;right:-5px;
  min-width:20px;height:20px;border-radius:10px;
  background:#ef4444;color:#fff;
  font-family:var(--rce-font);font-size:11px;font-weight:700;
  display:flex;align-items:center;justify-content:center;
  padding:0 5px;border:2.5px solid var(--rce-bg,#fff);
  animation:rce-pop .3s cubic-bezier(.34,1.56,.64,1);
}
.rce-badge.rce-hidden{display:none}

/* ──────────── PANEL ──────────── */
.rce-panel{
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
.rce-panel.pos-left{right:auto;left:24px;transform-origin:bottom left}
.rce-panel.rce-open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto}

@media(max-width:480px){
  .rce-panel{width:100dvw;height:100dvh;max-height:100dvh;bottom:0;right:0;left:0;border-radius:0}
  .rce-panel.pos-left{left:0;right:0}
  .rce-launcher{bottom:16px;right:16px}
  .rce-launcher.pos-left{left:16px;right:auto}
}

/* ──────────── HEADER ──────────── */
.rce-header{
  padding:14px 18px;
  background:linear-gradient(140deg,var(--rce-primary) 0%,rgba(var(--rce-primary-rgb),.85) 100%);
  border-bottom:1px solid rgba(var(--rce-accent-rgb),.25);
  display:flex;align-items:center;gap:12px;flex-shrink:0;position:relative;
}
.rce-header::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(var(--rce-accent-rgb),.6),transparent);
}

.rce-avatar{
  width:46px;height:46px;border-radius:50%;
  border:2px solid var(--rce-accent);overflow:hidden;flex-shrink:0;
  background:linear-gradient(135deg,rgba(var(--rce-accent-rgb),.3),rgba(var(--rce-accent-rgb),.1));
  display:flex;align-items:center;justify-content:center;
}
.rce-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.rce-avatar svg{width:22px;height:22px;color:var(--rce-accent)}

.rce-header-info{flex:1;min-width:0}
.rce-agent-name{font-family:var(--rce-font);font-size:15px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rce-status{display:flex;align-items:center;gap:5px;font-family:var(--rce-font);font-size:12px;color:rgba(255,255,255,.65);margin-top:2px}
.rce-status-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;animation:rce-pulse 2s infinite;flex-shrink:0}

.rce-header-actions{display:flex;gap:4px}
.rce-hbtn{
  width:34px;height:34px;border-radius:9px;border:none;
  background:rgba(255,255,255,.1);color:rgba(255,255,255,.75);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:background .2s,color .2s;outline:none;flex-shrink:0;
}
.rce-hbtn:hover{background:rgba(255,255,255,.2);color:#fff}
.rce-hbtn:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.rce-hbtn svg{width:16px;height:16px}

/* ──────────── MESSAGES ──────────── */
.rce-msgs{
  flex:1;overflow-y:auto;padding:18px 14px;
  display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;
}
.rce-msgs::-webkit-scrollbar{width:4px}
.rce-msgs::-webkit-scrollbar-track{background:transparent}
.rce-msgs::-webkit-scrollbar-thumb{background:var(--rce-scroll);border-radius:2px}

.rce-row{display:flex;gap:8px;max-width:100%;animation:rce-msgIn .32s cubic-bezier(.34,1.56,.64,1)}
.rce-row.rce-user{flex-direction:row-reverse}

.rce-msg-av{
  width:28px;height:28px;border-radius:50%;flex-shrink:0;overflow:hidden;
  border:1px solid var(--rce-border);
  background:linear-gradient(135deg,rgba(var(--rce-accent-rgb),.3),rgba(var(--rce-accent-rgb),.1));
  display:flex;align-items:center;justify-content:center;align-self:flex-end;
}
.rce-msg-av img{width:100%;height:100%;object-fit:cover}
.rce-msg-av svg{width:13px;height:13px;color:var(--rce-accent)}

.rce-msg-body{max-width:calc(100% - 42px);display:flex;flex-direction:column;gap:4px}
.rce-row.rce-user .rce-msg-body{align-items:flex-end}

.rce-bubble{
  padding:10px 14px;border-radius:18px;
  font-family:var(--rce-font);font-size:14px;line-height:1.55;word-break:break-word;
}
.rce-bubble.rce-bot{background:var(--rce-bot-bg);color:var(--rce-bot-color);border-bottom-left-radius:4px}
.rce-bubble.rce-user{background:var(--rce-user-bg);color:var(--rce-user-color);border-bottom-right-radius:4px}
.rce-bubble a{color:var(--rce-accent);text-decoration:underline}
.rce-bubble code{font-family:'Courier New',monospace;font-size:12px;background:rgba(var(--rce-primary-rgb),.08);padding:1px 5px;border-radius:4px}
.rce-bubble pre{background:rgba(var(--rce-primary-rgb),.06);padding:10px;border-radius:8px;overflow-x:auto;margin-top:6px}
.rce-bubble pre code{background:none;padding:0}
.rce-bubble h1,.rce-bubble h2,.rce-bubble h3{margin-bottom:5px;font-weight:700;line-height:1.3}
.rce-bubble ul,.rce-bubble ol{padding-left:18px;margin:4px 0}
.rce-bubble li{margin-bottom:2px}
.rce-bubble blockquote{border-left:3px solid var(--rce-accent);padding-left:10px;margin:6px 0;opacity:.8;font-style:italic}

.rce-ts{font-family:var(--rce-font);font-size:10px;color:var(--rce-muted);padding:0 4px}
.rce-row.rce-user .rce-ts{text-align:right}

/* Typing indicator */
.rce-typing{display:flex;align-items:center;gap:5px;padding:12px 14px;background:var(--rce-bot-bg);border-radius:18px;border-bottom-left-radius:4px;width:fit-content}
.rce-dot{width:7px;height:7px;border-radius:50%;background:var(--rce-text2);animation:rce-bounce 1.3s infinite}
.rce-dot:nth-child(2){animation-delay:.2s}
.rce-dot:nth-child(3){animation-delay:.4s}

/* ──────────── QUICK REPLIES ──────────── */
.rce-qrs{display:flex;flex-wrap:wrap;gap:8px;padding:2px 0}
.rce-qr{
  padding:7px 15px;border-radius:20px;
  border:1.5px solid var(--rce-accent);background:transparent;
  color:var(--rce-text);font-family:var(--rce-font);font-size:13px;font-weight:500;
  cursor:pointer;transition:background .2s,color .2s,transform .15s;outline:none;white-space:nowrap;
}
.rce-qr:hover{background:var(--rce-accent);color:var(--rce-primary);transform:translateY(-1px)}
.rce-qr:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.rce-qr:active{transform:scale(.97)}
.rce-qr.rce-used{opacity:.5;pointer-events:none}

/* ──────────── BUTTONS ──────────── */
.rce-btns{display:flex;flex-direction:column;gap:8px;max-width:280px;margin-top:2px}
.rce-btn{
  padding:10px 18px;border-radius:10px;border:none;
  font-family:var(--rce-font);font-size:13px;font-weight:600;
  cursor:pointer;transition:all .2s;text-align:center;text-decoration:none;
  display:flex;align-items:center;justify-content:center;gap:8px;outline:none;
}
.rce-btn-accent{
  background:linear-gradient(135deg,var(--rce-accent),rgba(var(--rce-accent-rgb),.8));
  color:var(--rce-primary);box-shadow:0 4px 14px rgba(var(--rce-accent-rgb),.3);
}
.rce-btn-accent:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(var(--rce-accent-rgb),.4)}
.rce-btn-outline{background:transparent;border:1.5px solid var(--rce-accent);color:var(--rce-text)}
.rce-btn-outline:hover{background:rgba(var(--rce-accent-rgb),.08);transform:translateY(-1px)}
.rce-btn:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.rce-btn:active{transform:scale(.97)!important}
.rce-btn svg{width:15px;height:15px;flex-shrink:0}

/* ──────────── PROPERTY CARD ──────────── */
.rce-card{
  background:var(--rce-card-bg);border-radius:14px;
  border:1px solid var(--rce-border);overflow:hidden;
  width:280px;flex-shrink:0;
  box-shadow:var(--rce-shadow-sm);transition:transform .2s,box-shadow .2s;
}
.rce-card:hover{transform:translateY(-3px);box-shadow:var(--rce-shadow)}

.rce-card-img-wrap{position:relative;overflow:hidden}
.rce-card-img{width:100%;height:165px;object-fit:cover;display:block;transition:transform .4s ease}
.rce-card:hover .rce-card-img{transform:scale(1.04)}
.rce-card-img-placeholder{
  width:100%;height:165px;
  background:linear-gradient(145deg,rgba(var(--rce-primary-rgb),.85),rgba(var(--rce-primary-rgb),.55));
  display:flex;align-items:center;justify-content:center;color:rgba(var(--rce-accent-rgb),.55);
}
.rce-card-img-placeholder svg{width:52px;height:52px}

.rce-card-badges{position:absolute;top:10px;left:10px;display:flex;gap:6px;flex-wrap:wrap}
.rce-cbadge{
  padding:3px 10px;border-radius:20px;
  font-family:var(--rce-font);font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;
}
.rce-cbadge-sale{background:var(--rce-accent);color:var(--rce-primary)}
.rce-cbadge-rent{background:#3b82f6;color:#fff}
.rce-cbadge-sold{background:#ef4444;color:#fff}
.rce-cbadge-type{background:rgba(var(--rce-primary-rgb),.75);color:#fff;backdrop-filter:blur(4px)}

.rce-card-body{padding:14px}
.rce-card-price{
  font-family:var(--rce-font);font-size:21px;font-weight:800;
  color:var(--rce-accent);letter-spacing:-.5px;margin-bottom:3px;
}
.rce-card-title{
  font-family:var(--rce-font);font-size:13.5px;font-weight:600;color:var(--rce-text);
  margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.rce-card-addr{
  font-family:var(--rce-font);font-size:12px;color:var(--rce-text2);
  margin-bottom:10px;display:flex;align-items:center;gap:4px;
}
.rce-card-addr svg{width:11px;height:11px;flex-shrink:0;color:var(--rce-accent)}

.rce-card-stats{display:flex;gap:10px;margin-bottom:11px;flex-wrap:wrap}
.rce-stat{display:flex;align-items:center;gap:3px;font-family:var(--rce-font);font-size:12px;color:var(--rce-text2)}
.rce-stat svg{width:12px;height:12px;color:var(--rce-accent);flex-shrink:0}

.rce-card-desc{
  font-family:var(--rce-font);font-size:12px;color:var(--rce-text2);line-height:1.5;
  margin-bottom:12px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}
.rce-card-actions{display:flex;gap:8px}
.rce-card-actions .rce-btn{flex:1;font-size:12px;padding:8px 10px;border-radius:9px}

/* Card carousel */
.rce-carousel{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;max-width:100%}
.rce-carousel::-webkit-scrollbar{height:3px}
.rce-carousel::-webkit-scrollbar-thumb{background:var(--rce-accent);border-radius:2px}

/* ──────────── LEAD FORM ──────────── */
.rce-form{
  background:var(--rce-bg2);border-radius:14px;
  border:1px solid var(--rce-border);padding:16px;max-width:300px;
}
.rce-form-title{
  font-family:var(--rce-font);font-size:14px;font-weight:700;color:var(--rce-text);
  margin-bottom:14px;display:flex;align-items:center;gap:8px;
}
.rce-form-title svg{width:16px;height:16px;color:var(--rce-accent)}

.rce-field{margin-bottom:10px}
.rce-label{
  display:block;font-family:var(--rce-font);font-size:10.5px;font-weight:700;
  color:var(--rce-text2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;
}
.rce-input,.rce-select,.rce-textarea{
  width:100%;padding:8px 12px;border-radius:8px;
  border:1.5px solid var(--rce-border);background:var(--rce-bg);
  color:var(--rce-text);font-family:var(--rce-font);font-size:13px;
  outline:none;transition:border-color .2s;
}
.rce-textarea{resize:vertical;min-height:60px}
.rce-input:focus,.rce-select:focus,.rce-textarea:focus{border-color:var(--rce-accent)}
.rce-input::placeholder,.rce-textarea::placeholder{color:var(--rce-muted)}
.rce-input.rce-err,.rce-select.rce-err{border-color:#ef4444}
.rce-ferr{font-family:var(--rce-font);font-size:11px;color:#ef4444;margin-top:3px}

.rce-consent{display:flex;gap:9px;align-items:flex-start;margin-bottom:12px}
.rce-consent input[type=checkbox]{accent-color:var(--rce-accent);width:14px;height:14px;flex-shrink:0;margin-top:1px;cursor:pointer}
.rce-consent-lbl{font-family:var(--rce-font);font-size:11px;color:var(--rce-text2);line-height:1.5}

.rce-form-ok{text-align:center;padding:12px 8px;font-family:var(--rce-font);font-size:13px;color:#22c55e;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:8px}
.rce-form-ok svg{width:28px;height:28px;color:#22c55e}

/* ──────────── HANDOFF ──────────── */
.rce-handoff{
  display:flex;flex-direction:column;align-items:center;gap:10px;
  padding:18px;background:rgba(var(--rce-accent-rgb),.05);
  border-radius:14px;border:1px solid rgba(var(--rce-accent-rgb),.2);max-width:260px;
}
.rce-handoff-icon{
  width:42px;height:42px;border-radius:50%;
  background:linear-gradient(135deg,var(--rce-accent),rgba(var(--rce-accent-rgb),.7));
  display:flex;align-items:center;justify-content:center;
  animation:rce-handoff-pulse 2s infinite;
}
.rce-handoff-icon svg{width:20px;height:20px;color:var(--rce-primary)}
.rce-handoff-text{font-family:var(--rce-font);font-size:13px;color:var(--rce-text2);text-align:center;line-height:1.5}

/* ──────────── ERROR MSG ──────────── */
.rce-errmsg{
  display:flex;align-items:flex-start;gap:8px;padding:10px 14px;
  background:rgba(239,68,68,.07);border-radius:12px;
  border:1px solid rgba(239,68,68,.2);max-width:270px;
}
.rce-errmsg svg{width:16px;height:16px;color:#ef4444;flex-shrink:0;margin-top:1px}
.rce-errmsg-text{font-family:var(--rce-font);font-size:13px;color:#ef4444;line-height:1.5}

/* ──────────── INPUT AREA ──────────── */
.rce-input-area{
  padding:12px 14px;background:var(--rce-bg);
  border-top:1px solid var(--rce-border);
  display:flex;flex-direction:column;gap:8px;flex-shrink:0;
}
.rce-input-row{display:flex;align-items:flex-end;gap:8px}
.rce-textarea-msg{
  flex:1;min-height:40px;max-height:120px;padding:10px 14px;
  border-radius:20px;border:1.5px solid var(--rce-border);
  background:var(--rce-input-bg);color:var(--rce-text);
  font-family:var(--rce-font);font-size:14px;resize:none;
  outline:none;transition:border-color .2s;line-height:1.4;
  overflow-y:auto;
}
.rce-textarea-msg:focus{border-color:var(--rce-accent)}
.rce-textarea-msg::placeholder{color:var(--rce-muted)}
.rce-textarea-msg:disabled{opacity:.5;cursor:not-allowed}

.rce-send{
  width:42px;height:42px;border-radius:50%;border:none;
  background:linear-gradient(135deg,var(--rce-accent),rgba(var(--rce-accent-rgb),.8));
  color:var(--rce-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all .2s;flex-shrink:0;outline:none;
  box-shadow:0 3px 10px rgba(var(--rce-accent-rgb),.35);
}
.rce-send:hover:not(:disabled){transform:scale(1.08);box-shadow:0 5px 14px rgba(var(--rce-accent-rgb),.45)}
.rce-send:disabled{opacity:.4;cursor:not-allowed}
.rce-send:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.rce-send svg{width:18px;height:18px}

.rce-footer{display:flex;align-items:center;justify-content:space-between}
.rce-powered{font-family:var(--rce-font);font-size:10px;color:var(--rce-muted);opacity:.6}
.rce-char{font-family:var(--rce-font);font-size:10px;color:var(--rce-muted)}
.rce-char.rce-over{color:#ef4444}

/* ──────────── WELCOME / EMPTY STATE ──────────── */
.rce-welcome{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding:24px 16px 8px;animation:rce-msgIn .4s ease}
.rce-welcome-logo{
  width:60px;height:60px;border-radius:18px;overflow:hidden;
  border:2px solid var(--rce-accent);
  background:linear-gradient(135deg,var(--rce-primary),rgba(var(--rce-primary-rgb),.7));
  display:flex;align-items:center;justify-content:center;
}
.rce-welcome-logo img{width:100%;height:100%;object-fit:cover}
.rce-welcome-logo svg{width:30px;height:30px;color:var(--rce-accent)}
.rce-welcome-title{font-family:var(--rce-font);font-size:17px;font-weight:800;color:var(--rce-text)}
.rce-welcome-msg{font-family:var(--rce-font);font-size:13.5px;color:var(--rce-text2);line-height:1.6;max-width:240px}
.rce-suggested{display:flex;flex-direction:column;gap:7px;width:100%;margin-top:4px}
.rce-sug-btn{
  width:100%;padding:10px 14px;border-radius:10px;
  border:1.5px solid var(--rce-border);background:var(--rce-bg2);
  color:var(--rce-text);font-family:var(--rce-font);font-size:13px;font-weight:500;
  cursor:pointer;transition:all .2s;text-align:left;display:flex;align-items:center;gap:8px;outline:none;
}
.rce-sug-btn:hover{background:rgba(var(--rce-accent-rgb),.07);border-color:var(--rce-accent);transform:translateX(2px)}
.rce-sug-btn:focus-visible{outline:2px solid var(--rce-accent);outline-offset:2px}
.rce-sug-arrow{margin-left:auto;color:var(--rce-accent);flex-shrink:0}
.rce-sug-arrow svg{width:13px;height:13px}

/* ──────────── BUSINESS HOURS NOTICE ──────────── */
.rce-hours-notice{
  margin:0 14px 10px;padding:9px 14px;
  background:rgba(var(--rce-accent-rgb),.07);
  border:1px solid rgba(var(--rce-accent-rgb),.2);
  border-radius:10px;font-family:var(--rce-font);font-size:12px;
  color:var(--rce-text2);text-align:center;flex-shrink:0;
}

/* ──────────── DEBUG PANEL ──────────── */
.rce-debug{
  background:#0d1117;border-top:1px solid #30363d;
  padding:8px 12px;max-height:150px;overflow-y:auto;flex-shrink:0;
}
.rce-debug-title{font-family:monospace;font-size:10px;font-weight:700;color:#58a6ff;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.rce-debug-entry{font-family:monospace;font-size:10px;line-height:1.6;border-bottom:1px solid #21262d;padding-bottom:4px;margin-bottom:4px}
.rce-debug-entry:last-child{border-bottom:none}
.rce-dl{color:#8b949e}.rce-dv{color:#e6edf3;word-break:break-all}
.rce-d-ok{color:#3fb950}.rce-d-err{color:#f85149}.rce-d-info{color:#58a6ff}.rce-d-ms{color:#d29922}

/* ──────────── ANIMATIONS ──────────── */
@keyframes rce-msgIn{from{opacity:0;transform:translateY(10px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes rce-bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-7px);opacity:1}}
@keyframes rce-pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes rce-pop{from{transform:scale(0)}to{transform:scale(1)}}
@keyframes rce-handoff-pulse{0%,100%{box-shadow:0 0 0 0 rgba(var(--rce-accent-rgb),.45)}50%{box-shadow:0 0 0 12px rgba(var(--rce-accent-rgb),0)}}

/* ──────────── REDIRECT MSG ──────────── */
.rce-redirect{display:flex;flex-direction:column;gap:8px;max-width:280px}
.rce-redirect-text{font-family:var(--rce-font);font-size:13px;color:var(--rce-text2)}

/* ──────────── ACCESSIBILITY ──────────── */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
}
`;

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 13 · MESSAGE RENDERERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Registry of message type renderers.
   * Each renderer receives the message object + the ChatWidget instance
   * and returns a DOM Node (or null to skip).
   *
   * Adding a new message type: add a key here that matches the `type` field
   * returned by the webhook. The renderer function receives (message, widget).
   *
   * @type {Record<string, (msg: Object, widget: ChatWidget) => Node | null>}
   */
  const Renderers = {
    /**
     * Plain text message.
     */
    text(msg) {
      const el = document.createElement('div');
      el.className = 'rce-bubble rce-bot';
      el.textContent = msg.content || '';
      return el;
    },

    /**
     * Markdown message — parsed to sanitized HTML.
     */
    markdown(msg) {
      const el = document.createElement('div');
      el.className = 'rce-bubble rce-bot';
      el.innerHTML = MarkdownParser.parse(msg.content || '');
      return el;
    },

    /**
     * Quick reply chips — pill buttons that send a message when clicked.
     */
    quick_replies(msg, widget) {
      const items = Array.isArray(msg.items) ? msg.items : [];
      if (!items.length) return null;

      const wrap = document.createElement('div');
      wrap.className = 'rce-qrs';
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Quick reply options');

      items.forEach((item) => {
        const btn = document.createElement('button');
        btn.className = 'rce-qr';
        btn.textContent = item.label || item.value || '';
        btn.setAttribute('aria-label', `Quick reply: ${item.label || item.value}`);
        btn.addEventListener('click', () => {
          wrap.querySelectorAll('.rce-qr').forEach((b) => b.classList.add('rce-used'));
          widget.sendMessage(item.value || item.label);
        });
        wrap.appendChild(btn);
      });

      return wrap;
    },

    /**
     * Styled CTA button group.
     */
    buttons(msg, widget) {
      const items = Array.isArray(msg.items) ? msg.items : [];
      if (!items.length) return null;

      const wrap = document.createElement('div');
      wrap.className = 'rce-btns';
      wrap.setAttribute('role', 'group');

      items.forEach((item, i) => {
        const btn = document.createElement(item.url ? 'a' : 'button');
        btn.className = `rce-btn ${i === 0 ? 'rce-btn-accent' : 'rce-btn-outline'}`;

        if (item.url) {
          btn.href = item.url;
          btn.target = '_blank';
          btn.rel = 'noopener noreferrer';
          btn.appendChild(svgEl(Icons.externalLink));
        }

        const label = document.createElement('span');
        label.textContent = item.label || item.value || '';
        btn.appendChild(label);

        if (!item.url) {
          btn.addEventListener('click', () => widget.sendMessage(item.value || item.label));
        }

        wrap.appendChild(btn);
      });

      return wrap;
    },

    /**
     * Single property card.
     */
    property_card(msg, widget) {
      return _buildPropertyCard(msg.property || msg, widget);
    },

    /**
     * Horizontally scrollable carousel of property cards.
     */
    property_cards(msg, widget) {
      const props = Array.isArray(msg.properties) ? msg.properties : [];
      if (!props.length) return null;

      const carousel = document.createElement('div');
      carousel.className = 'rce-carousel';
      carousel.setAttribute('role', 'list');
      carousel.setAttribute('aria-label', 'Property listings');

      props.forEach((p) => {
        const card = _buildPropertyCard(p, widget);
        if (card) {
          card.setAttribute('role', 'listitem');
          carousel.appendChild(card);
        }
      });

      return carousel;
    },

    /**
     * Single trip / package card.
     */
    trip_card(msg, widget) {
      return _buildTripCard(msg.trip || msg, widget);
    },

    /**
     * Horizontally scrollable carousel of trip cards.
     */
    trip_cards(msg, widget) {
      const trips = Array.isArray(msg.trips) ? msg.trips : [];
      if (!trips.length) return null;

      const carousel = document.createElement('div');
      carousel.className = 'rce-carousel';
      carousel.setAttribute('role', 'list');
      carousel.setAttribute('aria-label', 'Trip recommendations');

      trips.forEach((t) => {
        const card = _buildTripCard(t, widget);
        if (card) {
          card.setAttribute('role', 'listitem');
          carousel.appendChild(card);
        }
      });

      return carousel;
    },

    /**
     * Lead capture form.
     */
    lead_form(msg, widget) {
      return _buildLeadForm(msg, widget);
    },

    /**
     * Human handoff state.
     */
    handoff(msg) {
      const wrap = document.createElement('div');
      wrap.className = 'rce-handoff';
      wrap.setAttribute('role', 'status');

      const icon = document.createElement('div');
      icon.className = 'rce-handoff-icon';
      icon.appendChild(svgEl(Icons.agent));
      wrap.appendChild(icon);

      const text = document.createElement('div');
      text.className = 'rce-handoff-text';
      text.textContent = msg.message || 'Connecting you to a live agent…';
      wrap.appendChild(text);

      return wrap;
    },

    /**
     * Redirect — shows a CTA button, or auto-redirects if msg.auto is true.
     */
    redirect(msg, widget) {
      if (msg.auto && msg.url) {
        setTimeout(() => { window.open(msg.url, '_blank', 'noopener,noreferrer'); }, 800);
      }

      const wrap = document.createElement('div');
      wrap.className = 'rce-redirect';

      if (msg.content) {
        const text = document.createElement('div');
        text.className = 'rce-redirect-text';
        text.textContent = msg.content;
        wrap.appendChild(text);
      }

      if (msg.url) {
        const a = document.createElement('a');
        a.className = 'rce-btn rce-btn-accent';
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

    /**
     * Error message display.
     */
    error(msg) {
      const wrap = document.createElement('div');
      wrap.className = 'rce-errmsg';
      wrap.setAttribute('role', 'alert');
      wrap.appendChild(svgEl(Icons.alert));

      const text = document.createElement('div');
      text.className = 'rce-errmsg-text';
      text.textContent = msg.content || 'Something went wrong. Please try again.';
      wrap.appendChild(text);

      return wrap;
    },
  };

  /**
   * Build a luxury property card DOM node from a property data object.
   * @param {Object} p  Property data
   * @param {ChatWidget} widget
   * @returns {HTMLElement}
   */
  function _buildPropertyCard(p, widget) {
    if (!p) return null;

    const card = document.createElement('article');
    card.className = 'rce-card';

    // ── Image area ──
    const imgWrap = document.createElement('div');
    imgWrap.className = 'rce-card-img-wrap';

    if (p.image) {
      const img = document.createElement('img');
      img.className = 'rce-card-img';
      img.alt = p.title || 'Property image';
      img.loading = 'lazy';
      // Use IntersectionObserver for lazy loading
      img.dataset.src = p.image;
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1px placeholder
      _lazyLoad(img);
      imgWrap.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'rce-card-img-placeholder';
      placeholder.appendChild(svgEl(Icons.home));
      imgWrap.appendChild(placeholder);
    }

    // Status / type badges
    const badges = document.createElement('div');
    badges.className = 'rce-card-badges';

    if (p.status) {
      const badge = document.createElement('span');
      const statusLower = p.status.toLowerCase().replace(/\s+/g, '-');
      const cls = statusLower.includes('sale') ? 'rce-cbadge-sale'
        : statusLower.includes('rent') ? 'rce-cbadge-rent'
        : statusLower.includes('sold') ? 'rce-cbadge-sold'
        : 'rce-cbadge-type';
      badge.className = `rce-cbadge ${cls}`;
      badge.textContent = p.status;
      badges.appendChild(badge);
    }

    if (p.type) {
      const typeBadge = document.createElement('span');
      typeBadge.className = 'rce-cbadge rce-cbadge-type';
      typeBadge.textContent = p.type;
      badges.appendChild(typeBadge);
    }

    if (badges.children.length) imgWrap.appendChild(badges);
    card.appendChild(imgWrap);

    // ── Body ──
    const body = document.createElement('div');
    body.className = 'rce-card-body';

    // Price
    if (p.price !== undefined && p.price !== null) {
      const price = document.createElement('div');
      price.className = 'rce-card-price';
      const numPrice = parseFloat(String(p.price).replace(/[^0-9.]/g, ''));
      price.textContent = isNaN(numPrice)
        ? String(p.price)
        : formatCurrency(numPrice, p.currency || 'USD', widget._config.locale);
      body.appendChild(price);
    }

    // Title
    if (p.title) {
      const title = document.createElement('div');
      title.className = 'rce-card-title';
      title.textContent = p.title;
      title.title = p.title;
      body.appendChild(title);
    }

    // Address
    if (p.address) {
      const addr = document.createElement('div');
      addr.className = 'rce-card-addr';
      addr.appendChild(svgEl(Icons.location));
      const addrText = document.createElement('span');
      addrText.textContent = p.address;
      addr.appendChild(addrText);
      body.appendChild(addr);
    }

    // Stats row
    const stats = [];
    if (p.bedrooms != null) stats.push({ icon: Icons.bed, val: `${p.bedrooms} Bed${p.bedrooms !== 1 ? 's' : ''}` });
    if (p.bathrooms != null) stats.push({ icon: Icons.bath, val: `${p.bathrooms} Bath${p.bathrooms !== 1 ? 's' : ''}` });
    if (p.garage != null) stats.push({ icon: Icons.garage, val: `${p.garage} Car` });
    if (p.sqft != null) stats.push({ icon: Icons.sqft, val: `${Number(p.sqft).toLocaleString()} ft²` });

    if (stats.length) {
      const statsRow = document.createElement('div');
      statsRow.className = 'rce-card-stats';
      stats.forEach((s) => {
        const stat = document.createElement('div');
        stat.className = 'rce-stat';
        stat.appendChild(svgEl(s.icon));
        const v = document.createElement('span');
        v.textContent = s.val;
        stat.appendChild(v);
        statsRow.appendChild(stat);
      });
      body.appendChild(statsRow);
    }

    // Description
    if (p.description) {
      const desc = document.createElement('div');
      desc.className = 'rce-card-desc';
      desc.textContent = p.description;
      body.appendChild(desc);
    }

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'rce-card-actions';

    if (p.url) {
      const viewBtn = document.createElement('a');
      viewBtn.className = 'rce-btn rce-btn-outline';
      viewBtn.href = p.url;
      viewBtn.target = '_blank';
      viewBtn.rel = 'noopener noreferrer';
      viewBtn.setAttribute('aria-label', `View property: ${p.title || ''}`);
      viewBtn.appendChild(svgEl(Icons.eye));
      const vLbl = document.createElement('span');
      vLbl.textContent = 'View';
      viewBtn.appendChild(vLbl);
      actions.appendChild(viewBtn);
    }

    if (widget._config.bookingUrl) {
      const bookBtn = document.createElement('a');
      bookBtn.className = 'rce-btn rce-btn-accent';
      bookBtn.href = widget._config.bookingUrl;
      bookBtn.target = '_blank';
      bookBtn.rel = 'noopener noreferrer';
      bookBtn.setAttribute('aria-label', `Schedule viewing for: ${p.title || 'property'}`);
      bookBtn.appendChild(svgEl(Icons.calendar));
      const bLbl = document.createElement('span');
      bLbl.textContent = 'Book';
      bookBtn.appendChild(bLbl);
      actions.appendChild(bookBtn);
    }

    if (actions.children.length) body.appendChild(actions);
    card.appendChild(body);

    return card;
  }

  /**
   * Build a luxury trip/package card DOM node from a trip data object.
   * @param {Object} t  Trip data { title, price, location, type, duration,
   *                     travelers, rating, tag, image, url }
   * @param {ChatWidget} widget
   * @returns {HTMLElement}
   */
  function _buildTripCard(t, widget) {
    if (!t) return null;

    const card = document.createElement('article');
    card.className = 'rce-card';

    // ── Image area ──
    const imgWrap = document.createElement('div');
    imgWrap.className = 'rce-card-img-wrap';

    if (t.image) {
      const img = document.createElement('img');
      img.className = 'rce-card-img';
      img.alt = t.title || 'Trip image';
      img.loading = 'lazy';
      img.dataset.src = t.image;
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      _lazyLoad(img);
      imgWrap.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'rce-card-img-placeholder';
      placeholder.appendChild(svgEl(Icons.plane));
      imgWrap.appendChild(placeholder);
    }

    // Badges: trip type (Flight/Hotel/Cruise/Package) and a promo tag
    const badges = document.createElement('div');
    badges.className = 'rce-card-badges';

    if (t.type) {
      const typeBadge = document.createElement('span');
      typeBadge.className = 'rce-cbadge rce-cbadge-type';
      typeBadge.textContent = t.type;
      badges.appendChild(typeBadge);
    }

    if (t.tag) {
      const tagBadge = document.createElement('span');
      tagBadge.className = 'rce-cbadge rce-cbadge-sale';
      tagBadge.textContent = t.tag;
      badges.appendChild(tagBadge);
    }

    if (badges.children.length) imgWrap.appendChild(badges);
    card.appendChild(imgWrap);

    // ── Body ──
    const body = document.createElement('div');
    body.className = 'rce-card-body';

    // Price
    if (t.price !== undefined && t.price !== null) {
      const price = document.createElement('div');
      price.className = 'rce-card-price';
      const numPrice = parseFloat(String(t.price).replace(/[^0-9.]/g, ''));
      const priceText = isNaN(numPrice)
        ? String(t.price)
        : formatCurrency(numPrice, t.currency || 'USD', widget._config.locale);
      price.textContent = t.priceUnit ? `${priceText} ${t.priceUnit}` : priceText;
      body.appendChild(price);
    }

    // Title
    if (t.title) {
      const title = document.createElement('div');
      title.className = 'rce-card-title';
      title.textContent = t.title;
      title.title = t.title;
      body.appendChild(title);
    }

    // Location
    if (t.location) {
      const addr = document.createElement('div');
      addr.className = 'rce-card-addr';
      addr.appendChild(svgEl(Icons.location));
      const addrText = document.createElement('span');
      addrText.textContent = t.location;
      addr.appendChild(addrText);
      body.appendChild(addr);
    }

    // Stats row: duration, travelers, rating
    const stats = [];
    if (t.duration != null) stats.push({ icon: Icons.clock, val: t.duration });
    if (t.travelers != null) stats.push({ icon: Icons.users, val: `${t.travelers} traveler${t.travelers !== 1 ? 's' : ''}` });
    if (t.rating != null) stats.push({ icon: Icons.star, val: `${t.rating}` });

    if (stats.length) {
      const statsRow = document.createElement('div');
      statsRow.className = 'rce-card-stats';
      stats.forEach((s) => {
        const stat = document.createElement('div');
        stat.className = 'rce-stat';
        stat.appendChild(svgEl(s.icon));
        const v = document.createElement('span');
        v.textContent = s.val;
        stat.appendChild(v);
        statsRow.appendChild(stat);
      });
      body.appendChild(statsRow);
    }

    // Description
    if (t.description) {
      const desc = document.createElement('div');
      desc.className = 'rce-card-desc';
      desc.textContent = t.description;
      body.appendChild(desc);
    }

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'rce-card-actions';

    if (t.url) {
      const viewBtn = document.createElement('a');
      viewBtn.className = 'rce-btn rce-btn-outline';
      viewBtn.href = t.url;
      viewBtn.target = '_blank';
      viewBtn.rel = 'noopener noreferrer';
      viewBtn.setAttribute('aria-label', `View trip: ${t.title || ''}`);
      viewBtn.appendChild(svgEl(Icons.eye));
      const vLbl = document.createElement('span');
      vLbl.textContent = 'View';
      viewBtn.appendChild(vLbl);
      actions.appendChild(viewBtn);
    }

    if (widget._config.bookingUrl) {
      const bookBtn = document.createElement('a');
      bookBtn.className = 'rce-btn rce-btn-accent';
      bookBtn.href = widget._config.bookingUrl;
      bookBtn.target = '_blank';
      bookBtn.rel = 'noopener noreferrer';
      bookBtn.setAttribute('aria-label', `Enquire about: ${t.title || 'trip'}`);
      bookBtn.appendChild(svgEl(Icons.calendar));
      const bLbl = document.createElement('span');
      bLbl.textContent = 'Enquire';
      bookBtn.appendChild(bLbl);
      actions.appendChild(bookBtn);
    }

    if (actions.children.length) body.appendChild(actions);
    card.appendChild(body);

    return card;
  }

  /**
   * Lazy-load a property card image using IntersectionObserver.
   * @param {HTMLImageElement} img
   */
  function _lazyLoad(img) {
    if (!('IntersectionObserver' in window)) {
      img.src = img.dataset.src;
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.src = entry.target.dataset.src;
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '100px' }
    );
    observer.observe(img);
  }

  /**
   * Build a lead capture form DOM node.
   * @param {Object} msg
   * @param {ChatWidget} widget
   * @returns {HTMLElement}
   */
  function _buildLeadForm(msg, widget) {
    const allowedFields = ['name', 'email', 'phone', 'destination', 'tripType', 'travelDates', 'message'];
    const fields = (Array.isArray(msg.fields) ? msg.fields : allowedFields)
      .filter((f) => allowedFields.includes(f));

    const form = document.createElement('div');
    form.className = 'rce-form';
    form.setAttribute('role', 'form');
    form.setAttribute('aria-label', 'Lead capture form');

    const titleRow = document.createElement('div');
    titleRow.className = 'rce-form-title';
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
      fieldWrap.className = 'rce-field';

      const label = document.createElement('label');
      label.className = 'rce-label';
      label.textContent = def.label + (def.required ? ' *' : '');
      const inputId = `rce-field-${f}`;
      label.setAttribute('for', inputId);
      fieldWrap.appendChild(label);

      let input;
      if (def.type === 'select') {
        input = document.createElement('select');
        input.className = 'rce-select';
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
        input.className = 'rce-textarea';
        input.placeholder = def.placeholder || '';
        input.rows = 3;
      } else {
        input = document.createElement('input');
        input.className = 'rce-input';
        input.type = def.type;
        input.placeholder = def.placeholder || '';
        input.autocomplete = f === 'email' ? 'email' : f === 'name' ? 'name' : f === 'phone' ? 'tel' : 'off';
      }

      input.id = inputId;
      input.name = f;
      if (def.required) input.required = true;

      const errEl = document.createElement('div');
      errEl.className = 'rce-ferr';
      errEl.setAttribute('role', 'alert');
      errEl.setAttribute('aria-live', 'polite');

      fieldWrap.appendChild(input);
      fieldWrap.appendChild(errEl);
      form.appendChild(fieldWrap);
      inputEls[f] = { input, errEl, def };
    });

    // GDPR consent
    const consentWrap = document.createElement('div');
    consentWrap.className = 'rce-consent';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'rce-consent';
    checkbox.required = true;
    const consentLbl = document.createElement('label');
    consentLbl.className = 'rce-consent-lbl';
    consentLbl.setAttribute('for', 'rce-consent');
    consentLbl.textContent = `I agree to be contacted by ${widget._config.agencyName} regarding my enquiry.`;
    consentWrap.appendChild(checkbox);
    consentWrap.appendChild(consentLbl);
    form.appendChild(consentWrap);

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'rce-btn rce-btn-accent';
    submitBtn.style.width = '100%';
    submitBtn.style.marginTop = '4px';
    submitBtn.textContent = msg.submitLabel || 'Send Enquiry';

    const consentErr = document.createElement('div');
    consentErr.className = 'rce-ferr';
    consentErr.setAttribute('role', 'alert');

    form.appendChild(submitBtn);
    form.appendChild(consentErr);

    // Submit handler
    submitBtn.addEventListener('click', async () => {
      let valid = true;

      // Validate fields
      for (const [, { input: inp, errEl, def }] of Object.entries(inputEls)) {
        errEl.textContent = '';
        inp.classList.remove('rce-err');
        const val = inp.value.trim();
        if (def.required && !val) {
          errEl.textContent = `${def.label} is required.`;
          inp.classList.add('rce-err');
          valid = false;
        } else if (def.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          errEl.textContent = 'Please enter a valid email address.';
          inp.classList.add('rce-err');
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

        // Show success state
        form.innerHTML = '';
        const ok = document.createElement('div');
        ok.className = 'rce-form-ok';
        ok.appendChild(svgEl(Icons.check));
        const okText = document.createElement('span');
        okText.textContent = "Thanks! We'll be in touch soon.";
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
  // SECTION 14 · DEBUG PANEL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Renders a debug overlay inside the chat panel.
   * Only active when config.debug === true.
   */
  const DebugPanel = (() => {
    /** @type {HTMLElement | null} */
    let _el = null;
    const _entries = [];
    const MAX_ENTRIES = 20;

    function _row(label, value, cls = '') {
      const entry = document.createElement('div');
      entry.className = 'rce-debug-entry';
      const lEl = document.createElement('span');
      lEl.className = 'rce-dl';
      lEl.textContent = `[${label}] `;
      const vEl = document.createElement('span');
      vEl.className = `rce-dv ${cls}`;
      vEl.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
      entry.appendChild(lEl);
      entry.appendChild(vEl);
      return entry;
    }

    /**
     * Initialize the debug panel inside the shadow root.
     * @param {ShadowRoot} shadow
     * @returns {HTMLElement}
     */
    function mount(shadow) {
      _el = shadow.querySelector('.rce-debug');
      if (!_el) return null;
      const title = document.createElement('div');
      title.className = 'rce-debug-title';
      title.textContent = `🛠 Debug — Widget v${VERSION}`;
      _el.appendChild(title);
      return _el;
    }

    /**
     * Log an entry to the debug panel.
     * @param {string} label
     * @param {*} value
     * @param {'ok'|'err'|'info'|'ms'} [type]
     */
    function log(label, value, type = 'info') {
      if (!_el) return;
      const cls = type === 'ok' ? 'rce-d-ok' : type === 'err' ? 'rce-d-err' : type === 'ms' ? 'rce-d-ms' : 'rce-d-info';
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

  /**
   * The main ChatWidget class.
   * Manages the Shadow DOM, conversation state, and all user interactions.
   */
  class ChatWidget {
    /**
     * @param {Object} config  Merged configuration object
     */
    constructor(config) {
      /** @type {Object} Current resolved configuration */
      this._config = config;

      /** @type {string} Unique session identifier */
      this._sessionId = this._resolveSessionId();

      /** @type {Object[]} Conversation messages */
      this._messages = [];

      /** @type {boolean} Whether the panel is open */
      this._open = false;

      /** @type {boolean} Whether the widget is visible */
      this._visible = true;

      /** @type {boolean} Whether a webhook request is in flight */
      this._loading = false;

      /** @type {boolean} Whether handoff mode is active */
      this._handoff = false;

      /** @type {number} Unread message count */
      this._unread = 0;

      /** @type {HTMLElement} Host element appended to <body> */
      this._host = null;

      /** @type {ShadowRoot} */
      this._shadow = null;

      // Cached DOM references (populated in _buildDOM)
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

    // ── Initialise ─────────────────────────────────────────────────────────────

    /** Mount the widget into the page. */
    mount() {
      this._host = document.createElement('div');
      this._host.id = 'rce-widget-root';
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
        this._renderWelcome();
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

    // ── Session ────────────────────────────────────────────────────────────────

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
      stored.forEach((msg) => this._rehydrateMessage(msg));
      this._messages = stored;
    }

    _persistMessages() {
      if (!this._config.persistConversation) return;
      Storage.set('messages', this._messages.slice(-60));
      if (this._visitorInfo) {
        Storage.set('visitor', this._visitorInfo);
      }
    }

    // ── DOM Construction ───────────────────────────────────────────────────────

    _injectStyles() {
      const style = document.createElement('style');
      style.textContent = SHADOW_CSS;
      this._shadow.appendChild(style);
    }

    _buildDOM() {
      const posClass = this._config.position === 'bottom-left' ? 'pos-left' : '';

      // ── Launcher button ──
      this._launcher = document.createElement('button');
      this._launcher.className = `rce-launcher ${posClass}`;
      this._launcher.setAttribute('aria-label', `Open ${this._config.assistantName} chat`);
      this._launcher.setAttribute('aria-haspopup', 'dialog');
      this._launcher.setAttribute('aria-expanded', 'false');

      this._chatIcon = svgEl(Icons.chat);
      this._chatIcon.setAttribute('class', 'rce-launcher-icon');
      this._closeIcon = svgEl(Icons.close);
      this._closeIcon.setAttribute('class', 'rce-launcher-icon rce-hidden');

      this._badge = document.createElement('span');
      this._badge.className = 'rce-badge rce-hidden';
      this._badge.setAttribute('aria-label', '0 unread messages');

      this._launcher.appendChild(this._chatIcon);
      this._launcher.appendChild(this._closeIcon);
      this._launcher.appendChild(this._badge);
      this._shadow.appendChild(this._launcher);

      // ── Chat panel ──
      this._panel = document.createElement('div');
      this._panel.className = `rce-panel ${posClass}`;
      this._panel.setAttribute('role', 'dialog');
      this._panel.setAttribute('aria-modal', 'true');
      this._panel.setAttribute('aria-label', `${this._config.assistantName} – ${this._config.agencyName}`);

      this._panel.appendChild(this._buildHeader());

      // Messages
      this._msgs = document.createElement('div');
      this._msgs.className = 'rce-msgs';
      this._msgs.setAttribute('role', 'log');
      this._msgs.setAttribute('aria-live', 'polite');
      this._msgs.setAttribute('aria-label', 'Conversation');
      this._panel.appendChild(this._msgs);

      // Business hours notice
      if (!BusinessHours.isOpen(this._config.businessHours)) {
        const notice = document.createElement('div');
        notice.className = 'rce-hours-notice';
        notice.textContent = "We're currently outside business hours. Leave a message and we'll get back to you.";
        this._panel.appendChild(notice);
      }

      this._panel.appendChild(this._buildInputArea());

      // Debug panel (only if debug: true)
      if (this._config.debug) {
        const debugEl = document.createElement('div');
        debugEl.className = 'rce-debug';
        this._panel.appendChild(debugEl);
      }

      this._shadow.appendChild(this._panel);
    }

    _buildHeader() {
      const header = document.createElement('header');
      header.className = 'rce-header';

      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'rce-avatar';
      if (this._config.avatar) {
        const img = document.createElement('img');
        img.src = this._config.avatar;
        img.alt = this._config.assistantName;
        avatar.appendChild(img);
      } else {
        avatar.appendChild(svgEl(Icons.bot));
      }
      header.appendChild(avatar);

      // Info
      const info = document.createElement('div');
      info.className = 'rce-header-info';

      const name = document.createElement('div');
      name.className = 'rce-agent-name';
      name.textContent = this._config.assistantName;
      info.appendChild(name);

      const status = document.createElement('div');
      status.className = 'rce-status';
      const dot = document.createElement('span');
      dot.className = 'rce-status-dot';
      status.appendChild(dot);
      const statusText = document.createElement('span');
      statusText.textContent = BusinessHours.isOpen(this._config.businessHours)
        ? 'Online · Typically replies instantly'
        : 'Away · Will reply when back';
      status.appendChild(statusText);
      info.appendChild(status);
      header.appendChild(info);

      // Header action buttons
      const actions = document.createElement('div');
      actions.className = 'rce-header-actions';

      const restartBtn = document.createElement('button');
      restartBtn.className = 'rce-hbtn';
      restartBtn.setAttribute('aria-label', 'Restart conversation');
      restartBtn.title = 'Restart conversation';
      restartBtn.appendChild(svgEl(Icons.restart));
      restartBtn.addEventListener('click', () => this.restart());
      actions.appendChild(restartBtn);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'rce-hbtn';
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
      area.className = 'rce-input-area';

      const row = document.createElement('div');
      row.className = 'rce-input-row';

      this._textarea = document.createElement('textarea');
      this._textarea.className = 'rce-textarea-msg';
      this._textarea.placeholder = 'Type a message…';
      this._textarea.rows = 1;
      this._textarea.setAttribute('aria-label', 'Message input');
      this._textarea.setAttribute('aria-multiline', 'true');
      this._textarea.setAttribute('maxlength', MAX_INPUT_LENGTH);

      this._sendBtn = document.createElement('button');
      this._sendBtn.className = 'rce-send';
      this._sendBtn.setAttribute('aria-label', 'Send message');
      this._sendBtn.appendChild(svgEl(Icons.send));

      row.appendChild(this._textarea);
      row.appendChild(this._sendBtn);
      area.appendChild(row);

      const footer = document.createElement('div');
      footer.className = 'rce-footer';

      if (this._config.poweredBy) {
        const powered = document.createElement('span');
        powered.className = 'rce-powered';
        powered.textContent = `${this._config.agencyName} AI Assistant`;
        footer.appendChild(powered);
      }

      const charCount = document.createElement('span');
      charCount.className = 'rce-char';
      charCount.setAttribute('aria-live', 'polite');
      footer.appendChild(charCount);

      this._charCountEl = charCount;
      area.appendChild(footer);

      return area;
    }

    // ── Theme & Styling ────────────────────────────────────────────────────────

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
          // Derive user bubble — in dark mode: accent; in light: primary
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

    // ── Event Binding ──────────────────────────────────────────────────────────

    _bindEvents() {
      // Launcher click
      this._launcher.addEventListener('click', () => this._open ? this.close() : this.open());

      // Send on button click
      this._sendBtn.addEventListener('click', () => this._submitMessage());

      // Send on Enter (Shift+Enter = new line)
      this._textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._submitMessage();
        }
      });

      // Auto-resize textarea
      this._textarea.addEventListener('input', () => {
        this._textarea.style.height = 'auto';
        this._textarea.style.height = Math.min(this._textarea.scrollHeight, 120) + 'px';
        this._updateCharCount();
      });

      // Global keyboard: Escape = close
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
        this._charCountEl.classList.toggle('rce-over', len >= MAX_INPUT_LENGTH);
      } else {
        this._charCountEl.textContent = '';
      }
    }

    // ── Open / Close ───────────────────────────────────────────────────────────

    open() {
      this._open = true;
      this._panel.classList.add('rce-open');
      this._chatIcon.classList.add('rce-hidden');
      this._closeIcon.classList.remove('rce-hidden');
      this._launcher.setAttribute('aria-expanded', 'true');
      this._launcher.setAttribute('aria-label', 'Close chat');
      this._clearBadge();
      this._scrollToBottom();
      // Focus textarea after animation
      setTimeout(() => this._textarea?.focus(), 350);
      EventBus.emit('widget:open');
    }

    close() {
      this._open = false;
      this._panel.classList.remove('rce-open');
      this._chatIcon.classList.remove('rce-hidden');
      this._closeIcon.classList.add('rce-hidden');
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

    /** Remove the widget from the DOM entirely. */
    destroy() {
      document.removeEventListener('keydown', this._boundKeyDown);
      window.removeEventListener('resize', this._boundResize);
      EventBus.clear();
      DebugPanel.destroy();
      this._host?.parentNode?.removeChild(this._host);
      this._host = null;
    }

    /** Clear messages and start a new session. */
    restart() {
      this._messages = [];
      this._sessionId = generateUUID();
      Storage.set('session', { id: this._sessionId, ts: Date.now() });
      Storage.remove('messages');
      Storage.remove('visitor');
      this._visitorInfo = null;
      this._handoff = false;
      this._loading = false;
      this._unread = 0;
      this._setInputDisabled(false);
      this._msgs.innerHTML = '';
      this._renderWelcome();
      EventBus.emit('widget:restart');
    }

    // ── Message Sending ────────────────────────────────────────────────────────

    _submitMessage() {
      const text = this._textarea.value.trim();
      if (!text || this._loading || this._handoff) return;
      this._textarea.value = '';
      this._textarea.style.height = 'auto';
      this._charCountEl.textContent = '';
      this.sendMessage(text);
    }

    /**
     * Send a message (programmatically or from user input).
     * Appends user bubble, shows typing indicator, calls webhook.
     * @param {string} text
     * @param {string} [type='text']
     */
    async sendMessage(text, type = 'text') {
      if (!text || this._handoff) return;

      // Clear welcome screen if first message
      const welcomeEl = this._msgs.querySelector('.rce-welcome');
      if (welcomeEl) welcomeEl.remove();

      // Append user bubble
      this._appendMessage({ role: 'user', content: text, ts: Date.now() });

      // Show typing indicator
      this._loading = true;
      this._setInputDisabled(true);
      const typingRow = this._appendTyping();

      const context = Context.collect();
      const payload = {
        chatInput: text,
        message: text, // Backward compatibility
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

        this._persistMessages();
      } catch (err) {
        typingRow.remove();
        await this._renderBotMessage({ type: 'error', content: err.message || 'Connection failed. Please try again.' });
      } finally {
        this._loading = false;
        if (!this._handoff) this._setInputDisabled(false);
      }
    }

    /**
     * Internal: send to webhook without adding a user message bubble.
     * Used by lead forms.
     * @param {Object} extra  Extra fields to merge into the payload
     */
    async _sendToWebhook(extra = {}) {
      const context = Context.collect();

      // Store visitor info in memory when a lead form is submitted
      if (extra.formData) {
        this._visitorInfo = {
          name: extra.formData.name || null,
          email: extra.formData.email || null,
          phone: extra.formData.phone || null
        };
      }

      const payload = {
        chatInput: extra.content || "",
        message: extra.content || "", // Backward compatibility
        sessionId: this._sessionId,
        messageType: extra.messageType || "text",
        // Full, untouched form field values — required so the workflow can
        // log/email the exact data the visitor typed without needing the
        // AI to reconstruct it from a text description.
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

      const raw = await WebhookClient.send(this._config.webhook, payload);
      const { messages } = ResponseParser.parse(raw);
      for (const msg of messages) await this._renderBotMessage(msg);
    }

    // ── Message Rendering ──────────────────────────────────────────────────────

    /**
     * Render a bot message of any supported type.
     * @param {Object} msg
     */
    async _renderBotMessage(msg) {
      const renderer = Renderers[msg.type];
      if (!renderer) {
        if (this._config.debug) DebugPanel.log('UNKNOWN TYPE', msg.type, 'err');
        return;
      }

      const node = renderer(msg, this);
      if (!node) return;

      const row = document.createElement('div');
      row.className = 'rce-row';

      // Avatar
      const av = document.createElement('div');
      av.className = 'rce-msg-av';
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
      body.className = 'rce-msg-body';
      body.appendChild(node);

      // Timestamp
      const ts = document.createElement('div');
      ts.className = 'rce-ts';
      ts.setAttribute('aria-label', `Sent at ${formatTime()}`);
      ts.textContent = formatTime();
      body.appendChild(ts);

      row.appendChild(body);

      this._msgs.appendChild(row);
      this._scrollToBottom();

      const msgRecord = { role: 'bot', type: msg.type, content: msg.content || null, ts: Date.now() };
      this._messages.push(msgRecord);

      if (!this._open) this._incrementBadge();

      // Trim DOM if too many messages
      this._trimMessages();

      // Small delay between consecutive messages for a natural feel
      await new Promise((r) => setTimeout(r, 120));
    }

    /**
     * Append a user message bubble.
     * @param {{ role: string, content: string, ts: number }} msg
     */
    _appendMessage(msg) {
      const row = document.createElement('div');
      row.className = 'rce-row rce-user';

      const body = document.createElement('div');
      body.className = 'rce-msg-body';

      const bubble = document.createElement('div');
      bubble.className = 'rce-bubble rce-user';
      bubble.textContent = msg.content;

      const ts = document.createElement('div');
      ts.className = 'rce-ts';
      ts.textContent = formatTime(new Date(msg.ts));

      body.appendChild(bubble);
      body.appendChild(ts);
      row.appendChild(body);

      const av = document.createElement('div');
      av.className = 'rce-msg-av';
      av.setAttribute('aria-hidden', 'true');
      av.appendChild(svgEl(Icons.user));
      row.appendChild(av);

      this._msgs.appendChild(row);
      this._scrollToBottom();
      this._messages.push(msg);
      this._trimMessages();
    }

    /**
     * Re-render a persisted message during session restore.
     * @param {{ role: string, type?: string, content?: string }} msg
     */
    _rehydrateMessage(msg) {
      if (msg.role === 'user') {
        this._appendMessage(msg);
      } else if (msg.role === 'bot' && msg.type) {
        const renderer = Renderers[msg.type];
        if (!renderer) return;
        const node = renderer(msg, this);
        if (!node) return;

        const row = document.createElement('div');
        row.className = 'rce-row';

        const av = document.createElement('div');
        av.className = 'rce-msg-av';
        av.setAttribute('aria-hidden', 'true');
        av.appendChild(svgEl(Icons.bot));
        row.appendChild(av);

        const body = document.createElement('div');
        body.className = 'rce-msg-body';
        body.appendChild(node);
        if (msg.ts) {
          const ts = document.createElement('div');
          ts.className = 'rce-ts';
          ts.textContent = formatTime(new Date(msg.ts));
          body.appendChild(ts);
        }
        row.appendChild(body);
        this._msgs.appendChild(row);
      }
    }

    /** Show the three-dot typing indicator and return the row element. */
    _appendTyping() {
      const row = document.createElement('div');
      row.className = 'rce-row';

      const av = document.createElement('div');
      av.className = 'rce-msg-av';
      av.setAttribute('aria-hidden', 'true');
      av.appendChild(svgEl(Icons.bot));
      row.appendChild(av);

      const typing = document.createElement('div');
      typing.className = 'rce-typing';
      typing.setAttribute('role', 'status');
      typing.setAttribute('aria-label', `${this._config.assistantName} is typing`);
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.className = 'rce-dot';
        dot.setAttribute('aria-hidden', 'true');
        typing.appendChild(dot);
      }
      row.appendChild(typing);
      this._msgs.appendChild(row);
      this._scrollToBottom();
      return row;
    }

    _renderWelcome() {
      const wrap = document.createElement('div');
      wrap.className = 'rce-welcome';

      // Logo
      const logo = document.createElement('div');
      logo.className = 'rce-welcome-logo';
      if (this._config.logo) {
        const img = document.createElement('img');
        img.src = this._config.logo;
        img.alt = this._config.agencyName;
        logo.appendChild(img);
      } else {
        logo.appendChild(svgEl(Icons.plane));
      }
      wrap.appendChild(logo);

      const title = document.createElement('div');
      title.className = 'rce-welcome-title';
      title.textContent = this._config.agencyName;
      wrap.appendChild(title);

      const msg = document.createElement('div');
      msg.className = 'rce-welcome-msg';
      msg.textContent = this._config.welcomeMessage;
      wrap.appendChild(msg);

      const questions = this._config.suggestedQuestions || [];
      if (questions.length) {
        const sugWrap = document.createElement('div');
        sugWrap.className = 'rce-suggested';
        sugWrap.setAttribute('role', 'list');
        questions.forEach((q) => {
          const btn = document.createElement('button');
          btn.className = 'rce-sug-btn';
          btn.setAttribute('role', 'listitem');
          btn.setAttribute('aria-label', `Ask: ${q}`);
          const lbl = document.createElement('span');
          lbl.textContent = q;
          btn.appendChild(lbl);
          const arrow = document.createElement('span');
          arrow.className = 'rce-sug-arrow';
          arrow.appendChild(svgEl(Icons.arrow));
          btn.appendChild(arrow);
          btn.addEventListener('click', () => {
            wrap.remove();
            this.sendMessage(q);
          });
          sugWrap.appendChild(btn);
        });
        wrap.appendChild(sugWrap);
      }

      this._msgs.appendChild(wrap);
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
      const rows = this._msgs.querySelectorAll('.rce-row');
      if (rows.length > MAX_MESSAGES_IN_DOM) {
        rows[0].remove();
      }
    }

    _incrementBadge() {
      this._unread++;
      this._badge.textContent = this._unread > 99 ? '99+' : String(this._unread);
      this._badge.setAttribute('aria-label', `${this._unread} unread message${this._unread !== 1 ? 's' : ''}`);
      this._badge.classList.remove('rce-hidden');
    }

    _clearBadge() {
      this._unread = 0;
      this._badge.classList.add('rce-hidden');
      this._badge.setAttribute('aria-label', '0 unread messages');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 16 · PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /** @type {ChatWidget | null} Singleton instance */
  let _instance = null;

  /**
   * Validate that the widget is initialised before calling API methods.
   * @param {string} method
   */
  function _guard(method) {
    if (!_instance) {
      console.warn(`[TravelChatbot] Call .init() before .${method}()`);
      return false;
    }
    return true;
  }

  /**
   * @namespace TravelChatbot
   * @description Public JavaScript API for the Real Estate AI Chatbot Widget.
   */
  const TravelChatbot = {
    /**
     * Initialize and mount the widget.
     * Must be called before any other methods.
     *
     * @param {Object} userConfig  See configuration reference in README.md
     * @returns {void}
     *
     * @example
     * TravelChatbot.init({
     *   webhook: 'https://my-n8n.app/webhook/travel-chatbot/chat',
     *   agencyName: 'Travel Advisor',
     *   assistantName: 'Alex',
     *   theme: { primary: '#0B3D5C', accent: '#F2A93B' },
     * });
     */
    init(userConfig = {}) {
      if (_instance) {
        console.warn('[TravelChatbot] Widget already initialised. Call .destroy() first.');
        return;
      }
      if (!userConfig.webhook) {
        console.error('[TravelChatbot] `webhook` URL is required.');
        return;
      }

      const config = deepMerge(DEFAULTS, userConfig);
      _instance = new ChatWidget(config);
      _instance.mount();
    },

    /**
     * Open the chat panel.
     * @returns {void}
     */
    open() {
      if (_guard('open')) _instance.open();
    },

    /**
     * Close the chat panel.
     * @returns {void}
     */
    close() {
      if (_guard('close')) _instance.close();
    },

    /**
     * Clear conversation history and restart the session.
     * @returns {void}
     */
    restart() {
      if (_guard('restart')) _instance.restart();
    },

    /**
     * Show the launcher button (if previously hidden).
     * @returns {void}
     */
    show() {
      if (_guard('show')) _instance.show();
    },

    /**
     * Hide the launcher button and close the panel.
     * @returns {void}
     */
    hide() {
      if (_guard('hide')) _instance.hide();
    },

    /**
     * Completely remove the widget from the DOM.
     * After calling this, you must call .init() again to re-mount.
     * @returns {void}
     */
    destroy() {
      if (_guard('destroy')) {
        _instance.destroy();
        _instance = null;
      }
    },

    /**
     * Programmatically send a message as if the user typed it.
     * @param {string} text
     * @returns {void}
     */
    sendMessage(text) {
      if (_guard('sendMessage') && text) {
        _instance.open();
        _instance.sendMessage(String(text));
      }
    },

    /**
     * Hot-update configuration values without destroying the widget.
     * Not all values support hot-updating (e.g. webhook, position).
     * Useful for: agencyName, assistantName, welcomeMessage, bookingUrl.
     * @param {Partial<Object>} partial
     * @returns {void}
     */
    updateConfig(partial = {}) {
      if (!_guard('updateConfig')) return;
      _instance._config = deepMerge(_instance._config, partial);
    },

    /**
     * Hot-swap the visual theme colors.
     * @param {{ primary?: string, accent?: string, mode?: 'light'|'dark'|'auto' }} theme
     * @returns {void}
     */
    setTheme(theme = {}) {
      if (!_guard('setTheme')) return;
      _instance._config.theme = deepMerge(_instance._config.theme, theme);
      _instance._applyTheme();
    },

    /**
     * Subscribe to widget events.
     * Available events: 'widget:open', 'widget:close', 'widget:restart',
     *   'webhook:success', 'webhook:error'
     * @param {string} event
     * @param {Function} callback
     * @returns {void}
     */
    on(event, callback) {
      EventBus.on(event, callback);
    },

    /**
     * Unsubscribe from a widget event.
     * @param {string} event
     * @param {Function} callback
     * @returns {void}
     */
    off(event, callback) {
      EventBus.off(event, callback);
    },

    /** @returns {string} Current widget version */
    get version() { return VERSION; },
  };

  // Expose on window
  window.TravelChatbot = TravelChatbot;

})(window, document);
