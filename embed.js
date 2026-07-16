<!-- ✈️ Travel Chatbot Widget — paste before </body> -->
<script>
(function (w, d) {
  // ── Your configuration ──
  var config = {
    webhook: 'https://islempharm.app.n8n.cloud/webhook/travel-chatbot',
    agencyName: 'Travel Advisor',
    assistantName: 'Alex',
    theme: { primary: '#0B3D5C', accent: '#F2A93B', mode: 'auto' },
    position: 'bottom-right'
  };

  // ── Loader (no need to edit) ──
  function start() { w.RealEstateChatbot.init(config); }
  var s = d.createElement('script');
  s.src = 'https://1slyuum.github.io/chatbot-widget/travel-agent-chatbot.js';
  s.async = true;
  s.onload = function () {
    d.body ? start() : d.addEventListener('DOMContentLoaded', start);
  };
  d.head.appendChild(s);
})(window, document);
</script>
