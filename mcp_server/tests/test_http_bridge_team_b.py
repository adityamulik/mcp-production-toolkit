"""Tests for Team B HTTP Bridge (Flask app)."""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

import json
import pytest
from http_bridge_team_b import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_has_correct_fields(self, client):
        data = client.get("/health").get_json()
        assert data["status"] == "ok"
        assert data["team"] == "B"
        assert "tools" in data
        assert "service" in data

    def test_health_lists_tools(self, client):
        data = client.get("/health").get_json()
        assert "deploy_application" in data["tools"]
        assert "restart_service" in data["tools"]
        assert "update_configuration" in data["tools"]


class TestToolsEndpoint:
    def test_deploy_application_valid(self, client):
        resp = client.post(
            "/tools/deploy_application",
            json={"arguments": {"service": "api", "version": "1.0.0"}},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "deployed"
        assert data["team"] == "B"
        assert data["url"] == "https://api-staging.company.com"

    def test_unknown_tool_returns_404(self, client):
        resp = client.post(
            "/tools/nonexistent",
            json={"arguments": {}},
        )
        assert resp.status_code == 404
        data = resp.get_json()
        assert "error" in data

    def test_invalid_args_returns_400(self, client):
        resp = client.post(
            "/tools/deploy_application",
            json={"arguments": {"bad_param": "value"}},
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_restart_service_via_bridge(self, client):
        resp = client.post(
            "/tools/restart_service",
            json={"arguments": {"service": "web"}},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "restarted"

    def test_update_configuration_via_bridge(self, client):
        resp = client.post(
            "/tools/update_configuration",
            json={
                "arguments": {
                    "service": "api",
                    "config_key": "timeout",
                    "config_value": "30",
                }
            },
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["config"] == {"timeout": "30"}


class TestApiToolsEndpoint:
    def test_jsonrpc_deploy_application(self, client):
        resp = client.post(
            "/api/tools/deploy_application",
            json={
                "jsonrpc": "2.0",
                "id": 10,
                "params": {
                    "arguments": {"service": "web", "version": "2.0.0"}
                },
            },
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["jsonrpc"] == "2.0"
        assert data["id"] == 10
        assert data["result"]["team"] == "B"

    def test_jsonrpc_unknown_tool(self, client):
        resp = client.post(
            "/api/tools/nope",
            json={"jsonrpc": "2.0", "id": 1, "params": {"arguments": {}}},
        )
        assert resp.status_code == 404
        data = resp.get_json()
        assert "error" in data

    def test_list_tools(self, client):
        resp = client.get("/api/tools")
        assert resp.status_code == 200
        data = resp.get_json()
        tools = data["result"]["tools"]
        assert len(tools) == 3
        for tool in tools:
            assert "name" in tool
            assert "description" in tool
        assert data["result"]["team"] == "B"
