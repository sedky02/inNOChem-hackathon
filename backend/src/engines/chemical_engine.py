"""Chemical Intelligence Engine.

Uses RDKit for descriptor extraction when installed; otherwise falls back to a
deterministic structural approximation derived from the SMILES string. The same
weighted scoring algorithm is applied either way, so scores are stable and
comparable regardless of whether RDKit is present.
"""

from __future__ import annotations

import re

from src.engines.errors import InvalidSMILESError
from src.schemas.chemical import Descriptors

try:  # RDKit is optional
    from rdkit import Chem
    from rdkit.Chem import Descriptors as RDDescriptors

    RDKIT_AVAILABLE = True
except Exception:  # pragma: no cover - depends on environment
    RDKIT_AVAILABLE = False

MAX_SMILES_LEN = 5000


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _mw_score(mw: float) -> float:
    """1.0 in the optimal 200-600 g/mol window, tapering to 0 at <100 / >1500."""
    if mw <= 0 or mw < 100 or mw > 1500:
        return 0.0
    if 200 <= mw <= 600:
        return 1.0
    if mw < 200:
        return (mw - 100) / 100
    return max(0.0, 1.0 - (mw - 600) / 900)


class ChemicalEngine:
    def screen(self, smiles: str, dye_name: str) -> tuple[int, int, Descriptors]:
        smiles = (smiles or "").replace("\x00", "").strip()
        if not smiles:
            raise InvalidSMILESError(smiles, "Empty SMILES string")
        if len(smiles) > MAX_SMILES_LEN:
            raise InvalidSMILESError(smiles, "SMILES exceeds maximum length")

        descriptors = (
            self._rdkit_descriptors(smiles)
            if RDKIT_AVAILABLE
            else self._approx_descriptors(smiles)
        )
        compatibility = self._compatibility(descriptors)
        solubility = self._solubility(descriptors)
        return compatibility, solubility, descriptors

    # ── RDKit path ────────────────────────────────────────────
    def _rdkit_descriptors(self, smiles: str) -> Descriptors:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise InvalidSMILESError(smiles, "RDKit could not parse the structure")
        ring_info = mol.GetRingInfo()
        aromatic_rings = sum(
            1
            for ring in ring_info.AtomRings()
            if all(mol.GetAtomWithIdx(i).GetIsAromatic() for i in ring)
        )
        return Descriptors(
            molecular_weight=round(RDDescriptors.MolWt(mol), 2),
            logP=round(RDDescriptors.MolLogP(mol), 2),
            tpsa=round(RDDescriptors.TPSA(mol), 2),
            hbd=int(RDDescriptors.NumHDonors(mol)),
            hba=int(RDDescriptors.NumHAcceptors(mol)),
            rotatable_bonds=int(RDDescriptors.NumRotatableBonds(mol)),
            aromatic_rings=int(aromatic_rings),
        )

    # ── Deterministic fallback ────────────────────────────────
    def _approx_descriptors(self, smiles: str) -> Descriptors:
        # Reject obviously invalid input (unbalanced brackets/parens).
        if smiles.count("(") != smiles.count(")") or smiles.count("[") != smiles.count("]"):
            raise InvalidSMILESError(smiles, "Unbalanced SMILES brackets")
        if not re.fullmatch(r"[A-Za-z0-9@+\-\[\]()=#$:/\\.%*]+", smiles):
            raise InvalidSMILESError(smiles, "Invalid SMILES characters")

        carbons = len(re.findall(r"[Cc]", smiles))
        nitrogens = len(re.findall(r"[Nn]", smiles))
        oxygens = len(re.findall(r"[Oo]", smiles))
        sulfurs = len(re.findall(r"[Ss]", smiles))
        aromatic_atoms = len(re.findall(r"[a-z]", smiles))
        ring_closures = len(re.findall(r"\d", smiles))
        heavy = carbons + nitrogens + oxygens + sulfurs
        if heavy == 0:
            raise InvalidSMILESError(smiles, "No heavy atoms detected")

        aromatic_rings = int(_clamp(round(ring_closures / 2), 0, 8))
        return Descriptors(
            molecular_weight=round(
                carbons * 12.01
                + nitrogens * 14.01
                + oxygens * 16.0
                + sulfurs * 32.06
                + carbons * 1.6,
                2,
            ),
            logP=round(
                _clamp(carbons * 0.22 - (oxygens + nitrogens) * 0.55 + aromatic_atoms * 0.18, -3, 9),
                2,
            ),
            tpsa=round(oxygens * 20.2 + nitrogens * 12.4, 2),
            hbd=int(_clamp(round((oxygens + nitrogens) * 0.35), 0, oxygens + nitrogens)),
            hba=oxygens + nitrogens,
            rotatable_bonds=int(_clamp(round(heavy * 0.22) - aromatic_rings, 0, 30)),
            aromatic_rings=aromatic_rings,
        )

    # ── Scoring (shared by both paths) ────────────────────────
    def _compatibility(self, d: Descriptors) -> int:
        score = 0.0
        score += min(d.logP / 5.0, 1.0) * 40
        score += _clamp(1.0 - d.tpsa / 140.0, 0.0, 1.0) * 30
        score += _mw_score(d.molecular_weight) * 30
        score -= d.hbd * 2  # excess H-bond donors hurt scCO₂ compatibility
        return int(_clamp(round(score), 0, 100))

    def _solubility(self, d: Descriptors) -> int:
        score = 0.0
        score += min(max(d.logP, 0) / 5.0, 1.0) * 45
        score += _clamp(1.0 - d.tpsa / 140.0, 0.0, 1.0) * 35
        score += _clamp(1.0 - d.hbd / 6.0, 0.0, 1.0) * 20
        return int(_clamp(round(score), 0, 100))
