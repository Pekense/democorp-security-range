import asyncio
import os
from copy import deepcopy
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from time import monotonic
from typing import Any, Callable, Literal
from uuid import uuid4

import yaml
from pydantic import BaseModel, Field, ValidationError

from app.models import DiscoveredTool


SecurityVariant = Literal["vulnerable", "safe", "patched"]


class PolicyConfigurationError(Exception):
    """Raised when the operational security policy is missing or invalid."""


class PrivilegedActionsPolicy(BaseModel):
    require_human_confirmation: bool
    confirmation_ttl_seconds: int = Field(gt=0, le=3600)


class PolicyConfig(BaseModel):
    security_variant: SecurityVariant
    policy_origin: Literal["baseline_unenforced", "secure_by_design", "mitigation_applied"]
    privileged_actions: PrivilegedActionsPolicy


class ConfirmationStatus(StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


@dataclass
class PendingConfirmation:
    confirmation_id: str
    request_id: str
    trace_id: str
    tool_name: str
    tool_arguments: dict[str, Any]
    user_message: str
    created_at: float
    expires_at: float
    status: ConfirmationStatus = ConfirmationStatus.PENDING


class ConfirmationStore:
    def __init__(
        self,
        ttl_seconds: int,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self.ttl_seconds = ttl_seconds
        self.clock = clock
        self._confirmations: dict[str, PendingConfirmation] = {}
        self._lock = asyncio.Lock()

    async def create(
        self,
        request_id: str,
        trace_id: str,
        tool_name: str,
        tool_arguments: dict[str, Any],
        user_message: str,
    ) -> PendingConfirmation:
        now = self.clock()
        confirmation = PendingConfirmation(
            confirmation_id=str(uuid4()),
            request_id=request_id,
            trace_id=trace_id,
            tool_name=tool_name,
            tool_arguments=deepcopy(tool_arguments),
            user_message=user_message,
            created_at=now,
            expires_at=now + self.ttl_seconds,
        )
        async with self._lock:
            self._confirmations[confirmation.confirmation_id] = confirmation
        return confirmation

    async def peek(self, confirmation_id: str) -> PendingConfirmation | None:
        async with self._lock:
            confirmation = self._confirmations.get(confirmation_id)
            if confirmation is None or confirmation.status is not ConfirmationStatus.PENDING:
                return None
            if self.clock() >= confirmation.expires_at:
                return None
            return deepcopy(confirmation)

    async def consume(self, confirmation_id: str) -> PendingConfirmation | None:
        async with self._lock:
            confirmation = self._confirmations.get(confirmation_id)
            if confirmation is None or confirmation.status is not ConfirmationStatus.PENDING:
                return None
            if self.clock() >= confirmation.expires_at:
                confirmation.status = ConfirmationStatus.EXPIRED
                return None

            confirmation.status = ConfirmationStatus.CONFIRMED
            return deepcopy(confirmation)


class PolicyEnforcer:
    def __init__(self, config: PolicyConfig) -> None:
        self.config = config

    @property
    def security_variant(self) -> SecurityVariant:
        return self.config.security_variant

    def requires_confirmation(self, tool: DiscoveredTool) -> bool:
        return (
            tool.classification == "PRIVILEGED"
            and self.config.privileged_actions.require_human_confirmation
        )


def load_policy_from_environment() -> PolicyConfig:
    variant = os.getenv("SECURITY_VARIANT", "safe")
    if variant not in {"vulnerable", "safe", "patched"}:
        raise PolicyConfigurationError(f"Unsupported SECURITY_VARIANT: {variant}")

    config_root = Path(os.getenv("FINANCE_AGENT_CONFIG_ROOT", "/configs"))
    config_path = config_root / variant / "finance-agent.yml"
    if not config_path.is_file():
        raise PolicyConfigurationError(f"Finance Agent policy not found: {config_path}")

    try:
        with config_path.open("r", encoding="utf-8") as config_file:
            raw_config = yaml.safe_load(config_file)
        config = PolicyConfig.model_validate(raw_config)
    except (OSError, ValidationError, yaml.YAMLError) as exc:
        raise PolicyConfigurationError("Finance Agent policy is invalid") from exc

    if config.security_variant != variant:
        raise PolicyConfigurationError("Policy variant does not match SECURITY_VARIANT")

    expected_confirmation = variant in {"safe", "patched"}
    if config.privileged_actions.require_human_confirmation != expected_confirmation:
        raise PolicyConfigurationError("Policy does not match the selected security variant")

    return config
