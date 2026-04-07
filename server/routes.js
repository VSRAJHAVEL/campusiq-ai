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
    const { type } = req.query;
    let query = { date: { $gte: new Date() } }; // Only future events
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

module.exports = router;
