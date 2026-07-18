import os
from dotenv import load_dotenv
load_dotenv()  # Loads GROQ_API_KEY from .env automatically


import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.db import init_db
from backend.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[ForgeMind AI] Initializing SQLite database...")
    init_db()
    key_status = "✓ GROQ_API_KEY loaded" if os.environ.get("GROQ_API_KEY") else "⚠ No GROQ_API_KEY found – demo mode only"
    print(f"[ForgeMind AI] {key_status}")
    print("[ForgeMind AI] Database tables ready. Server online.")
    yield

app = FastAPI(title="ForgeMind AI Backend", version="1.0.0", lifespan=lifespan)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "running", "service": "ForgeMind AI Autonomous Engine API"}

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
