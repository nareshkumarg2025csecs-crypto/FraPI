import time
from app.core.config import settings

class VirusTotalRateLimiter:
    def __init__(self):
        self.minute_window = []
        self.day_window = []

    def can_request(self) -> bool:
        now = time.time()
        # Clean timestamps older than 60s
        self.minute_window = [t for t in self.minute_window if now - t < 60]
        # Clean timestamps older than 86400s (24h)
        self.day_window = [t for t in self.day_window if now - t < 86400]

        if len(self.minute_window) >= settings.VT_MAX_PER_MINUTE:
            return False
        if len(self.day_window) >= settings.VT_MAX_PER_DAY:
            return False
        return True

    def record_request(self):
        now = time.time()
        self.minute_window.append(now)
        self.day_window.append(now)

    def reset(self):
        self.minute_window.clear()
        self.day_window.clear()

vt_limiter = VirusTotalRateLimiter()
