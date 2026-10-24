"""Shared fixtures: an isolated SQLite DB per test, a TestClient, and auth headers."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.user  # noqa: F401  (registers tables on Base)
import app.models.vehicle  # noqa: F401
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import User

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSession = sessionmaker(bind=engine, autoflush=False)


@pytest.fixture
def db_session():
    Base.metadata.create_all(engine)
    session = TestingSession()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def _make_user(db_session, email: str, role: str) -> User:
    user = User(email=email, password_hash=hash_password("password123"), role=role)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _headers_for(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers(db_session):
    return _headers_for(_make_user(db_session, "user@example.com", "user"))


@pytest.fixture
def admin_headers(db_session):
    return _headers_for(_make_user(db_session, "admin@example.com", "admin"))


@pytest.fixture
def session_factory(db_session):
    """Factory for extra sessions on the same test DB (simulates concurrent requests)."""
    return TestingSession
