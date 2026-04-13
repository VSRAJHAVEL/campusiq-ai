/**
 * ═══════════════════════════════════════════════
 * CAMPUS IQ - AI MENTOR CHATBOT (v3.0 — API-Powered)
 * Sends messages to /api/chat and renders real DB responses
 * ═══════════════════════════════════════════════
 */

$(document).ready(function() {

  // ─── Inject Chatbot HTML ────────────────────────
  const botHTML = `
    <div id="ai-chatbot" class="chatbot-container">
      <div class="chatbot-header">
        <div class="bot-info">
          <span class="bot-avatar" style="
            font-family:'Playfair Display',serif;font-size:0.85rem;font-weight:bold;
            background:var(--accent-primary);color:#000;
            width:36px;height:36px;border-radius:0;
            display:flex;align-items:center;justify-content:center;flex-shrink:0;
          ">AI</span>
          <div>
            <h4 style="font-size:0.9rem;margin:0;font-family:'Playfair Display',serif;color:var(--accent-primary);">CampusIQ Mentor</h4>
            <small style="color:#4caf50;font-size:0.7rem;">● Online — Powered by real database</small>
          </div>
        </div>
        <button id="close-chat" style="background:none;border:none;color:#666;font-size:1.2rem;cursor:pointer;transition:color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#666'">✕</button>
      </div>

      <div id="chat-messages" class="chatbot-messages">
        <div class="message bot">
          <div class="msg-bubble">
            Hello! 👋 I'm your <strong style="color:var(--accent-primary)">CampusIQ Mentor</strong> — I have live access to your campus database.<br><br>
            Ask me about <em>courses, events, clubs</em>, your <em>Learning DNA</em>, or for <em>career advice</em>.<br><br>
            <span style="font-size:0.82em;color:#888;">Try: "Show me free Python courses" or "What events are coming up?"</span>
          </div>
        </div>
      </div>

      <div class="chatbot-quick-replies" id="quick-replies-bar">
        <button class="quick-reply" data-msg="Show me free courses">Free courses</button>
        <button class="quick-reply" data-msg="What clubs should I join?">Clubs</button>
        <button class="quick-reply" data-msg="What events are upcoming?">Events</button>
        <button class="quick-reply" data-msg="Explain my Learning DNA">My DNA</button>
        <button class="quick-reply" data-msg="Career advice for tech">Career tips</button>
      </div>

      <div class="chatbot-input">
        <input type="text" id="chat-input" placeholder="Ask me anything about campus..." autocomplete="off" maxlength="200">
        <button id="send-chat">SEND</button>
      </div>
    </div>

    <button id="chatbot-toggle" class="chat-toggle-btn">
      💬 AI MENTOR
    </button>
  `;

  $('body').append(botHTML);

  let chatOpen  = false;
  let isSending = false;

  // ─── Toggle Chat ────────────────────────────────
  $('#chatbot-toggle').click(() => toggleChat(true));
  $('#close-chat').click(() => toggleChat(false));

  function toggleChat(open) {
    chatOpen = open;
    if (open) {
      $('#ai-chatbot').addClass('active');
      $('#chatbot-toggle').hide();
      setTimeout(() => $('#chat-input').focus(), 300);
    } else {
      $('#ai-chatbot').removeClass('active');
      $('#chatbot-toggle').show();
    }
  }

  // ─── Send ─────────────────────────────────────
  $('#send-chat').click(sendMessage);
  $('#chat-input').keydown(function(e) {
    if (e.which === 13 && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  $(document).on('click', '.quick-reply', function() {
    const msg = $(this).data('msg') || $(this).text();
    $('#chat-input').val(msg);
    sendMessage();
  });

  // ─── Core send function ─────────────────────────
  async function sendMessage() {
    if (isSending) return;
    const raw = $('#chat-input').val().trim();
    if (!raw) return;

    isSending = true;
    $('#send-chat').text('...').prop('disabled', true);

    appendMessage('user', escapeHtml(raw));
    $('#chat-input').val('');

    // Typing indicator
    const $typing = $(`
      <div class="message bot" id="typing-indicator">
        <div class="msg-bubble" style="display:flex;align-items:center;gap:5px;padding:0.8rem 1rem;">
          <span style="width:7px;height:7px;background:var(--accent-primary);border-radius:50%;display:inline-block;animation:chatDot 1.2s 0s infinite ease-in-out;"></span>
          <span style="width:7px;height:7px;background:var(--accent-primary);border-radius:50%;display:inline-block;animation:chatDot 1.2s 0.2s infinite ease-in-out;"></span>
          <span style="width:7px;height:7px;background:var(--accent-primary);border-radius:50%;display:inline-block;animation:chatDot 1.2s 0.4s infinite ease-in-out;"></span>
        </div>
      </div>
    `);

    // Inject keyframes once
    if (!document.getElementById('chat-dot-style')) {
      $('head').append(`<style id="chat-dot-style">
        @keyframes chatDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      </style>`);
    }

    $('#chat-messages').append($typing);
    scrollBottom();

    try {
      // Call backend /api/chat endpoint
      const token = localStorage.getItem('campusiq_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: raw })
      });

      const data = await res.json();
      const replyHtml = data.reply || '⚠️ No response received. Please try again.';

      await simulateDelay(350 + Math.random() * 300);
      $('#typing-indicator').remove();
      appendMessage('bot', replyHtml);

    } catch (err) {
      console.error('Chat error:', err);
      $('#typing-indicator').remove();
      appendMessage('bot', '⚠️ Connection error. Make sure the server is running and try again.');
    } finally {
      isSending = false;
      $('#send-chat').text('SEND').prop('disabled', false);
      scrollBottom();
    }
  }

  // ─── Helpers ───────────────────────────────────
  function appendMessage(sender, html) {
    const isBot = sender === 'bot';
    const $msg = $(`
      <div class="message ${sender}" style="animation: fadeIn 0.3s ease;">
        <div class="msg-bubble">${html}</div>
      </div>
    `);
    $('#chat-messages').append($msg);
    scrollBottom();

    // Make any links inside bot messages work
    if (isBot) {
      $msg.find('a[href="#"]').on('click', function(e) {
        const cls = $(this).attr('class') || '';
        if (cls.includes('open-login-btn')) {
          e.preventDefault();
          toggleChat(false);
          if (typeof openAuthModal === 'function') openAuthModal('login');
        } else if (cls.includes('open-register-btn')) {
          e.preventDefault();
          toggleChat(false);
          if (typeof openAuthModal === 'function') openAuthModal('register');
        }
      });
    }
  }

  function scrollBottom() {
    const el = document.getElementById('chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});
