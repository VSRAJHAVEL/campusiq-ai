# 🎓 CampusIQ AI — Smart Campus & Career Companion

> An AI-powered recommendation system that helps college students maximize campus life AND career readiness — all from one intelligent dashboard that learns from their behavior.

![Node.js](https://img.shields.io/badge/Node.js-v24-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-AI-orange?logo=tensorflow)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🧠 What is CampusIQ AI?

CampusIQ AI is a **dual-brain recommendation system** that analyzes student behavior to provide personalized suggestions across two domains:

### 🏫 Campus Brain
- **Clubs** to join based on your interests
- **Events & Hackathons** you'd love attending
- **Study Groups** matched by complementary skills
- **Study Spots** based on your noise preference
- **Cafeteria Meals** by nutrition goals & budget

### 🎯 Career Brain
- **Courses** to take based on skill gaps vs job market demand
- **Products** (books, tools, software) to boost your learning
- **Projects** to build next — maximizing employability
- **Tech Trends** — what's rising, what's declining
- **Open Source** repos to contribute to

## ✨ Unique Features

- **🧬 Student DNA Profile** — 8-dimensional personality constellation visualization
- **🤖 AI Mentor Chatbot** — Ask "What should I learn next?" and get explained answers
- **📊 Job Market Pulse** — Live skill demand comparison
- **🌊 Mood-Adaptive UI** — Interface shifts colors based on your browsing pattern
- **🔮 Explainable AI** — Every recommendation shows WHY it was suggested

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| HTML5 / CSS3 | Semantic UI with glassmorphism design |
| JavaScript / jQuery | Interactivity, AJAX, DOM manipulation |
| JSON | API data exchange format |
| Node.js / Express.js | Backend REST API |
| MongoDB Atlas | Cloud database |
| TensorFlow.js | Client-side AI inference |
| Cosine Similarity | Content-based recommendation |
| Sentiment Analysis | Review processing |

## 📁 Project Structure

```
├── public/                  # Frontend
│   ├── index.html           # Landing page
│   ├── dashboard.html       # Student dashboard
│   ├── explore.html         # Browse recommendations
│   ├── css/style.css        # All styles
│   ├── js/app.js            # Main app logic
│   ├── js/ai-engine.js      # Client-side AI
│   └── js/chatbot.js        # AI chatbot
├── server/                  # Backend
│   ├── server.js            # Express app
│   ├── models.js            # MongoDB schemas
│   ├── routes.js            # API routes
│   ├── ai-service.js        # AI recommendation engine
│   └── seed.js              # Database seeder
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier)

### Installation

```bash
# Clone the repository
git clone https://github.com/VSRAJHAVEL/campusiq-ai.git
cd campusiq-ai

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB Atlas URI and JWT secret

# Seed the database
npm run seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new student |
| POST | /api/auth/login | Login & get JWT |
| GET | /api/courses | Browse courses |
| GET | /api/clubs | Browse clubs |
| GET | /api/events | Browse events |
| GET | /api/recommendations/campus | AI campus recommendations |
| GET | /api/recommendations/career | AI career recommendations |
| POST | /api/interactions | Log user behavior |

## 🧪 AI Algorithm

CampusIQ uses a **hybrid recommendation engine**:
- **Content-Based Filtering** (60%) — Cosine similarity between item features and user preferences
- **Collaborative Filtering** (30%) — User-user similarity from interaction patterns
- **Trending Signals** (10%) — Popularity and recency weighting

## 📄 License

MIT License — feel free to use and modify.

---

Built with ❤️ for the AIWD Course Project
