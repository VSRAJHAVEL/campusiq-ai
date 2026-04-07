/**
 * ═══════════════════════════════════════════════
 * CAMPUS IQ - CORE APP LOGIC
 * ═══════════════════════════════════════════════
 */

// Global State
let userToken = localStorage.getItem('campusiq_token');
let userData = null;

// API Base
const API_URL = '/api';

$(document).ready(function() {
  
  // ─── AUTHENTICATION FLOW ────────────────────────
  if (userToken) {
    fetchUserProfile();
  } else {
    // If on dashboard without auth, show login overlay
    if (window.location.pathname.includes('dashboard')) {
      $('#login-overlay').css('display', 'flex');
    }
  }

  // Handle fake login for demo purposes
  // In a real scenario we'd do a POST to /api/auth/login, but to make the demo easy,
  // we'll auto-register a demo user, or login if they exist.
  $('#login-form').submit(async function(e) {
    e.preventDefault();
    const email = $('#email').val();
    const password = $('#password').val();
    
    try {
      // First try to login
      let res = await fetch(\`\${API_URL}/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      let data = await res.json();
      
      // If fails, auto-register them
      if (!res.ok) {
        res = await fetch(\`\${API_URL}/auth/register\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: email.split('@')[0].toUpperCase(), 
            email, 
            password,
            major: 'Computer Science',
            interests: ['AI', 'Web Dev']
          })
        });
        data = await res.json();
      }

      if (data.token) {
        localStorage.setItem('campusiq_token', data.token);
        userToken = data.token;
        $('#login-overlay').fadeOut();
        fetchUserProfile();
      }
    } catch (err) {
      console.error('Login error', err);
      alert('Login failed. Ensure backend is running.');
    }
  });

  $('#logout-btn').click(function(e) {
    e.preventDefault();
    localStorage.removeItem('campusiq_token');
    window.location.href = '/';
  });

});

// ─── DATA FETCHING ──────────────────────────────
async function fetchUserProfile() {
  try {
    const res = await fetch(\`\${API_URL}/auth/me\`, {
      headers: { 'Authorization': \`Bearer \${userToken}\` }
    });
    
    if (res.ok) {
      userData = await res.json();
      renderProfile(userData);
      
      // Only fetch recommendations if on dashboard
      if (window.location.pathname.includes('dashboard')) {
        fetchCareerRecommendations();
        fetchCampusRecommendations();
        
        // Hide overlay just in case
        $('#login-overlay').fadeOut();
      }
    } else {
      localStorage.removeItem('campusiq_token');
      if (window.location.pathname.includes('dashboard')) {
        $('#login-overlay').css('display', 'flex');
      }
    }
  } catch (err) {
    console.error('Fetch profile error', err);
  }
}

async function fetchCareerRecommendations() {
  try {
    const res = await fetch(\`\${API_URL}/recommendations/career\`, {
      headers: { 'Authorization': \`Bearer \${userToken}\` }
    });
    const { data } = await res.json();
    renderCareerRecs(data);
  } catch (err) {
    console.error(err);
  }
}

async function fetchCampusRecommendations() {
  try {
    const res = await fetch(\`\${API_URL}/recommendations/campus\`, {
      headers: { 'Authorization': \`Bearer \${userToken}\` }
    });
    const data = await res.json();
    renderCampusRecs(data);
  } catch (err) {
    console.error(err);
  }
}

// ─── RENDERING ───────────────────────────────────
function renderProfile(user) {
  $('#user-name').text(user.name);
  $('#user-initial').text(user.name.charAt(0));
  $('#user-major').text(\`\${user.year} • \${user.major}\`);
  
  // Render DNA Canvas
  if (document.getElementById('dna-canvas')) {
    drawDNACanvas(user.studentDNA || {});
  }
}

function renderCareerRecs(items) {
  const html = items.map(rec => \`
    <div class="rec-item">
      <div style="font-size: 0.75rem; color: var(--accent-secondary); margin-bottom: 0.5rem; text-transform: uppercase;">
        \${rec.item.type} • \${rec.item.difficulty}
      </div>
      <h4 style="margin-bottom: 0.5rem;">\${rec.item.title}</h4>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
        \${rec.item.category} • \${rec.item.rating} ⭐ (\${rec.item.totalRatings})
      </p>
      
      <div>
        \${rec.item.tags.slice(0,3).map(tag => \`<span class="tag">\${tag}</span>\`).join('')}
      </div>
      
      <div class="ai-explanation">
        <div>💡</div>
        <div>\${rec.explanation}</div>
      </div>
    </div>
  \`).join('');
  
  $('#career-grid').html(html);
  showLoading(false);
}

function renderCampusRecs(data) {
  const clubsHtml = data.clubs.map(rec => \`
    <div class="rec-item" style="border-color: var(--accent-secondary)">
      <h4 style="margin-bottom: 0.5rem;">\${rec.item.name}</h4>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
        \${rec.item.category} • \${rec.item.memberCount} members
      </p>
      <div class="ai-explanation" style="color: var(--accent-secondary)">
        <div>💡</div>
        <div>\${rec.explanation}</div>
      </div>
    </div>
  \`).join('');
  $('#clubs-grid').html(clubsHtml);

  const eventsHtml = data.events.map(rec => \`
    <div class="rec-item" style="border-color: var(--accent-success)">
      <h4 style="margin-bottom: 0.5rem;">\${rec.item.title}</h4>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
        \${new Date(rec.item.date).toLocaleDateString()} • \${rec.item.location}
      </p>
      <div class="ai-explanation" style="color: var(--accent-success)">
        <div>💡</div>
        <div>\${rec.explanation}</div>
      </div>
    </div>
  \`).join('');
  $('#events-grid').html(eventsHtml);
}

// ─── UI HELPERS ─────────────────────────────────
function switchTab(tab) {
  $('.tab-btn').removeClass('active');
  $($('.tab-btn')[tab === 'career' ? 0 : 1]).addClass('active');
  
  $('.rec-content').hide();
  if (!loading) {
    $(\`#content-\${tab}\`).fadeIn();
  }
}

let loading = true;
function showLoading(show) {
  loading = show;
  if (show) {
    $('#loading').show();
    $('.rec-content').hide();
  } else {
    $('#loading').hide();
    // Show active tab
    const activeTab = $('.tab-btn.active').text().includes('Career') ? 'career' : 'campus';
    $(\`#content-\${activeTab}\`).fadeIn();
  }
}

// ─── STUDENT DNA CHART (Pure JS Canvas) ─────────
function drawDNACanvas(dna) {
  const canvas = document.getElementById('dna-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Setup dimensions
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 40;
  
  // Dimensions
  const labels = ['Curiosity', 'Depth', 'Creativity', 'Leadership', 'Networking', 'Consistency', 'Focus', 'Adaptive'];
  // Provide defaults if missing
  const values = [
    dna.curiosity || 50,
    dna.technicalDepth || 70,
    dna.creativity || 65,
    dna.leadership || 40,
    dna.networking || 60,
    dna.consistency || 80,
    dna.careerFocus || 85,
    dna.adaptability || 60
  ];
  
  const numPoints = labels.length;
  const angleStep = (Math.PI * 2) / numPoints;
  
  ctx.clearRect(0, 0, width, height);
  
  // Draw Background Web
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  
  for (let level = 1; level <= 5; level++) {
    const r = radius * (level / 5);
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  
  // Draw Spoke Lines & Labels
  ctx.fillStyle = '#9aaabf';
  ctx.font = '10px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    // Spoke
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
    
    // Label
    const lx = cx + Math.cos(angle) * (radius + 20);
    const ly = cy + Math.sin(angle) * (radius + 20);
    ctx.fillText(labels[i], lx, ly);
  }
  
  // Draw Data Polygon
  ctx.beginPath();
  for (let i = 0; i < numPoints; i++) {
    const val = values[i] / 100; // Normalize 0-1
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + Math.cos(angle) * (radius * val);
    const y = cy + Math.sin(angle) * (radius * val);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  
  // Fill gradient
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0.6)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw points
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < numPoints; i++) {
    const val = values[i] / 100;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + Math.cos(angle) * (radius * val);
    const y = cy + Math.sin(angle) * (radius * val);
    
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
