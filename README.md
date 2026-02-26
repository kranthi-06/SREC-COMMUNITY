# College Event Review Sentiment Analyzer

A full-stack web application designed for colleges to capture and analyze student feedback on various campus events using AI-powered sentiment analysis.

## 🚀 Features
- **Sentiment Analysis**: Automatically classifies reviews as Positive, Negative, or Neutral.
- **Interactive Dashboard**: Visualizes sentiment distribution and event-wise performance using Recharts.
- **Modern UI**: responsive, academic-themed design with Glassmorphism and Dark Mode support.
- **Review Management**: Admin capabilities to view and delete reviews.
- **Filtering**: Search and filter reviews by event name.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Recharts, Lucide-React, Axios, Vanilla CSS.
- **Backend**: Node.js, Express, Mongoose, Sentiment NLP library.
- **Database**: MongoDB.

## 📦 Installation & Setup

### Prerequisites
- Node.js installed
- MongoDB installed and running locally

### 1. Clone the repository
```bash
git clone <repository-url>
cd sentimental_analyse
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder:
```env
MONGODB_URI=mongodb://localhost:27017/college-sentiment
PORT=5000
```
Start the backend server:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

## 📸 Presentation Points
- Explain the Sentiment Analysis logic (Backend NLP).
- Demonstrate the responsive Dashboard.
- Show the Real-time Database integration with MongoDB.
- Highlight the Academic-focused Design System.
