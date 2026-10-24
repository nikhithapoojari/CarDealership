"""Application settings, read from environment variables."""
import os
from dataclasses import dataclass


def _csv(name: str, default: str) -> tuple[str, ...]:
    return tuple(p.strip() for p in os.getenv(name, default).split(",") if p.strip())


@dataclass(frozen=True)
class Settings:
    secret_key: str = os.getenv("SECRET_KEY", "dev-only-change-me")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/dealership"
    )
    cors_origins: tuple[str, ...] = _csv("CORS_ORIGINS", "http://localhost:5173")


settings = Settings()
