from app.core.security import hash_password, verify_password


def test_password_hashing():
    password = "TestPassword123!"

    hashed_password = hash_password(password)

    assert hashed_password != password
    assert verify_password(password, hashed_password)


def test_incorrect_password_fails():
    password = "TestPassword123!"
    hashed_password = hash_password(password)

    assert not verify_password("WrongPassword123!", hashed_password)