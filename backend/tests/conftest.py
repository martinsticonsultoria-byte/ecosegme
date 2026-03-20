import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.core.security import hash_password

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    admin = User(name="Admin Teste", email="admin@test.com", password_hash=hash_password("senha123"), role="admin_staff", active=True)
    tech = User(name="Tecnico Teste", email="tech@test.com", password_hash=hash_password("senha123"), role="technician", active=True)
    db.add_all([admin, tech])
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def client():
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


@pytest.fixture(scope="session")
def admin_token(client):
    res = client.post("/auth/login", data={"username": "admin@test.com", "password": "senha123"})
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def tech_token(client):
    res = client.post("/auth/login", data={"username": "tech@test.com", "password": "senha123"})
    return res.json()["access_token"]
