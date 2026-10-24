# Lotline: Car Dealership Inventory System

A full-stack TDD kata: FastAPI + PostgreSQL backend, React + Tailwind frontend.

## What it does
- Register and log in (JWT). Everyone registers as a regular user; admins are seeded.
- Browse, search, and filter the lot (make, model, category, price range).
- Purchase a vehicle (one unit). The Purchase button is disabled when stock is zero.
- Admins get a **Manage inventory** page to add, edit, restock, and delete vehicles.

## Run it locally

**Backend + database (Docker)**
```bash
cp .env.example .env            # then edit SECRET_KEY
docker compose up --build       # API on http://localhost:8000 (docs at /docs)
docker compose exec backend python -m app.scripts.seed \
  --admin-email admin@example.com --admin-password 'change-me-please' --demo
```

**Backend without Docker**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/dealership
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173 (proxies /api to :8000)
```

## Tests
```bash
cd backend && pytest            # prints a coverage table
cd frontend && npm test         # or: npm run coverage
```
Paste the final output of both runs under "Test report" below.

## API summary
| Method | Path | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| POST | /api/vehicles | logged in |
| GET | /api/vehicles, /api/vehicles/search | logged in |
| PUT | /api/vehicles/:id | logged in (partial update) |
| DELETE | /api/vehicles/:id | admin |
| POST | /api/vehicles/:id/purchase | logged in |
| POST | /api/vehicles/:id/restock | admin |

## Design decisions
- Layers: router → service → repository, so business rules are unit-tested with fake repositories.
- Purchases use one guarded `UPDATE ... WHERE quantity > 0`, so two buyers can't oversell the last unit. A database check constraint also forbids negative stock.
- Admin role is read from the database on each request, not trusted from the token.
- Login errors are identical for unknown email and wrong password.

## Screenshots
_TODO: add screenshots of login, dashboard, search, and the Manage inventory page._

## Test report
_TODO: paste `pytest` and `npm test` output here._

## My AI Usage
_TODO: write this as you go._
- **Tools used:**
- **How I used them:**
- **Reflection on how AI changed my workflow:**
