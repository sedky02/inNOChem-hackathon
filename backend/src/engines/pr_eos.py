"""Peng-Robinson equation of state for supercritical CO₂ density.

Ported from the InnoChem `services/pr_eos.py`. Uses NumPy to solve the cubic
when available; otherwise falls back to an empirical density correlation so the
engine still runs dependency-free.
"""

from __future__ import annotations

import math

try:
    import numpy as np

    NUMPY_AVAILABLE = True
except Exception:  # pragma: no cover
    NUMPY_AVAILABLE = False

# CO₂ critical constants
TC = 304.18  # K
PC = 73.77e5  # Pa
W = 0.239  # acentric factor
R = 8.314
M = 44.01e-3  # kg/mol


def co2_density(T_K: float, P_Pa: float) -> float:
    """CO₂ density (kg/m³) at temperature T_K (Kelvin) and pressure P_Pa (Pascal)."""
    if not NUMPY_AVAILABLE:
        return _empirical_density(T_K, P_Pa)

    Tr = T_K / TC
    kappa = 0.37464 + 1.54226 * W - 0.26992 * W**2
    alpha = (1 + kappa * (1 - math.sqrt(Tr))) ** 2
    a = 0.45724 * R**2 * TC**2 * alpha / PC
    b = 0.07780 * R * TC / PC
    A = a * P_Pa / (R * T_K) ** 2
    B = b * P_Pa / (R * T_K)

    coeffs = [1, -(1 - B), (A - 3 * B**2 - 2 * B), -(A * B - B**2 - B**3)]
    roots = np.roots(coeffs)
    real_roots = roots[np.isreal(roots)].real
    candidates = real_roots[real_roots > B]
    if candidates.size == 0:
        return _empirical_density(T_K, P_Pa)
    Z = float(np.min(candidates))
    v_molar = Z * R * T_K / P_Pa
    return M / v_molar


def co2_density_celsius_bar(T_celsius: float, P_bar: float) -> float:
    """Convenience wrapper taking °C and bar."""
    return co2_density(T_celsius + 273.15, P_bar * 1e5)


def _empirical_density(T_K: float, P_Pa: float) -> float:
    """Empirical fallback (kg/m³), bounded to the scCO₂ operating envelope."""
    T_c = T_K - 273.15
    P_bar = P_Pa / 1e5
    if T_c <= 31.1 or P_bar <= 73.8:
        return 150.0
    return max(243.4, min(1075.5, 750.0 + (P_bar - 150) * 1.85 - (T_c - 80) * 3.15))
