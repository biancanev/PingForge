import pytest
import asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
import fakeredis
from unittest.mock import patch

from backend import app, redis_client

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def fake_redis():
    """Mock Redis with in-memory fakeredis."""
    fake_redis_client = fakeredis.FakeRedis()
    with patch('backend.redis_client', fake_redis_client):
        yield fake_redis_client

@pytest.fixture
def test_client():
    """Sync test client for simple tests."""
    return TestClient(app)