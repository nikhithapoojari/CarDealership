"""Unit tests for password hashing and JWT helpers (TDD step 1)."""
from datetime import timedelta

import pytest

from app.core.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_the_plain_password(self):
        assert hash_password("s3cret!") != "s3cret!"

    def test_correct_password_verifies(self):
        hashed = hash_password("s3cret!")
        assert verify_password("s3cret!", hashed) is True

    def test_wrong_password_fails_verification(self):
        hashed = hash_password("s3cret!")
        assert verify_password("wrong", hashed) is False

    def test_same_password_produces_different_hashes(self):
        # bcrypt salts each hash
        assert hash_password("s3cret!") != hash_password("s3cret!")


class TestAccessToken:
    def test_round_trip_preserves_subject_and_role(self):
        token = create_access_token(subject="42", role="admin")
        claims = decode_access_token(token)
        assert claims["sub"] == "42"
        assert claims["role"] == "admin"

    def test_expired_token_is_rejected(self):
        token = create_access_token("42", "user", expires_delta=timedelta(seconds=-1))
        with pytest.raises(InvalidTokenError):
            decode_access_token(token)

    def test_tampered_token_is_rejected(self):
        token = create_access_token("42", "user")
        with pytest.raises(InvalidTokenError):
            decode_access_token(token[:-2] + "xx")

    def test_garbage_token_is_rejected(self):
        with pytest.raises(InvalidTokenError):
            decode_access_token("not-a-jwt")
