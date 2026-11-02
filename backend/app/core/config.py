from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

from typing import Literal

class Settings(BaseSettings):
    db_host: str = "127.0.0.1"
    db_port: int = 5432
    db_name: str = "lifeos"
    db_user: str = "lifeos_app"
    db_password: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()