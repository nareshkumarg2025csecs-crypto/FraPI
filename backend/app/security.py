import json
import logging
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("frapi")
logger.setLevel(logging.INFO)

class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        req_id = str(uuid.uuid4())
        request.state.request_id = req_id

        # Payload size limit strictly 4KB
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 4096:
            duration = time.time() - start
            log_entry = {
                "level": "WARN",
                "request_id": req_id,
                "route": request.url.path,
                "status": 413,
                "duration": round(duration, 4),
                "upstream_status": None,
            }
            logger.info(json.dumps(log_entry))
            return JSONResponse(status_code=413, content={"detail": "Payload too large"})

        response = await call_next(request)
        duration = time.time() - start

        upstream_status = getattr(request.state, "upstream_status", None)
        level = "INFO" if response.status_code < 400 else "WARN" if response.status_code < 500 else "ERROR"

        # Structured JSON log with NO body, NO URLs, NO query params, NO API keys
        log_entry = {
            "level": level,
            "request_id": req_id,
            "route": request.url.path,
            "status": response.status_code,
            "duration": round(duration, 4),
            "upstream_status": upstream_status,
        }
        logger.info(json.dumps(log_entry))

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        return response
