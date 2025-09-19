# Broadway Copilot Dashboard

Internal ops dashboard for [Broadway Copilot](https://github.com/advitrocks9/broadway_copilot), a WhatsApp AI stylist. Gives the team visibility into costs, user activity, and agent behaviour across the system.

## What it does

- **Analytics**: message volume over time, cost breakdowns by model, active user counts (Recharts)
- **User management**: searchable, sortable tables for all users on the platform (TanStack Table)
- **Agent trace debugger**: step-by-step view of graph executions, LLM calls, and tool usage for debugging agent behaviour

## Tech stack

- Next.js 15, TypeScript, Tailwind CSS
- shadcn/ui components
- NextAuth.js (Google OAuth)
- Prisma (PostgreSQL)
- Recharts
- Deployed on Google Cloud Run

## Setup

```bash
git clone https://github.com/advitrocks9/broadway_copilot_dashboard.git
cd broadway_copilot_dashboard
npm install
```

Create a `.env.local` file:

```bash
DATABASE_URL="postgresql://user:password@host:port/database"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

Run migrations and start the dev server:

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed to Google Cloud Run via GitHub Actions. Pushes to `main` trigger an automatic build and deploy. The workflow lives in `.github/workflows/google-cloudrun-deploy.yml`.
