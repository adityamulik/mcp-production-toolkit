"""Tests for Team B (DevOps) MCP Server tools."""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from server_team_b import deploy_application, restart_service, update_configuration


class TestDeployApplication:
    def test_returns_correct_url_format(self):
        result = deploy_application("api", "1.0.0")
        assert result["url"] == "https://api-staging.company.com"

    def test_custom_environment(self):
        result = deploy_application("api", "2.0.0", environment="production")
        assert result["environment"] == "production"
        assert result["url"] == "https://api-production.company.com"

    def test_default_environment_staging(self):
        result = deploy_application("web", "1.0.0")
        assert result["environment"] == "staging"

    def test_status_deployed(self):
        result = deploy_application("auth", "3.0.0")
        assert result["status"] == "deployed"

    def test_service_and_version(self):
        result = deploy_application("payments", "4.5.1")
        assert result["service"] == "payments"
        assert result["version"] == "4.5.1"

    def test_includes_timestamp(self):
        result = deploy_application("api", "1.0.0")
        assert "timestamp" in result

    def test_includes_team(self):
        result = deploy_application("api", "1.0.0")
        assert result["team"] == "B"


class TestRestartService:
    def test_status_restarted(self):
        result = restart_service("api")
        assert result["status"] == "restarted"

    def test_uptime_reset(self):
        result = restart_service("web")
        assert result["uptime"] == "0s"

    def test_service_name(self):
        result = restart_service("database")
        assert result["service"] == "database"

    def test_includes_timestamp(self):
        result = restart_service("api")
        assert "timestamp" in result

    def test_includes_team(self):
        result = restart_service("api")
        assert result["team"] == "B"


class TestUpdateConfiguration:
    def test_returns_config_dict(self):
        result = update_configuration("api", "max_connections", "100")
        assert result["config"] == {"max_connections": "100"}

    def test_status_updated(self):
        result = update_configuration("web", "timeout", "30")
        assert result["status"] == "updated"

    def test_service_name(self):
        result = update_configuration("auth", "secret_key", "abc123")
        assert result["service"] == "auth"

    def test_includes_timestamp(self):
        result = update_configuration("api", "k", "v")
        assert "timestamp" in result

    def test_includes_team(self):
        result = update_configuration("api", "k", "v")
        assert result["team"] == "B"

    def test_different_config_keys(self):
        result = update_configuration("svc", "log_level", "DEBUG")
        assert result["config"] == {"log_level": "DEBUG"}
