import threading
from typing import Dict, Any

class StatsTracker:
    def __init__(self):
        self._lock = threading.Lock()
        self.total_requests = 0
        self.cache_hits = 0
        self.upstream_failures = 0
        self.rate_limit_hits = 0

    def inc_requests(self, count: int = 1):
        with self._lock:
            self.total_requests += count

    def inc_cache_hits(self, count: int = 1):
        with self._lock:
            self.cache_hits += count

    def inc_upstream_failures(self, count: int = 1):
        with self._lock:
            self.upstream_failures += count

    def inc_rate_limit_hits(self, count: int = 1):
        with self._lock:
            self.rate_limit_hits += count

    def get_stats(self) -> Dict[str, int]:
        with self._lock:
            return {
                "requests": self.total_requests,
                "total_requests": self.total_requests,
                "cache_hits": self.cache_hits,
                "upstream_failures": self.upstream_failures,
                "rate_limit_hits": self.rate_limit_hits,
            }

    def reset(self):
        with self._lock:
            self.total_requests = 0
            self.cache_hits = 0
            self.upstream_failures = 0
            self.rate_limit_hits = 0

stats = StatsTracker()
