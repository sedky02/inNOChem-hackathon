from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class Descriptors(BaseModel):
    molecular_weight: float
    logP: float
    tpsa: float
    hbd: int
    hba: int
    rotatable_bonds: int
    aromatic_rings: int


class ScreenRequest(BaseModel):
    session_id: UUID | None = None
    dye_name: str = Field(min_length=1, max_length=500)
    smiles: str = Field(min_length=1, max_length=5000)
    force: bool = False

    @field_validator("smiles")
    @classmethod
    def strip_null_bytes(cls, v: str) -> str:
        return v.replace("\x00", "").strip()


class ScreenResponse(BaseModel):
    compatibility_score: int
    solubility_score: int
    descriptors: Descriptors
    compute_time_ms: float
    session_id: UUID | None = None
    # Populated from the RAG literature store when available (else empty).
    rag_citations: list[str] = []
