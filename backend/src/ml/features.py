"""Feature engineering shared by training and inference.

Mirrors the InnoChem feature schema so models trained by `train_models.py` line
up with the feature vectors the engines build at inference time.
"""

from __future__ import annotations

from src.engines.pr_eos import co2_density_celsius_bar
from src.schemas.process import ChemicalProfile, FabricProfile, ProcessParams

FEATURE_COLS = [
    "MolWt", "LogP", "TPSA", "HBD", "HBA",
    "T_celsius", "P_bar", "duration_min", "dye_conc_owf",
    "polyester_pct", "cotton_pct", "co2_density",
    "cosolvent_flag", "cosolvent_ethanol_pct", "dye_family_encoded",
]

RISK_MAP = {"FAIBLE": 0, "MODÉRÉ": 1, "ÉLEVÉ": 2}
RISK_LABELS = {0: "FAIBLE", 1: "MODÉRÉ", 2: "ÉLEVÉ"}


def build_feature_row(
    mol: ChemicalProfile,
    fabric: FabricProfile,
    params: ProcessParams,
    dye_conc_owf: float = 2.0,
) -> dict[str, float]:
    """Build a single inference feature row in FEATURE_COLS order."""
    density = co2_density_celsius_bar(params.temperature, params.pressure)
    return {
        "MolWt": mol.molecular_weight,
        "LogP": mol.logP,
        "TPSA": mol.tpsa,
        "HBD": mol.hbd,
        "HBA": mol.hba,
        "T_celsius": params.temperature,
        "P_bar": params.pressure,
        "duration_min": params.time,
        "dye_conc_owf": dye_conc_owf,
        "polyester_pct": fabric.polyester_pct,
        "cotton_pct": fabric.cotton_pct,
        "co2_density": density,
        "cosolvent_flag": 0,
        "cosolvent_ethanol_pct": 0.0,
        "dye_family_encoded": 0,
    }


def load_and_prepare(path: str):
    """Load the training dataset (xlsx or csv) → (X DataFrame, y DataFrame).

    Requires pandas; only used by the training script.
    """
    import pandas as pd
    from sklearn.preprocessing import LabelEncoder

    df = pd.read_excel(path) if path.endswith((".xlsx", ".xls")) else pd.read_csv(path)
    df = df.rename(
        columns={
            "MolWt (g/mol)": "MolWt",
            "TPSA (Å²)": "TPSA",
            "T (°C)": "T_celsius",
            "P (bar)": "P_bar",
            "duration (min)": "duration_min",
            "dye_conc (% owf)": "dye_conc_owf",
            "polyester_pct (%)": "polyester_pct",
            "cotton_pct (%)": "cotton_pct",
            "co2_density (kg/m³)": "co2_density",
        }
    )
    df["cosolvent_flag"] = (df["cosolvent"].astype(str).str.lower() != "sans").astype(int)
    df["cosolvent_ethanol_pct"] = (
        df["cosolvent"].astype(str).str.extract(r"(\d+)\s*mol%").astype(float).fillna(0)
    )
    df["dye_family_encoded"] = LabelEncoder().fit_transform(
        df["dye_family"].fillna("unknown")
    )
    df["thermal_risk_encoded"] = df["thermal_risk"].map(RISK_MAP)
    df["fixation_risk_encoded"] = df["fixation_risk"].map(RISK_MAP)

    X = df[FEATURE_COLS].copy()
    y = df[["KS", "thermal_risk_encoded", "fixation_risk_encoded"]].copy()
    return X, y
