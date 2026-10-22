from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://ecosegme-se6m.vercel.app"
    DEBUG: bool = False
    # Teto MANUAL opcional de fichas por PDF. Normalmente fica vazio: o teto é
    # calculado pela memória do servidor (app/core/capacity.py). Se definido,
    # vale o MENOR entre o manual e o automático.
    MAX_PDF_SHEETS: Optional[int] = None

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
