# InternHub

InternHub is a college internship ecosystem for R.V.R & J.C College of Engineering. The full application runs on Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui. Next.js route handlers provide the API, authentication, file handling, and integrations; they access the existing SQL Server database directly.

## Local setup

1. Install Node.js 20.9 or newer, Microsoft SQL Server, and Microsoft ODBC Driver 17 or 18. On Windows, run the Next.js server under an account authorized to use SQL Server Windows Authentication when using `Trusted_Connection`.
2. Install JavaScript dependencies:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env.local` in the project root. Set `DATABASE_URL` to the SQL Server URL, `JWT_SECRET_KEY` to a random value of at least 32 characters, and `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` as needed. The Next.js server connects directly to SQL Server using the existing `mssql+pyodbc://` URL, including `odbc_connect` URLs for Windows integrated authentication.
   For skill quizzes, set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` (default `gemini-3.8-flash`). For monthly market-roadmap research, set the separate `ROADMAP_GEMINI_API_KEY`; `ROADMAP_GEMINI_MODEL` is optional and defaults to `GEMINI_MODEL` or `gemini-3.8-flash`. Roadmap research never falls back to the quiz API key. For GitHub sign-in and verification, set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_REDIRECT_URI` to `http://localhost:3000/api/github/callback`. `GITHUB_API_TOKEN` is optional and can raise GitHub API rate limits. Register that callback URL in the GitHub OAuth app.

   To connect Gemini:

   1. Create an API key in Google AI Studio.
   2. Put the quiz key in the root `.env.local` as `GEMINI_API_KEY=...` and the separate roadmap-research key as `ROADMAP_GEMINI_API_KEY=...`; never expose either in `NEXT_PUBLIC_*` variables or browser code.
   3. Set `GEMINI_MODEL=gemini-3.8-flash` (or another Interactions API model enabled for your account).
   4. Restart the Next.js server. The first quiz for each skill and level creates a Gemini-generated question bank; later attempts reuse the stored bank.
   5. Select Beginner, Intermediate, or Advanced in Skill Roadmap before starting a quiz. The selected level is included in the generation prompt and cached separately.
4. Create or update the SQL Server schema using the existing migration history. The Python backend has been replaced, but the Alembic migrations remain the schema history for existing installations. Apply the latest migration (`006_monthly_roadmap_snapshots`) before using roadmaps:

   ```powershell
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   ```

   This migration setup is only needed to create or update the database schema; the application itself no longer requires Python or a separate API server. India market research refreshes on the first roadmap visit each month and replaces the curated roles with 25 ranked roles based on recent hiring demand, with role-specific technical skills. Saved snapshots include Google Search citations. If Gemini quota is unavailable, the saved or curated roadmap remains usable.
5. Start the application:

   ```powershell
   npm run dev
   ```

   Visit <http://localhost:3000>.

Skill verification is server-authoritative. Resume extraction only updates the student's claimed skill list. Quiz answers and question keys remain on the server, and GitHub repository checks run from server-side code.

The student roadmap uses Next.js route handlers at `/api/student/verifications`, `/api/student/quiz/*`, and `/api/student/roadmaps/monthly`, plus GitHub integration routes under `/api/github/*`.

Do not run old mock/demo SQL seed data. `supabase/seed.sql` is for local/development setup only; it must not be run in production.

## Validation

```powershell
npx tsc --noEmit
npm run build
```

The browser never receives SQL Server or integration credentials. Next.js stores the short-lived JWT in an HttpOnly cookie. Password recovery email delivery still requires an SMTP provider; until one is configured, the UI reports that recovery is unavailable.
