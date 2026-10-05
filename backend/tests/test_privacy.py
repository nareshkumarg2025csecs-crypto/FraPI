import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.config import settings

client = TestClient(app)

def test_no_keys_in_logs_or_responses(caplog):
    test_url = "https://example.com"
    response = client.post("/api/reputation/check", json={"urls": [test_url]})
    
    # Check response
    text = response.text.lower()
    assert "key=" not in text
    assert "x-apikey" not in text
    if settings.GSB_API_KEY:
        assert settings.GSB_API_KEY.lower() not in text
    if settings.VT_API_KEY:
        assert settings.VT_API_KEY.lower() not in text
        
    # Check logs
    for record in caplog.records:
        log_text = record.getMessage().lower()
        assert "key=" not in log_text
        assert "x-apikey" not in log_text
        if settings.GSB_API_KEY:
            assert settings.GSB_API_KEY.lower() not in log_text
        if settings.VT_API_KEY:
            assert settings.VT_API_KEY.lower() not in log_text
