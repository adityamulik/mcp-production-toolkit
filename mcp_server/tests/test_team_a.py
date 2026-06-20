"""Tests for Team A (Analytics) MCP Server tools."""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from server_team_a import query_database, generate_report, audit_logs


class TestQueryDatabase:
    def test_select_returns_rows(self):
        result = query_database("SELECT * FROM analytics", "default")
        assert result["rows"] == 42
        assert result["result"] == "Mock query results from Team A"

    def test_select_includes_team(self):
        result = query_database("SELECT 1")
        assert result["team"] == "A"

    def test_delete_returns_affected_rows(self):
        result = query_database("DELETE FROM logs")
        assert "affected_rows" in result
        assert "rows" not in result

    def test_delete_users_returns_10234(self):
        result = query_database("DELETE FROM users WHERE active=0")
        assert result["affected_rows"] == 10234

    def test_delete_non_users_returns_5(self):
        result = query_database("DELETE FROM logs WHERE old=1")
        assert result["affected_rows"] == 5

    def test_custom_database_parameter(self):
        result = query_database("SELECT 1", database="analytics_db")
        assert result["database"] == "analytics_db"

    def test_default_database(self):
        result = query_database("SELECT 1")
        assert result["database"] == "default"

    def test_query_stored_in_result(self):
        q = "SELECT count(*) FROM events"
        result = query_database(q)
        assert result["query"] == q

    def test_status_is_executed(self):
        result = query_database("SELECT 1")
        assert result["status"] == "executed"


class TestGenerateReport:
    def test_returns_correct_structure(self):
        result = generate_report("monthly")
        assert result["status"] == "generated"
        assert result["report_type"] == "monthly"
        assert "timestamp" in result
        assert "data" in result

    def test_default_format_json(self):
        result = generate_report("weekly")
        assert result["format"] == "json"

    def test_custom_format_csv(self):
        result = generate_report("daily", format="csv")
        assert result["format"] == "csv"

    def test_custom_format_pdf(self):
        result = generate_report("annual", format="pdf")
        assert result["format"] == "pdf"

    def test_includes_team(self):
        result = generate_report("quarterly")
        assert result["team"] == "A"

    def test_data_has_summary(self):
        result = generate_report("monthly")
        assert "summary" in result["data"]


class TestAuditLogs:
    def test_returns_success(self):
        result = audit_logs()
        assert result["status"] == "success"

    def test_default_params(self):
        result = audit_logs()
        assert result["action"] == "list"
        assert result["limit"] == 100

    def test_custom_action_and_limit(self):
        result = audit_logs(action="search", limit=50)
        assert result["action"] == "search"
        assert result["limit"] == 50

    def test_logs_is_list(self):
        result = audit_logs()
        assert isinstance(result["logs"], list)
        assert len(result["logs"]) > 0

    def test_includes_team(self):
        result = audit_logs()
        assert result["team"] == "A"
