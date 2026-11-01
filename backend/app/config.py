from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    gemini_api_key: str = ""
    groq_api_key: str = ""

    openai_model: str = "gpt-4o"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2-vision"
    gemini_model: str = "gemini-2.5-flash"
    groq_vision_model: str = "qwen/qwen3.8-27b"
    groq_text_model: str = "qwen/qwen3.8-27b"
    groq_force_ocr: bool = False

    max_upload_mb: int = 8
    request_timeout: float = 90
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
