# Avieno - Software Company Platform

A complete, production-ready full-stack application built for a software development agency. Features public landing pages, client request dashboards, and an admin management panel.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI + Framer Motion
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: Custom JWT Auth + HTTP-only Cookies
- **Forms**: React Hook Form + Zod

## 📦 Setup & Installation

### 1. Clone the repository and install dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on the `.env.example` template:

```bash
cp .env.example .env
```
Make sure to put your actual PostgreSQL `DATABASE_URL` and a secure `JWT_SECRET`.
For production contact/support emails, also configure SMTP values from `.env.example`.

### 3. Initialize the Database

Push the Prisma schema to your database and generate the Prisma client:

```bash
npx prisma db push
npx prisma generate
```

*(Note: In production, consider using `npx prisma migrate deploy` after creating migrations with `npx prisma migrate dev`)*

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 5. Create a Dedicated Admin Account

Do not promote client accounts to admin. Create a separate admin user:

```bash
# PowerShell
$env:ADMIN_EMAIL="admin@yourcompany.com"
$env:ADMIN_PASSWORD="replace_with_strong_password"
$env:ADMIN_NAME="Platform Admin" # optional
npm run create-admin
Remove-Item Env:ADMIN_PASSWORD
Remove-Item Env:ADMIN_EMAIL
Remove-Item Env:ADMIN_NAME
```

`ADMIN_PASSWORD` must be at least 12 characters.

## Production Security Notes

- `JWT_SECRET` is mandatory and must be at least 32 characters.
- Login API includes rate limiting (5 failed attempts per 15 minutes by IP + email).
- Prisma uses a shared singleton client to reduce connection churn.
- Contact and support notifications can send admin email via SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_EMAIL`).

## Implemented Modules

- Admin user management: search, filter, activate/deactivate, delete.
- Admin project management: create/delete, status updates, media upload endpoint with validation.
- Admin notification center and support queue management.
- Contact form persistence + admin notification + optional admin email alert.
- User notification center (mark read / clear read).
- Support ticket system with user/admin replies.
- Portfolio is database-driven with project detail pages.
- Legal pages: `/privacy` and `/terms`.

## 📁 Project Structure

- `/src/app/api`: Next.js REST API routes.
- `/src/app/(admin)`: Protected admin dashboard.
- `/src/app/(protected)`: Protected client dashboard.
- `/src/components`: Reusable UI components from Shadcn UI & custom components.
- `/prisma`: Database schema and migrations.

## 🐳 Docker Deployment

The project includes a multi-stage `Dockerfile` optimized for Next.js standalone output.

To build the Docker image:

```bash
docker build -t avieno-platform .
```

To run the container:

```bash
docker run --name avieno-platform --env-file .env -p 3000:3000 avieno-platform
```

Required runtime variables are documented in `.env.example` (at minimum `DATABASE_URL` and `JWT_SECRET`).
`next.config.ts` already sets `output: "standalone"`.
