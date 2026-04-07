/**
 * ═══════════════════════════════════════════════
 * CAMPUS IQ - CORE APP LOGIC (v2.0 — Full Fix)
 * ═══════════════════════════════════════════════
 */

// Global State
let userToken = localStorage.getItem('campusiq_token');
let userData = null;
let loading = true;

// API Base
const API_URL = '/api';

// ─── TOAST NOTIFICATION SYSTEM ──────────────────────
function showToast(message, type = 'info') {
  // Remove any existing toast
  $('#ciq-toast').remove();

  const colors = {
    success: '#C5A059',
    error: '#e53e3e',
    info: '#3b82f6',
    warning: '#D4AF37'
  };

  const toast = $(`
    <div id="ciq-toast" style="
      position: fixed;
      top: 90px;
      right: 30px;
      z-index: 9999;
      background: #111;
      border: 1px solid ${colors[type] || colors.info};
      color: #fff;
      padding: 1rem 1.5rem;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      max-width: 360px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8);
      animation: fadeIn 0.3s ease;
    ">
      <span style="color:${colors[type] || colors.info}; margin-right:8px; font-weight:700;">
        ${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}
      </span>
      ${message}
    </div>
  `);

  $('body').append(toast);

  setTimeout(() => {
    $('#ciq-toast').fadeOut(400, () => $('#ciq-toast').remove());
  }, 4000);
}

