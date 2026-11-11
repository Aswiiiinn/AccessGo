from django.test import TestCase
from django.contrib.auth import get_user_model
from .services import get_dashboard_stats

User = get_user_model()


class DashboardStatsTest(TestCase):
    def test_stats_returns_expected_keys(self):
        stats = get_dashboard_stats()
        expected_keys = {
            "total_reports", "pending_reports", "verified_reports",
            "resolved_reports", "total_locations", "total_users", "reports_by_impact",
        }
        self.assertEqual(set(stats.keys()), expected_keys)
