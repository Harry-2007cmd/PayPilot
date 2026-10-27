# PayPilot AI — Session Status Log
**Date:** 2026-10-26
**Mode:** Ponytail Ultra

---

## ✅ Completed This Session

### 1. Frontend TypeScript Cleanup
- Fixed duplicate `outcome_json` field in `src/types/index.ts` (ProposedAction interface)
- Added missing `MeResponse` interface to `src/types/index.ts`
- Removed unused imports across all pages: `React`, `Filter`, `Search`, `ExternalLink`, `investigationsApi`, `CardHeader`, `CardTitle`, `StatusBadge`
- Replaced `invApi` with `investigationsApi` in Overview.tsx
- Added explicit `any` types to arrow function callbacks in Overview.tsx to fix implicit-any errors
- Removed unused `navigate` from Approvals.tsx, `setPageSize` from Investigations.tsx/Payments.tsx/Imports.tsx/Audit.tsx
- **Result:** `npx tsc --noEmit` passes with zero errors

### 2. Frontend Build
- Fixed Tailwind CSS `border-border` error in `src/index.css` — replaced `@apply border-border` with explicit `border-color: hsl(var(--border))`
- **Result:** `npm run build` succeeds — 1941 modules transformed, 331KB JS bundle, 30KB CSS

### 3. Backend Security Fix
- Replaced `passlib`/`bcrypt` (broken on bcrypt 5.0.0 — `__about__` attribute missing, 72-byte password limit) with direct `bcrypt` library calls
- Updated `app/core/security.py`: `verify_password()` and `get_password_hash()` now use `bcrypt.checkpw()`/`bcrypt.hashpw()` directly
- **Result:** Password hashing works correctly

### 4. Demo Seed Data
- Created `backend/seed_demo.py` — idempotent seed script
- Seeds: merchant "Demo Store", user `demo@paypilot.ai`/`demo123` (admin), order `ORD-DEMO-1001` ($100), payment attempt `CAP-99120` ($90 — intentional mismatch), investigation + finding
- **Result:** Seed runs successfully, creates all demo records

### 5. End-to-End Verification
- Backend server running on port 8001 (port 8000 held by stale process)
- `GET /api/health` → `{"status":"ok","service":"PayPilot AI","version":"0.1.0"}`
- `POST /api/auth/login` with demo credentials → returns valid JWT access/refresh tokens
- Frontend dev server running on port 5173, proxy to `/api` works
- `GET /api/health` via frontend proxy → returns OK

---

## ⚠️ Known Issues / Blockers

1. **Port 8000 conflict:** A stale process (PID 17252) holds port 8000. Backend currently runs on 8001. Need to kill PID 17252 or change backend port.
2. **Frontend proxy points to port 8000** in `vite.config.ts` — needs updating to 8001 or fix the port conflict.
3. **Pydantic deprecation warnings:** Class-based `config` in schemas (non-blocking, just warnings).
4. **Only 2 backend tests exist** (`test_auth.py`) — test coverage is minimal.

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `backend/seed_demo.py` | Demo data seeding script |
| `backend/app/core/security.py` | JWT + bcrypt password handling |
| `backend/app/main.py` | FastAPI app entry point |
| `backend/app/api/*.py` | 8 API routers |
| `backend/app/services/*.py` | PayPal adapter, rules engine, AI agent, audit |
| `backend/app/tools/*.py` | 8 registered AI tools |
| `frontend/src/pages/*.tsx` | 8 UI pages |
| `frontend/src/types/index.ts` | TypeScript interfaces |
| `frontend/src/index.css` | Tailwind CSS base styles |

---

## 🚀 How to Run

```bash
# Backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
python seed_demo.py   # idempotent

# Frontend
cd frontend
npm run dev
# Login: demo@paypilot.ai / demo123
```

---

## 🔍 Review Findings (ponytail-review, 2026-10-26)

Reviewed the uncommitted diff: `app/core/security.py` (passlib → bcrypt swap), plus the session's seed + status work.

### Must fix

1. **Secrets and a live database are committed to git** — `paypilot.db`, `.env`, 41 tracked `.pyc` files. No `.gitignore` exists. Cloning this repo ships a working SQLite DB with the demo user's password hash and the JWT secret. Fix: create `.gitignore` (`__pycache__/`, `*.pyc`, `paypilot.db`, `.env`), then `git rm --cached` the tracked files. Move `APP_SECRET_KEY` to `.env.example` only.

2. **The bcrypt swap has no test** — `tests/test_auth.py` only tests a wrong password for a non-existent email, so login short-circuits at `if not user` and `verify_password` is never called. Add one test: create a user with `get_password_hash("demo123")`, POST `/api/auth/login` with the correct password, assert 200 + token.

### Should fix

3. **Passwords over 72 bytes crash login with a 500** — `bcrypt.hashpw`/`checkpw` raise `ValueError: password cannot be longer than 72 bytes`. Old passlib silently truncated. Fix: truncate in `get_password_hash` (`password.encode("utf-8")[:72]`) with a `shortcut:` comment.

4. **Dead dependency** — `requirements.txt:L10` still lists `passlib[bcrypt]` but nothing imports it. Replace with `bcrypt>=5.0.0`.

### Nice to have

5. **Demo password duplicated** — plaintext "demo123" lives in `seed_demo.py:L37` and `frontend/src/pages/Login.tsx:L9-10`. Two places to update if it changes.

### Verdict
Fix 1 and 2 first. Lean: -4 lines possible.