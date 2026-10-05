import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GSB_API_KEY: str = os.getenv("GSB_API_KEY", "")
    VT_API_KEY: str = os.getenv("VT_API_KEY", "")
    ALLOWED_ORIGIN: str = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")
    VT_MAX_PER_MINUTE: int = int(os.getenv("VT_MAX_PER_MINUTE", "4"))
    VT_MAX_PER_DAY: int = int(os.getenv("VT_MAX_PER_DAY", "500"))

settings = Settings()
