"""Train the GreenDye RandomForest models on the scCO₂ dyeing dataset.

Produces three joblib bundles in MODEL_BASE_PATH:
  - ks_regressor.joblib       → K/S color-strength regressor
  - thermal_classifier.joblib → thermal-risk classifier (FAIBLE/MODÉRÉ/ÉLEVÉ)
  - fixation_classifier.joblib→ fixation-risk classifier

The dataset (100 rows) ships with precomputed RDKit descriptors, so training
needs only scikit-learn + pandas (no RDKit). Evaluated with Leave-One-Out CV
given the small sample size, with regularization to limit overfitting.

Run: `python -m scripts.train_models`
"""

from __future__ import annotations

import os

import joblib

from src.config.settings import settings
from src.ml.features import load_and_prepare

DATASET = os.environ.get("DATASET_PATH", "data/raw/dyeing_dataset.xlsx")


def train(dataset_path: str = DATASET) -> None:
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.model_selection import LeaveOneOut, cross_val_score

    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}; skipping training.")
        return

    X, y = load_and_prepare(dataset_path)
    X_arr = X.values
    os.makedirs(settings.model_base_path, exist_ok=True)
    loo = LeaveOneOut()

    # K/S regressor
    ks_model = RandomForestRegressor(
        n_estimators=200, max_depth=8, min_samples_leaf=2, random_state=42, n_jobs=-1
    )
    ks_mae = -cross_val_score(
        ks_model, X_arr, y["KS"].values, cv=loo, scoring="neg_mean_absolute_error"
    ).mean()
    ks_model.fit(X, y["KS"].values)  # fit on DataFrame to retain feature names
    joblib.dump(ks_model, os.path.join(settings.model_base_path, "ks_regressor.joblib"))
    print(f"K/S regressor      → LOOCV MAE: {ks_mae:.2f} K/S units")

    # Risk classifiers
    for name, col in (
        ("thermal_classifier", "thermal_risk_encoded"),
        ("fixation_classifier", "fixation_risk_encoded"),
    ):
        clf = RandomForestClassifier(
            n_estimators=200, max_depth=6, class_weight="balanced", random_state=42, n_jobs=-1
        )
        acc = cross_val_score(clf, X_arr, y[col].values, cv=loo).mean()
        clf.fit(X, y[col].values)  # fit on DataFrame to retain feature names
        joblib.dump(clf, os.path.join(settings.model_base_path, f"{name}.joblib"))
        print(f"{name:18s} → LOOCV accuracy: {acc:.2f}")

    importances = sorted(
        zip(X.columns, ks_model.feature_importances_), key=lambda kv: kv[1], reverse=True
    )
    print("\nTop K/S features:")
    for feat, imp in importances[:5]:
        print(f"  {feat:18s} {imp:.3f}")
    print(f"\nModels saved to {settings.model_base_path}")


if __name__ == "__main__":
    train()
