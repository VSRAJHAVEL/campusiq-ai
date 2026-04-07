/**
 * ═══════════════════════════════════════════════
 * CAMPUS IQ - AI MENTOR CHATBOT
 * ═══════════════════════════════════════════════
 */

$(document).ready(function() {
  
  // Inject HTML structure for Chatbot
  const botHTML = `
    <div id="ai-chatbot" class="chatbot-container">
      <div class="chatbot-header">
        <div class="bot-info">
          <span class="bot-avatar" style="font-family: var(--font-serif); font-size: 0.9rem; font-weight: bold; background: var(--accent-primary); color: #000;">AI</span>
          <div>
            <h4>CampusIQ Mentor</h4>
            <small>Online</small>
          </div>
        </div>
        <button id="close-chat">✕</button>
      </div>
      
      <div id="chat-messages" class="chatbot-messages">
        <!-- Initial Message -->
        <div class="message bot">
          <div class="msg-bubble">
            Hi! I'm your AI Mentor. I can help recommend courses, clubs, and explain why certain items fit your Learning DNA. How can I help today?
          </div>
        </div>
      </div>
      
      <div class="chatbot-quick-replies">
        <button class="quick-reply">What should I learn next?</button>
        <button class="quick-reply">Suggest a club</button>
        <button class="quick-reply">Explain my DNA</button>
      </div>
      
      <div class="chatbot-input">
        <input type="text" id="chat-input" placeholder="Type a message...">
        <button id="send-chat">➤</button>
      </div>
    </div>
    
    <button id="chatbot-toggle" class="chat-toggle-btn">
      AI MENTOR
    </button>
  `;
  
  $('body').append(botHTML);
  
  // State
  let chatOpen = false;
  
  // Toggles
  $('#chatbot-toggle').click(() => toggleChat(true));
  $('#close-chat').click(() => toggleChat(false));
  
  function toggleChat(state) {
    chatOpen = state;
    if (chatOpen) {
      $('#ai-chatbot').addClass('active');
      $('#chatbot-toggle').hide();
    } else {
      $('#ai-chatbot').removeClass('active');
      $('#chatbot-toggle').show();
    }
  }
  
  // Send message
  $('#send-chat').click(sendMessage);
  $('#chat-input').keypress(function(e) {
    if(e.which == 13) sendMessage();
  });
  
  $('.quick-reply').click(function() {
    $('#chat-input').val($(this).text());
    sendMessage();
  });
  
  function appendMessage(sender, text) {
    $('#chat-messages').append(`
      <div class="message ${sender}">
        <div class="msg-bubble">${text}</div>
      </div>
    `);
    const msgs = document.getElementById('chat-messages');
    msgs.scrollTop = msgs.scrollHeight;
  }
  
  async function sendMessage() {
    const input = $('#chat-input').val().trim();
    if (!input) return;
    
    // User message
    appendMessage('user', input);
    $('#chat-input').val('');
    
    // Typing indicator
    $('#chat-messages').append(`
      <div class="message bot typing">
        <div class="msg-bubble">...</div>
      </div>
    `);
    scrollToBottom();
    
    // Process via pure JS AI logic
    const response = await generateAIResponse(input.toLowerCase());
    
    setTimeout(() => {
      $('.typing').remove();
      appendMessage('bot', response);
    }, 600 + Math.random() * 500); // Simulate network delay
  }
  
  function scrollToBottom() {
    const msgs = document.getElementById('chat-messages');
    msgs.scrollTop = msgs.scrollHeight;
  }
  
  // Pure JS "AI" processing (Pattern Matching + Context)
  async function generateAIResponse(query) {
    // Keyword matching logic
    if (query.includes('learn next') || query.includes('course') || query.includes('career')) {
      if (typeof userToken !== 'undefined' && userToken) {
        return "Based on your behavior patterns, I recommend checking your Career Dashboard. Your interactions suggest a strong alignment with Web Development and AI. Should I list the top 2 suggestions?";
      }
      return "To give you a personalized recommendation, please log in so I can analyze your Learning DNA! But generally, AI and React are trending highly right now.";
    }
    
    if (query.includes('club') || query.includes('event')) {
      return "I notice a lot of students with your profile join the 'AI & Robotics Club'. It has excellent community ratings. Check the Campus Explore tab for more!";
    }
    
    if (query.includes('explain') || query.includes('dna')) {
      return "Your Learning DNA is calculated using cosine similarity on a 10-dimensional feature vector comparing your clicks/enrollments to our database metadata. It dynamically updates in real-time!";
    }
    
    if (query.includes('hello') || query.includes('hi')) {
      return "Hello! Let's optimize your campus experience. Ask me about courses, events, or how our recommendation engine works.";
    }
    
    if (query.includes('why')) {
      return "Every recommendation on CampusIQ is scored using a hybrid AI model: 60% Content-based (what you click), 30% Collaborative (what similar students click), and 10% Trending metrics.";
    }
    
    return "I'm your AI Mentor. I analyze your interaction data to help you. Try asking 'What should I learn next?' or 'Explain my DNA'.";
  }
});
