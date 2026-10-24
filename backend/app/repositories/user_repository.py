from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """Persistence for users. Services depend on this interface, not on SQLAlchemy."""

    def __init__(self, db: Session):
        self._db = db

    def get_by_email(self, email: str) -> User | None:
        return self._db.scalar(select(User).where(User.email == email))

    def add(self, user: User) -> User:
        self._db.add(user)
        self._db.commit()
        self._db.refresh(user)
        return user
