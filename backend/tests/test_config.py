from app.config import get_settings

def test_settings_load_defaults():
    """Test that settings load correctly with expected defaults."""
    settings = get_settings()
    assert settings.APP_NAME == "SafeMove API"
    assert settings.VERSION == "0.1.0"
    assert "postgresql" in settings.DATABASE_URL
    assert "mongodb" in settings.MONGODB_URL
    assert "redis" in settings.REDIS_URL
