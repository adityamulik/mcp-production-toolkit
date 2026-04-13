"""Tests for Team A HTTP Bridge (Flask app)."""
import sys
sys.path.insert(0, "/home/runner/work/mcp-production-toolkit/mcp-production-toolkit/mcp_server")

import json
import pytest
from http_bridge_team_a import app


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
        assert data["team"] == "A"
        assert "tools" in data
        assert "service" in data

    def test_health_lists_tools(self, client):
        data = client.get("/health").get_json()
        assert "query_database" in data["tools"]
        assert "generate_report" in data["tools"]
        assert "audit_logs" in data["tools"]


class TestToolsEndpoint:
    def test_query_database_valid(self, client):
        resp = client.post(
            "/tools/query_database",
            json={"arguments": {"query": "SELECT 1"}},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["team"] == "A"
        assert data["rows"] == 42

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
            "/tools/query_database",
            json={"arguments": {"bad_param": "value"}},
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_generate_report_via_bridge(self, client):
        resp = client.post(
            "/tools/generate_report",
            json={"arguments": {"report_type": "monthly"}},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["report_type"] == "monthly"

    def test_audit_logs_via_bridge(self, client):
        resp = client.post(
            "/tools/audit_logs",
            json={"arguments": {}},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"


class TestApiToolsEndpoint:
    def test_jsonrpc_query_database(self, client):
        resp = client.post(
            "/api/tools/query_database",
            json={
                "jsonrpc": "2.0",
                "id": 42,
                "params": {"arguments": {"query": "SELECT 1"}},
            },
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["jsonrpc"] == "2.0"
        assert data["id"] == 42
        assert data["result"]["team"] == "A"

    def test_jsonrpc_unknown_tool(self, client):
        resp = client.post(
            "/api/tools/nope",
            json={"jsonrpc": "2.0", "id": 1, "params": {"arguments": {}}},
        )
        assert resp.status_code == 404
        data = resp.get_json()
        assert data["jsonrpc"] == "2.0"
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
        assert data["result"]["team"] == "A"
