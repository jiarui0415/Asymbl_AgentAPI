// ── Configuration ─────────────────────────────────────────────────────────
// After deploying AsymblAgentProxy to the FDE sandbox and setting up a Site,
// replace this with the Site guest REST endpoint (NOT the My Domain URL).
// Example: 'https://asymbl-dev-ed.my.site.com/services/apexrest/agentforce/v1/chat'
const SF_PROXY_URL = 'https://asymbl-mo--fde.sandbox.my.salesforce-sites.com/AgentProxyAPI/services/apexrest/agentforce/v1/chat';

// ── State ─────────────────────────────────────────────────────────────────
let sessionId  = null;
let sequenceId = 1;
let sending    = false;

// ── DOM refs ──────────────────────────────────────────────────────────────
const chatToggle  = document.getElementById('chat-toggle');
const chatWindow  = document.getElementById('chat-window');
const chatClose   = document.getElementById('chat-close');
const chatMessages = document.getElementById('chat-messages');
const chatInput   = document.getElementById('chat-input');
const chatSend    = document.getElementById('chat-send');

// ── Proxy call ────────────────────────────────────────────────────────────
async function callProxy(payload) {
  const res = await fetch(SF_PROXY_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'proxy_error');
  return data;
}

// ── Session init ──────────────────────────────────────────────────────────
async function initSession() {
  appendMessage('agent', '', 'loading');
  const data = await callProxy({ action: 'createSession' });
  removeByClass('loading');
  // accessToken stays in Apex (Platform Cache) — never stored here
  sessionId  = data.sessionId;
  sequenceId = 1;
  appendMessage('agent', 'Hi! I\'m the Asymbl Agent. How can I help you today?');
}

// ── Send message ──────────────────────────────────────────────────────────
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || sending) return;

  sending = true;
  setInputEnabled(false);
  chatInput.value = '';
  appendMessage('user', text);

  const loadingBubble = appendMessage('agent', '', 'loading');

  try {
    if (!sessionId) await initSession();
    removeElement(loadingBubble);

    const data = await callProxy({
      action:     'sendMessage',
      sessionId,
      text,
      sequenceId
    });
    sequenceId++;
    appendMessage('agent', data.reply || '(no reply)');
  } catch (err) {
    removeElement(loadingBubble);
    appendMessage('agent', 'Sorry, something went wrong. Please try again.', 'error');
    // Reset session so next send triggers re-init
    sessionId  = null;
    sequenceId = 1;
  } finally {
    sending = false;
    setInputEnabled(true);
    chatInput.focus();
  }
}

// ── End session ───────────────────────────────────────────────────────────
async function endSession() {
  if (!sessionId) return;
  try {
    await callProxy({ action: 'endSession', sessionId });
  } catch (_) {
    // best-effort — session may have already expired
  }
  sessionId  = null;
  sequenceId = 1;
  appendMessage('agent', 'Session ended. Start a new conversation anytime.', 'status');
}

// ── UI helpers ────────────────────────────────────────────────────────────
function appendMessage(role, text, modifier) {
  const wrap   = document.createElement('div');
  wrap.className = 'message ' + role + (modifier ? ' ' + modifier : '');

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return wrap;
}

function removeByClass(cls) {
  chatMessages.querySelectorAll('.' + cls).forEach(el => el.remove());
}

function removeElement(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function setInputEnabled(enabled) {
  chatInput.disabled = !enabled;
  chatSend.disabled  = !enabled;
}

// ── Auto-resize textarea ──────────────────────────────────────────────────
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

// ── Event listeners ───────────────────────────────────────────────────────
chatToggle.addEventListener('click', async () => {
  const isOpen = chatWindow.classList.toggle('open');
  if (isOpen && !sessionId) {
    try {
      await initSession();
    } catch (err) {
      removeByClass('loading');
      appendMessage('agent', 'Unable to connect. Check the Salesforce org configuration.', 'error');
    }
  }
});

chatClose.addEventListener('click', () => {
  chatWindow.classList.remove('open');
});

chatSend.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// End session when user closes the browser tab
window.addEventListener('beforeunload', () => {
  if (sessionId) {
    navigator.sendBeacon(SF_PROXY_URL, JSON.stringify({
      action: 'endSession', sessionId
    }));
  }
});
