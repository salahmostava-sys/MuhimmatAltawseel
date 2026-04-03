import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from main import health
from model import (  # noqa: E402
    detect_anomalies,
    predict_orders,
    predict_salary_forecast,
    rank_employees,
    rank_platforms,
)


class AiBackendSmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.history = [
            {"date": "2026-03-01", "orders": 10, "app_name": "Jahez", "employee_id": "emp-1", "employee_name": "Ali"},
            {"date": "2026-03-02", "orders": 12, "app_name": "Jahez", "employee_id": "emp-1", "employee_name": "Ali"},
            {"date": "2026-03-03", "orders": 11, "app_name": "Hunger", "employee_id": "emp-2", "employee_name": "Omar"},
            {"date": "2026-03-04", "orders": 14, "app_name": "Jahez", "employee_id": "emp-1", "employee_name": "Ali"},
            {"date": "2026-03-05", "orders": 15, "app_name": "Hunger", "employee_id": "emp-2", "employee_name": "Omar"},
            {"date": "2026-03-06", "orders": 16, "app_name": "Jahez", "employee_id": "emp-1", "employee_name": "Ali"},
            {"date": "2026-03-07", "orders": 18, "app_name": "Hunger", "employee_id": "emp-2", "employee_name": "Omar"},
        ]

    def test_health_endpoint_shape(self) -> None:
        self.assertEqual(health()["status"], "ok")

    def test_predict_orders_returns_forecast_shape(self) -> None:
        result = predict_orders(self.history, forecast_days=3)
        self.assertEqual(len(result["daily_forecast"]), 3)
        self.assertIn(result["trend"], {"up", "down", "stable"})
        self.assertIn(result["confidence"], {"high", "medium", "low"})

    def test_predict_salary_forecast_returns_expected_fields(self) -> None:
        result = predict_salary_forecast(current_orders=120, days_passed=10, avg_order_value=6, base_salary=1500)
        self.assertGreaterEqual(result["predicted_monthly_salary"], 1500)
        self.assertIn(result["trend"], {"above_target", "on_track", "below_target"})

    def test_rank_platforms_returns_sorted_platforms(self) -> None:
        result = rank_platforms(self.history)
        self.assertGreaterEqual(len(result["platforms"]), 1)
        self.assertGreaterEqual(result["platforms"][0]["total_orders"], result["platforms"][-1]["total_orders"])

    def test_rank_employees_returns_best_employee(self) -> None:
        result = rank_employees(
            [
                {
                    "employee_id": "emp-1",
                    "employee_name": "Ali",
                    "total_orders": 320,
                    "attendance_days": 28,
                    "error_count": 1,
                    "late_days": 0,
                },
                {
                    "employee_id": "emp-2",
                    "employee_name": "Omar",
                    "total_orders": 250,
                    "attendance_days": 26,
                    "error_count": 2,
                    "late_days": 1,
                },
            ],
            top_n=2,
        )
        self.assertEqual(len(result["employees"]), 2)
        self.assertIsNotNone(result["best_employee"])

    def test_detect_anomalies_returns_risk_level(self) -> None:
        result = detect_anomalies(
            {
                "employee_name": "Ali",
                "current_salary": 1800,
                "expected_salary_range": (2400, 3000),
                "monthly_orders": 150,
                "previous_month_orders": 260,
                "deductions": 400,
            }
        )
        self.assertIn(result["risk_level"], {"low", "medium", "high", "critical"})
        self.assertIsInstance(result["anomalies"], list)


if __name__ == "__main__":
    unittest.main()
