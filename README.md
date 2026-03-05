# 🚀 CreatorIQ: AI-Powered YouTube CRM & SEO Engine

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Gemini API](https://img.shields.io/badge/Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![YouTube API](https://img.shields.io/badge/YouTube%20API-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://developers.google.com/youtube/v3)

**Live Demo:** [https://suyogmahagaonkar.github.io/creatoriq/](https://suyogmahagaonkar.github.io/creatoriq/)

CreatorIQ is an enterprise-grade dashboard built for YouTube creators to manage their channel's SEO, audit content pipelines, and engage with their audience at scale using Artificial Intelligence. 

---

## 💡 The "Why" (Motivation)
Managing a growing YouTube channel often requires jumping between multiple tools: YouTube Studio for analytics, TubeBuddy/VidIQ for SEO, and spreadsheets for tracking. 

**CreatorIQ was built to centralize these operations into a single command center.** It eliminates manual metadata guessing by using the Gemini AI API to generate high-ranking SEO suggestions, and it transforms comment management into a traditional Sales CRM workflow with Kanban boards and sentiment analysis.

---

## 🎯 The "What" (Core Features)

### 1. 📊 Executive Dashboard
* **KPI Tracking:** Real-time metrics for views, engagement rates, and channel growth.
* **Engagement Visualizer:** Custom CSS-based charts to track the performance of recent uploads.
* **Recent Activity Feed:** A chronological pipeline of recent video performance and updates.

### 2. 🤖 AI Audience CRM (Comment Management)
* **Pipeline Views:** Toggle between a standard List view and a dynamic Kanban Board (Inbox vs. Responded).
* **Vibe Check & Sentiment Analysis:** Scans audience comments to categorize them as Positive, Neutral, or Negative.
* **AI Reply Drafter:** Click a button to have Gemini instantly draft a contextual, high-quality reply to any comment.

### 3. 🔍 Content Library & SEO Workspace
* **Split-Pane Audit UI:** Select any video or playlist to open a detailed SEO workspace.
* **AI Action Plan:** Automatically scores Titles, Descriptions, and Tags out of 100 and highlights critical issues.
* **Direct-to-YouTube Sync:** Edit metadata directly within the app and push changes live to YouTube via the API.

### 4. 📈 Bulk SEO Audit
* **Catalog Health Check:** Audits your entire video library at once and sorts videos from "Worst SEO" to "Best SEO".
* **Quick-Fix Routing:** Identifies critical action items and provides a one-click route to the optimization workspace.

---

## ⚙️ The "How" (Tech Stack & Architecture)

This project is a heavily optimized Client-Side Single Page Application (SPA).

* **Frontend Framework:** React 18 + Vite for lightning-fast HMR and building.
* **Styling:** Custom CSS with a CSS-variable theming engine for a sleek, dark-mode-first CRM aesthetic.
* **Icons:** `lucide-react` for clean, professional iconography.
* **APIs & Data:**
  * **YouTube Data API v3:** Fetches channel statistics, videos, playlists, and comments. Handles OAuth2 tokens for writing metadata changes back to the server.
  * **Google Gemini Pro API:** Powers the AI Assistant for generating SEO-optimized titles, drafting comment replies, and summarizing audience sentiment.
* **Deployment:** Hosted on GitHub Pages via the `gh-pages` branch.

---

## 🚀 Installation & Local Setup

Want to run CreatorIQ on your local machine? Follow these steps:

### 1. Clone the Repository
```bash
git clone [https://github.com/SuyogMahagaonkar/creatoriq.git](https://github.com/SuyogMahagaonkar/creatoriq.git)
cd creatoriq
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Add required details and Run the developement server
```bash
npm run dev
```
The app will be available at http://localhost:5173.
## 👨‍💻 Meet the Creator

**Suyog Mahagaonkar** *Java Developer | Content Creator | Tech Enthusiast*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Suyog_Mahagaonkar-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/suyog-mahagaonkar/)
[![YouTube Channel](https://img.shields.io/badge/YouTube-WorldOfZeroOne-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/@WorldOfZeroOne)



Welcome to my digital workspace! I'm passionate about building robust backend systems in Java, exploring complex algorithms, and sharing my tech journey with the community.

*Feel free to connect, subscribe to the channel, or fork this project!*
