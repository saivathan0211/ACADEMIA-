# Academia LMS — Deployment Guide

## Quick Start

### 1. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema in `brain/database_schema.sql`
3. In **Authentication → Settings**, enable **Email** provider
4. Copy your **Project URL** and **Anon Key** from **Settings → API**

### 2. Configure Environment Variables

Edit `frontend/.env` and replace the placeholders:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Run the Frontend

```bash
cd frontend
npm install       # Only needed first time
npm run dev       # Starts at http://localhost:3000
```

### 4. Run the Backend (Optional — for AI Chatbot)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Project Structure

```
PROJECT 123/
├── frontend/                # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/       # Login, Register, ForgotPassword pages
│   │   │   ├── student/    # Student Dashboard + 10 sub-pages
│   │   │   ├── teacher/    # Teacher Dashboard + 10 sub-pages
│   │   │   └── parent/     # Parent Dashboard + 6 sub-pages
│   │   ├── components/
│   │   │   └── layout/     # Sidebar, TopNav, DashboardLayout
│   │   ├── context/        # AuthContext (Supabase session)
│   │   └── lib/            # Supabase client + helpers
│   └── package.json
├── backend/                 # FastAPI (Python)
│   ├── main.py
│   └── requirements.txt
└── brain/
    └── database_schema.sql  # Run in Supabase SQL Editor
```

---

## Supabase Setup Details

### Storage Buckets (Required for Assignment Uploads)
1. Go to **Storage** in Supabase dashboard
2. Create a bucket named `submissions`
3. Set it to **Public** so students can download their files

### Authentication Email Templates
- Supabase sends automatic reset emails. No additional config needed.

---

## User Account Formats

| Role | Login ID | Profile Linkage |
|------|----------|-----------------|
| Student | Personal Email | Linked via UID in `profiles` table |
| Teacher | Personal Email | Linked via UID in `profiles` table |
| Parent | Personal Email | Linked via UID in `profiles` table |

> [!NOTE]
> Authenticaion now uses real email addresses for both registration and login. Roll numbers and Teacher IDs are stored in the profile but not used for auth.

---

## Features Summary

### Student Dashboard
- Enrolled courses with progress bars
- Daily/weekly timetable
- Attendance percentage with donut chart
- Interactive quiz-taking
- Assignment upload to Supabase Storage
- Marks & grades view
- Real-time messaging with teachers
- AI Tutor chatbot
- Notification system

### Teacher Dashboard  
- Attendance marking (bulk + individual) for 100+ students
- Course and timetable management
- Quiz builder (MCQ with correct answer selection)
- Assignment posting with student notifications
- Submission review with grading
- Analytics dashboard with student leaderboard
- Broadcast announcements to course/all students

### Parent Dashboard
- Child's academic progress overview
- Attendance history and percentage
- Marks/grades table
- Weekly timetable view
- Notification feed

---

## Deployment to Production

### Frontend (Vercel / Netlify)
```bash
cd frontend
npm run build
# Deploy the dist/ folder
```

### Backend (Railway / Render)
```bash
cd backend
# Set environment variables on your hosting platform
# Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```
