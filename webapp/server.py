#!/usr/bin/env python3
"""
R2B チェックリスト・進捗ビューア
"""

from fastapi import FastAPI

from routers import (
    domains,
    home,
    items,
    sprint_checklist,
    sprint_deliverables,
    sprint_overview,
    sprint_quiz,
)

app = FastAPI(title="R2B Progress Viewer")

app.include_router(home.router)
app.include_router(sprint_overview.router)
app.include_router(sprint_checklist.router)
app.include_router(sprint_quiz.router)
app.include_router(sprint_deliverables.router)
app.include_router(domains.router)
app.include_router(items.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