// ─── MODAL HELPERS ────────────────────────────────────
function openAuthModal(mode = 'login') {
  // Build the auth modal if it doesn't exist
  if ($('#auth-modal-overlay').length === 0) {
    $('body').append(`
      <div id="auth-modal-overlay" style="
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);
        z-index:2000;display:flex;align-items:center;justify-content:center;
      ">
        <div id="auth-modal" style="
          background:#111;border:1px solid rgba(197,160,89,0.4);
          padding:3rem;width:100%;max-width:420px;position:relative;
          box-shadow:0 20px 60px rgba(0,0,0,0.9);
        ">
          <button id="auth-modal-close" style="
            position:absolute;top:1rem;right:1.5rem;
            background:none;border:none;color:#888;font-size:1.3rem;cursor:pointer;
          ">✕</button>

          <!-- Tabs -->
          <div style="display:flex;gap:0;margin-bottom:2rem;border-bottom:1px solid rgba(197,160,89,0.2);">
            <button id="tab-login" class="auth-tab-btn" data-tab="login" style="
              flex:1;padding:0.8rem;background:none;border:none;border-bottom:2px solid transparent;
              color:#888;font-family:'Montserrat',sans-serif;font-size:0.85rem;letter-spacing:0.1em;
              text-transform:uppercase;cursor:pointer;transition:all 0.2s;
            ">Sign In</button>
            <button id="tab-register" class="auth-tab-btn" data-tab="register" style="
              flex:1;padding:0.8rem;background:none;border:none;border-bottom:2px solid transparent;
              color:#888;font-family:'Montserrat',sans-serif;font-size:0.85rem;letter-spacing:0.1em;
              text-transform:uppercase;cursor:pointer;transition:all 0.2s;
            ">Register</button>
          </div>

          <!-- Login Form -->
          <div id="form-login">
            <h2 style="font-family:'Playfair Display',serif;color:#C5A059;margin-bottom:0.5rem;">Welcome Back</h2>
            <p style="color:#888;font-size:0.85rem;margin-bottom:2rem;">Sign in to access your AI-powered profile.</p>
            <form id="login-form" style="display:flex;flex-direction:column;gap:1rem;">
              <div>
                <label style="display:block;color:#888;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">Email</label>
                <input type="email" id="login-email" placeholder="you@university.edu" required
                  style="width:100%;padding:0.9rem 1rem;background:rgba(0,0,0,0.4);border:1px solid rgba(197,160,89,0.3);color:#fff;font-family:'Montserrat',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;"
                  onfocus="this.style.borderColor='rgba(197,160,89,0.8)'" onblur="this.style.borderColor='rgba(197,160,89,0.3)'">
              </div>
              <div>
                <label style="display:block;color:#888;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">Password</label>
                <input type="password" id="login-password" placeholder="••••••••" required
                  style="width:100%;padding:0.9rem 1rem;background:rgba(0,0,0,0.4);border:1px solid rgba(197,160,89,0.3);color:#fff;font-family:'Montserrat',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;"
                  onfocus="this.style.borderColor='rgba(197,160,89,0.8)'" onblur="this.style.borderColor='rgba(197,160,89,0.3)'">
              </div>
              <div id="login-error" style="display:none;color:#e53e3e;font-size:0.8rem;padding:0.5rem;border-left:2px solid #e53e3e;"></div>
              <button type="submit" class="btn btn-primary" style="margin-top:0.5rem;width:100%;">
                <span class="btn-text">Sign In</span>
                <span class="btn-spinner" style="display:none;">...</span>
              </button>
            </form>
            <p style="margin-top:1.5rem;text-align:center;color:#888;font-size:0.8rem;">
              Don't have an account? 
              <a href="#" id="switch-to-register" style="color:#C5A059;text-decoration:underline;">Create one</a>
            </p>
          </div>

          <!-- Register Form -->
          <div id="form-register" style="display:none;">
            <h2 style="font-family:'Playfair Display',serif;color:#C5A059;margin-bottom:0.5rem;">Join CampusIQ</h2>
            <p style="color:#888;font-size:0.85rem;margin-bottom:2rem;">Create your free AI-powered campus profile.</p>
            <form id="register-form" style="display:flex;flex-direction:column;gap:1rem;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;color:#888;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">Full Name</label>
                  <input type="text" id="reg-name" placeholder="Alex Kumar" required
                    style="width:100%;padding:0.9rem 1rem;background:rgba(0,0,0,0.4);border:1px solid rgba(197,160,89,0.3);color:#fff;font-family:'Montserrat',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;"
                    onfocus="this.style.borderColor='rgba(197,160,89,0.8)'" onblur="this.style.borderColor='rgba(197,160,89,0.3)'">
                </div>
                <div>
                  <label style="display:block;color:#888;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">Year</label>
                  <select id="reg-year"
                    style="width:100%;padding:0.9rem 1rem;background:#111;border:1px solid rgba(197,160,89,0.3);color:#fff;font-family:'Montserrat',sans-serif;font-size:0.9rem;outline:none;">
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                    <option>Graduate</option>
                  </select>
                </div>
              </div>
              <div>
                <label style="display:block;color:#888;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">Email</label>
                <input type="email" id="reg-email" placeholder="you@university.edu" required
                  style="width:100%;padding:0.9rem 1rem;background:rgba(0,0,0,0.4);border:1px solid rgba(197,160,89,0.3);color:#fff;font-family:'Montserrat',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;"
                  onfocus="this.style.borderColor='rgba(197,160,89,0.8)'" onblur="this.style.borderColor='rgba(197,160,89,0.3)'">
              </div>
              <div>
                <label style="display:block;color:#888;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">Major / Field</label>
                <input type="text" id="reg-major" placeholder="Computer Science" required
                  style="width:100%;padding:0.9rem 1rem;background:rgba(0,0,0,0.4);border:1px solid rgba(197,160,89,0.3);color:#fff;font-family:'Montserrat',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;"
                  onfocus="this.style.borderColor='rgba(197,160,89,0.8)'" onblur="this.style.borderColor='rgba(197,160,89,0.3)'">
              </div>
              <div>
                <label style="display:block;color:#888;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">Password (min 6 chars)</label>
                <input type="password" id="reg-password" placeholder="••••••••" required minlength="6"
                  style="width:100%;padding:0.9rem 1rem;background:rgba(0,0,0,0.4);border:1px solid rgba(197,160,89,0.3);color:#fff;font-family:'Montserrat',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;"
                  onfocus="this.style.borderColor='rgba(197,160,89,0.8)'" onblur="this.style.borderColor='rgba(197,160,89,0.3)'">
              </div>
              <div>
                <label style="display:block;color:#888;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem;">Career Goal</label>
                <input type="text" id="reg-career" placeholder="Full Stack Developer, Data Scientist..."
                  style="width:100%;padding:0.9rem 1rem;background:rgba(0,0,0,0.4);border:1px solid rgba(197,160,89,0.3);color:#fff;font-family:'Montserrat',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;"
                  onfocus="this.style.borderColor='rgba(197,160,89,0.8)'" onblur="this.style.borderColor='rgba(197,160,89,0.3)'">
              </div>
              <div id="reg-error" style="display:none;color:#e53e3e;font-size:0.8rem;padding:0.5rem;border-left:2px solid #e53e3e;"></div>
              <button type="submit" class="btn btn-primary" style="margin-top:0.5rem;width:100%;">
                <span class="btn-text">Create Account</span>
                <span class="btn-spinner" style="display:none;">...</span>
              </button>
            </form>
            <p style="margin-top:1.5rem;text-align:center;color:#888;font-size:0.8rem;">
              Already have an account? 
              <a href="#" id="switch-to-login" style="color:#C5A059;text-decoration:underline;">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    `);

    // Tab switching
    function switchAuthTab(tab) {
      const isLogin = tab === 'login';
      $('#form-login').toggle(isLogin);
      $('#form-register').toggle(!isLogin);

      $('#tab-login').css({
        'color': isLogin ? '#C5A059' : '#888',
        'border-bottom-color': isLogin ? '#C5A059' : 'transparent'
      });
      $('#tab-register').css({
        'color': !isLogin ? '#C5A059' : '#888',
        'border-bottom-color': !isLogin ? '#C5A059' : 'transparent'
      });
    }

    // Initialize to proper tab
    switchAuthTab(mode);

    $('.auth-tab-btn').click(function() { switchAuthTab($(this).data('tab')); });
    $('#switch-to-register').click(function(e) { e.preventDefault(); switchAuthTab('register'); });
    $('#switch-to-login').click(function(e) { e.preventDefault(); switchAuthTab('login'); });

    // Close
    $('#auth-modal-close').click(() => closeAuthModal());
    $('#auth-modal-overlay').click(function(e) {
      if ($(e.target).is('#auth-modal-overlay')) closeAuthModal();
    });

    // ── Login Form Submit ──────────────────
    $('#login-form').submit(async function(e) {
      e.preventDefault();
      const email = $('#login-email').val().trim();
      const password = $('#login-password').val();

      if (!email || !password) {
        $('#login-error').text('Please enter both email and password.').show();
        return;
      }

      // Show spinner
      $('#login-form .btn-text').hide();
      $('#login-form .btn-spinner').show();
      $('#login-error').hide();

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
          // Show actual error from server
          $('#login-error').text(data.error || 'Invalid email or password. Please try again.').show();
          return;
        }

        if (data.token) {
          localStorage.setItem('campusiq_token', data.token);
          userToken = data.token;
          closeAuthModal();
          showToast('Welcome back! Loading your dashboard...', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 800);
        }
      } catch (err) {
        console.error('Login error', err);
        $('#login-error').text('Connection error. Please ensure the server is running.').show();
      } finally {
        $('#login-form .btn-text').show();
        $('#login-form .btn-spinner').hide();
      }
    });

    // ── Register Form Submit ──────────────────
    $('#register-form').submit(async function(e) {
      e.preventDefault();
      const name = $('#reg-name').val().trim();
      const email = $('#reg-email').val().trim();
      const password = $('#reg-password').val();
      const major = $('#reg-major').val().trim();
      const year = $('#reg-year').val();
      const careerGoal = $('#reg-career').val().trim();

      if (!name || !email || !password || !major) {
        $('#reg-error').text('Please fill in all required fields.').show();
        return;
      }

      if (password.length < 6) {
        $('#reg-error').text('Password must be at least 6 characters.').show();
        return;
      }

      $('#register-form .btn-text').hide();
      $('#register-form .btn-spinner').show();
      $('#reg-error').hide();

      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            major,
            year,
            preferences: {
              careerGoal,
              interests: [],
              learningStyle: 'hands-on'
            }
          })
        });

        const data = await res.json();

        if (!res.ok) {
          $('#reg-error').text(data.error || 'Registration failed. Please try again.').show();
          return;
        }

        if (data.token) {
          localStorage.setItem('campusiq_token', data.token);
          userToken = data.token;
          closeAuthModal();
          showToast('Account created! Welcome to CampusIQ ✨', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 800);
        }
      } catch (err) {
        console.error('Register error', err);
        $('#reg-error').text('Connection error. Please ensure the server is running.').show();
      } finally {
        $('#register-form .btn-text').show();
        $('#register-form .btn-spinner').hide();
      }
    });
  } else {
    // Modal exists — just show it and switch tab
    $('#auth-modal-overlay').show();
    switchAuthTab && switchAuthTab(mode);
  }
}

