from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.routers.reputation import router as reputation_router, limiter
from app.security import SecurityMiddleware

app = FastAPI(
    title="FraPI Sentinel 2.0 Backend",
    description="Privacy-preserving reputation proxy. Receives ONLY domain/URL strings, never personal data or message text.",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS strictly for ALLOWED_ORIGIN
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.ALLOWED_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(SecurityMiddleware)

app.include_router(reputation_router)

@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FraPI Sentinel Reputation Proxy"}
