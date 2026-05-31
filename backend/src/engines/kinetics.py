"""Langmuir adsorption kinetics for scCO₂ dyeing.

Ported from the InnoChem `services/ode_solver.py`. Solves the coupled ODEs

    dq/dt = k_ads · C · (q_max − q) − k_des · q
    dC/dt = −dq/dt

with SciPy's `solve_ivp` when available; otherwise integrates with an explicit
RK4 step in pure Python. `q` is dye adsorbed onto the fiber (∝ K/S), `C` is dye
concentration remaining in the supercritical fluid.
"""

from __future__ import annotations

try:
    from scipy.integrate import solve_ivp

    SCIPY_AVAILABLE = True
except Exception:  # pragma: no cover
    SCIPY_AVAILABLE = False


def solve_dyeing_kinetics(
    k_ads: float,
    k_des: float,
    q_max: float,
    c0: float,
    duration_min: float,
    n_points: int = 50,
) -> tuple[list[float], list[float], list[float]]:
    """Return (time_points, q_curve, c_curve) of length n_points."""
    if duration_min <= 0:
        return [0.0], [0.0], [c0]

    def deriv(q: float, c: float) -> tuple[float, float]:
        dq = k_ads * c * (q_max - q) - k_des * q
        return dq, -dq

    if SCIPY_AVAILABLE:
        import numpy as np

        def ode(_t, y):
            dq, dc = deriv(y[0], y[1])
            return [dq, dc]

        t_eval = np.linspace(0, duration_min, n_points)
        sol = solve_ivp(
            ode, (0, duration_min), [0.0, c0], t_eval=t_eval,
            method="RK45", rtol=1e-6, atol=1e-8,
        )
        return (
            [float(x) for x in sol.t],
            [float(x) for x in sol.y[0]],
            [float(x) for x in sol.y[1]],
        )

    # Pure-Python RK4 fallback.
    times, qs, cs = [], [], []
    steps = max(n_points - 1, 1)
    dt = duration_min / steps
    q, c = 0.0, c0
    for i in range(n_points):
        t = i * dt
        times.append(round(t, 4))
        qs.append(q)
        cs.append(c)
        # RK4 integration of (q, c)
        dq1, dc1 = deriv(q, c)
        dq2, dc2 = deriv(q + 0.5 * dt * dq1, c + 0.5 * dt * dc1)
        dq3, dc3 = deriv(q + 0.5 * dt * dq2, c + 0.5 * dt * dc2)
        dq4, dc4 = deriv(q + dt * dq3, c + dt * dc3)
        q += (dt / 6.0) * (dq1 + 2 * dq2 + 2 * dq3 + dq4)
        c += (dt / 6.0) * (dc1 + 2 * dc2 + 2 * dc3 + dc4)
    return times, qs, cs