function closeAuthModal() {
  $('#auth-modal-overlay').fadeOut(200, () => $('#auth-modal-overlay').remove());
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  $('#form-login').toggle(isLogin);
  $('#form-register').toggle(!isLogin);
  $('#tab-login').css({
    'color': isLogin ? '#C5A059' : '#888',
    'border-bottom-color': isLogin ? '#C5A059' : 'transparent'
  });
  $('#tab-register').css({
    'color': !isLogin ? '#C5A059' : '#888',
    'border-bottom-color': !isLogin ? '#C5A059' : 'transparent'
  });
}

// ─── NAV STATE MANAGEMENT ────────────────────────────
function updateNavState() {
  if (userToken) {
    // Logged in — show full nav
    $('#nav-signin-btn').hide();
    $('#nav-register-btn').hide();
    $('#nav-logged-in').show();
  } else {
    // Logged out — show sign in + register
    $('#nav-signin-btn').show();
    $('#nav-register-btn').show();
    $('#nav-logged-in').hide();
  }
}

$(document).ready(function() {

  // ─── AUTHENTICATION FLOW ────────────────────────
  if (userToken) {
    fetchUserProfile();
  } else {
    // Redirect protected pages to index with auth modal
    if (window.location.pathname.includes('explore')) {
      window.location.href = '/?auth=1';
      return;
    }
    if (window.location.pathname.includes('dashboard')) {
      $('#login-overlay').css('display', 'flex');
    }
  }

  // Update nav state
  updateNavState();

  // ─── NAV BUTTON EVENTS ───────────────────────────
  // Sign In from nav
  $(document).on('click', '#nav-signin-btn, .open-login-btn', function(e) {
    e.preventDefault();
    openAuthModal('login');
  });

  // Register from nav
  $(document).on('click', '#nav-register-btn, .open-register-btn', function(e) {
    e.preventDefault();
    openAuthModal('register');
  });

  // Legacy login overlay (dashboard.html)
  $(document).on('submit', '#login-overlay-form', async function(e) {
    e.preventDefault();
    const email = $('#lo-email').val().trim();
    const password = $('#lo-password').val();

    if (!email || !password) {
      $('#lo-error').text('Please enter email and password.').show();
      return;
    }

    $('#lo-btn').text('Signing in...');
    $('#lo-error').hide();

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        $('#lo-error').text(data.error || 'Invalid email or password.').show();
        $('#lo-btn').text('Sign In');
        return;
      }

      if (data.token) {
        localStorage.setItem('campusiq_token', data.token);
        userToken = data.token;
        $('#login-overlay').fadeOut();
        updateNavState();
        fetchUserProfile();
        showToast('Welcome back!', 'success');
      }
    } catch (err) {
      $('#lo-error').text('Connection error. Is the server running?').show();
      $('#lo-btn').text('Sign In');
    }
  });

  // Dashboard overlay register switch
  $(document).on('click', '#lo-switch-register', function(e) {
    e.preventDefault();
    openAuthModal('register');
    $('#login-overlay').fadeOut();
  });

  // Auto-open auth modal if redirected with ?auth=1
  if (window.location.search.includes('auth=1')) {
    setTimeout(() => openAuthModal('login'), 500);
  }

  // Logout
  $(document).on('click', '#logout-btn, .logout-action', function(e) {
    e.preventDefault();
    localStorage.removeItem('campusiq_token');
    userToken = null;
    userData = null;
    showToast('Signed out successfully.', 'info');
    setTimeout(() => { window.location.href = '/'; }, 600);
  });

});

