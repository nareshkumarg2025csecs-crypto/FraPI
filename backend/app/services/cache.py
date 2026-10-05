from cachetools import TTLCache

# GSB: 5 min TTL (300 seconds), max 1000 entries
gsb_cache = TTLCache(maxsize=1000, ttl=300)

# VirusTotal: 1 hour TTL (3600 seconds), max 1000 entries
vt_cache = TTLCache(maxsize=1000, ttl=3600)

def clear_caches():
    gsb_cache.clear()
    vt_cache.clear()
