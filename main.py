from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import Optional

app = FastAPI(title="Academia LMS API", version="1.0.0")

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None


KEYWORD_RESPONSES = {
    "study": "Great question! Here are effective study tips:\n1. Use the Pomodoro technique (25 min focus, 5 min break)\n2. Review notes within 24 hours of learning\n3. Practice active recall and self-testing\n4. Use spaced repetition for long-term retention",
    "quiz": "For quiz preparation:\n1. Review all lecture materials\n2. Practice with past papers\n3. Focus on your weak areas first\n4. Get enough rest before the quiz",
    "assignment": "Assignment tips:\n1. Read the requirements carefully\n2. Break tasks into smaller milestones\n3. Start early to avoid last-minute stress\n4. Proofread before submitting",
    "attendance": "Attendance is critical! Maintain above 75% to avoid academic penalties. If you've missed classes, speak with your teacher promptly.",
    "exam": "Exam preparation:\n1. Create a study schedule 2 weeks before\n2. Organize all notes and materials\n3. Practice under timed conditions\n4. Stay hydrated and sleep well the night before",
    "math": "Mathematics tips:\n1. Understand concepts—don't just memorize\n2. Practice problems daily\n3. Khan Academy is excellent for free tutorials\n4. Form study groups for complex topics",
    "programming": "Programming advice:\n1. Code every day—consistency is key\n2. Build real projects alongside exercises\n3. Read documentation when stuck\n4. Platforms like LeetCode and HackerRank help sharpen skills",
    "stress": "Managing academic stress:\n1. Take regular breaks using Pomodoro technique\n2. Exercise regularly—it boosts brain function\n3. Talk to friends, family, or a counselor\n4. Break large tasks into smaller, achievable goals",
}


@app.get("/")
def root():
    return {"status": "Academia LMS API is running", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/chat")
def chatbot_response(body: ChatMessage):
    """AI Tutor chatbot with keyword-based intelligent responses."""
    msg_lower = body.message.lower()
    
    for keyword, response in KEYWORD_RESPONSES.items():
        if keyword in msg_lower:
            return {"response": response, "keyword_matched": keyword}
    
    # Default responses
    default = (
        "That's a great question! I recommend:\n"
        "1. Checking your course materials for specific topics\n"
        "2. Consulting your teacher for subject-specific queries\n"
        "3. Using my quick prompts for common topics\n\n"
        "You can ask me about: study tips, quizzes, assignments, attendance, math, programming, exams, or stress management."
    )
    return {"response": default, "keyword_matched": None}


@app.get("/api/stats")
def get_stats():
    """Placeholder for server-side computed stats."""
    return {
        "total_courses": 0,
        "total_students": 0,
        "total_teachers": 0,
        "message": "Connect to Supabase to retrieve real data."
    }
