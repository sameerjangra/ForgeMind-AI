# ForgeMind AI - Autonomous AI Software Engineer

ForgeMind AI is an AI software engineer that scans your entire codebase, maps dependencies, uncovers security bugs, runs optimization tasks, and implements code in minutes. It provides an intuitive platform to upload, scan, and analyze codebases autonomously. Powered by state-of-the-art Generative AI models, ForgeMind helps developers detect bugs, evaluate security vulnerabilities, optimize performance, and understand complex architecture instantly.

## 🚀 Features

- **Multi-Agent Architecture**: Dedicated agents for Repository Analysis, Architecture Mapping, Bug Detection, Security Auditing, Performance Optimization, and Testing.
- **Dynamic Security & Bug Scanning**: Automatically scans codebases for OWASP vulnerabilities (e.g., hardcoded secrets, disabled SSL), N+1 queries, unhandled exceptions, and memory leaks.
- **AI Explainer**: Hover over or select any file in your project to get a dynamic, AI-generated explanation of its purpose, complexity, and suggested improvements.
- **Architecture Visualization**: Dynamically generates interactive, premium-styled architecture node graphs based on project frameworks and file structures.
- **Real-Time AI Chat**: Chat with a context-aware AI assistant that can answer questions about the codebase, help refactor code, and fix identified vulnerabilities.

## 🛠️ Technology Stack

### Frontend
- **React 18** with **Vite** for blazing-fast builds.
- **TypeScript** for strong type safety.
- **TailwindCSS** for stunning, responsive, and glassmorphism-inspired UI design.
- **Lucide React** for beautiful iconography.
- **React Flow** for interactive architecture graphs.
- **Axios** for API integrations.

### Backend
- **FastAPI** (Python 3) for high-performance, asynchronous REST APIs.
- **SQLite** for lightweight, robust local database storage.
- **Groq API (Llama 3 / Vision)** for lightning-fast LLM inference and code analysis.
- Custom AST (Abstract Syntax Tree) scanners for deep static code analysis.

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- A Groq API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your Groq API Key in the `.env` or settings (can be configured in the UI later).
4. Run the FastAPI server:
   ```bash
   python -m backend.main
   # Server will start on http://localhost:8000
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   # App will be available at http://localhost:5173
   ```

### Production / Vercel Deployment

1. Ensure the `VITE_API_URL` environment variable is set in your deployment environment (Vercel). It should point to the deployed FastAPI backend. Example value used in this repository:

   - `VITE_API_URL=https://forgemind-ai-4ayq.onrender.com`

2. Local build (to verify production build):

```bash
cd frontend
npm run build
```

3. Deploy to Vercel:

 - Create a Vercel project pointing at this repository.
 - In the Vercel dashboard, add an Environment Variable named `VITE_API_URL` with your backend URL (for example the value above) for both Preview and Production.
 - Vercel will automatically run `npm run build` for the `frontend` package when deploying.

Notes:
 - This repo uses a centralized Axios client at `frontend/src/api.ts` that reads `import.meta.env.VITE_API_URL` at runtime. Do not hardcode backend URLs in the frontend code.
 - Two `.env` files were added for convenience: `frontend/.env` and `frontend/.env.production`. These are for local testing only — do not commit secrets into the repo.

## 🛡️ License
This project is built for the Hackathon and is open source. 
