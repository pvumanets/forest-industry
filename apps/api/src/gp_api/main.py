from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from gp_api.config import get_settings
from gp_api.routers import auth, dashboard_read, outlets_read, reports_read, submissions, weeks

app = FastAPI(title="Grove Pulse API", openapi_url="/api/openapi.json")

_s = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_s.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")


@api_router.get("/health")
def health() -> JSONResponse:
    return JSONResponse(
        content={"status": "ok", "service": "grove-pulse-api"},
    )


api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(weeks.router, prefix="/weeks")
api_router.include_router(outlets_read.router, prefix="/outlets")
api_router.include_router(submissions.router, prefix="/submissions")
api_router.include_router(dashboard_read.router, prefix="/dashboard")
api_router.include_router(reports_read.router, prefix="/reports")
app.include_router(api_router)
