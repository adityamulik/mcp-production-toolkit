"""Tests for Team C HTTP Bridge (Flask app)."""
import sys
sys.path.insert(0, "/home/runner/work/mcp-production-toolkit/mcp-production-toolkit/mcp_server")

import json
import pytest
from http_bridge_team_c import app


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
        assert data["team"] == "C"
        assert "tools" in data
        assert "service" in data

    def test_health_lists_tools(self, client):
        data = client.get("/health").get_json()
        assert "read_file" in data["tools"]
        assert "list_directory" in data["tools"]
        assert "modify_permissions" in data["tools"]
        assert "user_management" in data["tools"]


class TestToolsEndpoint:
    def test_read_file_valid(self, client):
        resp = client.post(
            "/tools/read_file",
            json={"arguments": {"path": "/etc/config"}},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["team"] == "C"
        assert "/etc/config" in data["content"]

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
            "/tools/read_file",
            json={"arguments": {"bad_param": "value"}},
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_list_directory_via_bridge(self, client):
        resp = client.post(
            "/tools/list_directory",
            json={"arguments": {"path": "/home"}},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data["files"], list)

    def test_modify_permissions_via_bridge(self, client):
        resp = client.post(
            "/tools/modify_permissions",
            json={"arguments": {"user": "alice@co.com", "role": "admin"}},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "updated"

    def test_user_management_via_bridge(self, client):
        resp = client.post(
            "/tools/user_management",
            json={
                "arguments": {
                    "action": "create",
                    "user_email": "new@co.com",
                    "role": "editor",
                }
            },
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"


class TestApiToolsEndpoint:
    def test_jsonrpc_read_file(self, client):
        resp = client.post(
            "/api/tools/read_file",
            json={
                "jsonrpc": "2.0",
                "id": 7,
                "params": {"arguments": {"path": "/data/file.txt"}},
            },
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["jsonrpc"] == "2.0"
        assert data["id"] == 7
        assert data["result"]["team"] == "C"

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
        assert len(tools) == 4
        for tool in tools:
            assert "name" in tool
            assert "description" in tool
        assert data["result"]["team"] == "C"
