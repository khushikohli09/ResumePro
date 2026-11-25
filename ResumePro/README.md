# ResumePro — AI Resume Analyzer & Builder

A full MERN-stack app that analyzes resumes like an ATS + hiring manager, and helps you
build a new resume with AI-assisted writing. Includes a light/dark theme toggle and a
minimal, professional UI.

## Features

**Analyzer**
- Upload a resume (PDF/DOC/DOCX) or paste text
- Rule-based ATS scoring: formatting, impact, clarity, keyword coverage
- LLM review: strengths, weaknesses, suggestions, skill gaps
- Job-description match score with matched/missing keywords; re-run on any saved resume

**Builder**
- Structured form: contact (incl. LinkedIn/website), summary, experience, projects (with tech stack), education (with CGPA), skills
- AI-written summary and AI-rewritten bullets (or add your own bullets as-is)
- **5 templates, switchable without losing content:** ATS-Safe (single column, plain text), Fresher, Professional, Developer, Business
- **3 export options:** ATS text PDF (real selectable text), exact-look PDF, and Print / Save as PDF
- Open and edit saved resumes at `/builder/:id`

**AI Tools** (`/tools`) - each works on a saved resume or pasted text
- **Grammar & wording checker:** grammar errors, weak verbs, repetition, vague statements, each with a fix
- **Authenticity checker:** date gaps/overlaps, claimed vs. dated experience, seniority vs. experience, extreme metrics, copied bullets, text copied from a job description, keyword stuffing
- **LinkedIn suggestions:** headlines, About section, experience descriptions, skills to add, tips
- **Job recommendations:** roles ranked by fit from skills, education, projects and experience
- **Skill gap & roadmap:** compare against a role or a pasted job description, get a prioritised, phased learning plan
- **Portfolio website generator:** a responsive single-file site with its own light/dark toggle, editable text, accent colours, download as HTML

**Platform**
- JWT auth, light/dark theme (persisted, follows system preference)
- Animated dashboard: counting stat cards, a "suggested next step" panel that types itself out (rule-based, picked from your own scores, no LLM call), a self-drawing score overview, animated score rings, quick tool tiles, search and filter, skeleton loading, and exit animations on delete
- All motion respects the OS "reduce motion" setting

## How the AI tools degrade

Every tool has a deterministic rule-based engine that runs first, so each tool still returns
useful results with no API key. When an LLM is configured, its output is merged in (marked
"AI"). The UI tells you which mode produced the result.

## Stack

- **Frontend:** React (Vite), Tailwind CSS v4, React Router, Axios, lucide-react icons,
  jsPDF + html2canvas for PDF export
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, Multer (uploads),
  pdf-parse + mammoth (resume text extraction)
- **AI:** Grok (xAI), Groq, OpenAI or Anthropic (set `LLM_PROVIDER`) for review and content generation

## Project structure

```
ResumePro/
  backend/     Express API
  frontend/    React app (Vite)
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — your MongoDB connection string (local or Atlas)
- `JWT_SECRET` — any long random string
- `GROK_API_KEY` — your Grok API key (from xAI)

Run it:

```bash
npm run dev      # nodemon, auto-restarts on changes
# or
npm start
```

The API runs on `http://localhost:5000` by default.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api` requests to the backend
(configured in `vite.config.js`), so no separate `.env` is required for local dev.

### 3. Try it

1. Open `http://localhost:5173`, create an account.
2. Go to **Analyzer**, upload a resume (or paste text), optionally paste a job description.
3. Or go to **Builder** to create a resume from scratch with AI-assisted writing, then export as PDF.
4. Toggle light/dark mode from the sun/moon icon in the navbar.

## Notes on the LLM integration

Without a valid key the analyzer and all AI tools fall back to rule-based results. The builder's
AI writing (summary and bullet rewriting) needs a key because there is no non-AI fallback for
generative writing.

## Verification

Run the backend suite with `cd backend && npm test`. It stubs MongoDB and the LLM HTTP call, so it
needs neither a database nor an API key. It runs every tool endpoint twice, once with the LLM
"down" (rule-based fallbacks) and once "up" (LLM output merged), and checks auth guards, input
validation, builder-resume handling, and HTML escaping in the portfolio output (24 checks).

Run the frontend suite with `cd frontend && npm test` (17 tests): the count-up and typewriter hooks
(including reduced motion) and the Dashboard (stats maths, next-step logic, score rings, search and
filters, delete with exit animation, inline rename, empty state).

Also verified during development:
- Text PDFs for all 5 templates were generated in Node and read back with `pdf-parse`: text is
  selectable, sections follow each template's order, and long resumes paginate.
- All 5 templates were server-rendered with identical data: every field survives a template
  switch, and the ATS template uses no grid/flex/table/image layout tricks.
- `vite build` succeeds with no errors.

Not verified here: real MongoDB, real LLM responses, and click-through testing in a browser. The
sandbox had none of these, so do a quick manual pass after adding your `.env`.
