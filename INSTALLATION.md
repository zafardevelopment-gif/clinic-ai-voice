# ClinicAI — Installation Guide

A full-stack SaaS platform that uses an AI Voice Agent to handle clinic calls, book appointments, and log conversations. Built with **Next.js 14**, **Supabase**, and **Tailwind CSS**.

---

## Prerequisites

Make sure these are installed on your machine before starting:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18.x or 20.x | https://nodejs.org |
| npm | 9+ (comes with Node) | — |
| Git | Any recent version | https://git-scm.com |

---

## Step 1 — Clone the Repository

```bash
git clone <your-repo-url>
cd clinic-ai-voice
```

---

## Step 2 — Install Dependencies

```bash
npm install
```

---

## Step 3 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New Project** — choose a name, database password, and region
3. Wait for the project to finish provisioning (~1 minute)

---

## Step 4 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `supabase/schema.sql` from this project
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** (or press `Ctrl+Enter`)

This will create all tables, enums, indexes, RLS policies, and triggers automatically.

---

## Step 5 — Get Your Supabase API Keys

In your Supabase project dashboard:

1. Go to **Project Settings → API**
2. Copy the following three values:

| Key | Where to find it |
|-----|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (e.g. `https://abcdef.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / `public` key under "Project API keys" |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — click "Reveal" to see it |

> **Warning:** Never expose `SUPABASE_SERVICE_ROLE_KEY` publicly. It bypasses Row Level Security.

---

## Step 6 — Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# In the project root (same level as package.json)
touch .env.local
```

Add your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace the placeholder values with the keys you copied in Step 5.

---

## Step 7 — Create the First Super Admin User

The app uses two roles: **Super Admin** (`admin`) and **Clinic Admin** (`clinic_admin`).

You need to create the first admin manually via Supabase:

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **Add User** → **Create New User**
3. Enter your email and a strong password
4. Click **Create User**
5. Then go to **SQL Editor** and run:

```sql
UPDATE profiles
SET role = 'admin', full_name = 'Super Admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com'
);
```

> Replace `your-admin-email@example.com` with the email you just created.

---

## Step 8 — Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the login page. Sign in with the admin account you created in Step 7.

---

## Step 9 — First-Time Setup in the App

Once logged in as Super Admin:

1. **Create a Clinic** → Admin Panel → Clinics → New Clinic
2. **Create a Clinic Admin user** → Admin Panel → Users → Add User (select role: `clinic_admin`, assign to the clinic)
3. Log out and log back in as the Clinic Admin
4. **Add Doctors** → Doctors → Add Doctor
5. **Set Doctor Availability** → Availability → toggle working days and hours
6. **Configure Voice Agent** → Voice Config → enable the agent, set language, voice, working hours

---

## Building for Production

```bash
npm run build
npm run start
```

---

## Deploying to Vercel

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Push your code to a GitHub repository
2. Go to [https://vercel.com](https://vercel.com) → **New Project** → Import your repo
3. In the **Environment Variables** section, add all three keys from Step 5:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**

Vercel will auto-detect Next.js and configure everything automatically.

> **Important:** Do not commit `.env.local` to Git. It is already listed in `.gitignore`.

---

## Project Structure

```
clinic-ai-voice/
├── src/
│   ├── app/
│   │   ├── admin/          # Super Admin panel (clinics, users, analytics)
│   │   ├── clinic/         # Clinic Admin panel (doctors, patients, appointments)
│   │   ├── api/            # API routes (voice endpoints + auth)
│   │   │   ├── voice/      # Twilio-ready AI Voice Agent endpoints
│   │   │   └── admin/      # Admin user management
│   │   ├── login/          # Authentication page
│   │   └── globals.css     # Design system (dark theme CSS variables)
│   ├── components/
│   │   ├── layout/         # Sidebar, Topbar
│   │   ├── ui/             # Shared UI (StatCard, PageCard, AppModal, etc.)
│   │   └── voice/          # ConversationView (call transcript viewer)
│   ├── lib/supabase/       # Supabase client (browser, server, middleware)
│   ├── middleware.ts        # Auth + role-based route protection
│   └── types/database.ts   # Full TypeScript types for Supabase
└── supabase/
    └── schema.sql          # Complete database schema + RLS policies
```

---

## AI Voice Agent API Endpoints

These endpoints are ready for integration with **Twilio** or any telephony provider:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/voice/incoming-call` | Triggered when a call arrives. Returns agent config. |
| `POST` | `/api/voice/process-intent` | Classifies caller intent from transcript. |
| `POST` | `/api/voice/save-conversation` | Saves conversation turns + finalizes call record. |
| `POST` | `/api/voice/book-appointment` | Books appointment and updates call outcome. |

See each route file in `src/app/api/voice/` for full request/response documentation.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only, bypasses RLS) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS v3 + ShadCN |
| Fonts | Syne (headings) + Figtree (body) |
| Deployment | Vercel |
