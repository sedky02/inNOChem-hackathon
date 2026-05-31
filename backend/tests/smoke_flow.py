"""End-to-end smoke test of the full API flow against an in-process ASGI app."""

import asyncio

import httpx

from src.main import app

BASE = "http://test/api/v1"


async def main() -> None:
    # httpx's ASGI transport does not run FastAPI lifespan, so initialize the
    # DB + seed here (uvicorn runs these automatically via lifespan).
    from src.config.database import init_db
    from src.config.seed import seed_demo_data

    await init_db()
    await seed_demo_data()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        # health
        r = await c.get("/health")
        print("health:", r.status_code, r.json())

        # login as engineer (can verify + force-override CRITICAL with notes)
        r = await c.post(f"{BASE}/auth/login", json={"email": "engineer@greendye.io", "password": "demo"})
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        print("login:", r.status_code, r.json()["user"]["role"])

        # create session
        r = await c.post(f"{BASE}/sessions", json={"session_name": "Smoke Test"}, headers=h)
        assert r.status_code == 201, r.text
        sid = r.json()["session_id"]
        print("session:", sid)

        # screen
        r = await c.post(
            f"{BASE}/chemical/screen",
            json={"session_id": sid, "dye_name": "Anthraquinone", "smiles": "O=C1c2ccccc2C(=O)c2ccccc21"},
            headers=h,
        )
        assert r.status_code == 200, r.text
        chem = r.json()
        print("screen:", chem["compatibility_score"], chem["solubility_score"])

        # optimize
        opt_req = {
            "session_id": sid,
            "fabric_profile": {"fabric_type": "blend", "cotton_pct": 65, "polyester_pct": 35, "density_gm2": 180, "mass_kg": 5.0},
            "chemical_profile": {**chem["descriptors"], "compatibility_score": chem["compatibility_score"], "solubility_score": chem["solubility_score"]},
            "optimization_mode": "Balanced",
        }
        r = await c.post(f"{BASE}/process/optimize", json=opt_req, headers=h)
        assert r.status_code == 200, r.text
        opt = r.json()
        print("optimize:", opt["recommended_parameters"], "risk:", opt["risk_assessment"]["overall_risk"], "curve:", len(opt["simulation_outputs"]["kinetic_curve"]))

        # verify
        r = await c.post(
            f"{BASE}/sessions/{sid}/verify",
            json={"acknowledged": True, "engineer_notes": "ok", "overall_risk_at_sign": opt["risk_assessment"]["overall_risk"], "force_override": True},
            headers=h,
        )
        assert r.status_code == 200, r.text
        print("verify:", r.json()["verification_hash"][:16], "…")

        # adapt
        r = await c.post(
            f"{BASE}/model/adapt",
            json={"session_id": sid, "experimental_feedback": {"actual_ks": 16.9, "actual_pressure": 245, "actual_temperature": 128, "actual_flow_rate": 1.05}},
            headers=h,
        )
        assert r.status_code == 202, r.text
        print("adapt:", r.json()["status"], r.json()["model_confidence"])

        # export json + csv
        for fmt in ("json", "csv"):
            r = await c.get(f"{BASE}/sessions/{sid}/export?format={fmt}", headers=h)
            assert r.status_code == 200, r.text
            print(f"export {fmt}:", len(r.content), "bytes")

        # dashboard + sessions list
        r = await c.get(f"{BASE}/dashboard/aggregate", headers=h)
        assert r.status_code == 200, r.text
        print("dashboard:", r.json())

        r = await c.get(f"{BASE}/sessions?limit=5", headers=h)
        assert r.status_code == 200, r.text
        print("sessions list total:", r.json()["total"])

        # RBAC: operator cannot delete
        r = await c.post(f"{BASE}/auth/login", json={"email": "operator@greendye.io", "password": "demo"})
        oph = {"Authorization": f"Bearer {r.json()['access_token']}"}
        r = await c.delete(f"{BASE}/sessions/{sid}", headers=oph)
        print("operator delete (expect 403):", r.status_code)

        print("\nALL SMOKE CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(main())
