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

Do not run old mock/demo SQL seed data. `supabase/seed.sql` is for local/development setup only; it must not be run in production.

## Validation

```powershell
npx tsc --noEmit
npm run build
```

The browser never receives the SQL Server credentials. Next.js proxies authentication to FastAPI and stores only the short-lived JWT in an HttpOnly cookie. Password recovery email delivery still requires an SMTP provider; until one is configured, the UI reports that recovery is unavailable.
