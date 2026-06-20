"""Tests for Team C (Developer) MCP Server tools."""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from server_team_c import read_file, list_directory, modify_permissions, user_management


class TestReadFile:
    def test_content_includes_path(self):
        result = read_file("/etc/config.json")
        assert "/etc/config.json" in result["content"]

    def test_returns_success(self):
        result = read_file("/some/path")
        assert result["status"] == "success"

    def test_returns_size(self):
        result = read_file("/some/file.txt")
        assert result["size"] == 1024

    def test_path_stored(self):
        result = read_file("/var/log/app.log")
        assert result["path"] == "/var/log/app.log"

    def test_includes_team(self):
        result = read_file("/any/path")
        assert result["team"] == "C"


class TestListDirectory:
    def test_returns_files_list(self):
        result = list_directory("/home")
        assert isinstance(result["files"], list)
        assert len(result["files"]) > 0

    def test_returns_directories_list(self):
        result = list_directory("/home")
        assert isinstance(result["directories"], list)
        assert len(result["directories"]) > 0

    def test_returns_success(self):
        result = list_directory("/var")
        assert result["status"] == "success"

    def test_path_stored(self):
        result = list_directory("/usr/local")
        assert result["path"] == "/usr/local"

    def test_includes_team(self):
        result = list_directory("/")
        assert result["team"] == "C"


class TestModifyPermissions:
    def test_default_action_assign(self):
        result = modify_permissions("alice@co.com", "admin")
        assert result["action"] == "assign"

    def test_custom_action(self):
        result = modify_permissions("bob@co.com", "editor", action="revoke")
        assert result["action"] == "revoke"

    def test_status_updated(self):
        result = modify_permissions("user@co.com", "viewer")
        assert result["status"] == "updated"

    def test_user_and_role(self):
        result = modify_permissions("dev@co.com", "developer")
        assert result["user"] == "dev@co.com"
        assert result["role"] == "developer"

    def test_includes_timestamp(self):
        result = modify_permissions("u@co.com", "r")
        assert "timestamp" in result

    def test_includes_team(self):
        result = modify_permissions("u@co.com", "r")
        assert result["team"] == "C"


class TestUserManagement:
    def test_create_action(self):
        result = user_management("create", "new@co.com", role="editor")
        assert result["action"] == "create"
        assert "new@co.com" in result["message"]
        assert "created" in result["message"]

    def test_delete_action(self):
        result = user_management("delete", "old@co.com")
        assert "deleted" in result["message"]

    def test_update_action(self):
        result = user_management("update", "user@co.com", role="admin")
        assert "updated" in result["message"]
        assert "admin" in result["message"]

    def test_list_action(self):
        result = user_management("list", "any@co.com")
        assert "Listed" in result["message"]

    def test_unknown_action_fallback(self):
        result = user_management("suspend", "user@co.com")
        assert "suspend" in result["message"]
        assert "executed" in result["message"]

    def test_status_success(self):
        result = user_management("create", "u@co.com")
        assert result["status"] == "success"

    def test_user_email_stored(self):
        result = user_management("create", "test@co.com")
        assert result["user"] == "test@co.com"

    def test_includes_timestamp(self):
        result = user_management("create", "u@co.com")
        assert "timestamp" in result

    def test_includes_team(self):
        result = user_management("create", "u@co.com")
        assert result["team"] == "C"

    def test_default_role_viewer(self):
        result = user_management("create", "u@co.com")
        assert "viewer" in result["message"]
