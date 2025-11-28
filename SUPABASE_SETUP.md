# Supabase Local Development Setup

## Prerequisites

- Docker Desktop installed and running

## Steps to Start Supabase Locally

### 1. Start Supabase

```bash
npx supabase start
```

This command will:

- Pull the necessary Docker images
- Start PostgreSQL on port 54322
- Start Supabase Studio on port 54323
- Start the API on port 54321

**First time setup takes a few minutes to download images.**

### 2. Get Your Local Credentials

After starting, you'll see output like:

```
API URL: http://127.0.0.1:54321
Studio URL: http://127.0.0.1:54323
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Update Your .env.local File

Add these variables to your `.env.local`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<your-anon-key-from-step-2>
```

### 4. Apply Migrations

The migrations will be applied automatically when you start Supabase. If you need to reset the database:

```bash
npx supabase db reset
```

### 5. Access Supabase Studio

Open http://localhost:54323 in your browser to:

- View tables and data
- Run SQL queries
- Monitor API requests

## Running the Scraper

Once Supabase is running:

```bash
npm run scrape
```

This will scrape patient data from MediOnline and save it to your local Supabase database.

## Useful Commands

```bash
# Stop Supabase
npx supabase stop

# Check Supabase status
npx supabase status

# Reset database (drops all data and re-runs migrations)
npx supabase db reset

# Generate TypeScript types from database
npx supabase gen types typescript --local > src/utils/supabase/types.ts
```

## Database Schema

### Tables Created:

1. **patients** - Patient information from MediOnline
2. **appointments** - Appointments linked to patients
3. **invoices** - Invoices linked to patients
4. **services** - Individual services within invoices

### Relationships:

- `appointments.patient_id` → `patients.id`
- `invoices.patient_id` → `patients.id`
- `services.invoice_id` → `invoices.id`

All foreign keys have CASCADE DELETE for clean data management.

## Troubleshooting

### Docker not running

Make sure Docker Desktop is running before executing `npx supabase start`.

### Port conflicts

If ports 54321-54323 are in use, stop other services or modify `supabase/config.toml`.

### Database reset needed

If you encounter schema issues:

```bash
npx supabase db reset
```

## Next Steps

After validation:

1. Test the scraper with local Supabase
2. Verify data in Studio UI
3. Check for duplicate handling
4. Review data integrity
5. Deploy to production Supabase when ready
