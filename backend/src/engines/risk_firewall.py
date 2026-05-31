"""Risk & compliance firewall (ported from Colab module 3).

Combines a structural Negative-Knowledge Database (SMARTS substructure alerts,
matched via RDKit when available) with thermodynamic process-threshold checks.
Used by the Risk Engine to raise auditable warnings and escalate severity.
"""

from __future__ import annotations

from src.engines.pr_eos import co2_density_celsius_bar

try:
    from rdkit import Chem

    RDKIT_AVAILABLE = True
except Exception:  # pragma: no cover
    RDKIT_AVAILABLE = False

# Substructure SMARTS → toxicological / processing risk.
NEGATIVE_KNOWLEDGE_DB = {
    "toxic_azo_cleavage": {
        "smarts": "N=N",
        "risk_level": "CRITICAL",
        "message": "Azo linkage detected. Above ~135°C certain azo dyes risk thermal cleavage into carcinogenic aromatic amines.",
    },
    "halogenated_acid_risk": {
        "smarts": "C(Cl)(Cl)Cl",
        "risk_level": "WARNING",
        "message": "Highly chlorinated aliphatic group detected. Risk of corrosive trace acids in sub-optimal scCO₂ moisture.",
    },
    "explosive_nitro_cluster": {
        "smarts": "[$([NX3](=O)=O),$([NX3+](=O)[O-])]",
        "risk_level": "WARNING",
        "message": "Nitro group(s) detected. Elevated structural energy density — review stability under hyperbaric cycling.",
    },
    "fabric_degradation_acidic": {
        "smarts": "C(=O)[OH]",
        "risk_level": "WARNING",
        "message": "Free carboxylic acid group identified. May promote regional fabric brittleness under high pressure.",
    },
}


def scan_structure(smiles: str | None) -> list[dict]:
    """Match a SMILES against the negative-knowledge DB. Returns alert dicts."""
    if not smiles or not RDKIT_AVAILABLE:
        return []
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return [{"risk_level": "CRITICAL", "message": "Invalid SMILES — compliance scan aborted."}]
    alerts: list[dict] = []
    for name, info in NEGATIVE_KNOWLEDGE_DB.items():
        pattern = Chem.MolFromSmarts(info["smarts"])
        if pattern is not None and mol.HasSubstructMatch(pattern):
            alerts.append({"category": name, "risk_level": info["risk_level"], "message": info["message"]})
    return alerts


def scan_process(
    temperature_c: float,
    pressure_bar: float,
    duration_min: float,
    polyester_pct: float,
) -> tuple[list[dict], float]:
    """Threshold checks against thermodynamic safety limits. Returns (alerts, density)."""
    density = co2_density_celsius_bar(temperature_c, pressure_bar)
    alerts: list[dict] = []

    if temperature_c > 135.0:
        alerts.append({"risk_level": "CRITICAL", "message": f"Temperature {temperature_c:.0f}°C exceeds the safe threshold for dye/fiber integrity."})
    elif temperature_c < 75.0:
        alerts.append({"risk_level": "WARNING", "message": f"Low temperature ({temperature_c:.0f}°C) slows dye sublimation and fixation."})

    if density < 400.0:
        alerts.append({"risk_level": "CRITICAL", "message": f"CO₂ density deficit ({density:.0f} kg/m³) — insufficient solvent power, risk of color spotting."})
    elif density > 950.0:
        alerts.append({"risk_level": "WARNING", "message": f"Very high CO₂ density ({density:.0f} kg/m³) may trigger reverse dye desorption."})

    if polyester_pct < 40.0 and temperature_c > 110.0:
        alerts.append({"risk_level": "WARNING", "message": f"High temperature on a low-polyester blend ({polyester_pct:.0f}%) risks natural-fiber weakening."})

    if duration_min > 90.0:
        alerts.append({"risk_level": "WARNING", "message": f"Extended cycle ({duration_min:.0f} min) inflates the carbon footprint without proportional color gain."})

    return alerts, density
