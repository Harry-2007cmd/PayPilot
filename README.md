# PayPilot AI — The Payment Detective

AI-powered payment investigation and safe-resolution application for merchants. Combines PayPal Sandbox payments with controlled AI investigation, deterministic checks, and human-approved actions.

## Features

- **PayPal Sandbox Integration**: Full checkout, capture, and refund flow
- **Deterministic Investigation Engine**: Rule-based checks for payment inconsistencies
- **AI Investigation Agent**: LangGraph-based agent with 8 registered backend tools
- **Human-in-the-loop Actions**: Proposed actions require explicit approval before execution
- **Audit Trail**: Complete audit logging of all actions and decisions
- **CSV Import**: Import and reconcile external payment records
- **Merchant-scoped Authorization**: Multi-tenant data isolation

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic
- **Database**: PostgreSQL (production), SQLite (development)
- **AI**: Google Gemini API with LangGraph orchestration
- **Payments**: PayPal Developer Sandbox (Orders API, Payments API)

## Prerequisites

- Python 3.11+
- Node.js 18+
- PayPal Developer Sandbox accounts (buyer + business)
- Google Gemini API key

## Quick Start

### 1. Clone and Configure

```bash
git clone <repo-url>
cd PayPilot
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials:
# - PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
# - GEMINI_API_KEY
# - APP_SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_hex(32))")

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed demo data
python seed_demo.py

# Start server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

**Demo Login**: `demo@paypilot.ai` / `demo123`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `APP_SECRET_KEY` | JWT signing key (32+ chars) | Yes |
| `DATABASE_URL` | Database connection string | Yes |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox Client ID | Yes |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox Client Secret | Yes |
| `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com` | Yes |
| `GEMINI_API_KEY` | Google Gemini API Key | Yes |
| `GEMINI_MODEL` | Model name (default: `gemini-2.5-flash`) | No |
| `FRONTEND_ORIGIN` | CORS origin (default: `http://localhost:5173`) | No |

## PayPal Sandbox Setup

1. Create a [PayPal Developer Account](https://developer.paypal.com/)
2. Create Sandbox Business and Personal (Buyer) accounts
3. Create a REST App to get Client ID and Secret
4. Note: Webhook event notifications are not consumed in this MVP; payment status is refreshed on demand via the PayPal API. Set `PAYPAL_WEBHOOK_ID` only if needed for downstream integrations.

## Demo Workflow

1. **Login** with demo credentials
2. **Create Order** via Overview or Payments page
3. **Checkout** with PayPal Sandbox buyer account
4. **Investigate** any mismatch via Investigations → New
5. **AI Copilot** asks questions and invokes backend tools
6. **Review** proposed action in Approvals
7. **Approve/Reject** — only human approval executes refunds

## Project Structure

```
PayPilot/
├── backend/
│   ├── app/
│   │   ├── api/          # 8 API routers
│   │   ├── core/         # Config, DB, Security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # PayPal, AI, Rules, Audit
│   │   └── tools/        # AI agent tools (8 tools)
│   ├── alembic/          # Migrations
│   └── tests/            # 11 passing tests
├── frontend/
│   ├── src/
│   │   ├── pages/        # 10 React pages
│   │   ├── components/   # Shared components
│   │   ├── services/     # API client
│   │   └── context/      # Auth context
│   └── dist/             # Production build
└── PayPilot_AI_Documentation_Packet/  # Full specs
```

## Testing

```bash
# Backend
cd backend
python -m pytest -v

# Frontend
cd frontend
npm run build
npm run lint
```

## Deployment

### Render (Backend + Frontend)

1. Create PostgreSQL database on Supabase or Render
2. Set environment variables in Render dashboard
3. Build command: `pip install -r requirements.txt && alembic upgrade head`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Supabase (Database)

1. Create project
2. Get connection string
3. Set as `DATABASE_URL` in backend `.env`

## Security Notes

- Never commit `.env` files (enforced by `.gitignore`)
- All financial actions require explicit human approval
- PayPal secrets and AI keys are server-side only
- JWT tokens with 30-min access / 7-day refresh

## Known Limitations

- AG Grid AG Studio integration pending sponsor access verification (fallback tables used)
- PayPal webhook event notifications are not consumed in this MVP; status must be refreshed on demand via the PayPal API
- Refund testing requires live PayPal Sandbox credentials
- Free hosting tiers may have cold-start delays

## Hackathon Submission

- Demo video: <3 minutes showing end-to-end flow
- Public repo with source, setup instructions, and MIT license
- No secrets or real transaction data in repo

## License

MIT License — see [LICENSE](LICENSE)