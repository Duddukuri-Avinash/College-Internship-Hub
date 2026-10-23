# InternHub

InternHub is a college internship ecosystem for R.V.R & J.C College of Engineering. The full application runs on Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui. Next.js route handlers provide the API, authentication, file handling, and integrations; they access the existing SQL Server database directly.

## Local setup

1. Install Node.js 20.9 or newer, Microsoft SQL Server, and Microsoft ODBC Driver 17 or 18. On Windows, run the Next.js server under an account authorized to use SQL Server Windows Authentication when using `Trusted_Connection`.
2. Install JavaScript dependencies:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env.local` in the project root. Set `DATABASE_URL` to the SQL Server URL, `JWT_SECRET_KEY` to a random value of at least 32 characters, and `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` as needed. The Next.js server connects directly to SQL Server using the existing `mssql+pyodbc://` URL, including `odbc_connect` URLs for Windows integrated authentication.
   For skill quizzes, set `GEMINI_API_KEY`. `GEMINI_MODEL` selects the shared primary model and defaults to `gemini-3.1-flash-lite`. For market-roadmap research, set the separate server-only `ROADMAP_GEMINI_API_KEY`; it never falls back to the quiz API key. Roadmap research uses the Interactions API with Google Search grounding. If Google rejects that tool, the server retries the model without it. `GEMINI_FALLBACK_MODEL` selects the roadmap fallback model and defaults to `gemini-flash-lite-latest`. The primary model is retried up to three times on HTTP 429 or 503 responses before the fallback is tried. For GitHub sign-in and verification, set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_REDIRECT_URI` to `http://localhost:3000/api/github/callback`. `GITHUB_API_TOKEN` is optional and can raise GitHub API rate limits. Register that callback URL in the GitHub OAuth app.

   To connect Gemini:

   1. Create an API key in Google AI Studio.
   2. Put the quiz key in the root `.env.local` as `GEMINI_API_KEY=...` and the separate roadmap-research key as `ROADMAP_GEMINI_API_KEY=...`; never expose either in `NEXT_PUBLIC_*` variables or browser code.
   3. Set `GEMINI_MODEL=gemini-3.1-flash-lite` and `GEMINI_FALLBACK_MODEL=gemini-flash-lite-latest`, or select other Interactions API models enabled for your account. `GEMINI_MODEL` is shared with skill quizzes; roadmap calls use the separate `ROADMAP_GEMINI_API_KEY`.
   4. Restart the Next.js server. The first quiz for each skill and level creates a Gemini-generated question bank; later attempts reuse the stored bank.
   5. Select Beginner, Intermediate, or Advanced in Skill Roadmap before starting a quiz. The selected level is included in the generation prompt and cached separately.
4. Create or update the SQL Server schema using the existing migration history. The Python backend has been replaced, but the Alembic migrations remain the schema history for existing installations. Apply the latest migration (`009_filter_null_verification_skills`) to enable notifications and allow multiple document reviews per student:

   ```powershell
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   ```

   This migration setup is only needed to create or update the database schema; the application itself no longer requires Python or a separate API server. Migration `007_password_reset_tokens` enables password recovery emails, `008_notifications` creates notification and preference tables, and `009_filter_null_verification_skills` fixes uniqueness for skill verifications without blocking document-review records.
   For email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` in `.env.local`. For Gmail, use an App Password rather than your regular account password. Restart Next.js after changing environment variables. Password recovery links expire after 30 minutes. Faculty and admin announcements create in-app notifications and send email according to each recipient's saved notification preferences. Scheduled admin emails are unavailable in local mode because there is no background scheduler.
   India market research refreshes when no successful snapshot exists from the previous 24 hours and replaces the curated roles with 25 ranked roles based on recent hiring demand, with role-specific technical skills. Saved snapshots include Google Search citations. Failed refreshes are retried after one minute; after the primary model retries and the fallback model fail, the curated roadmap remains available.
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
npm run test:notifications
```

The browser never receives SQL Server or integration credentials. Next.js stores the short-lived JWT and password-reset token in HttpOnly cookies.
