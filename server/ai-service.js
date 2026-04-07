const { Student, Course, Club, Event, Interaction } = require('./models');

// ═══════════════════════════════════════════════
// MATH & PURE AI LOGIC UTILS
// ═══════════════════════════════════════════════

/**
 * Calculates cosine similarity between two vectors (arrays of numbers).
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Score between -1 and 1
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Normalizes a score to a 0-1 range.
 */
function normalize(value, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Sentiment analysis using simple AFINN word list (Internal Dictionary)
 * @param {string} text
 * @returns {number} Score from -5 (very negative) to +5 (very positive)
 */
function analyzeSentiment(text) {
  const words = text.toLowerCase().match(/\w+/g) || [];
  const afinn = {
    'good': 3, 'great': 3, 'excellent': 4, 'amazing': 4, 'best': 3, 'love': 3, 'awesome': 4,
    'helpful': 2, 'informative': 2, 'easy': 1, 'clear': 2, 'perfect': 3,
    'bad': -3, 'terrible': -4, 'boring': -2, 'worst': -4, 'hate': -3, 'useless': -3,
    'confusing': -2, 'hard': -1, 'difficult': -1, 'waste': -3
  };
  let score = 0;
  let matches = 0;
  words.forEach(word => {
    if (afinn[word] !== undefined) {
      score += afinn[word];
      matches++;
    }
  });
  return matches > 0 ? (score / matches) : 0;
}

// ═══════════════════════════════════════════════
// AI RECOMMENDATION ENGINE (THE "BRAIN")
// ═══════════════════════════════════════════════

/**
 * Core Recommendation Engine class handling dual-brain operations.
 */
class RecommendationEngine {
  
  /**
   * Generates a 10-dimensional preference vector for a student based on recent interactions.
   * Dimensions: [AI/ML, WebDev, DataScience, Cloud, Mobile, Cybersecurity, DevOps, Design, Business, Hardware]
   */
  static async computeUserVector(studentId) {
    const defaultVector = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
    
    // Get recent interactions
    const interactions = await Interaction.find({ studentId })
      .sort({ timestamp: -1 })
      .limit(50);
      
    if (interactions.length === 0) return defaultVector;

    let vector = [...defaultVector];
    
    for (const action of interactions) {
      let item = null;
      if (action.itemType === 'course' || action.itemType === 'product') {
        item = await Course.findById(action.itemId).select('featureVector category');
      } else if (action.itemType === 'club') {
        item = await Club.findById(action.itemId).select('featureVector category');
      } else if (action.itemType === 'event') {
        item = await Event.findById(action.itemId).select('featureVector type');
      }
      
      if (item && item.featureVector && item.featureVector.length === 10) {
        // Weight by action type
        let weight = 0.1;
        if (action.action === 'enroll') weight = 0.5;
        if (action.action === 'rate' && action.rating >= 4) weight = 0.6;
        if (action.action === 'bookmark') weight = 0.3;
        
        for (let i = 0; i < 10; i++) {
          vector[i] += item.featureVector[i] * weight;
        }
      }
    }
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(v => v / magnitude) : defaultVector;
  }

  /**
   * CAREER BRAIN: Recommends Courses and Products
   */
  static async getCareerRecommendations(studentId) {
    const userVector = await this.computeUserVector(studentId);
    
    // Fetch all courses/products to score
    const allItems = await Course.find();
    
    // Get max enrollments for normalization
    const maxEnroll = Math.max(...allItems.map(c => c.enrollments || 1));
    
    let recommendations = allItems.map(item => {
      // 1. Content-Based Score (Cosine Similarity)
      const contentScore = cosineSimilarity(userVector, item.featureVector || Array(10).fill(0));
      
      // 2. Trending/Popularity Score
      const popScore = normalize(item.enrollments || 0, 0, maxEnroll);
      const trendingBoost = item.trending ? 0.1 : 0;
      
      // 3. Rating Score
      const ratingScore = normalize(item.rating || 0, 0, 5);
      
      // Hybrid Weighting: 60% Content, 20% Popularity, 20% Quality (Rating)
      const finalScore = (contentScore * 0.6) + (popScore * 0.2) + (ratingScore * 0.2) + trendingBoost;
      
      return {
        item,
        score: finalScore,
        explanation: this.generateExplanation(contentScore, popScore, ratingScore, item)
      };
    });
    
    // Sort by score descending and return top 10
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, 10);
  }

  /**
   * CAMPUS BRAIN: Recommends Clubs and Events
   */
  static async getCampusRecommendations(studentId) {
    const userVector = await this.computeUserVector(studentId);
    
    const allClubs = await Club.find();
    const futureEvents = await Event.find({ date: { $gte: new Date() } });
    
    const scoreItem = (item) => {
      const contentScore = cosineSimilarity(userVector, item.featureVector || Array(10).fill(0));
      return {
        item,
        score: contentScore,
        explanation: 'Recommended based on your recent campus and technology interests.'
      };
    };
    
    let clubRecs = allClubs.map(scoreItem).sort((a, b) => b.score - a.score).slice(0, 5);
    let eventRecs = futureEvents.map(scoreItem).sort((a, b) => b.score - a.score).slice(0, 5);
    
    return { clubs: clubRecs, events: eventRecs };
  }

  /**
   * Explainable AI Helper for Reasoning
   */
  static generateExplanation(contentScore, popScore, ratingScore, item) {
    if (contentScore > 0.8) {
      return `Highly matches your "Learning DNA" and recent behavior in ${item.category}.`;
    } else if (item.trending && popScore > 0.7) {
      return `Recommended because it's currently trending across CampusIQ.`;
    } else if (ratingScore > 0.9) {
      return `Suggested due to its exceptionally high ratings from other students.`;
    }
    return `A great ${item.difficulty} level option to expand your skill set.`;
  }
}

module.exports = {
  cosineSimilarity,
  normalize,
  analyzeSentiment,
  RecommendationEngine
};
