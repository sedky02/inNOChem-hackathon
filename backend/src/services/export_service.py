"""Report/export generation. JSON & CSV use the stdlib (always available);
PDF uses ReportLab when installed."""

from __future__ import annotations

import csv
import io
import json
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tables import Session
from src.repositories.result_repo import (
    OptimizationRepository,
    ScreeningRepository,
    VerificationRepository,
)

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    REPORTLAB_AVAILABLE = True
except Exception:  # pragma: no cover
    REPORTLAB_AVAILABLE = False


async def _build_manifest(db: AsyncSession, session: Session) -> dict:
    optimization = await OptimizationRepository(db).by_session(session.id)
    if optimization is None:
        raise HTTPException(status_code=409, detail="SESSION_NOT_VERIFIED")
    verification = await VerificationRepository(db).by_session(session.id)
    if verification is None:
        raise HTTPException(status_code=409, detail="SESSION_NOT_VERIFIED")
    screening = await ScreeningRepository(db).by_session(session.id)

    return {
        "session_id": str(session.id),
        "session_name": session.session_name,
        "dye_name": screening.dye_name if screening else None,
        "optimization_mode": session.optimization_mode,
        "verification_hash": verification.verification_hash,
        "verified_at": verification.verified_at.isoformat(),
        "recommended_parameters": optimization.recommended_parameters,
        "simulation_outputs": optimization.simulation_outputs,
        "sustainability_metrics": optimization.sustainability_metrics,
        "risk_assessment": optimization.risk_assessment,
    }


async def build_export(
    db: AsyncSession, session: Session, fmt: str
) -> tuple[bytes, str, str]:
    if fmt not in {"json", "pdf", "csv"}:
        raise HTTPException(status_code=400, detail="INVALID_FORMAT")
    manifest = await _build_manifest(db, session)
    base = f"GD-{session.id}"

    if fmt == "json":
        return (
            json.dumps(manifest, indent=2).encode(),
            "application/json",
            f"{base}.json",
        )

    if fmt == "csv":
        params = manifest["recommended_parameters"]
        sust = manifest["sustainability_metrics"]
        row = {
            "session_id": manifest["session_id"],
            "dye_name": manifest["dye_name"],
            "mode": manifest["optimization_mode"],
            **params,
            **sust,
            "verification_hash": manifest["verification_hash"],
        }
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=list(row.keys()))
        writer.writeheader()
        writer.writerow(row)
        return buf.getvalue().encode(), "text/csv", f"{base}.csv"

    # PDF
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF_GENERATION_UNAVAILABLE")
    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    _, height = A4
    y = height - 60
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, y, "GreenDye Twin — Process Configuration")
    pdf.setFont("Helvetica", 10)
    y -= 30
    for label, value in _flatten(manifest):
        if y < 60:
            pdf.showPage()
            y = height - 60
            pdf.setFont("Helvetica", 10)
        pdf.drawString(50, y, f"{label}: {value}")
        y -= 16
    pdf.showPage()
    pdf.save()
    return buf.getvalue(), "application/pdf", f"{base}.pdf"


def _flatten(d: dict, prefix: str = "") -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.extend(_flatten(v, f"{key}."))
        elif isinstance(v, list):
            out.append((key, f"[{len(v)} items]"))
        else:
            out.append((key, str(v)))
    return out
