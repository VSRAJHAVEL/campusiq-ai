const express = require('express');
const jwt = require('jsonwebtoken');
const { Student, Course, Club, Event, Interaction, Review } = require('./models');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'campusiq_default_secret_change_me';

// ═══════════════════════════════════════════════
// MIDDLEWARE — JWT Authentication
// ═══════════════════════════════════════════════
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.studentId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Optional auth — doesn't block, just attaches studentId if available
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.studentId = decoded.id;
    } catch (err) { /* ignore invalid token */ }
  }
  next();
}

// ═══════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, year, major, interests, learningStyle, careerGoal, skills } = req.body;

    // Check if email already exists
    const existing = await Student.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered.' });

    // Create student
    const student = new Student({
      name,
      email,
      password,
      year: year || '1st Year',
      major: major || '',
      preferences: {
        interests: interests || [],
        learningStyle: learningStyle || 'hands-on',
        careerGoal: careerGoal || ''
      },
      skills: skills || []
    });

    await student.save();

    // Generate JWT
    const token = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful!',
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        year: student.year,
        major: student.major,
        preferences: student.preferences,
        skills: student.skills,
        studentDNA: student.studentDNA
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed.', details: error.message });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });
    if (!student) return res.status(400).json({ error: 'Invalid email or password.' });

    const isMatch = await student.comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password.' });

    // Update last active
    student.lastActive = new Date();
    await student.save();

    const token = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful!',
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        year: student.year,
        major: student.major,
        preferences: student.preferences,
        skills: student.skills,
        studentDNA: student.studentDNA
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed.', details: error.message });
  }
});

// GET /api/auth/me — Get current user
router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).select('-password');
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile.', details: error.message });
  }
});

// ═══════════════════════════════════════════════
// COURSE & PRODUCT ROUTES
// ═══════════════════════════════════════════════

// GET /api/courses — List all (filterable)
router.get('/courses', optionalAuth, async (req, res) => {
  try {
    const { category, difficulty, type, search, sort, limit = 50 } = req.query;
    let query = {};

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (type) query.type = type; // 'course' or 'product'
    if (search) query.$text = { $search: search };

    let sortObj = { trending: -1, rating: -1 }; // default sort
    if (sort === 'rating') sortObj = { rating: -1 };
    if (sort === 'price') sortObj = { price: 1 };
    if (sort === 'newest') sortObj = { createdAt: -1 };
    if (sort === 'popular') sortObj = { enrollments: -1 };

    const courses = await Course.find(query)
      .sort(sortObj)
      .limit(parseInt(limit));

    res.json({ count: courses.length, data: courses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses.', details: error.message });
  }
});

// GET /api/courses/:id — Single course
router.get('/courses/:id', optionalAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    // Get reviews for this course
    const reviews = await Review.find({ courseId: course._id })
      .populate('studentId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ course, reviews });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course.', details: error.message });
  }
});

// ═══════════════════════════════════════════════
// CLUB ROUTES
// ═══════════════════════════════════════════════

// GET /api/clubs — List all clubs
router.get('/clubs', optionalAuth, async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) query.category = category;

    const clubs = await Club.find(query).sort({ memberCount: -1 });
    res.json({ count: clubs.length, data: clubs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clubs.', details: error.message });
  }
});

// ═══════════════════════════════════════════════
// EVENT ROUTES
// ═══════════════════════════════════════════════

