"""Lazy registry for the trained RandomForest models.

Loads `ks_regressor`, `thermal_classifier`, and `fixation_classifier` joblib
bundles from MODEL_BASE_PATH at construction. If joblib/pandas are unavailable
or the files are missing, `available` is False and the engines fall back to
their deterministic implementations.
"""

from __future__ import annotations

import os

from src.config.settings import settings
from src.ml.features import FEATURE_COLS


class ModelRegistry:
    def __init__(self) -> None:
        self.ks_model = None
        self.thermal_model = None
        self.fixation_model = None
        self._pd = None
        self._load()

    def _load(self) -> None:
        try:
            import joblib
            import pandas as pd
        except Exception:
            return
        base = settings.model_base_path
        paths = {
            "ks_model": "ks_regressor.joblib",
            "thermal_model": "thermal_classifier.joblib",
            "fixation_model": "fixation_classifier.joblib",
        }
        loaded_any = False
        for attr, fname in paths.items():
            fpath = os.path.join(base, fname)
            if os.path.exists(fpath):
                try:
                    setattr(self, attr, joblib.load(fpath))
                    loaded_any = True
                except Exception:
                    pass
        if loaded_any:
            self._pd = pd

    @property
    def available(self) -> bool:
        return self.ks_model is not None and self._pd is not None

    def _frame(self, feature_row: dict):
        return self._pd.DataFrame([feature_row])[FEATURE_COLS]

    def predict_ks(self, feature_row: dict) -> float | None:
        if self.ks_model is None or self._pd is None:
            return None
        return float(self.ks_model.predict(self._frame(feature_row))[0])

    def predict_ks_ci(self, feature_row: dict) -> tuple[float, float] | None:
        """95% interval from the RF tree ensemble spread, if available."""
        if self.ks_model is None or self._pd is None:
            return None
        X = self._frame(feature_row)
        pred = float(self.ks_model.predict(X)[0])
        estimators = getattr(self.ks_model, "estimators_", None)
        if not estimators:
            return (round(pred * 0.85, 1), round(pred * 1.15, 1))
        import statistics

        spread = statistics.pstdev([float(e.predict(X)[0]) for e in estimators])
        return (round(pred - 1.96 * spread, 1), round(pred + 1.96 * spread, 1))

    def _predict_class_proba(self, model, feature_row: dict) -> tuple[int, float] | None:
        if model is None or self._pd is None:
            return None
        X = self._frame(feature_row)
        cls = int(model.predict(X)[0])
        proba_high = 0.0
        if hasattr(model, "predict_proba") and hasattr(model, "classes_"):
            classes = list(model.classes_)
            probs = model.predict_proba(X)[0]
            # Probability mass on the elevated-risk class (encoded 2).
            if 2 in classes:
                proba_high = float(probs[classes.index(2)])
            elif 1 in classes:
                proba_high = float(probs[classes.index(1)])
        return cls, proba_high

    def predict_thermal(self, feature_row: dict) -> tuple[int, float] | None:
        return self._predict_class_proba(self.thermal_model, feature_row)

    def predict_fixation(self, feature_row: dict) -> tuple[int, float] | None:
        return self._predict_class_proba(self.fixation_model, feature_row)

    def ks_feature_importances(self) -> dict[str, float] | None:
        if self.ks_model is None or not hasattr(self.ks_model, "feature_importances_"):
            return None
        return dict(zip(FEATURE_COLS, (float(v) for v in self.ks_model.feature_importances_)))


# Singleton loaded once at import.
registry = ModelRegistry()
