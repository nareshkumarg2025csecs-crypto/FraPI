import time
import httpx
from urllib.parse import urlparse
from typing import List, Dict, Any
from app.core.config import settings
from app.services.cache import gsb_cache, vt_cache
from app.services.stats_service import stats

def extract_domain(url: str) -> str:
    try:
        return urlparse(url).hostname or ""
    except Exception:
        return ""

async def query_google_safe_browsing(urls: List[str], client: httpx.AsyncClient) -> Dict[str, dict]:
    results = {}
    
    # Check cache first
    uncached = []
    for u in urls:
        if u in gsb_cache:
            results[u] = gsb_cache[u]
            stats.inc_cache_hits()
        else:
            uncached.append(u)
            
    if not uncached:
        return results
        
    try:
        resp = await client.post(
            f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={settings.GSB_API_KEY}",
            json={
                "client": {"clientId": "frapi-sentinel", "clientVersion": "2.0"},
                "threatInfo": {
                    "threatTypes": ["SOCIAL_ENGINEERING", "MALWARE"],
                    "platformTypes": ["ANY_PLATFORM"],
                    "threatEntryTypes": ["URL"],
                    "threatEntries": [{"url": u} for u in uncached]
                }
            },
            timeout=3.0
        )
        if resp.status_code == 429:
            stats.inc_rate_limit_hits()
            stats.inc_upstream_failures()
            for u in uncached:
                results[u] = {"status": "rate_limited", "threatTypes": [], "cached": False}
        elif resp.status_code != 200:
            stats.inc_upstream_failures()
            for u in uncached:
                results[u] = {"status": "unavailable", "threatTypes": [], "cached": False}
        else:
            data = resp.json()
            threats = {}
            if "matches" in data:
                for match in data["matches"]:
                    u = match["threat"]["url"]
                    if u not in threats:
                        threats[u] = []
                    threats[u].append(match["threatType"])
            
            for u in uncached:
                item_res = {"status": "ok", "threatTypes": threats.get(u, []), "cached": False}
                results[u] = item_res
                gsb_cache[u] = {"status": "ok", "threatTypes": threats.get(u, []), "cached": True}
                
    except (httpx.TimeoutException, httpx.RequestError, Exception):
        stats.inc_upstream_failures()
        for u in uncached:
            results[u] = {"status": "unavailable", "threatTypes": [], "cached": False}
        
    return results

async def query_virustotal_domain(domain: str, client: httpx.AsyncClient) -> dict:
    if domain in vt_cache:
        stats.inc_cache_hits()
        return vt_cache[domain]
        
    try:
        resp = await client.get(
            f"https://www.virustotal.com/api/v3/domains/{domain}",
            headers={"x-apikey": settings.VT_API_KEY},
            timeout=3.0
        )
        if resp.status_code == 429:
            stats.inc_rate_limit_hits()
            stats.inc_upstream_failures()
            return {"status": "rate_limited", "malicious": 0, "suspicious": 0, "harmless": 0, "undetected": 0, "reputation": 0, "cached": False}
        elif resp.status_code != 200:
            stats.inc_upstream_failures()
            return {"status": "unavailable", "malicious": 0, "suspicious": 0, "harmless": 0, "undetected": 0, "reputation": 0, "cached": False}
            
        data = resp.json().get("data", {}).get("attributes", {})
        stats_data = data.get("last_analysis_stats", {})
        
        result = {
            "status": "ok",
            "malicious": stats_data.get("malicious", 0),
            "suspicious": stats_data.get("suspicious", 0),
            "harmless": stats_data.get("harmless", 0),
            "undetected": stats_data.get("undetected", 0),
            "reputation": data.get("reputation", 0),
            "cached": False
        }
        
        cached_result = result.copy()
        cached_result["cached"] = True
        vt_cache[domain] = cached_result
        return result
        
    except (httpx.TimeoutException, httpx.RequestError, Exception):
        stats.inc_upstream_failures()
        return {"status": "unavailable", "malicious": 0, "suspicious": 0, "harmless": 0, "undetected": 0, "reputation": 0, "cached": False}
