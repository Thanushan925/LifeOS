from app.core.tokens import create_access_token, decode_access_token


def test_access_token_creation():
    user_id = "12345678-1234-5678-1234-567812345678"

    token = create_access_token(user_id)
    payload = decode_access_token(token)

    assert payload["sub"] == user_id
    assert "exp" in payload


def test_invalid_token_is_rejected():
    import jwt
    import pytest

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token("this.is.not.a.valid.token")