// GET /api/events — List all events
router.get('/events', optionalAuth, async (req, res) => {
  try {
    const { type, upcoming } = req.query;
    let query = {};

    // Only upcoming events if explicitly requested (e.g. for recommendations)
    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
    }

    if (type) query.type = type;

    const events = await Event.find(query).sort({ date: 1 });
    res.json({ count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events.', details: error.message });
  }
});

// ═══════════════════════════════════════════════
// INTERACTION ROUTES (Behavior Tracking)
// ═══════════════════════════════════════════════

// POST /api/interactions — Log user behavior
router.post('/interactions', authMiddleware, async (req, res) => {
  try {
    const { itemId, itemType, action, rating, duration, searchQuery } = req.body;

    const interaction = new Interaction({
      studentId: req.studentId,
      itemId,
      itemType,
      action,
      rating,
      duration,
      searchQuery
    });

    await interaction.save();
    res.status(201).json({ message: 'Interaction logged.', data: interaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log interaction.', details: error.message });
  }
});

// GET /api/interactions/history — Get user's interaction history
router.get('/interactions/history', authMiddleware, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const interactions = await Interaction.find({ studentId: req.studentId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({ count: interactions.length, data: interactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history.', details: error.message });
  }
});

// ═══════════════════════════════════════════════
// USER PROFILE ROUTES
// ═══════════════════════════════════════════════

// GET /api/users/profile
router.get('/users/profile', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).select('-password');
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    // Get interaction stats
    const totalInteractions = await Interaction.countDocuments({ studentId: req.studentId });
    const enrolledCourses = await Interaction.countDocuments({ studentId: req.studentId, action: 'enroll' });
    const viewedItems = await Interaction.countDocuments({ studentId: req.studentId, action: 'view' });

    res.json({
      student,
      stats: { totalInteractions, enrolledCourses, viewedItems }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile.', details: error.message });
  }
});

// PUT /api/users/preferences — Update preferences
router.put('/users/preferences', authMiddleware, async (req, res) => {
  try {
    const { interests, learningStyle, careerGoal, budget, difficulty, skills } = req.body;

    const updateObj = {};
    if (interests) updateObj['preferences.interests'] = interests;
    if (learningStyle) updateObj['preferences.learningStyle'] = learningStyle;
    if (careerGoal) updateObj['preferences.careerGoal'] = careerGoal;
    if (budget) updateObj['preferences.budget'] = budget;
    if (difficulty) updateObj['preferences.difficulty'] = difficulty;
    if (skills) updateObj.skills = skills;

    const student = await Student.findByIdAndUpdate(
      req.studentId,
      { $set: updateObj },
      { new: true }
    ).select('-password');

    res.json({ message: 'Preferences updated.', student });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences.', details: error.message });
  }
});

// ═══════════════════════════════════════════════
// REVIEW ROUTES
// ═══════════════════════════════════════════════

// POST /api/reviews — Add a review
router.post('/reviews', authMiddleware, async (req, res) => {
  try {
    const { courseId, text, rating } = req.body;

    const review = new Review({
      studentId: req.studentId,
      courseId,
      text,
      rating,
      sentimentScore: 0 // Will be updated by AI service
    });

    await review.save();

    // Update course rating
    const allReviews = await Review.find({ courseId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Course.findByIdAndUpdate(courseId, {
      rating: Math.round(avgRating * 10) / 10,
      totalRatings: allReviews.length
    });

    res.status(201).json({ message: 'Review added.', data: review });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add review.', details: error.message });
  }
});

// ═══════════════════════════════════════════════
// RECOMMENDATION ROUTES (The AI Brains)
// ═══════════════════════════════════════════════

const { RecommendationEngine } = require('./ai-service');

// GET /api/recommendations/career — Courses & Products
router.get('/recommendations/career', authMiddleware, async (req, res) => {
  try {
    const recommendations = await RecommendationEngine.getCareerRecommendations(req.studentId);
    res.json({ count: recommendations.length, data: recommendations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get career recommendations.', details: error.message });
  }
});

// GET /api/recommendations/campus — Clubs & Events
router.get('/recommendations/campus', authMiddleware, async (req, res) => {
  try {
    const recommendations = await RecommendationEngine.getCampusRecommendations(req.studentId);
    res.json(recommendations); // Returns { clubs: [...], events: [...] }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get campus recommendations.', details: error.message });
  }
});

// ═══════════════════════════════════════════════
// CHATBOT ROUTE — AI Mentor powered by real DB data
// ═══════════════════════════════════════════════

// POST /api/chat
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const query = message.toLowerCase().trim();
    let reply = '';
    let cards = []; // Optional rich card results to embed

    // ── Load student profile if authenticated ──
    let student = null;
    if (req.studentId) {
      student = await Student.findById(req.studentId).select('-password');
    }
    const firstName = student ? student.name.split(' ')[0] : null;
    const greet = firstName ? `Hey ${firstName}! ` : '';

    // ═══════════════ INTENT DETECTION ═══════════════

    // ─── Course search ────────────────────────────
    const isCourseQuery = /course|learn|study|python|java|react|node|web dev|ml|machine learning|deep learning|data science|cloud|aws|docker|kubernetes|flutter|mobile|cybersec|design|devops|sql|javascript|css|html/i.test(query);
    const isProductQuery = /product|book|keyboard|headphone|monitor|tool|subscription|copilot|leetcode|figma/i.test(query);
    const isClubQuery    = /club|society|group|join|community|hackathon|team|competitive/i.test(query);
    const isEventQuery   = /event|upcoming|workshop|seminar|fair|hackathon|competition|schedule|when|date/i.test(query);
    const isCareerQuery  = /career|job|placement|interview|resume|salary|hire|internship|work|company|google|amazon|microsoft/i.test(query);
    const isDNAQuery     = /dna|score|dimension|curiosity|leadership|creativity|consistency|focus|adaptive|networking/i.test(query);
    const isHelpQuery    = /help|what can|who are|mentor|how does|what is campusiq|about/i.test(query);
    const isGreetQuery   = /^(hi|hello|hey|sup|good morning|good evening|howdy|yo)\b/.test(query);
    const isProfileQuery = /my (profile|info|major|year|preferences|skills)|what do you know about me/i.test(query);
    const isRecommendQuery = /recommend|suggest|what should i|top pick|best for me|personali/i.test(query);
    const isFreeQuery    = /free|no cost|without payment|open source/i.test(query);
    const isPriceQuery   = /price|cost|how much|paid|premium|cheap/i.test(query);

    // ─── Greeting ──────────────────────────────────
    if (isGreetQuery) {
      reply = `${greet}Hello! 👋 I'm your CampusIQ AI Mentor — powered by real data from our campus database.<br><br>
I can help you:<br>
• 🔍 <b>Search courses, products, clubs & events</b><br>
• 🧬 <b>Explain your Learning DNA</b><br>
• 💼 <b>Career advice & interview tips</b><br>
• 🏆 <b>Find upcoming events & competitions</b><br><br>
<em>Just ask me anything — e.g. "Show me free Python courses" or "What clubs should I join?"</em>`;
      return res.json({ reply, cards });
    }

    // ─── Help / About ─────────────────────────────
    if (isHelpQuery) {
      reply = `CampusIQ is an AI-powered student companion 🎓<br><br>
<b>What I can do:</b><br>
• Search our database of <b>30+ courses</b>, <b>15 products</b>, <b>10 clubs</b>, and <b>12 events</b><br>
• Give you <b>personalized course recommendations</b> based on your profile<br>
• Explain how our <b>AI recommendation engine</b> works<br>
• Help with <b>career planning, interview prep, and skill building</b><br><br>
Try asking: <em>"Show me AI courses"</em>, <em>"What events are upcoming?"</em>, or <em>"Recommend something for me"</em>`;
      return res.json({ reply, cards });
    }

    // ─── User profile info ─────────────────────────
    if (isProfileQuery) {
      if (!student) {
        reply = `You're not signed in, so I can't see your profile yet.<br>
<a href="#" class="open-login-btn" style="color:var(--accent-primary);">Sign in</a> to get personalized responses!`;
      } else {
        const interests = (student.preferences?.interests || []).join(', ') || 'not set yet';
        const goal = student.preferences?.careerGoal || 'not specified';
        const skills = (student.skills || []).join(', ') || 'none added yet';
        reply = `Here's what I know about you, ${firstName}:<br><br>
📚 <b>Major:</b> ${student.major || 'Not set'}<br>
🎓 <b>Year:</b> ${student.year}<br>
🎯 <b>Career Goal:</b> ${goal}<br>
💡 <b>Interests:</b> ${interests}<br>
🛠️ <b>Skills:</b> ${skills}<br><br>
<em>Update your preferences in the Dashboard → Settings tab to improve your recommendations!</em>`;
      }
      return res.json({ reply, cards });
    }

    // ─── DNA explanation ───────────────────────────
    if (isDNAQuery) {
      let dnaDetails = '';
      if (student && student.studentDNA) {
        const dna = student.studentDNA;
        dnaDetails = `<br><br>Your current scores:<br>
🔍 Curiosity: <b>${dna.curiosity}%</b> &nbsp;|&nbsp; ⚙️ Technical Depth: <b>${dna.technicalDepth}%</b><br>
🎨 Creativity: <b>${dna.creativity}%</b> &nbsp;|&nbsp; 🎯 Leadership: <b>${dna.leadership}%</b><br>
🤝 Networking: <b>${dna.networking}%</b> &nbsp;|&nbsp; 📅 Consistency: <b>${dna.consistency}%</b><br>
💼 Career Focus: <b>${dna.careerFocus}%</b> &nbsp;|&nbsp; 🔄 Adaptability: <b>${dna.adaptability}%</b>`;
      }
      reply = `${greet}Your <b>Learning DNA</b> is an 8-dimensional fingerprint of your learning style 🧬<br><br>
<b>The 8 Dimensions:</b><br>
🔍 <b>Curiosity</b> — How broadly you explore new topics<br>
⚙️ <b>Technical Depth</b> — How deep you go in technical subjects<br>
🎨 <b>Creativity</b> — Novel problem-solving & design thinking<br>
🎯 <b>Leadership</b> — Club participation & community engagement<br>
🤝 <b>Networking</b> — Social and collaborative learning<br>
📅 <b>Consistency</b> — Regularity of your activity on CampusIQ<br>
💼 <b>Career Focus</b> — Career-aligned course/event choices<br>
🔄 <b>Adaptability</b> — Cross-domain curiosity${dnaDetails}<br><br>
<em>It updates in real-time as you browse, enroll, and interact!</em>`;
      return res.json({ reply, cards });
    }

    // ─── Personalized recommendations ─────────────
    if (isRecommendQuery && req.studentId) {
      const { RecommendationEngine } = require('./ai-service');
      const recs = await RecommendationEngine.getCareerRecommendations(req.studentId);
      const top3 = recs.slice(0, 3);
      if (top3.length > 0) {
        const list = top3.map((r, i) => {
          const price = r.item.price === 0 ? '<span style="color:#4caf50">Free</span>' : `$${r.item.price}`;
          return `<b>${i+1}. ${r.item.title}</b> (${r.item.category}) — ${price} — ${r.item.rating}⭐<br>
<em style="color:#888;font-size:0.82em;">${r.explanation}</em>`;
        }).join('<br><br>');
        reply = `${greet}Based on your Learning DNA, here are your top picks right now:<br><br>${list}<br><br>
<a href="/dashboard" style="color:var(--accent-primary);">View all recommendations →</a>`;
      } else {
        reply = `${greet}Interact with a few courses or clubs first, and I'll generate personalized picks for you! <a href="/explore" style="color:var(--accent-primary);">Start exploring →</a>`;
      }
      return res.json({ reply, cards });
    } else if (isRecommendQuery && !req.studentId) {
      reply = `To get personalized recommendations I need to know your profile.<br>
<a href="#" class="open-login-btn" style="color:var(--accent-primary);">Sign in</a> or <a href="#" class="open-register-btn" style="color:var(--accent-primary);">register for free</a> and I'll give you AI-powered suggestions!`;
      return res.json({ reply, cards });
    }

    // ─── Events (from DB) ─────────────────────────
    if (isEventQuery) {
      const events = await Event.find({}).sort({ date: 1 }).limit(5);
      if (events.length === 0) {
        reply = `${greet}No events found right now. Check back soon!`;
      } else {
        const list = events.map(e => {
          const d = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `🗓️ <b>${e.title}</b> — ${e.type.toUpperCase()}<br>
&nbsp;&nbsp;&nbsp;📅 ${d} &nbsp;|&nbsp; 📍 ${e.location}<br>
&nbsp;&nbsp;&nbsp;<em style="color:#888;font-size:0.82em;">${e.description.substring(0, 80)}...</em>`;
        }).join('<br><br>');
        reply = `${greet}Here are the upcoming campus events:<br><br>${list}<br><br>
<a href="/explore" style="color:var(--accent-primary);">View all events →</a>`;
      }
      return res.json({ reply, cards });
    }

    // ─── Clubs (from DB) ──────────────────────────
    if (isClubQuery) {
      // Try to match query keywords to club names/tags
      const searchTerms = query.replace(/club|society|join|suggest|recommend|what/gi, '').trim();
      let clubQuery = {};
      if (searchTerms.length > 2) {
        clubQuery = { $or: [
          { name: { $regex: searchTerms, $options: 'i' } },
          { tags: { $in: [searchTerms] } },
          { category: { $regex: searchTerms, $options: 'i' } }
        ]};
      }
      const clubs = await Club.find(clubQuery).sort({ memberCount: -1 }).limit(5);
      const allClubs = clubs.length ? clubs : await Club.find().sort({ memberCount: -1 }).limit(5);

      const list = allClubs.map(c =>
        `🏛️ <b>${c.name}</b> — ${c.memberCount} members<br>
&nbsp;&nbsp;&nbsp;📅 ${c.meetingSchedule}<br>
&nbsp;&nbsp;&nbsp;<em style="color:#888;font-size:0.82em;">${c.description.substring(0, 80)}...</em>`
      ).join('<br><br>');
      reply = `${greet}Here are some clubs you might love:<br><br>${list}<br><br>
<a href="/explore" style="color:var(--accent-primary);">View all clubs →</a>`;
      return res.json({ reply, cards });
    }

    // ─── Free courses ─────────────────────────────
    if (isFreeQuery) {
      const freeCourses = await Course.find({ price: 0 }).sort({ enrollments: -1 }).limit(6);
      const list = freeCourses.map((c, i) =>
        `${i+1}. <b>${c.title}</b> (${c.category}) — ${c.rating}⭐ — ${c.duration}`
      ).join('<br>');
      reply = `${greet}Great news — here are our top FREE resources:<br><br>${list}<br><br>
<a href="/explore" style="color:var(--accent-primary);">Browse all free content →</a>`;
      return res.json({ reply, cards });
    }

    // ─── Price query ──────────────────────────────
    if (isPriceQuery) {
      const cheapest = await Course.find({ price: { $gt: 0 } }).sort({ price: 1 }).limit(4);
      const freeCount = await Course.countDocuments({ price: 0 });
      const list = cheapest.map(c => `• <b>${c.title}</b> — $${c.price}`).join('<br>');
      reply = `${greet}We have <b>${freeCount} completely free</b> courses & resources!<br><br>
Affordable paid options start from:<br>${list}<br><br>
Filter by price on the <a href="/explore" style="color:var(--accent-primary);">Explore page</a> (Sort by Price ↑)`;
      return res.json({ reply, cards });
    }

    // ─── General course/product search ────────────
    if (isCourseQuery || isProductQuery) {
      // Extract the meaningful keywords from the query
      const stopwords = ['show', 'me', 'find', 'search', 'get', 'i', 'want', 'need', 'a', 'an', 'the', 'some', 'any', 'courses', 'course', 'on', 'about', 'for', 'in', 'give'];
      const keywords = query.split(/\s+/).filter(w => w.length > 2 && !stopwords.includes(w));

      let dbQuery = {};
      if (keywords.length > 0) {
        const regexPatterns = keywords.map(k => new RegExp(k, 'i'));
        dbQuery = {
          $or: [
            { title: { $in: regexPatterns } },
            { tags: { $in: keywords } },
            { category: { $in: regexPatterns } },
            { description: { $in: regexPatterns } }
          ]
        };
      }
      if (isProductQuery && !isCourseQuery) dbQuery.type = 'product';
      if (isCourseQuery && !isProductQuery) dbQuery.type = 'course';

      const results = await Course.find(dbQuery).sort({ rating: -1, enrollments: -1 }).limit(4);
      const fallback = results.length === 0;

      const items = fallback
        ? await Course.find({ type: isCourseQuery ? 'course' : { $in: ['course','product'] } }).sort({ trending: -1, rating: -1 }).limit(4)
        : results;

      if (items.length === 0) {
        reply = `${greet}I didn't find a specific match, but you can browse our full catalog on the <a href="/explore" style="color:var(--accent-primary);">Explore page</a>!`;
      } else {
        const list = items.map(c => {
          const price = c.price === 0 ? '<span style="color:#4caf50">Free</span>' : `$${c.price}`;
          return `📘 <b>${c.title}</b><br>
&nbsp;&nbsp;&nbsp;${c.category} · ${c.difficulty} · ${price} · ${c.rating}⭐ · ${c.duration}<br>
&nbsp;&nbsp;&nbsp;<em style="color:#888;font-size:0.82em;">${c.description.substring(0, 90)}...</em>`;
        }).join('<br><br>');
        const header = fallback
          ? `${greet}I couldn't find an exact match, but here are some top picks you might like:`
          : `${greet}Here's what I found for <b>"${keywords.join(' ')}"</b>:`;
        reply = `${header}<br><br>${list}<br><br><a href="/explore" style="color:var(--accent-primary);">Browse all →</a>`;
      }
      return res.json({ reply, cards });
    }

    // ─── Career advice ─────────────────────────────
    if (isCareerQuery) {
      const careerCourses = await Course.find({ category: { $in: ['Web Dev', 'AI/ML', 'Cloud', 'Data Science'] } })
        .sort({ rating: -1 }).limit(3);
      const careerEvents = await Event.find({ type: 'career-fair' }).limit(2);

      let courseList = careerCourses.map(c => `• <b>${c.title}</b> (${c.category}) — ${c.price === 0 ? 'Free' : '$'+c.price}`).join('<br>');
      let eventList = careerEvents.length
        ? careerEvents.map(e => `• <b>${e.title}</b> — ${new Date(e.date).toLocaleDateString('en-US', {month:'short',day:'numeric'})}`).join('<br>')
        : '• Check back soon for career fairs!';

      reply = `${greet}Here's your career action plan 💼<br><br>
<b>Top courses to boost your profile:</b><br>${courseList}<br><br>
<b>Career events coming up:</b><br>${eventList}<br><br>
<b>General tips:</b><br>
✅ Build 3+ GitHub projects<br>
✅ Solve 100+ LeetCode problems<br>
✅ Get at least one cloud or ML certification<br>
✅ Attend the Tech Career Fair to meet recruiters<br><br>
<a href="/dashboard" style="color:var(--accent-primary);">View your personalized career path →</a>`;
      return res.json({ reply, cards });
    }

    // ─── How AI works ──────────────────────────────
    if (/how.*work|algorithm|cosine|collab|content.based|hybrid/i.test(query)) {
      reply = `CampusIQ uses a <b>3-layer hybrid AI engine</b> 🤖<br><br>
<b>Layer 1 — Content-Based (60%):</b><br>
Every course, club, and event has a 10-dimensional feature vector. Your interactions build a "user vector" that we score with <em>cosine similarity</em>.<br><br>
<b>Layer 2 — Collaborative (30%):</b><br>
We analyze what students with similar profiles clicked, enrolled in, and bookmarked — "wisdom of the crowd."<br><br>
<b>Layer 3 — Trending Boost (10%):</b><br>
Items that are exploding in popularity across campus get an extra weight.<br><br>
The result? A unique, real-time score for each item shown in your Dashboard 📊`;
      return res.json({ reply, cards });
    }

    // ─── Default fallback ─────────────────────────
    const totalCourses = await Course.countDocuments({ type: 'course' });
    const totalProducts = await Course.countDocuments({ type: 'product' });
    const totalClubs   = await Club.countDocuments();
    const totalEvents  = await Event.countDocuments();
    reply = `${greet}I'm not sure I understood that — could you rephrase it? 🤔<br><br>
Our knowledge base has:<br>
📚 <b>${totalCourses} courses</b> &nbsp;|&nbsp; 🛒 <b>${totalProducts} products</b><br>
🏛️ <b>${totalClubs} clubs</b> &nbsp;|&nbsp; 📅 <b>${totalEvents} events</b><br><br>
Try asking me:<br>
• <em>"Show me free Python courses"</em><br>
• <em>"What clubs should I join?"</em><br>
• <em>"What events are coming up?"</em><br>
• <em>"Recommend something for a web developer"</em><br>
• <em>"Explain my DNA score"</em>`;
    return res.json({ reply, cards });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ reply: '⚠️ I encountered a technical error. Please try again in a moment.', cards: [] });
  }
});

module.exports = router;
