/* Tiny mock n8n webhook + static file server for local testing of widget.js */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  // CORS for the mock webhook
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // Mock webhook: echoes a markdown-rich reply after a short delay.
  if (req.url === '/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      let userMsg = '';
      try { userMsg = (JSON.parse(body).chatInput) || ''; } catch (e) {}
      const reply =
        `Thanks for asking about **"${userMsg}"**!\n\n` +
        `Here's what I can help with:\n` +
        `- Answer product questions\n` +
        `- Share **pricing** & plans\n` +
        `- Connect you with our team\n\n` +
        `Visit https://example.com for more, or run \`npm install\` to get started.`;
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ output: reply }));
      }, 900);
    });
    return;
  }

  // Static files
  let filePath = path.join(__dirname, '..', req.url === '/' ? '../demo.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Mock server on http://0.0.0.0:${PORT}`));
