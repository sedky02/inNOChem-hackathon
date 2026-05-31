"""Engine-level exceptions. The API layer maps these to HTTP responses;
engines themselves remain free of HTTP/DB concerns."""


class EngineError(Exception):
    """Base class for all engine errors."""


class InvalidSMILESError(EngineError):
    def __init__(self, smiles: str, detail: str = "Could not parse SMILES"):
        self.smiles = smiles
        self.detail = detail
        super().__init__(f"{detail}: {smiles[:80]}")


class ModelUnavailableError(EngineError):
    pass
