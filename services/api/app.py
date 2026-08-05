import os
from pathlib import Path

import certifi
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from runtime_config import load_web_environment

load_web_environment()

# Python.org macOS builds do not always inherit a usable system CA bundle.
# Configure a maintained trust store before MediaPipe imports; its first heavy
# pose run downloads the model through urllib.
os.environ.setdefault("SSL_CERT_FILE", certifi.where())

from routes.analysis import router as analysis_router
from routes.context_safety import router as context_safety_router
from ontology_runtime.acecoach_ontology.loader import OntologyBundle, OntologyError

API_VERSION = "1.9.0"
ONTOLOGY_BUNDLE_PATH = Path(__file__).resolve().parent / "ontology" / "v2.2.0"


def _load_ontology_bundle() -> tuple[OntologyBundle | None, str]:
    try:
        bundle = OntologyBundle.load(ONTOLOGY_BUNDLE_PATH)
    except OntologyError:
        return None, "unavailable"
    version = str(bundle.manifest.get("version", "unknown"))
    return bundle, version


ontology_bundle, ontology_version = _load_ontology_bundle()

app = FastAPI(
    title="AceCoach AI Analysis API",
    version=API_VERSION,
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development").lower() != "production" else None,
    redoc_url=None,
)
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Analysis-API-Key"],
)
app.include_router(analysis_router)
app.include_router(context_safety_router)

if ontology_bundle is not None:
    app.state.ontology_bundle = ontology_bundle
app.state.ontology_version = ontology_version


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "analysis-api",
        "version": API_VERSION,
        "ontology_version": app.state.ontology_version,
    }
