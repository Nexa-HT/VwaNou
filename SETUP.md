# Environment & Database Setup Guide

## What I've Set Up

✅ **Environment Configuration**
- `.env` file with all configuration variables
- `.env.example` file for reference (commit to git)

✅ **Alembic Migrations**
- Migration framework configured
- Initial migration `001_initial.py` ready to apply
- Creates `users`, `reports`, and `zones` tables

---

## What You Need To Do

### Step 1: Ensure PostgreSQL is Running

You need PostgreSQL installed and running on `localhost:5432`. 

**Check if it's running:**
```powershell
psql --version
```

**Start PostgreSQL (Windows):**
- If using PostgreSQL installer: Open "Services" and start "postgresql-x64-15" (or your version)
- If using WSL: `wsl sudo service postgresql start`

### Step 2: Create the Database

Open PowerShell and run:

```powershell
# Connect to PostgreSQL default database
psql -U postgres -h localhost

# In the psql prompt, create the database:
CREATE DATABASE vwanou;

# Exit
\q
```

### Step 3: Verify Virtual Environment is Activated

```powershell
# Navigate to project root
cd C:\Users\Jifferson Delly\Documents\vibe_coding\VwaNou_AI

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Verify (you should see (.venv) in your prompt)
```

### Step 4: Apply Database Migrations

```powershell
# From the VwaNou_AI root directory
cd backend

# Run migrations
alembic upgrade head
```

**Expected output:**
```
INFO  [alembic.migration] Context impl PostgresqlImpl.
INFO  [alembic.migration] Will assume transactional DDL.
INFO  [alembic.migration] Running upgrade  -> 001_initial, Initial migration: Create all tables
```

### Step 5: Verify Database Setup

```powershell
# Connect to the database
psql -U postgres -h localhost -d vwanou

# List tables (should see: users, reports, zones)
\dt

# Exit
\q
```

### Step 6: Update Environment Variables (Production)

Edit `.env` and change:
```
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
```

Generate a secure key:
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Common Issues & Fixes

### ❌ "psql: command not found"
- PostgreSQL is not in your PATH
- Add PostgreSQL bin folder to PATH or use full path: `C:\Program Files\PostgreSQL\15\bin\psql.exe`

### ❌ "FATAL: role 'postgres' does not exist"
- PostgreSQL not installed properly
- Reinstall PostgreSQL and ensure default 'postgres' user is created

### ❌ "database vwanou does not exist"
- You skipped Step 2
- Create the database as shown above

### ❌ "ModuleNotFoundError: No module named 'alembic'"
- .venv not activated
- Run `.\.venv\Scripts\Activate.ps1`

### ❌ "could not connect to server"
- PostgreSQL is not running
- Start PostgreSQL service

---

## Next Steps After Setup

Once migrations are applied:

1. ✅ Start the backend: `uvicorn app.main:app --reload`
2. ✅ Connect frontend API calls to the backend
3. ✅ Implement real AI classification service
4. ✅ Add user authentication UI

---

## File Structure

```
VwaNou_AI/
├── .env                    # ← Created: Your local environment variables
├── .env.example           # ← Created: Template for others
├── .gitignore             # ← Updated: Excludes .env from git
├── backend/
│   ├── alembic/           # ← Created: Migration framework
│   │   ├── env.py         # ← Database connection config
│   │   ├── versions/      # ← Migration files
│   │   │   └── 001_initial.py  # ← Initial migration
│   │   └── script.py.mako # ← Migration template
│   ├── alembic.ini        # ← Created: Alembic configuration
│   ├── requirements.txt    # ← Already has: alembic
│   └── app/
└── ...
```

---

Let me know when Steps 1-5 are complete, and I'll help you with the next phase!
