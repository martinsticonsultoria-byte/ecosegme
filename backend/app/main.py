from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, companies, employees, field_sheets, uploads, reports, setup, users

app = FastAPI(title="EcoSegme API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(employees.router)
app.include_router(field_sheets.router)
app.include_router(uploads.router)
app.include_router(reports.router)
app.include_router(setup.router)
app.include_router(users.router)

@app.get("/health")
def health():
    return {"status": "ok"}
