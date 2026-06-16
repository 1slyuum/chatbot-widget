# 💬 ChatWidget

A lightweight, fully-customizable, dependency-free **AI chatbot widget** you can drop into any website with a single `<script>` tag. Built for selling AI chatbots as a SaaS — each client gets their own n8n webhook URL and brand styling, all configured through `data-*` attributes.

**Live demo & embed-code builder:** open `demo.html` (or your GitHub Pages URL).

---

## 🚀 Quick start

Add one line before `</body>` (or in `<head>` — it's safe either way):

```html
<script src="https://1slyuum.github.io/chatbot-widget/widget.js"
  data-webhook="https://YOUR-N8N/webhook/abcdef"
  data-name="Acme Inc"
  data-color-primary="#c9a84c"
  defer></script>
```

That's it. The floating launcher appears in the bottom-right corner.

> ✅ Works with `defer`, `async`, in `<head>`, or injected dynamically — the widget auto-detects its own script tag and waits for `<body>`.

---

## 🔌 Connecting your n8n webhook

The widget sends a `POST` request to your `data-webhook` URL with this JSON body:

```json
{
  "chatInput": "the user's message",
  "message":   "the user's message",
  "sessionId": "session_xxxxx",
  "page":      "https://the-page-it-was-sent-from"
}
```

It accepts a reply in **any** of these shapes (plain text or JSON):

```jsonc
"Just a plain text reply"
{ "output": "..." }      // n8n AI Agent default
{ "text": "..." }
{ "message": "..." }
{ "response": "..." }
{ "answer": "..." }
{ "reply": "..." }
[ { "output": "..." } ]   // arrays are handled too
```

**n8n setup:** Use a **Webhook** node (POST) → your AI Agent / LLM → a **Respond to Webhook** node returning `{ "output": "{{ $json.output }}" }`. Make sure CORS allows your client's domain (n8n: enable "Allow CORS" / set the response header `Access-Control-Allow-Origin`).

> AI replies support **Markdown** — bold, italics, lists, links, inline `code` and code blocks all render nicely.

---

## ⚙️ Configuration reference

All options are `data-*` attributes on the `<script>` tag.

### Connection
| Attribute | Default | Description |
|---|---|---|
| `data-webhook` | *(required)* | Your n8n webhook URL |

### Branding & content
| Attribute | Default | Description |
|---|---|---|
| `data-name` | `AI Assistant` | Business / bot name in the header |
| `data-avatar` | first letter of name | Single-letter avatar |
| `data-avatar-image` | — | URL to a logo image (overrides the letter) |
| `data-badge` | `AI` | Small badge in the header (empty to hide) |
| `data-welcome-title` | `Welcome to …` | Welcome card title |
| `data-welcome-sub` | `Ask me anything…` | Welcome card subtitle |
| `data-initial-message` | auto | First AI message shown |
| `data-status-text` | `Online · replies instantly` | Status line under the name |
| `data-placeholder` | `Type a message…` | Input placeholder |
| `data-chips` | 3 defaults | Suggestion chips: `"emoji:label,emoji:label"` |
| `data-powered-by` | business name | Footer "Powered by" text |
| `data-powered-by-url` | — | Make the footer text a link |
| `data-show-powered-by` | `true` | Set `false` to hide the footer |

### Appearance
| Attribute | Default | Description |
|---|---|---|
| `data-theme` | `auto` | `auto` \| `light` \| `dark` |
| `data-position` | `bottom-right` | `bottom-right` \| `bottom-left` |
| `data-color-primary` | `#c9a84c` | Main accent / brand color |
| `data-color-primary-dark` | auto-derived | Gradient end color |
| `data-color-user-text` | auto-contrast | Text color on the accent (auto picks black/white) |
| `data-color-bg` / `-panel` / `-header` / `-border` / `-text` / `-muted` / `-ai-bubble` / `-input-bg` | theme | Fine-grained surface overrides |
| `data-launcher-size` | `60` | Launcher diameter in px |
| `data-bubble-radius` | `18px` | Message bubble corner radius |
| `data-panel-radius` | `20px` | Widget panel corner radius |
| `data-offset-x` / `data-offset-y` | `24` | Distance from the screen edge (px) |
| `data-font` | system font stack | CSS `font-family` |

### Behaviour
| Attribute | Default | Description |
|---|---|---|
| `data-timeout` | `60000` | Request timeout in ms (LLMs can be slow) |
| `data-persist-chat` | `true` | Keep chat history across page reloads |
| `data-persist-open` | `false` | Remember open/closed state |
| `data-max-history` | `50` | Max messages stored locally |
| `data-auto-open` | `false` | Open automatically on page load |
| `data-auto-open-delay` | `3000` | Delay before auto-open (ms) |
| `data-greeting-bubble` | `false` | Show a teaser bubble near the launcher |
| `data-greeting-text` | `👋 Need help?…` | Teaser bubble text |
| `data-sound` | `false` | Play a subtle beep on new replies |

---

## 🧩 JavaScript API

Once loaded, control the widget programmatically:

```js
ChatWidget.open();                  // open the panel
ChatWidget.close();                 // close it
ChatWidget.toggle();                // toggle
ChatWidget.clear();                 // start a new conversation
ChatWidget.sendMessage('Hello!');   // open + send a message
ChatWidget.isOpen();                // → true / false
ChatWidget.config;                  // the resolved config object
```

Example — open the chat from your own "Need help?" button:

```html
<button onclick="ChatWidget.open()">Chat with us</button>
```

---

## ✨ What's included

- **Markdown rendering** — safe, whitelist-based (no raw HTML injection from the model)
- **Chat persistence** — conversations survive reloads (per-webhook namespaced)
- **Unread badge** — counts replies that arrive while the widget is closed
- **Smart error handling** — friendly messages + one-click retry for timeouts/network/server errors
- **Auto-contrast colors** — readable text picked automatically for any brand color
- **Robust loading** — `currentScript` fallback + waits for `document.body`
- **Accessibility** — ARIA roles, keyboard support, `Esc` to close, focus management
- **Mobile-friendly** — responsive layout, `100dvh` handling, reduced-motion support
- **Zero dependencies** — one self-contained file, ~no build step

---

## 🛠️ Local development

```bash
# from the repo root
node dev/mock-server.js          # serves demo.html + a mock /webhook on :8080
# open http://localhost:8080
```

- `dev/mock-server.js` — static server + a fake n8n webhook that returns a Markdown reply
- `dev/test.html` — automated self-test (open it and check the console for PASS/FAIL)

---

## 🚢 Deploying (GitHub Pages)

1. Push to the `main` branch.
2. Repo **Settings → Pages → Source: Deploy from branch → `main` / root**.
3. Your widget is served at `https://<user>.github.io/<repo>/widget.js`.
4. Give clients the `<script>` snippet from `demo.html` (the builder generates it for them).

> Tip: append a version query when you publish updates, e.g. `widget.js?v=2`, to bust browser caches.

---

## 📄 License

MIT — free to use and modify for your SaaS.
