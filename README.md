# AI-Powered Study Material Generator 🚀

**🌍 Live Demo:** [Frontend (Vercel)](https://ai-study-material-generator-nine.vercel.app/) | **⚙️ Backend API:** [Render](https://ai-study-material-generator-ljl8.onrender.com/)

An incredibly powerful, full-stack Next.js and FastAPI application that uses multimodality to turn any YouTube video into comprehensive study notes, interactive quizzes, and precision-extracted visual flashcards.

## Features ✨
- **Bypass YouTube Blocks:** Uses `yt-dlp` to fetch auto-generated VTT subtitles from any video.
- **Multilingual Support:** Supports English, Spanish, French, German, Hindi, Nepali, Japanese, Korean, and Portuguese.
- **Lightning Fast AI:** Uses Groq's high-speed Whisper Large v3 to transcribe fallback audio.
- **Intelligent Chunking:** Automatically chunks massive transcripts using a Map-Reduce architecture.
- **Precision AI Visuals:** Instead of randomly capturing screenshots, the AI reads the transcript, identifies the exact timestamps of critical diagrams or whiteboard notes, and commands `FFmpeg` to extract those exact split-second frames.
- **Flawless Formatting:** Equipped with an omniscient Double Iterative Backtracking JSON parser to guarantee 100% stable API responses even when the LLM hallucinates or wraps outputs in `<think>` tags.
- **Clean Export:** Fully customized Tailwind print classes to natively generate beautiful UI-free PDFs.

## Tech Stack 💻
- **Frontend:** Next.js 14, React, Tailwind CSS, Framer Motion, Lucide React
- **Backend:** FastAPI, Python, FFmpeg, Groq API (Whisper + GPT-OSS-20B), yt-dlp

## Quick Start 🛠️

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```
Create a `.env` file in the `backend` directory and add:
```env
GROQ_API_KEY=your_groq_api_key
```
Start the backend server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` in your browser!
