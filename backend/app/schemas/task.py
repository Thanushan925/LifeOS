import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

TaskStatus = Literal["pending", "in_progress", "completed"]
TaskPriority = Literal["low", "medium", "high"]
TaskTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
TaskDescription = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]
TaskDuration = Annotated[int, Field(strict=True, ge=1, le=10080)]


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: TaskTitle
    description: TaskDescription | None = None
    status: TaskStatus = "pending"
    priority: TaskPriority = "medium"
    estimated_minutes: TaskDuration = 30
    due_date: date | None = None


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: TaskTitle | None = None
    description: TaskDescription | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    estimated_minutes: TaskDuration | None = None
    due_date: date | None = None

    @field_validator("title", "status", "priority", "estimated_minutes")
    @classmethod
    def reject_explicit_null(cls, value):
        # Omitted fields are unchanged; only description and due_date can be cleared.
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    estimated_minutes: int
    due_date: date | None
    created_at: datetime
    updated_at: datetime
