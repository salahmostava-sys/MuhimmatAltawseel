"""
Muhimmat AI Backend — Full analytics engine.

Endpoints:
  POST /predict-orders    → Forecast daily/monthly orders using ML
  POST /predict-salary    → Forecast monthly salary based on current performance
  POST /best-driver       → Identify top-performing driver
  POST /best-employee     → Rank employees by composite performance score
  POST /top-platform      → Rank platforms by order volume & growth
  POST /smart-alerts      → Generate operational alerts from data patterns
  POST /detect-anomalies  → Detect salary, order, and deduction anomalies
  GET  /health            → Liveness check
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from model import (
    predict_orders,
    predict_salary_forecast,
    find_best_driver,
    rank_employees,
    rank_platforms,
    generate_smart_alerts,
    detect_anomalies,
    analyze_salary,
)

app = FastAPI(title="Muhimmat AI Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response schemas ───────────────────────────────────────────────


class DayRecord(BaseModel):
    date: str
    orders: float
    app_name: str | None = None
    employee_id: str | None = None
    employee_name: str | None = None


class PredictOrdersRequest(BaseModel):
    history: list[DayRecord] = Field(..., min_length=1)
    forecast_days: int = Field(7, ge=1, le=90)


class PredictOrdersResponse(BaseModel):
    daily_forecast: list[dict]
    monthly_total_predicted: float
    trend: str  # "up" | "down" | "stable"
    trend_percent: float
    confidence: str  # "high" | "medium" | "low"


class BestDriverRequest(BaseModel):
    history: list[DayRecord] = Field(..., min_length=1)
    top_n: int = Field(5, ge=1, le=50)


class DriverRank(BaseModel):
    employee_id: str
    employee_name: str
    total_orders: int
    daily_avg: float
    trend: str
    trend_percent: float
    consistency_score: float


class BestDriverResponse(BaseModel):
    drivers: list[DriverRank]


class TopPlatformRequest(BaseModel):
    history: list[DayRecord] = Field(..., min_length=1)


class PlatformRank(BaseModel):
    app_name: str
    total_orders: int
    share_percent: float
    growth_percent: float
    avg_daily: float


class TopPlatformResponse(BaseModel):
    platforms: list[PlatformRank]


class SmartAlertsRequest(BaseModel):
    history: list[DayRecord] = Field(..., min_length=7)
    thresholds: dict = Field(default_factory=lambda: {
        "low_demand_drop_percent": -20,
        "high_demand_spike_percent": 30,
        "driver_drop_percent": -25,
    })


class Alert(BaseModel):
    type: str  # "low_demand" | "high_demand" | "driver_drop" | "driver_spike"
    severity: str  # "warning" | "critical" | "info"
    message: str
    value: float
    entity: str | None = None


class SmartAlertsResponse(BaseModel):
    alerts: list[Alert]


class SalaryAnalysisRequest(BaseModel):
    base_salary: float = Field(..., ge=0)
    orders: int = Field(..., ge=0)
    bonus: float = Field(0, ge=0)


class SalaryAnalysisResponse(BaseModel):
    expected_salary: float
    risk: str  # "underpaid" | "normal" | "overpaid"
    diff_percent: float


# ─── New AI Systems Schemas ─────────────────────────────────────────────────


class SalaryForecastRequest(BaseModel):
    current_orders: int = Field(..., ge=0, description="Orders completed so far this month")
    days_passed: int = Field(..., ge=1, le=31, description="Days passed in current month")
    avg_order_value: float = Field(5.0, ge=0, description="Average earnings per order")
    base_salary: float = Field(0, ge=0, description="Fixed base salary component")
    working_days_per_month: int = Field(30, ge=1, le=31)


class SalaryForecastResponse(BaseModel):
    predicted_monthly_salary: float
    current_daily_avg: float
    projected_monthly_orders: int
    confidence: str  # "high" | "medium" | "low"
    trend: str  # "on_track" | "above_target" | "below_target"
    days_remaining: int


class EmployeeRecord(BaseModel):
    employee_id: str
    employee_name: str
    total_orders: int = Field(0, ge=0)
    attendance_days: int = Field(0, ge=0)
    error_count: int = Field(0, ge=0)
    late_days: int = Field(0, ge=0)
    salary: float = Field(0, ge=0)
    avg_orders_per_day: float = Field(0, ge=0)


class BestEmployeeRequest(BaseModel):
    employees: list[EmployeeRecord] = Field(..., min_length=1)
    top_n: int = Field(5, ge=1, le=50)


class EmployeeRank(BaseModel):
    employee_id: str
    employee_name: str
    composite_score: float
    rank: int
    total_orders: int
    attendance_rate: float
    error_rate: float
    performance_tier: str  # "excellent" | "good" | "average" | "needs_improvement"


class BestEmployeeResponse(BaseModel):
    employees: list[EmployeeRank]
    best_employee: EmployeeRank | None


class AnomalyDetectionRequest(BaseModel):
    employee_id: str
    employee_name: str
    current_salary: float
    expected_salary_range: tuple[float, float] = Field(..., description="(min, max) expected salary")
    monthly_orders: int
    previous_month_orders: int
    deductions: float = Field(0, ge=0)
    deduction_reasons: list[str] = Field(default_factory=list)


class Anomaly(BaseModel):
    type: str  # "low_salary" | "order_drop" | "high_deductions" | "attendance_issue"
    severity: str  # "critical" | "warning" | "info"
    message: str
    value: float
    threshold: float
    recommendation: str


class AnomalyDetectionResponse(BaseModel):
    anomalies: list[Anomaly]
    overall_risk_score: float  # 0-100
    risk_level: str  # "low" | "medium" | "high" | "critical"


# ─── Endpoints ────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.post("/predict-orders", response_model=PredictOrdersResponse)
def api_predict_orders(req: PredictOrdersRequest):
    rows = [d.model_dump() for d in req.history]
    result = predict_orders(rows, req.forecast_days)
    return result


@app.post("/best-driver", response_model=BestDriverResponse)
def api_best_driver(req: BestDriverRequest):
    rows = [d.model_dump() for d in req.history]
    result = find_best_driver(rows, req.top_n)
    return result


@app.post("/top-platform", response_model=TopPlatformResponse)
def api_top_platform(req: TopPlatformRequest):
    rows = [d.model_dump() for d in req.history]
    result = rank_platforms(rows)
    return result


@app.post("/smart-alerts", response_model=SmartAlertsResponse)
def api_smart_alerts(req: SmartAlertsRequest):
    rows = [d.model_dump() for d in req.history]
    result = generate_smart_alerts(rows, req.thresholds)
    return result


@app.post("/analyze", response_model=SalaryAnalysisResponse)
def api_analyze_salary(req: SalaryAnalysisRequest):
    result = analyze_salary(req.base_salary, req.orders, req.bonus)
    return result


# ─── New AI Systems Endpoints ─────────────────────────────────────────────────


@app.post("/predict-salary", response_model=SalaryForecastResponse)
def api_predict_salary(req: SalaryForecastRequest):
    """Predict monthly salary based on current performance."""
    result = predict_salary_forecast(
        current_orders=req.current_orders,
        days_passed=req.days_passed,
        avg_order_value=req.avg_order_value,
        base_salary=req.base_salary,
        working_days_per_month=req.working_days_per_month,
    )
    return result


@app.post("/best-employee", response_model=BestEmployeeResponse)
def api_best_employee(req: BestEmployeeRequest):
    """Rank employees by composite performance score."""
    employees_data = [e.model_dump() for e in req.employees]
    result = rank_employees(employees_data, req.top_n)
    return result


@app.post("/detect-anomalies", response_model=AnomalyDetectionResponse)
def api_detect_anomalies(req: AnomalyDetectionRequest):
    """Detect anomalies in salary, orders, and deductions."""
    result = detect_anomalies(req.model_dump())
    return result
