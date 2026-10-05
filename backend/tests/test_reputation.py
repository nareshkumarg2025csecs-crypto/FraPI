import re
import pytest
import respx
import httpx
from fastapi.testclient import TestClient

from main import app
from app.core.config import settings
from app.services.cache import clear_caches
from app.services.rate_limiter import vt_limiter

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_state():
    clear_caches()
    vt_limiter.reset()

def test_health_check():
    resp1 = client.get("/health")
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "ok"

    resp2 = client.get("/api/health")
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "ok"

@respx.mock
def test_reputation_success(respx_mock):
    test_url = "https://testsafebrowsing.appspot.com/s/phishing.html"
    test_domain = "testsafebrowsing.appspot.com"

    # Mock Google Safe Browsing
    gsb_route = respx_mock.post(re.compile(r"https://safebrowsing\.googleapis\.com/v4/threatMatches:find.*")).respond(
        status_code=200,
        json={
            "matches": [
                {
                    "threatType": "SOCIAL_ENGINEERING",
                    "platformType": "ANY_PLATFORM",
                    "threatEntryType": "URL",
                    "threat": {"url": test_url},
                }
            ]
        },
    )

    # Mock VirusTotal
    vt_route = respx_mock.get(f"https://www.virustotal.com/api/v3/domains/{test_domain}").respond(
        status_code=200,
        json={
            "data": {
                "attributes": {
                    "last_analysis_stats": {
                        "malicious": 4,
                        "suspicious": 1,
                        "harmless": 65,
                        "undetected": 10,
                    },
                    "reputation": -15,
                }
            }
        },
    )

    response = client.post("/api/reputation/check", json={"urls": [test_url]})
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 1

    item = data["results"][0]
    assert item["url"] == test_url
    assert item["domain"] == test_domain
    assert item["gsb"]["status"] == "ok"
    assert "SOCIAL_ENGINEERING" in item["gsb"]["threatTypes"]
    assert item["vt"]["status"] == "ok"
    assert item["vt"]["malicious"] == 4
    assert item["vt"]["suspicious"] == 1
    assert item["vt"]["reputation"] == -15
    assert item["cached"] is False

    assert gsb_route.called
    assert vt_route.called

@respx.mock
def test_reputation_timeout(respx_mock):
    test_url = "https://timeout-site.org/test"
    test_domain = "timeout-site.org"

    respx_mock.post(re.compile(r"https://safebrowsing\.googleapis\.com/v4/threatMatches:find.*")).mock(
        side_effect=httpx.TimeoutException("Connection timed out")
    )
    respx_mock.get(f"https://www.virustotal.com/api/v3/domains/{test_domain}").mock(
        side_effect=httpx.TimeoutException("Connection timed out")
    )

    response = client.post("/api/reputation/check", json={"urls": [test_url]})
    assert response.status_code == 200
    data = response.json()
    item = data["results"][0]
    assert item["gsb"]["status"] == "unavailable"
    assert item["vt"]["status"] == "unavailable"

@respx.mock
def test_reputation_upstream_429(respx_mock):
    test_url = "https://rate-limited-site.org/page"
    test_domain = "rate-limited-site.org"

    respx_mock.post(re.compile(r"https://safebrowsing\.googleapis\.com/v4/threatMatches:find.*")).respond(
        status_code=429,
        json={"error": "Too Many Requests"}
    )
    respx_mock.get(f"https://www.virustotal.com/api/v3/domains/{test_domain}").respond(
        status_code=429,
        json={"error": "Quota exceeded"}
    )

    response = client.post("/api/reputation/check", json={"urls": [test_url]})
    assert response.status_code == 200
    data = response.json()
    item = data["results"][0]
    assert item["gsb"]["status"] == "rate_limited"
    assert item["vt"]["status"] == "rate_limited"

