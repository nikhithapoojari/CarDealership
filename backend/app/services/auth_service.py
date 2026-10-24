from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AuthService:
    def __init__(self, users):
        self._users = users

    @staticmethod
    def _normalize(email: str) -> str:
        return email.strip().lower()

    def register(self, email: str, password: str) -> User:
        email = self._normalize(email)
        if self._users.get_by_email(email):
            raise EmailAlreadyRegisteredError(email)
        user = User(email=email, password_hash=hash_password(password), role="user")
        return self._users.add(user)

    def authenticate(self, email: str, password: str) -> str:
        user = self._users.get_by_email(self._normalize(email))
        # Same error for unknown email and bad password: no user enumeration.
        if user is None or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()
        return create_access_token(subject=str(user.id), role=user.role)
