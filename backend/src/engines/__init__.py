"""Engine package.

Intentionally free of eager submodule imports: several engines depend on
`src.ml.features`, which imports `src.engines.pr_eos`. Importing heavy modules
(pipeline, chemical_engine) here would create a circular import. Import the
engine modules directly, e.g. `from src.engines.pipeline import pipeline`.
"""
