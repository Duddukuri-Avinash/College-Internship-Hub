from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "InternHub"
    app_env: str = "development"
    app_debug: bool = True
    database_url: str = "mssql+pyodbc://username:password@localhost:1433/internhub?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
    jwt_secret_key: str = "change-this-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    max_upload_size_mb: int = 5
    allowed_upload_types: str = ".pdf,.doc,.docx,.png,.jpg,.jpeg"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    github_client_id: str | None = None
    github_client_secret: str | None = None
    github_oauth_redirect_uri: str = "http://localhost:8000/students/github/oauth/callback"
    github_api_token: str | None = None
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "uploads"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)


settings = Settings()
