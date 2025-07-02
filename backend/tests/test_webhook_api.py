import pytest
import json
from httpx import *
from unittest.mock import patch, AsyncMock

class TestWebhookSessions:
    def test_create_webhook_session(self, test_client, fake_redis):
        """Test webhook session creation."""
        response = test_client.post("/webhooks")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "session_id" in data
        assert "webhook_url" in data

    @pytest.mark.asyncio
    async def test_capture_webhook_post(self, fake_redis):
        """Test capturing POST webhook."""
        from backend import app
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # First create a session
            response = await client.post("/webhooks")
            session_id = response.json()["session_id"]
            
            # Send webhook request
            test_payload = {"test": "data", "user_id": 123}
            webhook_response = await client.post(
                f"/hooks/{session_id}",
                json=test_payload,
                headers={"X-Custom-Header": "test-value"}
            )
            
            assert webhook_response.status_code == 200
            assert "request_id" in webhook_response.json()

    @pytest.mark.asyncio
    async def test_capture_different_methods(self, fake_redis):
        """Test capturing different HTTP methods."""
        from backend import app
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/webhooks")
            session_id = response.json()["session_id"]
            
            methods = ["GET", "PUT", "DELETE", "PATCH"]
            for method in methods:
                response = await client.request(
                    method, f"/hooks/{session_id}", json={"method": method}
                )
                assert response.status_code == 200

class TestRequestRetrieval:
    @pytest.mark.asyncio
    async def test_get_session_requests(self, fake_redis):
        """Test retrieving captured requests for a session."""
        from backend import app
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Create session and capture some requests
            response = await client.post("/webhooks")
            session_id = response.json()["session_id"]
            
            # Capture a few requests
            for i in range(3):
                await client.post(f"/hooks/{session_id}", json={"request": i})
            
            # Note: You need to implement this GET endpoint in backend.py
            get_response = await client.get(f"/webhooks/{session_id}")
            assert get_response.status_code == 200