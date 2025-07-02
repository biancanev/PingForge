import pytest
import json
import asyncio
import httpx
from fastapi.testclient import TestClient
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

class TestWebSocketConnections:
    def test_websocket_connection(self, test_client, fake_redis):
        """Test WebSocket connection establishment."""
        response = test_client.post("/webhooks")
        session_id = response.json()["session_id"]
        
        with test_client.websocket_connect(f"/ws/{session_id}") as websocket:
            assert websocket
            websocket.send_text("ping")

    @pytest.mark.asyncio
    async def test_webhook_websocket_notification(self, fake_redis):
        """Test that webhook captures notify WebSocket clients."""
        from backend import app
        
        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/webhooks")
            session_id = response.json()["session_id"]
            
            with patch('backend.notify_websocket_clients') as mock_notify:
                mock_notify.return_value = AsyncMock()
                
                await client.post(f"/hooks/{session_id}", json={"test": "data"})
                
                mock_notify.assert_called_once()