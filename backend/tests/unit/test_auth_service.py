"""Unit tests for AuthService using an in-memory fake repository (TDD step 2a)."""
import pytest

from app.core.security import verify_password
from app.services.auth_service import (
    AuthService,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
)


class FakeUserRepository:
    def __init__(self):
        self.users = {}

    def get_by_email(self, email):
        return self.users.get(email)

    def add(self, user):
        user.id = len(self.users) + 1
        self.users[user.email] = user
        return user


@pytest.fixture
def service():
    return AuthService(FakeUserRepository())


def test_register_hashes_password_and_defaults_to_user_role(service):
    user = service.register("a@b.com", "password123")
    assert user.role == "user"
    assert user.password_hash != "password123"
    assert verify_password("password123", user.password_hash)


def test_register_normalizes_email_to_lowercase(service):
    assert service.register("A@B.com", "password123").email == "a@b.com"


def test_register_duplicate_email_raises(service):
    service.register("a@b.com", "password123")
    with pytest.raises(EmailAlreadyRegisteredError):
        service.register("A@B.com", "password123")


def test_authenticate_returns_token_for_valid_credentials(service):
    service.register("a@b.com", "password123")
    assert isinstance(service.authenticate("a@b.com", "password123"), str)


def test_authenticate_wrong_password_raises(service):
    service.register("a@b.com", "password123")
    with pytest.raises(InvalidCredentialsError):
        service.authenticate("a@b.com", "nope-nope")


def test_authenticate_unknown_email_raises(service):
    with pytest.raises(InvalidCredentialsError):
        service.authenticate("ghost@b.com", "password123")
