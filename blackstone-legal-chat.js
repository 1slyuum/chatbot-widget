/*!
 * AI Chat Widget — "Executive Clinical Intelligence"
 * Single-file embeddable chat widget. n8n webhook backend. AR/EN + RTL. Light/Dark auto.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EMBED (simplest — auto-init via data attributes):
 *
 *   <script
 *     src="https://your-domain.com/chat-widget.js"
 *     data-webhook-url="https://your-n8n.com/webhook/chat"
 *     data-lang="ar"
 *     data-theme="auto"
 *     data-title="المساعد الطبي"
 *     defer>
 *   </script>
 *
 * EMBED (programmatic — full config):
 *
 *   <script src="https://your-domain.com/chat-widget.js" defer></script>
 *   <script>
 *     window.addEventListener('load', function () {
 *       AIChatWidget.init({
 *         webhookUrl: 'https://your-n8n.com/webhook/chat',
 *         lang: 'ar',                 // 'ar' | 'en'
 *         theme: 'auto',              // 'auto' | 'light' | 'dark'
 *         title: 'المساعد الطبي',
 *         subtitle: 'عيادة النخبة',
 *         avatarUrl: '',              // optional logo image url
 *         position: 'end',            // 'end' (right in LTR / left in RTL) | 'start'
 *         primaryColor: '#0047BB',    // brand override
 *         secondaryColor: '#006a6a',
 *         suggestedPrompts: ['احجز موعد', 'ما هي خدماتكم؟', 'أين موقعكم؟'],
 *         welcomeMessage: '',         // optional custom welcome bubble
 *         metadata: { clinicId: 'riyadh-01' },   // extra data sent with every request
 *         demoMode: false             // true = no webhook needed, canned responses
 *       });
 *     });
 *   </script>
 *
 * PUBLIC API:
 *   AIChatWidget.init(config)          AIChatWidget.open()
 *   AIChatWidget.close()               AIChatWidget.toggle()
 *   AIChatWidget.sendMessage(text)     AIChatWidget.injectMessage(msgObj)
 *   AIChatWidget.reset()               AIChatWidget.updateConfig(partial)
 *   AIChatWidget.on(event, cb)         AIChatWidget.off(event, cb)
 *   AIChatWidget.destroy()
 *   Events: 'open' 'close' 'message:sent' 'message:received' 'action' 'error' 'handoff' 'reset'
 *
 * WEBHOOK CONTRACT (n8n):
 *   Request  → POST JSON:
 *     { sessionId, message, history: [{role, content}], event?, action?,
 *       metadata: { pageUrl, referrer, language, userAgent, timestamp, ...custom } }
 *   Response ← JSON. Any of these shapes work:
 *     { "output": "text" }  |  { "text": "..." }  |  { "reply": "..." }
 *     { "messages": [ ...message objects... ] }   |  [ ...message objects... ]
 *   Message object types:
 *     { type:'text', text:'**markdown** supported' }
 *     { type:'image', url:'...', caption:'' }
 *     { type:'link', url:'...', title:'', description:'' }
 *     { type:'doctor',    name, specialty, imageUrl?, rating?, actions?[] }
 *     { type:'treatment', title, description?, price?, duration?, imageUrl?, actions?[] }
 *     { type:'service',   title, description?, icon?, actions?[] }
 *     { type:'location',  title, address, lat?, lng?, query?, actions?[] }
 *     { type:'form', title?, fields:[{name,label,type:'text|email|tel|textarea|select|date',required?,options?[]}], submitLabel?, action? }
 *     { type:'quickReplies', replies:['..','..'] }
 *     { type:'buttons', buttons:[{label, action?, url?, value?, style:'primary|secondary|teal'}] }
 *     { type:'handoff', agentName?:'' }   // switches to live-agent mode
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';
  if (window.AIChatWidget && window.AIChatWidget.__loaded) return;

  /* ═══════════════ i18n ═══════════════ */
  var I18N = {
    en: {
      dir: 'ltr',
      title: 'AI Assistant',
      subtitle: 'Clinical Intelligence',
      online: 'Online',
      agentMode: 'Live agent',
      welcomeTitle: 'Welcome',
      welcomeBody: 'How can we help you today? Ask a question or pick a suggestion below.',
      inputPlaceholder: 'Type your message…',
      send: 'Send',
      typing: 'Assistant is typing',
      openChat: 'Open chat',
      closeChat: 'Close chat',
      settings: 'Settings',
      backToChat: 'Back to chat',
      language: 'Language',
      theme: 'Theme',
      themeAuto: 'Auto',
      themeLight: 'Light',
      themeDark: 'Dark',
      resetChat: 'Reset conversation',
      resetConfirm: 'Delete this conversation and start over?',
      privacy: 'Privacy',
      privacyBody: 'Your conversation is stored locally in your browser and sent securely to our assistant service to generate responses. Do not share sensitive medical identifiers unless requested by staff.',
      errorGeneric: 'Something went wrong. Please try again.',
      offline: 'You appear to be offline. Messages will fail until connection is restored.',
      retry: 'Retry',
      submit: 'Submit',
      required: 'Required',
      newMessage: 'New message',
      today: 'Today',
      poweredBy: 'AI Assistant',
      handoffNote: 'You are now connected to a live agent.',
      cancel: 'Cancel',
      confirm: 'Confirm'
    },
    ar: {
      dir: 'rtl',
      title: 'المساعد الذكي',
      subtitle: 'الذكاء السريري',
      online: 'متصل',
      agentMode: 'موظف مباشر',
      welcomeTitle: 'أهلاً بك',
      welcomeBody: 'كيف يمكننا مساعدتك اليوم؟ اطرح سؤالاً أو اختر أحد الاقتراحات أدناه.',
      inputPlaceholder: 'اكتب رسالتك…',
      send: 'إرسال',
      typing: 'المساعد يكتب',
      openChat: 'فتح المحادثة',
      closeChat: 'إغلاق المحادثة',
      settings: 'الإعدادات',
      backToChat: 'العودة للمحادثة',
      language: 'اللغة',
      theme: 'المظهر',
      themeAuto: 'تلقائي',
      themeLight: 'فاتح',
      themeDark: 'داكن',
      resetChat: 'إعادة تعيين المحادثة',
      resetConfirm: 'هل تريد حذف هذه المحادثة والبدء من جديد؟',
      privacy: 'الخصوصية',
      privacyBody: 'يتم حفظ محادثتك محلياً في متصفحك وإرسالها بشكل آمن إلى خدمة المساعد لإنشاء الردود. لا تشارك معلومات طبية حساسة إلا إذا طلب منك الموظفون ذلك.',
      errorGeneric: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
      offline: 'يبدو أنك غير متصل بالإنترنت. لن يتم إرسال الرسائل حتى يعود الاتصال.',
      retry: 'إعادة المحاولة',
      submit: 'إرسال',
      required: 'مطلوب',
      newMessage: 'رسالة جديدة',
      today: 'اليوم',
      poweredBy: 'المساعد الذكي',
      handoffNote: 'تم توصيلك الآن بموظف مباشر.',
      cancel: 'إلغاء',
      confirm: 'تأكيد'
    }
  };

  /* ═══════════════ Defaults ═══════════════ */
  var DEFAULTS = {
    webhookUrl: '',
    lang: 'ar',
    theme: 'auto',
    title: '',
    subtitle: '',
    avatarUrl: '',
    position: 'end',
    primaryColor: '#0047BB',
    secondaryColor: '#006a6a',
    suggestedPrompts: null,
    welcomeMessage: '',
    metadata: {},
    demoMode: false,
    storageKey: 'aicw',
    zIndex: 2147483000
  };

  var DEFAULT_PROMPTS = {
    en: ['Book an appointment', 'What services do you offer?', 'Where are you located?'],
    ar: ['احجز موعداً', 'ما هي خدماتكم؟', 'أين موقعكم؟']
  };

  /* ═══════════════ State ═══════════════ */
  var cfg = {};
  var t = I18N.ar;
  var host = null, shadow = null, root = null;
  var isOpen = false, isTyping = false, agentMode = false, destroyed = false;
  var messages = [];        // {id, role:'user'|'assistant'|'system', payload, ts}
  var listeners = {};
  var sessionId = '';
  var unread = 0;
  var mediaDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var els = {};

  /* ═══════════════ Utils ═══════════════ */
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function emit(ev, data) {
    (listeners[ev] || []).forEach(function (cb) { try { cb(data); } catch (e) { /* noop */ } });
  }
  function store(k, v) {
    try {
      if (v === undefined) { var raw = localStorage.getItem(cfg.storageKey + ':' + k); return raw ? JSON.parse(raw) : null; }
      localStorage.setItem(cfg.storageKey + ':' + k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function storeDel(k) { try { localStorage.removeItem(cfg.storageKey + ':' + k); } catch (e) {} }
  function fmtTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString(cfg.lang === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }
  function isDark() {
    if (cfg.theme === 'dark') return true;
    if (cfg.theme === 'light') return false;
    return !!(mediaDark && mediaDark.matches);
  }
  function safeUrl(u) {
    try {
      var url = new URL(u, location.href);
      return (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'tel:' || url.protocol === 'mailto:') ? url.href : '#';
    } catch (e) { return '#'; }
  }

  /* ═══════════════ Minimal safe Markdown ═══════════════ */
  function md(src) {
    var s = esc(src);
    // fenced code blocks
    s = s.replace(/```([\s\S]*?)```/g, function (_, code) {
      return '<pre class="code"><code>' + code.replace(/^\n|\n$/g, '') + '</code></pre>';
    });
    // inline code
    s = s.replace(/`([^`\n]+)`/g, '<code class="icode">$1</code>');
    // bold / italic
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_, txt, url) {
      return '<a href="' + safeUrl(url) + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>';
    });
    // bare urls
    s = s.replace(/(^|[\s>])(https?:\/\/[^\s<]+)/g, function (_, pre, url) {
      return pre + '<a href="' + safeUrl(url) + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
    // unordered lists
    s = s.replace(/(?:^|\n)((?:[-•] .+(?:\n|$))+)/g, function (_, block) {
      var items = block.trim().split('\n').map(function (l) { return '<li>' + l.replace(/^[-•] /, '') + '</li>'; }).join('');
      return '\n<ul>' + items + '</ul>';
    });
    // headings (### only, keep simple)
    s = s.replace(/(^|\n)#{1,3} (.+)/g, '$1<strong class="h">$2</strong>');
    // newlines
    s = s.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
    return s;
  }

  /* ═══════════════ Styles ═══════════════ */
  function css() {
    var p = cfg.primaryColor, sec = cfg.secondaryColor;
    return '\
:host{all:initial}\
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\
.aicw{--p:' + p + ';--p-dark:#00328a;--on-p:#ffffff;--sec:' + sec + ';--on-sec:#ffffff;\
--bg:#faf8ff;--sfc:#ffffff;--sfc-2:#f2f3ff;--sfc-3:#eaedff;--ink:#131b2e;--ink-2:#434653;\
--line:#c3c6d6;--line-soft:#e2e8f0;--err:#ba1a1a;--err-bg:#ffdad6;--on-err-bg:#93000a;\
--shadow:0 10px 20px rgba(2,6,23,.06),0 2px 6px rgba(2,6,23,.05);\
font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Arabic",sans-serif;\
font-size:15px;line-height:1.5;color:var(--ink);\
position:fixed;bottom:20px;z-index:' + cfg.zIndex + ';direction:ltr}\
.aicw.dark{--bg:#020617;--sfc:#0b1120;--sfc-2:#111a2e;--sfc-3:#16203a;--ink:#eef0ff;--ink-2:#aab0c4;\
--line:#28324a;--line-soft:#1c2740;--err:#ffb4ab;--err-bg:#3a1210;--on-err-bg:#ffdad6;\
--shadow:0 10px 24px rgba(0,0,0,.5)}\
.aicw.pos-end{right:20px}.aicw.pos-start{left:20px}\
.aicw[dir="rtl"]{direction:rtl}\
.aicw[dir="rtl"].pos-end{right:auto;left:20px}\
.aicw[dir="rtl"].pos-start{left:auto;right:20px}\
button{font:inherit;cursor:pointer;border:none;background:none;color:inherit}\
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--p);outline-offset:2px}\
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\
\
/* Launcher */\
.launcher{position:relative;width:56px;height:56px;border-radius:9999px;background:var(--p);color:var(--on-p);\
display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow);\
transition:transform .2s ease,background .2s ease;animation:aicw-pop .35s ease}\
.launcher:hover{transform:scale(1.06)}\
.launcher svg{width:26px;height:26px}\
.badge{position:absolute;top:-2px;inset-inline-end:-2px;min-width:20px;height:20px;padding:0 5px;border-radius:9999px;\
background:var(--sec);color:var(--on-sec);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;\
border:2px solid var(--bg)}\
@keyframes aicw-pop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}\
\
/* Panel */\
.panel{position:absolute;bottom:72px;inset-inline-end:0;width:380px;max-width:calc(100vw - 24px);height:600px;max-height:calc(100vh - 110px);\
background:var(--bg);border:1px solid var(--line-soft);border-radius:.75rem;box-shadow:var(--shadow);\
display:flex;flex-direction:column;overflow:hidden;\
opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .22s ease,transform .22s ease}\
.panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}\
@media (max-width:480px){.aicw{bottom:12px}.aicw.pos-end{right:12px}.aicw[dir="rtl"].pos-end{left:12px}\
.panel{width:calc(100vw - 24px);height:calc(100dvh - 90px);max-height:none}}\
\
/* Header */\
.hd{display:flex;align-items:center;gap:10px;padding:14px 16px;background:var(--p);color:var(--on-p);\
border-bottom:1px solid rgba(255,255,255,.12);flex:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}\
.hd .avatar{width:36px;height:36px;border-radius:9999px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;overflow:hidden;flex:none}\
.hd .avatar img{width:100%;height:100%;object-fit:cover}\
.hd .avatar svg{width:20px;height:20px}\
.hd-txt{flex:1;min-width:0}\
.hd-title{font-family:Manrope,Inter,sans-serif;font-weight:700;font-size:15px;letter-spacing:-.01em;\
white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.hd-sub{font-size:12px;opacity:.85;display:flex;align-items:center;gap:6px}\
.dot{width:7px;height:7px;border-radius:9999px;background:#6fd7d6;flex:none}\
.dot.agent{background:#ffd166}\
.hd-btn{width:32px;height:32px;border-radius:.375rem;display:flex;align-items:center;justify-content:center;opacity:.85;transition:background .15s,opacity .15s;flex:none}\
.hd-btn:hover{background:rgba(255,255,255,.14);opacity:1}\
.hd-btn svg{width:18px;height:18px}\
\
/* Body */\
.body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;overscroll-behavior:contain}\
.body::-webkit-scrollbar{width:6px}.body::-webkit-scrollbar-thumb{background:var(--line);border-radius:3px}\
\
/* Welcome */\
.welcome{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:28px 12px 12px}\
.welcome .w-ic{width:52px;height:52px;border-radius:9999px;background:var(--sfc-3);color:var(--p);display:flex;align-items:center;justify-content:center}\
.aicw.dark .welcome .w-ic{color:#b3c5ff}\
.welcome .w-ic svg{width:26px;height:26px}\
.welcome h2{font-family:Manrope,Inter,sans-serif;font-size:19px;font-weight:700;letter-spacing:-.01em}\
.welcome p{font-size:13.5px;color:var(--ink-2);max-width:280px}\
.prompts{display:flex;flex-direction:column;gap:8px;width:100%;margin-top:10px}\
.prompt{border:1px solid var(--line-soft);background:var(--sfc);border-radius:.5rem;padding:10px 14px;font-size:13.5px;\
text-align:start;transition:border-color .15s,background .15s;color:var(--ink)}\
.prompt:hover{border-color:var(--p);background:var(--sfc-2)}\
\
/* Messages */\
.row{display:flex;flex-direction:column;gap:4px;animation:aicw-in .25s ease}\
@keyframes aicw-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\
.row.user{align-items:flex-end}\
.aicw[dir="rtl"] .row.user{align-items:flex-end}\
.row.bot{align-items:flex-start}\
.bubble{max-width:85%;padding:10px 14px;border-radius:.5rem;font-size:14px;word-break:break-word}\
.row.user .bubble{background:var(--p);color:var(--on-p);border-end-end-radius:.125rem}\
.row.bot .bubble{background:var(--sfc);border:1px solid var(--line-soft);color:var(--ink);border-end-start-radius:.125rem}\
.bubble a{color:inherit;text-decoration:underline}\
.row.bot .bubble a{color:var(--p)}\
.aicw.dark .row.bot .bubble a{color:#b3c5ff}\
.bubble ul{padding-inline-start:18px;margin:4px 0}\
.bubble .h{display:block;font-family:Manrope,Inter,sans-serif;margin:2px 0}\
.bubble pre.code{background:var(--sfc-3);border:1px solid var(--line-soft);border-radius:.375rem;padding:10px;overflow-x:auto;\
margin:6px 0;font-family:Geist,ui-monospace,Menlo,monospace;font-size:12.5px;direction:ltr;text-align:left;color:var(--ink)}\
.row.user .bubble pre.code{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);color:var(--on-p)}\
code.icode{font-family:Geist,ui-monospace,Menlo,monospace;font-size:.9em;background:var(--sfc-3);border:1px solid var(--line-soft);\
border-radius:.25rem;padding:1px 5px;direction:ltr;unicode-bidi:embed}\
.row.user code.icode{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.2)}\
.ts{font-size:10.5px;color:var(--ink-2);font-family:Geist,ui-monospace,monospace;padding:0 2px}\
.sysnote{align-self:center;font-size:12px;color:var(--ink-2);background:var(--sfc-2);border:1px solid var(--line-soft);\
border-radius:9999px;padding:4px 14px;text-align:center}\
\
/* Typing */\
.typing{display:flex;align-items:center;gap:5px;padding:12px 16px;background:var(--sfc);border:1px solid var(--line-soft);\
border-radius:.5rem;border-end-start-radius:.125rem;width:max-content}\
.typing i{width:6px;height:6px;border-radius:9999px;background:var(--ink-2);animation:aicw-b 1.2s infinite}\
.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}\
@keyframes aicw-b{0%,60%,100%{transform:none;opacity:.4}30%{transform:translateY(-4px);opacity:1}}\
\
/* Cards */\
.card{max-width:92%;background:var(--sfc);border:1px solid var(--line-soft);border-radius:.5rem;overflow:hidden}\
.card img.hero{width:100%;height:140px;object-fit:cover;display:block;background:var(--sfc-3)}\
.card .c-body{padding:12px 14px;display:flex;flex-direction:column;gap:4px}\
.card .c-kicker{font-family:Geist,ui-monospace,monospace;font-size:10.5px;font-weight:600;letter-spacing:.06em;\
text-transform:uppercase;color:var(--sec)}\
.aicw.dark .card .c-kicker{color:#6fd7d6}\
.card .c-title{font-family:Manrope,Inter,sans-serif;font-weight:700;font-size:15px;letter-spacing:-.01em}\
.card .c-desc{font-size:13px;color:var(--ink-2)}\
.card .c-meta{display:flex;gap:12px;flex-wrap:wrap;font-family:Geist,ui-monospace,monospace;font-size:12.5px;color:var(--ink);margin-top:2px}\
.card .c-meta b{font-weight:600}\
.card .c-actions{display:flex;gap:8px;flex-wrap:wrap;padding:0 14px 12px}\
.card .doc{display:flex;gap:12px;align-items:center;padding:12px 14px}\
.card .doc .dimg{width:52px;height:52px;border-radius:9999px;object-fit:cover;background:var(--sfc-3);flex:none;\
display:flex;align-items:center;justify-content:center;color:var(--p);overflow:hidden}\
.card .doc .dimg img{width:100%;height:100%;object-fit:cover}\
.card .doc .dimg svg{width:24px;height:24px}\
.rating{color:var(--sec);font-family:Geist,monospace;font-size:12px}\
.aicw.dark .rating{color:#6fd7d6}\
.map{width:100%;height:150px;border:0;display:block;background:var(--sfc-3)}\
.imgmsg{max-width:85%;border-radius:.5rem;overflow:hidden;border:1px solid var(--line-soft);background:var(--sfc)}\
.imgmsg img{width:100%;display:block;max-height:220px;object-fit:cover}\
.imgmsg .cap{padding:8px 12px;font-size:12.5px;color:var(--ink-2)}\
.linkprev{display:flex;flex-direction:column;gap:2px;max-width:85%;background:var(--sfc);border:1px solid var(--line-soft);\
border-radius:.5rem;padding:10px 14px;text-decoration:none;color:var(--ink);transition:border-color .15s}\
.linkprev:hover{border-color:var(--p)}\
.linkprev .lp-t{font-weight:600;font-size:13.5px;color:var(--p)}\
.aicw.dark .linkprev .lp-t{color:#b3c5ff}\
.linkprev .lp-d{font-size:12.5px;color:var(--ink-2)}\
.linkprev .lp-u{font-family:Geist,monospace;font-size:11px;color:var(--ink-2);direction:ltr;text-align:start;\
overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
\
/* Chips & buttons */\
.chips{display:flex;gap:8px;flex-wrap:wrap;max-width:92%}\
.chip{border:1px solid var(--line);border-radius:9999px;padding:7px 14px;font-size:13px;background:var(--sfc);color:var(--ink);\
transition:all .15s}\
.chip:hover{border-color:var(--p);color:var(--p);background:var(--sfc-2)}\
.aicw.dark .chip:hover{color:#b3c5ff;border-color:#b3c5ff}\
.btn{border-radius:.25rem;padding:8px 14px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;\
transition:opacity .15s,background .15s;text-decoration:none}\
.btn.primary{background:var(--p);color:var(--on-p);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}\
.btn.teal{background:var(--sec);color:var(--on-sec);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}\
.btn.primary:hover,.btn.teal:hover{opacity:.9}\
.btn.secondary{background:transparent;border:1px solid var(--line);color:var(--ink)}\
.btn.secondary:hover{background:var(--sfc-2)}\
\
/* Forms */\
.form{max-width:92%;background:var(--sfc);border:1px solid var(--line-soft);border-radius:.5rem;padding:14px;display:flex;flex-direction:column;gap:10px}\
.form .f-title{font-family:Manrope,Inter,sans-serif;font-weight:700;font-size:14px}\
.field{display:flex;flex-direction:column;gap:4px}\
.field label{font-size:12px;font-weight:600;color:var(--ink-2)}\
.field input,.field textarea,.field select{border:1px solid var(--line);border-radius:.25rem;padding:8px 10px;font:inherit;\
font-size:13.5px;background:var(--bg);color:var(--ink);width:100%}\
.field textarea{resize:vertical;min-height:64px}\
.field input:focus,.field textarea:focus,.field select:focus{outline:none;border:2px solid var(--p);padding:7px 9px}\
.field .req{color:var(--err)}\
.form .f-err{font-size:12px;color:var(--err)}\
\
/* Skeleton */\
.skel{max-width:70%;display:flex;flex-direction:column;gap:6px}\
.skel i{display:block;height:12px;border-radius:.25rem;background:linear-gradient(90deg,var(--sfc-2),var(--sfc-3),var(--sfc-2));\
background-size:200% 100%;animation:aicw-sh 1.4s infinite}\
@keyframes aicw-sh{from{background-position:200% 0}to{background-position:-200% 0}}\
\
/* Error / offline */\
.errbar{display:flex;align-items:center;gap:8px;background:var(--err-bg);color:var(--on-err-bg);border-radius:.375rem;\
padding:8px 12px;font-size:12.5px;max-width:92%}\
.errbar button{font-weight:700;text-decoration:underline;color:inherit;flex:none}\
.offline{background:var(--sfc-3);color:var(--ink-2);text-align:center;font-size:12px;padding:6px 12px;border-bottom:1px solid var(--line-soft);display:none}\
.offline.show{display:block}\
\
/* Composer */\
.composer{flex:none;border-top:1px solid var(--line-soft);background:var(--sfc);padding:10px 12px;display:flex;gap:8px;align-items:flex-end}\
.composer textarea{flex:1;border:1px solid var(--line);border-radius:.375rem;background:var(--bg);color:var(--ink);\
padding:9px 12px;font:inherit;font-size:14px;resize:none;max-height:110px;line-height:1.4}\
.composer textarea:focus{outline:none;border:2px solid var(--p);padding:8px 11px}\
.composer textarea::placeholder{color:var(--ink-2)}\
.sendbtn{width:38px;height:38px;border-radius:.375rem;background:var(--p);color:var(--on-p);display:flex;align-items:center;\
justify-content:center;flex:none;transition:opacity .15s;box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}\
.sendbtn:disabled{opacity:.4;cursor:default}\
.sendbtn svg{width:18px;height:18px}\
.aicw[dir="rtl"] .sendbtn svg{transform:scaleX(-1)}\
.foot{flex:none;text-align:center;font-family:Geist,ui-monospace,monospace;font-size:10px;letter-spacing:.04em;\
color:var(--ink-2);padding:6px;background:var(--sfc);border-top:1px solid var(--line-soft)}\
\
/* Settings */\
.settings{position:absolute;inset:0;background:var(--bg);display:none;flex-direction:column;z-index:5}\
.settings.open{display:flex}\
.settings .body{gap:18px}\
.set-group{display:flex;flex-direction:column;gap:8px}\
.set-label{font-family:Geist,monospace;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}\
.seg{display:flex;border:1px solid var(--line);border-radius:.375rem;overflow:hidden;width:max-content}\
.seg button{padding:7px 16px;font-size:13px;color:var(--ink-2);background:var(--sfc)}\
.seg button.on{background:var(--p);color:var(--on-p);font-weight:600}\
.set-privacy{font-size:12.5px;color:var(--ink-2);background:var(--sfc);border:1px solid var(--line-soft);border-radius:.5rem;padding:12px 14px}\
.danger{border:1px solid var(--err);color:var(--err);border-radius:.25rem;padding:9px 14px;font-size:13px;font-weight:600;width:max-content}\
.danger:hover{background:var(--err-bg);color:var(--on-err-bg)}';
  }

  /* ═══════════════ Icons ═══════════════ */
  var IC = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    stetho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.5"/></svg>'
  };

  /* ═══════════════ DOM construction ═══════════════ */
  function build() {
    host = document.createElement('div');
    host.id = 'ai-chat-widget-host';
    shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var style = document.createElement('style');
    style.textContent = css();
    shadow.appendChild(style);

    root = el('div', 'aicw pos-' + (cfg.position === 'start' ? 'start' : 'end'));
    root.setAttribute('dir', t.dir);
    if (isDark()) root.classList.add('dark');
    shadow.appendChild(root);

    /* Launcher */
    var launcher = el('button', 'launcher');
    launcher.setAttribute('aria-label', t.openChat);
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = IC.chat;
    var badge = el('span', 'badge');
    badge.style.display = 'none';
    launcher.appendChild(badge);
    launcher.addEventListener('click', api.toggle);
    root.appendChild(launcher);

    /* Panel */
    var panel = el('div', 'panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', cfg.title || t.title);

    // header
    var hd = el('div', 'hd');
    var av = el('div', 'avatar');
    av.innerHTML = cfg.avatarUrl ? '<img alt="" src="' + esc(safeUrl(cfg.avatarUrl)) + '">' : IC.stetho;
    var hdTxt = el('div', 'hd-txt');
    var hdTitle = el('div', 'hd-title', esc(cfg.title || t.title));
    var hdSub = el('div', 'hd-sub', '<span class="dot"></span><span class="hd-status">' + esc(cfg.subtitle || t.online) + '</span>');
    hdTxt.appendChild(hdTitle); hdTxt.appendChild(hdSub);
    var btnSettings = el('button', 'hd-btn', IC.gear);
    btnSettings.setAttribute('aria-label', t.settings);
    btnSettings.addEventListener('click', function () { toggleSettings(true); });
    var btnClose = el('button', 'hd-btn', IC.close);
    btnClose.setAttribute('aria-label', t.closeChat);
    btnClose.addEventListener('click', api.close);
    hd.appendChild(av); hd.appendChild(hdTxt); hd.appendChild(btnSettings); hd.appendChild(btnClose);
    panel.appendChild(hd);

    // offline bar
    var offline = el('div', 'offline', esc(t.offline));
    panel.appendChild(offline);

    // body
    var body = el('div', 'body');
    body.setAttribute('role', 'log');
    body.setAttribute('aria-live', 'polite');
    panel.appendChild(body);

    // composer
    var composer = el('div', 'composer');
    var ta = document.createElement('textarea');
    ta.rows = 1;
    ta.placeholder = t.inputPlaceholder;
    ta.setAttribute('aria-label', t.inputPlaceholder);
    ta.addEventListener('input', function () {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 110) + 'px';
      sendBtn.disabled = !ta.value.trim();
    });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent || e).isComposing && e.keyCode !== 229) {
        e.preventDefault();
        submitInput();
      }
    });
    var sendBtn = el('button', 'sendbtn', IC.send);
    sendBtn.disabled = true;
    sendBtn.setAttribute('aria-label', t.send);
    sendBtn.addEventListener('click', submitInput);
    composer.appendChild(ta); composer.appendChild(sendBtn);
    panel.appendChild(composer);

    var foot = el('div', 'foot', esc(t.poweredBy));
    panel.appendChild(foot);

    // settings overlay
    var settings = buildSettings();
    panel.appendChild(settings);

    root.appendChild(panel);

    // keyboard: Esc closes
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (settings.classList.contains('open')) toggleSettings(false);
        else api.close();
      }
    });

    els = { launcher: launcher, badge: badge, panel: panel, body: body, ta: ta, sendBtn: sendBtn, offline: offline, settings: settings, hdTitle: hdTitle, hdSub: hdSub, foot: foot };

    document.body.appendChild(host);
  }

  function buildSettings() {
    var s = el('div', 'settings');
    var hd = el('div', 'hd');
    var back = el('button', 'hd-btn', IC.back);
    back.setAttribute('aria-label', t.backToChat);
    back.addEventListener('click', function () { toggleSettings(false); });
    hd.appendChild(back);
    hd.appendChild(el('div', 'hd-txt', '<div class="hd-title">' + esc(t.settings) + '</div>'));
    s.appendChild(hd);

    var body = el('div', 'body');

    // language
    var gLang = el('div', 'set-group', '<div class="set-label">' + esc(t.language) + '</div>');
    var segL = el('div', 'seg');
    [['ar', 'العربية'], ['en', 'English']].forEach(function (pair) {
      var b = el('button', cfg.lang === pair[0] ? 'on' : '', esc(pair[1]));
      b.addEventListener('click', function () { api.updateConfig({ lang: pair[0] }); });
      segL.appendChild(b);
    });
    gLang.appendChild(segL);
    body.appendChild(gLang);

    // theme
    var gTheme = el('div', 'set-group', '<div class="set-label">' + esc(t.theme) + '</div>');
    var segT = el('div', 'seg');
    [['auto', t.themeAuto], ['light', t.themeLight], ['dark', t.themeDark]].forEach(function (pair) {
      var b = el('button', cfg.theme === pair[0] ? 'on' : '', esc(pair[1]));
      b.addEventListener('click', function () { api.updateConfig({ theme: pair[0] }); });
      segT.appendChild(b);
    });
    gTheme.appendChild(segT);
    body.appendChild(gTheme);

    // privacy
    var gPriv = el('div', 'set-group', '<div class="set-label">' + esc(t.privacy) + '</div>');
    gPriv.appendChild(el('div', 'set-privacy', esc(t.privacyBody)));
    body.appendChild(gPriv);

    // reset
    var gReset = el('div', 'set-group');
    var resetBtn = el('button', 'danger', esc(t.resetChat));
    resetBtn.addEventListener('click', function () {
      if (window.confirm(t.resetConfirm)) { api.reset(); toggleSettings(false); }
    });
    gReset.appendChild(resetBtn);
    body.appendChild(gReset);

    s.appendChild(body);
    return s;
  }

  function toggleSettings(open) {
    els.settings.classList.toggle('open', !!open);
  }

  /* ═══════════════ Rendering ═══════════════ */
  function scrollDown() {
    requestAnimationFrame(function () { els.body.scrollTop = els.body.scrollHeight; });
  }

  function renderWelcome() {
    var w = el('div', 'welcome');
    w.innerHTML =
      '<div class="w-ic">' + IC.spark + '</div>' +
      '<h2>' + esc(t.welcomeTitle) + '</h2>' +
      '<p>' + esc(cfg.welcomeMessage || t.welcomeBody) + '</p>';
    var prompts = cfg.suggestedPrompts || DEFAULT_PROMPTS[cfg.lang] || DEFAULT_PROMPTS.en;
    if (prompts && prompts.length) {
      var pc = el('div', 'prompts');
      prompts.forEach(function (p) {
        var b = el('button', 'prompt', esc(p));
        b.addEventListener('click', function () { api.sendMessage(p); });
        pc.appendChild(b);
      });
      w.appendChild(pc);
    }
    els.body.appendChild(w);
  }

  function actionBtns(actions, container) {
    (actions || []).forEach(function (a) {
      var style = a.style === 'teal' ? 'teal' : a.style === 'secondary' ? 'secondary' : 'primary';
      var node;
      if (a.url) {
        node = el('a', 'btn ' + style, esc(a.label || a.url));
        node.href = safeUrl(a.url);
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
        node.addEventListener('click', function () { trackAction(a); });
      } else {
        node = el('button', 'btn ' + style, esc(a.label || ''));
        node.addEventListener('click', function () {
          trackAction(a);
          if (a.value || a.sendText) api.sendMessage(a.value || a.sendText);
        });
      }
      container.appendChild(node);
    });
  }

  function trackAction(a) {
    var payload = { action: a.action || 'button_click', label: a.label || '', value: a.value || a.url || '' };
    emit('action', payload);
    if (!cfg.demoMode && cfg.webhookUrl && a.track !== false && a.action) {
      // fire-and-forget event tracking
      try {
        fetch(cfg.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId, event: 'action', action: payload, metadata: meta() })
        });
      } catch (e) {}
    }
  }

  function renderMessage(m, animate) {
    var p = m.payload;
    var type = p.type || 'text';
    var row = el('div', 'row ' + (m.role === 'user' ? 'user' : 'bot'));
    if (animate === false) row.style.animation = 'none';

    if (m.role === 'system') {
      var note = el('div', 'sysnote', md(p.text || ''));
      els.body.appendChild(note);
      return;
    }

    if (type === 'text') {
      row.appendChild(el('div', 'bubble', md(p.text || '')));
    } else if (type === 'image') {
      var im = el('div', 'imgmsg');
      im.innerHTML = '<img alt="' + esc(p.caption || '') + '" loading="lazy" src="' + esc(safeUrl(p.url)) + '">' +
        (p.caption ? '<div class="cap">' + esc(p.caption) + '</div>' : '');
      row.appendChild(im);
    } else if (type === 'link') {
      var lp = el('a', 'linkprev');
      lp.href = safeUrl(p.url); lp.target = '_blank'; lp.rel = 'noopener noreferrer';
      lp.innerHTML = '<span class="lp-t">' + esc(p.title || p.url) + '</span>' +
        (p.description ? '<span class="lp-d">' + esc(p.description) + '</span>' : '') +
        '<span class="lp-u">' + esc(p.url) + '</span>';
      row.appendChild(lp);
    } else if (type === 'doctor') {
      var dc = el('div', 'card');
      var stars = p.rating ? '<span class="rating">★ ' + esc(p.rating) + '</span>' : '';
      dc.innerHTML = '<div class="doc"><div class="dimg">' +
        (p.imageUrl ? '<img alt="" src="' + esc(safeUrl(p.imageUrl)) + '">' : IC.user) +
        '</div><div><div class="c-kicker">' + esc(p.kicker || (cfg.lang === 'ar' ? 'طبيب' : 'Doctor')) + '</div>' +
        '<div class="c-title">' + esc(p.name || '') + '</div>' +
        '<div class="c-desc">' + esc(p.specialty || '') + ' ' + stars + '</div></div></div>';
      if (p.actions && p.actions.length) { var da = el('div', 'c-actions'); actionBtns(p.actions, da); dc.appendChild(da); }
      row.appendChild(dc);
    } else if (type === 'treatment' || type === 'service') {
      var tc = el('div', 'card');
      var html = '';
      if (p.imageUrl) html += '<img class="hero" alt="" loading="lazy" src="' + esc(safeUrl(p.imageUrl)) + '">';
      html += '<div class="c-body"><div class="c-kicker">' +
        esc(p.kicker || (type === 'treatment' ? (cfg.lang === 'ar' ? 'علاج' : 'Treatment') : (cfg.lang === 'ar' ? 'خدمة' : 'Service'))) + '</div>' +
        '<div class="c-title">' + esc(p.title || '') + '</div>' +
        (p.description ? '<div class="c-desc">' + esc(p.description) + '</div>' : '');
      var metaBits = [];
      if (p.price) metaBits.push('<span><b>' + esc(p.price) + '</b></span>');
      if (p.duration) metaBits.push('<span>' + esc(p.duration) + '</span>');
      if (metaBits.length) html += '<div class="c-meta">' + metaBits.join('') + '</div>';
      html += '</div>';
      tc.innerHTML = html;
      if (p.actions && p.actions.length) { var ta2 = el('div', 'c-actions'); actionBtns(p.actions, ta2); tc.appendChild(ta2); }
      row.appendChild(tc);
    } else if (type === 'location') {
      var lc = el('div', 'card');
      var q = p.lat != null && p.lng != null ? p.lat + ',' + p.lng : (p.query || p.address || '');
      var mapHtml = q ? '<iframe class="map" loading="lazy" title="' + esc(p.title || 'Map') + '" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed&hl=' + cfg.lang + '"></iframe>' : '';
      lc.innerHTML = mapHtml + '<div class="c-body"><div class="c-kicker">' +
        esc(p.kicker || (cfg.lang === 'ar' ? 'الموقع' : 'Location')) + '</div>' +
        '<div class="c-title">' + esc(p.title || '') + '</div>' +
        (p.address ? '<div class="c-desc">' + esc(p.address) + '</div>' : '') + '</div>';
      var acts = (p.actions || []).slice();
      if (q && !acts.some(function (a) { return a.url; })) {
        acts.push({ label: cfg.lang === 'ar' ? 'الاتجاهات' : 'Directions', url: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q), style: 'teal', action: 'directions' });
      }
      if (acts.length) { var la = el('div', 'c-actions'); actionBtns(acts, la); lc.appendChild(la); }
      row.appendChild(lc);
    } else if (type === 'quickReplies') {
      var qc = el('div', 'chips');
      (p.replies || []).forEach(function (r) {
        var label = typeof r === 'string' ? r : (r.label || '');
        var val = typeof r === 'string' ? r : (r.value || r.label || '');
        var c = el('button', 'chip', esc(label));
        c.addEventListener('click', function () {
          qc.remove();
          api.sendMessage(val);
        });
        qc.appendChild(c);
      });
      row.appendChild(qc);
      row.__ephemeral = true;
    } else if (type === 'buttons') {
      var bc = el('div', 'chips');
      actionBtns(p.buttons || [], bc);
      row.appendChild(bc);
    } else if (type === 'form') {
      row.appendChild(renderForm(p));
    } else if (type === 'handoff') {
      agentMode = true;
      setAgentHeader(p.agentName);
      var hn = el('div', 'sysnote', esc(t.handoffNote + (p.agentName ? ' — ' + p.agentName : '')));
      els.body.appendChild(hn);
      emit('handoff', p);
      return;
    } else {
      row.appendChild(el('div', 'bubble', md(p.text || JSON.stringify(p))));
    }

    // timestamp
    if (type === 'text' || type === 'image' || type === 'doctor' || type === 'treatment' || type === 'service' || type === 'location' || type === 'link') {
      row.appendChild(el('span', 'ts', esc(fmtTime(m.ts))));
    }

    els.body.appendChild(row);
  }

  function renderForm(p) {
    var f = el('form', 'form');
    f.setAttribute('novalidate', '');
    if (p.title) f.appendChild(el('div', 'f-title', esc(p.title)));
    (p.fields || []).forEach(function (fd) {
      var w = el('div', 'field');
      var id = 'f-' + uid().slice(0, 8);
      var lab = el('label', '', esc(fd.label || fd.name) + (fd.required ? ' <span class="req">*</span>' : ''));
      lab.setAttribute('for', id);
      w.appendChild(lab);
      var input;
      if (fd.type === 'textarea') input = document.createElement('textarea');
      else if (fd.type === 'select') {
        input = document.createElement('select');
        (fd.options || []).forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = typeof o === 'string' ? o : o.value;
          opt.textContent = typeof o === 'string' ? o : o.label;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement('input');
        input.type = /^(email|tel|date|number|time)$/.test(fd.type) ? fd.type : 'text';
      }
      input.id = id;
      input.name = fd.name || id;
      if (fd.required) input.required = true;
      if (fd.placeholder) input.placeholder = fd.placeholder;
      w.appendChild(input);
      f.appendChild(w);
    });
    var errNode = el('div', 'f-err');
    errNode.style.display = 'none';
    f.appendChild(errNode);
    var sb = el('button', 'btn teal', esc(p.submitLabel || t.submit));
    sb.type = 'submit';
    f.appendChild(sb);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      errNode.style.display = 'none';
      var data = {}, valid = true;
      Array.prototype.forEach.call(f.elements, function (elem) {
        if (!elem.name) return;
        if (elem.required && !String(elem.value).trim()) valid = false;
        data[elem.name] = elem.value;
      });
      if (!valid) {
        errNode.textContent = t.required;
        errNode.style.display = 'block';
        return;
      }
      sb.disabled = true;
      trackAction({ action: p.action || 'form_submit', label: p.title || 'form', value: JSON.stringify(data), track: false });
      sendToWebhook({ event: 'form_submit', formAction: p.action || 'form_submit', formData: data, message: '' }, true);
      f.querySelectorAll('input,textarea,select,button').forEach(function (n) { n.disabled = true; });
    });
    return f;
  }

  function setAgentHeader(name) {
    if (!els.hdSub) return;
    els.hdSub.innerHTML = '<span class="dot' + (agentMode ? ' agent' : '') + '"></span><span class="hd-status">' +
      esc(agentMode ? (name || t.agentMode) : (cfg.subtitle || t.online)) + '</span>';
  }

  function renderAll() {
    els.body.innerHTML = '';
    if (!messages.length) { renderWelcome(); return; }
    messages.forEach(function (m) { renderMessage(m, false); });
    scrollDown();
  }

  function showTyping() {
    if (isTyping) return;
    isTyping = true;
    var row = el('div', 'row bot');
    row.id = 'aicw-typing';
    var tp = el('div', 'typing', '<i></i><i></i><i></i><span class="sr">' + esc(t.typing) + '</span>');
    tp.setAttribute('aria-label', t.typing);
    row.appendChild(tp);
    els.body.appendChild(row);
    scrollDown();
  }
  function hideTyping() {
    isTyping = false;
    var n = shadow.getElementById ? shadow.getElementById('aicw-typing') : els.body.querySelector('#aicw-typing');
    if (!n) n = els.body.querySelector('#aicw-typing');
    if (n) n.remove();
  }

  function showError(retryFn) {
    var row = el('div', 'row bot');
    var bar = el('div', 'errbar');
    bar.appendChild(el('span', '', esc(navigator.onLine === false ? t.offline : t.errorGeneric)));
    var rb = el('button', '', esc(t.retry));
    rb.addEventListener('click', function () { row.remove(); retryFn(); });
    bar.appendChild(rb);
    row.appendChild(bar);
    els.body.appendChild(row);
    scrollDown();
  }

  /* ═══════════════ Messaging ═══════════════ */
  function pushMessage(role, payload, persist) {
    var m = { id: uid(), role: role, payload: payload, ts: Date.now() };
    messages.push(m);
    // remove welcome screen if present
    var w = els.body.querySelector('.welcome');
    if (w) w.remove();
    renderMessage(m, true);
    scrollDown();
    if (persist !== false) saveHistory();
    return m;
  }

  function saveHistory() {
    // don't persist ephemeral quick-reply rows; cap history at 200
    store('history', messages.slice(-200));
  }

  function historyForContext() {
    return messages
      .filter(function (m) { return (m.payload.type || 'text') === 'text' && m.role !== 'system'; })
      .slice(-20)
      .map(function (m) { return { role: m.role, content: m.payload.text || '' }; });
  }

  function meta() {
    var base = {
      pageUrl: location.href,
      pageTitle: document.title,
      referrer: document.referrer || '',
      language: navigator.language || '',
      widgetLang: cfg.lang,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      screen: (window.screen ? screen.width + 'x' + screen.height : '')
    };
    for (var k in cfg.metadata) base[k] = cfg.metadata[k];
    return base;
  }

  function submitInput() {
    var v = els.ta.value.trim();
    if (!v) return;
    els.ta.value = '';
    els.ta.style.height = 'auto';
    els.sendBtn.disabled = true;
    api.sendMessage(v);
  }

  function normalizeResponse(data) {
    // Accept many n8n output shapes → array of message payloads
    if (data == null) return [];
    if (Array.isArray(data)) {
      // could be [{output:..}] from n8n or array of message objects
      var out = [];
      data.forEach(function (item) { out = out.concat(normalizeResponse(item)); });
      return out;
    }
    if (typeof data === 'string') return [{ type: 'text', text: data }];
    if (Array.isArray(data.messages)) return data.messages;
    if (data.type) return [data];
    var txt = data.output || data.text || data.reply || data.answer || data.message || data.response;
    if (typeof txt === 'string') return [{ type: 'text', text: txt }];
    if (txt && typeof txt === 'object') return normalizeResponse(txt);
    if (data.json) return normalizeResponse(data.json);
    return [{ type: 'text', text: JSON.stringify(data) }];
  }

  function sendToWebhook(extra, silent) {
    var body = {
      sessionId: sessionId,
      message: extra.message != null ? extra.message : '',
      history: historyForContext(),
      metadata: meta()
    };
    for (var k in extra) if (k !== 'message') body[k] = extra[k];

    if (cfg.demoMode) return demoRespond(body);

    if (!cfg.webhookUrl) {
      hideTyping();
      pushMessage('assistant', { type: 'text', text: '⚠ webhookUrl is not configured. Pass it via AIChatWidget.init({ webhookUrl }) or the data-webhook-url attribute.' }, false);
      return Promise.resolve();
    }

    if (!silent) showTyping();
    return fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        hideTyping();
        var data;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
        var msgs = normalizeResponse(data);
        // multi-message: render sequentially with a small stagger
        msgs.forEach(function (mp, i) {
          setTimeout(function () {
            pushMessage('assistant', mp);
            emit('message:received', mp);
          }, i * 350);
        });
        if (!isOpen && msgs.length) bumpUnread(msgs.length);
      })
      .catch(function (err) {
        hideTyping();
        emit('error', err);
        showError(function () { sendToWebhook(extra, silent); });
      });
  }

  /* Demo mode: canned responses, no backend needed */
  function demoRespond(body) {
    showTyping();
    var msgLower = (body.message || '').toLowerCase();
    var isAr = cfg.lang === 'ar';
    var out;
    if (/موقع|عنوان|location|where|address/.test(msgLower)) {
      out = [{ type: 'location', title: isAr ? 'العيادة الرئيسية' : 'Main Clinic', address: isAr ? 'طريق الملك فهد، الرياض' : 'King Fahd Rd, Riyadh', query: 'King Fahd Road Riyadh' }];
    } else if (/حجز|موعد|book|appoint/.test(msgLower)) {
      out = [
        { type: 'text', text: isAr ? 'يسعدنا حجز موعد لك. يرجى تعبئة النموذج:' : 'Happy to book you in. Please fill this form:' },
        { type: 'form', title: isAr ? 'حجز موعد' : 'Book appointment', action: 'booking', fields: [
          { name: 'name', label: isAr ? 'الاسم' : 'Name', type: 'text', required: true },
          { name: 'phone', label: isAr ? 'الجوال' : 'Phone', type: 'tel', required: true },
          { name: 'date', label: isAr ? 'التاريخ' : 'Date', type: 'date', required: true }
        ] }
      ];
    } else if (/خدمات|service/.test(msgLower)) {
      out = [
        { type: 'service', title: isAr ? 'الفحص الشامل التنفيذي' : 'Executive Health Screening', description: isAr ? 'تقييم صحي متكامل خلال زيارة واحدة.' : 'Comprehensive same-day health assessment.', actions: [{ label: isAr ? 'التفاصيل' : 'Details', value: isAr ? 'أخبرني عن الفحص الشامل' : 'Tell me about the screening' }] },
        { type: 'quickReplies', replies: isAr ? ['احجز موعداً', 'الأسعار'] : ['Book an appointment', 'Pricing'] }
      ];
    } else {
      out = [
        { type: 'text', text: isAr ? 'هذه استجابة **تجريبية** (demo mode). اربط `webhookUrl` بخادم n8n لتفعيل الذكاء الاصطناعي.' : 'This is a **demo** response. Connect a `webhookUrl` to your n8n server to enable AI.' },
        { type: 'quickReplies', replies: isAr ? ['ما هي خدماتكم؟', 'أين موقعكم؟', 'احجز موعداً'] : ['What services do you offer?', 'Where are you located?', 'Book an appointment'] }
      ];
    }
    return new Promise(function (resolve) {
      setTimeout(function () {
        hideTyping();
        out.forEach(function (mp, i) {
          setTimeout(function () { pushMessage('assistant', mp); emit('message:received', mp); }, i * 350);
        });
        if (!isOpen) bumpUnread(out.length);
        resolve();
      }, 900);
    });
  }

  function bumpUnread(n) {
    unread += n;
    els.badge.textContent = unread > 9 ? '9+' : String(unread);
    els.badge.style.display = 'flex';
    els.badge.setAttribute('aria-label', t.newMessage);
  }
  function clearUnread() {
    unread = 0;
    els.badge.style.display = 'none';
  }

  /* ═══════════════ Theme / lang application ═══════════════ */
  function applyTheme() {
    if (!root) return;
    root.classList.toggle('dark', isDark());
  }
  function applyLang() {
    t = I18N[cfg.lang] || I18N.en;
    if (!root) return;
    root.setAttribute('dir', t.dir);
    els.hdTitle.textContent = cfg.title || t.title;
    setAgentHeader();
    els.ta.placeholder = t.inputPlaceholder;
    els.ta.setAttribute('aria-label', t.inputPlaceholder);
    els.sendBtn.setAttribute('aria-label', t.send);
    els.launcher && els.launcher.setAttribute('aria-label', isOpen ? t.closeChat : t.openChat);
    els.offline.textContent = t.offline;
    els.foot.textContent = t.poweredBy;
    // rebuild settings with new strings
    var wasOpen = els.settings.classList.contains('open');
    var fresh = buildSettings();
    els.panel.replaceChild(fresh, els.settings);
    els.settings = fresh;
    if (wasOpen) fresh.classList.add('open');
    renderAll();
  }

  function onSchemeChange() { if (cfg.theme === 'auto') applyTheme(); }
  function onOnline() { els.offline.classList.remove('show'); }
  function onOffline() { els.offline.classList.add('show'); }

  /* ═══════════════ Public API ═══════════════ */
  var api = {
    __loaded: true,

    init: function (userCfg) {
      if (root) api.destroy();
      destroyed = false;
      cfg = {};
      for (var k in DEFAULTS) cfg[k] = DEFAULTS[k];
      for (var k2 in (userCfg || {})) cfg[k2] = userCfg[k2];
      if (!I18N[cfg.lang]) cfg.lang = 'en';
      t = I18N[cfg.lang];

      // session
      sessionId = store('sid');
      if (!sessionId) { sessionId = uid(); store('sid', sessionId); }
      // restore persisted prefs
      var savedLang = store('lang'); if (savedLang && I18N[savedLang] && !(userCfg && userCfg.lang)) cfg.lang = savedLang;
      var savedTheme = store('theme'); if (savedTheme && !(userCfg && userCfg.theme)) cfg.theme = savedTheme;
      t = I18N[cfg.lang];
      // restore history
      messages = store('history') || [];

      // load fonts (best effort)
      if (!document.getElementById('aicw-fonts')) {
        var lnk = document.createElement('link');
        lnk.id = 'aicw-fonts';
        lnk.rel = 'stylesheet';
        lnk.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@600;700&family=Inter:wght@400;600&family=Geist+Mono:wght@400;500&display=swap';
        document.head.appendChild(lnk);
      }

      build();
      renderAll();
      applyTheme();

      if (mediaDark && mediaDark.addEventListener) mediaDark.addEventListener('change', onSchemeChange);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      if (navigator.onLine === false) onOffline();
      return api;
    },

    open: function () {
      if (!root || isOpen) return;
      isOpen = true;
      els.panel.classList.add('open');
      els.launcher.innerHTML = IC.close;
      els.launcher.appendChild(els.badge);
      els.launcher.setAttribute('aria-expanded', 'true');
      els.launcher.setAttribute('aria-label', t.closeChat);
      clearUnread();
      scrollDown();
      setTimeout(function () { els.ta.focus(); }, 250);
      emit('open');
    },

    close: function () {
      if (!root || !isOpen) return;
      isOpen = false;
      els.panel.classList.remove('open');
      els.launcher.innerHTML = IC.chat;
      els.launcher.appendChild(els.badge);
      els.launcher.setAttribute('aria-expanded', 'false');
      els.launcher.setAttribute('aria-label', t.openChat);
      toggleSettings(false);
      emit('close');
    },

    toggle: function () { isOpen ? api.close() : api.open(); },

    sendMessage: function (text) {
      if (!root || !text || !String(text).trim()) return;
      var v = String(text).trim();
      pushMessage('user', { type: 'text', text: v });
      emit('message:sent', { text: v });
      return sendToWebhook({ message: v });
    },

    injectMessage: function (msg) {
      if (!root || !msg) return;
      var role = msg.role || 'assistant';
      var payload = msg.payload || msg;
      delete payload.role;
      pushMessage(role, payload);
    },

    reset: function () {
      messages = [];
      agentMode = false;
      sessionId = uid();
      store('sid', sessionId);
      storeDel('history');
      setAgentHeader();
      renderAll();
      emit('reset');
    },

    updateConfig: function (partial) {
      var langChanged = partial.lang && partial.lang !== cfg.lang;
      var themeChanged = partial.theme && partial.theme !== cfg.theme;
      for (var k in (partial || {})) cfg[k] = partial[k];
      if (partial.lang) store('lang', cfg.lang);
      if (partial.theme) store('theme', cfg.theme);
      if (themeChanged) applyTheme();
      if (langChanged) applyLang();
      if (partial.title && els.hdTitle) els.hdTitle.textContent = cfg.title;
      if (partial.primaryColor || partial.secondaryColor) {
        var style = shadow.querySelector('style');
        if (style) style.textContent = css();
      }
    },

    on: function (ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); return api; },
    off: function (ev, cb) {
      if (!listeners[ev]) return api;
      listeners[ev] = listeners[ev].filter(function (f) { return f !== cb; });
      return api;
    },

    destroy: function () {
      if (destroyed) return;
      destroyed = true;
      isOpen = false;
      if (mediaDark && mediaDark.removeEventListener) mediaDark.removeEventListener('change', onSchemeChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (host && host.parentNode) host.parentNode.removeChild(host);
      host = shadow = root = null;
      els = {};
    }
  };

  window.AIChatWidget = api;

  /* ═══════════════ Auto-init via data attributes ═══════════════ */
  function autoInit() {
    var script = document.currentScript;
    if (!script) {
      var scripts = document.querySelectorAll('script[src*="chat-widget"]');
      script = scripts[scripts.length - 1];
    }
    if (!script) return;
    var d = script.dataset || {};
    if (!d.webhookUrl && !('autoInit' in d) && d.demo !== 'true') return; // programmatic mode
    var conf = {
      webhookUrl: d.webhookUrl || '',
      lang: d.lang || DEFAULTS.lang,
      theme: d.theme || DEFAULTS.theme,
      title: d.title || '',
      subtitle: d.subtitle || '',
      avatarUrl: d.avatar || '',
      position: d.position || DEFAULTS.position,
      primaryColor: d.primaryColor || DEFAULTS.primaryColor,
      secondaryColor: d.secondaryColor || DEFAULTS.secondaryColor,
      welcomeMessage: d.welcome || '',
      demoMode: d.demo === 'true'
    };
    if (d.prompts) {
      try { conf.suggestedPrompts = JSON.parse(d.prompts); }
      catch (e) { conf.suggestedPrompts = d.prompts.split('|').map(function (s) { return s.trim(); }).filter(Boolean); }
    }
    function go() { api.init(conf); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }
  autoInit();
})();