def test_reputation_invalid_input():
    # Empty list -> 422
    resp1 = client.post("/api/reputation/check", json={"urls": []})
    assert resp1.status_code == 422

    # More than 5 URLs -> 422
    six_urls = [f"https://site{i}.com" for i in range(6)]
    resp2 = client.post("/api/reputation/check", json={"urls": six_urls})
    assert resp2.status_code == 422

    # Non-http URL -> 422
    resp3 = client.post("/api/reputation/check", json={"urls": ["ftp://invaliddomain.com"]})
    assert resp3.status_code == 422

    # URL > 2048 chars -> 422
    huge_url = "https://example.com/" + "a" * 2050
    resp4 = client.post("/api/reputation/check", json={"urls": [huge_url]})
    assert resp4.status_code == 422

@respx.mock
def test_reputation_cache_hit(respx_mock):
    test_url = "https://cached-domain.com/login"
    test_domain = "cached-domain.com"

    gsb_route = respx_mock.post(re.compile(r"https://safebrowsing\.googleapis\.com/v4/threatMatches:find.*")).respond(
        status_code=200,
        json={"matches": []}
    )
    vt_route = respx_mock.get(f"https://www.virustotal.com/api/v3/domains/{test_domain}").respond(
        status_code=200,
        json={"data": {"attributes": {"last_analysis_stats": {"malicious": 0, "suspicious": 0}, "reputation": 0}}}
    )

    # First request: uncached
    resp1 = client.post("/api/reputation/check", json={"urls": [test_url]})
    assert resp1.status_code == 200
    assert resp1.json()["results"][0]["cached"] is False
    assert gsb_route.call_count == 1
    assert vt_route.call_count == 1

    # Second request: cached
    resp2 = client.post("/api/reputation/check", json={"urls": [test_url]})
    assert resp2.status_code == 200
    assert resp2.json()["results"][0]["cached"] is True
    # Upstream routes were NOT called again
    assert gsb_route.call_count == 1
    assert vt_route.call_count == 1

@respx.mock
def test_keys_never_appear_in_response(respx_mock):
    test_url = "https://secure-test.com"
    test_domain = "secure-test.com"

    respx_mock.post(re.compile(r"https://safebrowsing\.googleapis\.com/v4/threatMatches:find.*")).respond(
        status_code=500,
        text="Internal Server Error: GSB Internal Details"
    )
    respx_mock.get(f"https://www.virustotal.com/api/v3/domains/{test_domain}").respond(
        status_code=500,
        text="Internal Server Error: VT Key Unauthorized"
    )

    response = client.post("/api/reputation/check", json={"urls": [test_url]})
    raw_text = response.text

    if settings.GSB_API_KEY:
        assert settings.GSB_API_KEY not in raw_text
    if settings.VT_API_KEY:
        assert settings.VT_API_KEY not in raw_text

    # Upstream internal error details should not be leaked
    assert "GSB Internal Details" not in raw_text
    assert "VT Key Unauthorized" not in raw_text

def test_ready_endpoint():
    resp = client.get("/api/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ready"] is True
    assert "gsb_configured" in data
    assert "vt_configured" in data
    # Ensure API keys themselves are never leaked in response
    if settings.GSB_API_KEY:
        assert settings.GSB_API_KEY not in resp.text
    if settings.VT_API_KEY:
        assert settings.VT_API_KEY not in resp.text

@respx.mock
def test_stats_endpoint(respx_mock):
    from app.services.stats_service import stats
    stats.reset()

    # Before checks
    s0 = client.get("/api/stats").json()
    assert s0["total_requests"] == 0
    assert s0["cache_hits"] == 0

    test_url = "https://stats-test.com/check"
    respx_mock.post(re.compile(r"https://safebrowsing\.googleapis\.com/v4/threatMatches:find.*")).respond(
        status_code=200, json={"matches": []}
    )
    respx_mock.get("https://www.virustotal.com/api/v3/domains/stats-test.com").respond(
        status_code=200, json={"data": {"attributes": {"last_analysis_stats": {}, "reputation": 0}}}
    )

    client.post("/api/reputation/check", json={"urls": [test_url]})
    s1 = client.get("/api/stats").json()
    assert s1["total_requests"] == 1
    assert s1["cache_hits"] == 0

    # Cached check
    client.post("/api/reputation/check", json={"urls": [test_url]})
    s2 = client.get("/api/stats").json()
    assert s2["total_requests"] == 2
    assert s2["cache_hits"] >= 1

