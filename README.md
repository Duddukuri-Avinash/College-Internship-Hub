# InternHub

InternHub is a college internship ecosystem for R.V.R & J.C College of Engineering. The frontend is built with Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui. The Python FastAPI backend owns authentication and application data through SQL Server.

## Local setup

1. Install Node.js 20 or newer.
2. Install JavaScript dependencies:

   ```powershell
   npm install
   ```

3. Install the backend dependencies in `backend` with Python 3.11+ and install Microsoft ODBC Driver 18 for SQL Server on the host.
4. Copy `.env.example` to `.env` in `backend` and set `DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS`, and `BACKEND_API_URL`. The SQLAlchemy URL must use `mssql+pyodbc` and an installed SQL Server ODBC driver.
   For OpenAI-powered skill quizzes also set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `gpt-4o-mini`). Gemini is not used. Also set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URI`, `GITHUB_API_TOKEN` (optional fallback), and `FRONTEND_URL`. Register the GitHub OAuth callback URL exactly as configured.

   To connect OpenAI:

   1. Create an API key in the OpenAI Platform dashboard.
   2. Put it only in `backend/.env` as `OPENAI_API_KEY=...`; never expose it in `NEXT_PUBLIC_*` variables or browser code.
   3. Set `OPENAI_MODEL=gpt-4o-mini` (or another model enabled for your account).
   4. Restart the FastAPI backend. The first quiz for each skill and level creates an OpenAI-generated question bank; later attempts reuse the stored bank.
   5. Select Beginner, Intermediate, or Advanced in Skill Roadmap before starting a quiz. The selected level is included in the generation prompt and cached separately.
5. Create the SQL Server schema from the existing SQLAlchemy models:

   ```powershell
   cd backend
   alembic upgrade head
   ```

6. Start the API and frontend in separate terminals:

   ```powershell
   uvicorn app.main:app --reload
   ```

   ```powershell
   npm run dev
   ```

   Visit <http://localhost:3000>.

Skill verification is server-authoritative. Resume extraction only updates the student's claimed skill list. Quiz answers and question keys remain on the API, and GitHub repository checks run with the server-held OAuth token. Apply migration `003_skill_verification` before using the roadmap:

```powershell
cd backend
alembic upgrade head
```

The student roadmap reads `GET /students/verifications`, starts quizzes with `POST /students/quiz/start`, submits them with `POST /students/quiz/submit`, and uses the GitHub OAuth and repository endpoints under `/students/github`.

Do not run old mock/demo SQL seed data. `supabase/seed.sql` is for local/development setup only; it must not be run in production.

## Validation

```powershell
npx tsc --noEmit
npm run build
```

The browser never receives the SQL Server credentials. Next.js proxies authentication to FastAPI and stores only the short-lived JWT in an HttpOnly cookie. Password recovery email delivery still requires an SMTP provider; until one is configured, the UI reports that recovery is unavailable.
