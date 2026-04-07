from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class WeekSelectableItem(BaseModel):
    week_start: date = Field(description="Понедельник отчётной недели (YYYY-MM-DD)")
    label: str = Field(description="Подпись для UI")


class OutletListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    code: str
    display_name: str
    is_virtual: bool
