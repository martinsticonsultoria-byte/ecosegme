<div align="center">

<img src="frontend/public/logo.png" alt="Logo" width="180"/>

# Noise Dosimetry Report System

**End-to-end platform for occupational noise dosimetry management**  
*From field data collection to legally compliant PDF report generation*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.133-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Tests](https://img.shields.io/badge/tests-20%20passing-22c55e?style=flat-square)](#tests)

</div>

---

## Overview

This system digitizes the occupational noise monitoring workflow for **an occupational health company** based in Brazil, replacing manual paperwork with a structured system that generates audit-ready reports in under 15 minutes.

The system parses raw dosimeter exports (SONUS 2), cross-references them with field data, and produces standardized PDF reports compliant with **NR-15** and **NHO-01** Brazilian regulations.

**Business impact:** ~80 reports/month, 2 user profiles (Field Technician and Administrative Staff).

---

## How It Works

```
Field Technician         Administrative Staff
      │                          │
      ▼                          ▼
 Fill field sheet       Upload SONUS 2 PDF
 (employee, EPI,               │
  conditions)                  ▼
      │               Parser extracts data
      │               (confidence scoring +
      │                name similarity)
      └──────────────────────┐
                             ▼
                    Data review & validation
                             │
                             ▼
                    Generate PDF report
                    (WeasyPrint + Jinja2,
                     SHA-256 hash, immutable)
                             │
                             ▼
                        Download ✓
```

---

## Tech Stack

**Backend**
- **FastAPI** — REST API with JWT authentication and role-based access control
- **SQLAlchemy + PostgreSQL** — relational data model with Alembic migrations
- **pdfplumber** — text extraction from SONUS 2 dosimeter exports
- **WeasyPrint + Jinja2** — HTML-to-PDF report generation
- **pypdf** — PDF protection and SHA-256 integrity verification

**Frontend**
- **React 18 + Vite** — single-page application
- **React Router** — client-side routing with protected routes
- **Axios** — HTTP client with automatic token injection

---

## Key Technical Decisions

### Parser with Confidence Scoring
The SONUS 2 PDF parser uses a multi-pattern approach with confidence scoring instead of a single rigid regex. Each field has fallback patterns, and the system raises an error only when fewer than 3/6 required fields are found — making it resilient to different firmware versions of the dosimeter.

```python
# Name matching uses difflib similarity, not exact match
# Handles typos, abbreviations and accent variations
def names_match(name_pdf: str, name_db: str, threshold: float = 0.85) -> bool:
    return name_similarity(name_pdf, name_db) >= threshold
```

### Immutable Reports
Once generated, reports cannot be overridden. Each PDF is SHA-256 hashed and stored with a standardized filename. The audit log records who generated each report and when.

### Role-Based Access
Two roles — `technician` and `admin_staff` — with route-level enforcement on both backend (FastAPI dependency injection) and frontend (protected routes + conditional navbar).

---

## Project Structure

```
ecosegme/
├── backend/
│   ├── app/
│   │   ├── routers/        # auth, companies, employees,
│   │   │                   # field_sheets, uploads, reports, users
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── core/           # JWT auth, security, dependencies
│   │   ├── templates/      # Jinja2 HTML report template
│   │   ├── parser.py       # SONUS 2 PDF parser
│   │   └── pdf_generator.py
│   ├── alembic/            # database migrations
│   └── tests/              # pytest (20 tests)
└── frontend/
    └── src/
        ├── pages/          # Login, Companies, Employees,
        │                   # FieldSheetForm, Conference,
        │                   # Reports, Users
        ├── components/     # Navbar, PrivateRoute
        ├── context/        # AuthContext
        └── api/            # axios instance
```

---

## Tests

```bash
cd backend
pytest tests/ -v
```

```
tests/test_auth.py         5 passed
tests/test_users.py        6 passed
tests/test_companies.py    3 passed
tests/test_parser.py       6 passed

20 passed in 3.24s
```

---

## Running Locally

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # fill in your values
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key |
| `VITE_API_URL` | Backend URL (frontend build) |

---

## Author

**Guilherme Lizardo**  
Data Analyst & Backend Developer  
[linkedin.com/in/glizardx](https://linkedin.com/in/glizardx) · glizardo171@gmail.com