// ─── DATA FETCHING ──────────────────────────────
async function fetchUserProfile() {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    if (res.ok) {
      userData = await res.json();
      renderProfile(userData);
      updateNavState();

      if (window.location.pathname.includes('dashboard')) {
        $('#login-overlay').fadeOut();
        fetchCareerRecommendations();
        fetchCampusRecommendations();
      }
    } else {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('campusiq_token');
        userToken = null;
        updateNavState();

        if (window.location.pathname.includes('explore')) {
          window.location.href = '/';
        } else if (window.location.pathname.includes('dashboard')) {
          $('#login-overlay').css('display', 'flex');
        }
      }
    }
  } catch (err) {
    console.error('Fetch profile error', err);
  }
}

async function fetchCareerRecommendations() {
  try {
    const res = await fetch(`${API_URL}/recommendations/career`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    if (!res.ok) throw new Error('Failed to load recommendations');
    const json = await res.json();
    const data = json.data || json;
    renderCareerRecs(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error(err);
    $('#career-grid').html('<p style="color:#888;grid-column:1/-1;">Could not load recommendations. Please refresh.</p>');
    showLoading(false);
  }
}

async function fetchCampusRecommendations() {
  try {
    const res = await fetch(`${API_URL}/recommendations/campus`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    if (!res.ok) throw new Error('Failed to load campus recommendations');
    const data = await res.json();
    renderCampusRecs(data);
  } catch (err) {
    console.error(err);
    $('#clubs-grid').html('<p style="color:#888;">Could not load campus data.</p>');
    $('#events-grid').html('');
  }
}

// ─── RENDERING ───────────────────────────────────
function renderProfile(user) {
  if (!user) return;

  if ($('#user-name').length) $('#user-name').text(user.name);
  if ($('#user-initial').length) $('#user-initial').text(user.name ? user.name.charAt(0).toUpperCase() : '?');
  if ($('#user-major').length) $('#user-major').text(`${user.year || '1st Year'} • ${user.major || 'Undeclared'}`);

  // Render DNA Canvas — wait for layout
  if (document.getElementById('dna-canvas')) {
    setTimeout(() => drawDNACanvas(user.studentDNA || {}), 150);
  }

  // Populate prefs if panel exists
  if ($('#pref-career').length && user.preferences) {
    $('#pref-career').val(user.preferences.careerGoal || '');
    $('#pref-style').val(user.preferences.learningStyle || 'hands-on');
    const interests = (user.preferences.interests || []).join(', ');
    $('#pref-interests').val(interests);
  }
}

function renderCareerRecs(items) {
  if (!items || items.length === 0) {
    $('#career-grid').html('<p style="color:#888;grid-column:1/-1;text-align:center;padding:2rem;">No career recommendations yet. Explore some courses first!</p>');
    showLoading(false);
    return;
  }

  const html = items.map(rec => {
    if (!rec || !rec.item) return '';
    const item = rec.item;
    const priceLabel = item.price !== undefined ? (item.price === 0 ? 'Free' : `$${item.price}`) : '';
    return `
    <div class="rec-item">
      <div style="font-size:0.72rem;color:var(--accent-secondary);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.08em;">
        ${item.type || ''} • ${item.difficulty || ''}
      </div>
      <h4 style="margin-bottom:0.5rem;font-family:'Playfair Display',serif;">${item.title || 'Untitled'}</h4>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">
        ${item.category || ''} ${item.rating ? '• ' + item.rating + ' ⭐' : ''} ${item.totalRatings ? '(' + item.totalRatings + ')' : ''}
      </p>
      ${priceLabel ? `<p style="font-weight:700;color:var(--accent-primary);margin-bottom:0.8rem;">${priceLabel}</p>` : ''}
      <div style="margin-bottom:1rem;">
        ${(item.tags || []).slice(0,3).map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <div class="ai-explanation">
        <div><span style="font-family:'Playfair Display',serif;font-style:italic;">AI Insight:</span> ${rec.explanation || 'Recommended based on your profile.'}</div>
      </div>
    </div>
  `}).join('');

  $('#career-grid').html(html);
  showLoading(false);
}

function renderCampusRecs(data) {
  const clubs = data.clubs || [];
  const events = data.events || [];

  if (clubs.length === 0) {
    $('#clubs-grid').html('<p style="color:#888;grid-column:1/-1;text-align:center;">No club recommendations yet.</p>');
  } else {
    const clubsHtml = clubs.map(rec => {
      if (!rec || !rec.item) return '';
      return `
      <div class="rec-item" style="border-color:var(--accent-secondary)">
        <h4 style="margin-bottom:0.5rem;font-family:'Playfair Display',serif;">${rec.item.name || 'Club'}</h4>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">
          ${rec.item.category || ''} • ${rec.item.memberCount || 0} members
        </p>
        ${rec.item.meetingSchedule ? `<p style="font-size:0.8rem;color:#888;margin-bottom:1rem;">📅 ${rec.item.meetingSchedule}</p>` : ''}
        <div class="ai-explanation" style="color:var(--accent-secondary)">
          <div><span style="font-family:'Playfair Display',serif;font-style:italic;">AI Insight:</span> ${rec.explanation || ''}</div>
        </div>
      </div>
    `}).join('');
    $('#clubs-grid').html(clubsHtml);
  }

  if (events.length === 0) {
    $('#events-grid').html('<p style="color:#888;grid-column:1/-1;text-align:center;">No upcoming events found.</p>');
  } else {
    const eventsHtml = events.map(rec => {
      if (!rec || !rec.item) return '';
      const dateStr = rec.item.date ? new Date(rec.item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
      return `
      <div class="rec-item" style="border-color:var(--accent-success)">
        <div style="font-size:0.72rem;color:var(--accent-primary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem;">${rec.item.type || 'Event'}</div>
        <h4 style="margin-bottom:0.5rem;font-family:'Playfair Display',serif;">${rec.item.title || 'Event'}</h4>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">
          📅 ${dateStr} • 📍 ${rec.item.location || 'On Campus'}
        </p>
        <div class="ai-explanation" style="color:var(--accent-success)">
          <div><span style="font-family:'Playfair Display',serif;font-style:italic;">AI Insight:</span> ${rec.explanation || ''}</div>
        </div>
      </div>
    `}).join('');
    $('#events-grid').html(eventsHtml);
  }
}

// ─── UI HELPERS ─────────────────────────────────
function switchTab(tab) {
  $('.tab-btn').removeClass('active');
  $($('.tab-btn')[tab === 'career' ? 0 : 1]).addClass('active');
  $('.rec-content').hide();
  if (!loading) {
    $(`#content-${tab}`).fadeIn();
  }
}

function showLoading(show) {
  loading = show;
  if (show) {
    $('#loading').show();
    $('.rec-content').hide();
  } else {
    $('#loading').hide();
    const activeTab = $('.tab-btn.active').text().toLowerCase().includes('career') ? 'career' : 'campus';
    $(`#content-${activeTab}`).fadeIn();
  }
}

// ─── STUDENT DNA CHART (Pure JS Canvas) ─────────
function drawDNACanvas(dna) {
  const canvas = document.getElementById('dna-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Ensure canvas has physical dimensions
  const containerWidth = canvas.parentElement ? canvas.parentElement.offsetWidth || 280 : 280;
  const size = Math.min(containerWidth, 300);

  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';

  const dpr = window.devicePixelRatio || 1;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  const width  = size;
  const height = size;
  const cx = width  / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 35;

  const labels = ['Curiosity', 'Depth', 'Creativity', 'Leadership', 'Networking', 'Consistency', 'Focus', 'Adaptive'];
  const values = [
    dna.curiosity      || 50,
    dna.technicalDepth || 70,
    dna.creativity     || 65,
    dna.leadership     || 40,
    dna.networking     || 60,
    dna.consistency    || 80,
    dna.careerFocus    || 85,
    dna.adaptability   || 60
  ];

  const numPoints = labels.length;
  const angleStep = (Math.PI * 2) / numPoints;

  ctx.clearRect(0, 0, width, height);

  // Background web rings
  for (let level = 1; level <= 5; level++) {
    const r = radius * (level / 5);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(197, 160, 89, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Spoke Lines & Labels
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(197, 160, 89, 0.2)';
    ctx.lineWidth = 1;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();

    const lx = cx + Math.cos(angle) * (radius + 22);
    const ly = cy + Math.sin(angle) * (radius + 22);
    ctx.fillStyle = '#888';
    ctx.font = '9px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], lx, ly);
  }

  // Data polygon
  ctx.beginPath();
  for (let i = 0; i < numPoints; i++) {
    const val   = values[i] / 100;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + Math.cos(angle) * (radius * val);
    const y = cy + Math.sin(angle) * (radius * val);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(197, 160, 89, 0.25)');
  gradient.addColorStop(1, 'rgba(212, 175, 55, 0.55)');
  ctx.fillStyle   = gradient;
  ctx.fill();
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Data points
  for (let i = 0; i < numPoints; i++) {
    const val   = values[i] / 100;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + Math.cos(angle) * (radius * val);
    const y = cy + Math.sin(angle) * (radius * val);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#C5A059';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// ─── BEHAVIOR LOGGING ─────────────────────────────
async function logAction(itemId, itemType, action) {
  if (!userToken) return;
  try {
    await fetch(`${API_URL}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ itemId, itemType, action })
    });
  } catch(e) {
    console.error('Failed to log action', e);
  }
}

// ─── PREFERENCES UPDATE ────────────────────────────
async function savePreferences() {
  if (!userToken) return;
  const careerGoal = $('#pref-career').val().trim();
  const learningStyle = $('#pref-style').val();
  const interestsRaw = $('#pref-interests').val().trim();
  const interests = interestsRaw ? interestsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  try {
    const res = await fetch(`${API_URL}/users/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ careerGoal, learningStyle, interests })
    });

    if (res.ok) {
      showToast('Preferences saved! Refreshing recommendations...', 'success');
      fetchCareerRecommendations();
      fetchCampusRecommendations();
    } else {
      showToast('Failed to save preferences.', 'error');
    }
  } catch(e) {
    showToast('Connection error saving preferences.', 'error');
  }
}
