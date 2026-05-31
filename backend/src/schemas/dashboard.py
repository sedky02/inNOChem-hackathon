from pydantic import BaseModel


class DashboardAggregate(BaseModel):
    total_sessions: int
    completed_sessions: int
    total_water_saved_liters: float
    total_carbon_saved_kg_co2e: float
    average_energy_reduction_pct: float
    sessions_this_month: int
    most_used_mode: str | None
