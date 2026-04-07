const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ═══════════════════════════════════════════════
// STUDENT MODEL
// ═══════════════════════════════════════════════
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  year: { type: String, enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'], default: '1st Year' },
  major: { type: String, default: '' },

  // User preferences (collected during signup quiz)
  preferences: {
    interests: [{ type: String }],          // e.g., ['AI', 'Web Dev', 'Data Science']
    learningStyle: { type: String, enum: ['visual', 'reading', 'hands-on', 'video'], default: 'hands-on' },
    careerGoal: { type: String, default: '' }, // e.g., 'Full Stack Developer'
    budget: { type: String, enum: ['free', 'low', 'medium', 'high'], default: 'free' },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' }
  },

  // AI-computed Student DNA (8 dimensions, 0-100 each)
  studentDNA: {
    curiosity: { type: Number, default: 50 },
    technicalDepth: { type: Number, default: 50 },
    creativity: { type: Number, default: 50 },
    leadership: { type: Number, default: 50 },
    networking: { type: Number, default: 50 },
    consistency: { type: Number, default: 50 },
    careerFocus: { type: Number, default: 50 },
    adaptability: { type: Number, default: 50 }
  },

  // Skills the student has
  skills: [{ type: String }],

  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

// Hash password before saving
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ═══════════════════════════════════════════════
// COURSE MODEL (Courses & Products combined)
// ═══════════════════════════════════════════════
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['course', 'product'], required: true }, // course or product
  category: { type: String, required: true },   // e.g., 'AI/ML', 'Web Dev', 'Cloud'
  tags: [{ type: String }],                      // e.g., ['python', 'machine-learning', 'beginner']
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  duration: { type: String, default: '' },       // e.g., '8 weeks' or 'N/A' for products
  price: { type: Number, default: 0 },
  rating: { type: Number, default: 4.0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  provider: { type: String, default: '' },       // e.g., 'Coursera', 'Amazon'
  thumbnail: { type: String, default: '' },
  url: { type: String, default: '' },
  skillsGained: [{ type: String }],              // Skills you gain from this course/product

  // AI feature vector (for cosine similarity matching)
  featureVector: [{ type: Number }],

  // Popularity metrics
  enrollments: { type: Number, default: 0 },
  trending: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

// Text index for search
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

// ═══════════════════════════════════════════════
// CLUB MODEL
// ═══════════════════════════════════════════════
const clubSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true },     // e.g., 'Technical', 'Cultural', 'Sports'
  tags: [{ type: String }],
  memberCount: { type: Number, default: 0 },
  meetingSchedule: { type: String, default: '' },  // e.g., 'Every Saturday 4 PM'
  skillsGained: [{ type: String }],
  featureVector: [{ type: Number }],
  thumbnail: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// ═══════════════════════════════════════════════
// EVENT MODEL
// ═══════════════════════════════════════════════
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['hackathon', 'workshop', 'seminar', 'career-fair', 'social', 'competition'], required: true },
  date: { type: Date, required: true },
  tags: [{ type: String }],
  skillsRelated: [{ type: String }],
  location: { type: String, default: '' },
  capacity: { type: Number, default: 100 },
  registered: { type: Number, default: 0 },
  featureVector: [{ type: Number }],
  thumbnail: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// ═══════════════════════════════════════════════
// INTERACTION MODEL (User behavior tracking)
// ═══════════════════════════════════════════════
const interactionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemType: { type: String, enum: ['course', 'product', 'club', 'event'], required: true },
  action: { type: String, enum: ['view', 'click', 'enroll', 'bookmark', 'rate', 'search'], required: true },
  rating: { type: Number, min: 1, max: 5 },
  duration: { type: Number, default: 0 },        // Time spent in seconds
  searchQuery: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

// Index for fast queries
interactionSchema.index({ studentId: 1, timestamp: -1 });
interactionSchema.index({ itemId: 1, itemType: 1 });

// ═══════════════════════════════════════════════
// REVIEW MODEL
// ═══════════════════════════════════════════════
const reviewSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  text: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  sentimentScore: { type: Number, default: 0 },   // AI-computed: -1 (negative) to +1 (positive)
  createdAt: { type: Date, default: Date.now }
});

// ═══════════════════════════════════════════════
// EXPORT ALL MODELS
// ═══════════════════════════════════════════════
const Student = mongoose.model('Student', studentSchema);
const Course = mongoose.model('Course', courseSchema);
const Club = mongoose.model('Club', clubSchema);
const Event = mongoose.model('Event', eventSchema);
const Interaction = mongoose.model('Interaction', interactionSchema);
const Review = mongoose.model('Review', reviewSchema);

module.exports = { Student, Course, Club, Event, Interaction, Review };
