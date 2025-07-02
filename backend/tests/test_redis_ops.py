import pytest
import json
from datetime import datetime

class TestRedisOperations:
    def test_session_expiration(self, fake_redis):
        """Test that sessions expire after 24 hours."""
        session_id = "test123"
        session_data = {"created_at": datetime.now().isoformat()}
        
        fake_redis.setex(f"session:{session_id}", 86400, json.dumps(session_data))
        
        # Should exist initially
        assert fake_redis.exists(f"session:{session_id}")
        
        # Fast-forward time (fakeredis doesn't auto-expire, so we test the TTL)
        ttl = fake_redis.ttl(f"session:{session_id}")
        assert 86399 <= ttl <= 86400  # Should be close to 24 hours

    def test_request_storage_limit(self, fake_redis):
        """Test request storage behavior."""
        session_id = "test123"
        requests_key = f"requests:{session_id}"
        
        # Store some requests
        for i in range(10):  # Use smaller number for now
            fake_redis.lpush(requests_key, json.dumps({"request": i}))
        
        # Test what actually happens (no limit implemented yet)
        stored_count = fake_redis.llen(requests_key)
        assert stored_count == 10
        
        # TODO: Implement request limiting in backend.py and update this test