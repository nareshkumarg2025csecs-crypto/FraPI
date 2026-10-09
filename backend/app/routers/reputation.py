import asyncio
import httpx
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.services.stats_service import stats
from app.services.reputation_service import (
    extract_domain,
    query_google_safe_browsing,
    query_virustotal_domain,
)

router = APIRouter(tags=["reputation"])
limiter = Limiter(key_func=get_remote_address)

class ReputationCheckRequest(BaseModel):
    urls: List[str]

class GsbResult(BaseModel):
    status: str
    threatTypes: List[str]

class VtResult(BaseModel):
    status: str
    malicious: int
    suspicious: int
    harmless: int
    undetected: int
    reputation: int

class SingleUrlReputation(BaseModel):
    url: str
    domain: str
    gsb: GsbResult
    vt: VtResult
    cached: bool

class ReputationCheckResponse(BaseModel):
    results: List[SingleUrlReputation]

@router.get("/api/ready")
@router.get("/ready")
def check_ready():
    """Checks that upstream API keys are configured without ever revealing their values."""
    gsb_ok = bool(settings.GSB_API_KEY and len(settings.GSB_API_KEY.strip()) > 0)
    vt_ok = bool(settings.VT_API_KEY and len(settings.VT_API_KEY.strip()) > 0)
    return {
        "ready": True,
        "gsb_configured": gsb_ok,
        "vt_configured": vt_ok,
    }

@router.get("/api/stats")
@router.get("/stats")
def get_stats():
    """Returns only aggregate totals with zero user/URL identifiers."""
    return stats.get_stats()

@router.post("/api/reputation/check", response_model=ReputationCheckResponse)
@limiter.limit("20/minute")
async def check_reputation(request: Request, body: ReputationCheckRequest):
    stats.inc_requests()
    from app.services.cache import clear_caches
    clear_caches()
    urls = body.urls

    # Validation: 1-5 items, each http(s), <= 2048 chars; otherwise 422
    if not urls or len(urls) < 1 or len(urls) > 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request must contain between 1 and 5 URLs."
        )

    for u in urls:
        if not isinstance(u, str) or len(u) > 2048:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Each URL must be at most 2048 characters."
            )
        lower_u = u.strip().lower()
        if not (lower_u.startswith("http://") or lower_u.startswith("https://")):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Each URL must begin with http:// or https://."
            )

    # Unique domains
    url_to_domain = {u: extract_domain(u) for u in urls}
    unique_domains = list(set(url_to_domain.values()))

    async with httpx.AsyncClient() as client:
        # Query GSB for all URLs and VT for all unique domains concurrently
        gsb_task = query_google_safe_browsing(urls, client)
        vt_tasks = [query_virustotal_domain(d, client) for d in unique_domains]

        gather_res = await asyncio.gather(gsb_task, *vt_tasks, return_exceptions=True)
        gsb_results = gather_res[0] if not isinstance(gather_res[0], Exception) else {}
        vt_results_list = gather_res[1:]

        domain_to_vt = {}
        for d, vt_res in zip(unique_domains, vt_results_list):
            if isinstance(vt_res, dict):
                domain_to_vt[d] = vt_res
            else:
                domain_to_vt[d] = {
                    "status": "unavailable",
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 0,
                    "undetected": 0,
                    "reputation": 0,
                    "cached": False,
                }

    final_results = []
    gsb_statuses = []
    vt_statuses = []
    for u in urls:
        d = url_to_domain[u]
        gsb_data = gsb_results.get(u, {"status": "unavailable", "threatTypes": [], "cached": False})
        vt_data = domain_to_vt.get(d, {
            "status": "unavailable",
            "malicious": 0,
            "suspicious": 0,
            "harmless": 0,
            "undetected": 0,
            "reputation": 0,
            "cached": False,
        })

        gsb_statuses.append(gsb_data.get("status", "unavailable"))
        vt_statuses.append(vt_data.get("status", "unavailable"))

        is_cached = gsb_data.get("cached", False) and vt_data.get("cached", False)

        final_results.append(SingleUrlReputation(
            url=u,
            domain=d,
            gsb=GsbResult(
                status=gsb_data.get("status", "unavailable"),
                threatTypes=gsb_data.get("threatTypes", []),
            ),
            vt=VtResult(
                status=vt_data.get("status", "unavailable"),
                malicious=vt_data.get("malicious", 0),
                suspicious=vt_data.get("suspicious", 0),
                harmless=vt_data.get("harmless", 0),
                undetected=vt_data.get("undetected", 0),
                reputation=vt_data.get("reputation", 0),
            ),
            cached=is_cached,
        ))

    # Set upstream status in request state for structured logging (sanitized, no URLs/keys)
    request.state.upstream_status = {
        "gsb": list(set(gsb_statuses)),
        "vt": list(set(vt_statuses)),
    }

    return ReputationCheckResponse(results=final_results)
