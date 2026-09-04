import os

import httpx
from pydantic import ValidationError

from app.models import CustomerData, OrderData


BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://backend-api:8000").rstrip("/")
BACKEND_TIMEOUT_SECONDS = 5.0


class BackendClientError(Exception):
    """A safe, consumer-facing Backend API failure."""


class BackendClient:
    def __init__(
        self,
        base_url: str = BACKEND_API_URL,
        timeout: float = BACKEND_TIMEOUT_SECONDS,
    ) -> None:
        self.base_url = base_url
        self.timeout = timeout

    async def get_customer(
        self,
        customer_id: str,
        request_id: str,
        trace_id: str,
    ) -> CustomerData | None:
        data = await self._get(
            f"/customers/{customer_id}",
            request_id=request_id,
            trace_id=trace_id,
        )
        if data is None:
            return None

        try:
            return CustomerData.model_validate(data)
        except ValidationError as exc:
            raise BackendClientError("Backend API returned invalid customer data") from exc

    async def get_order(
        self,
        order_id: str,
        request_id: str,
        trace_id: str,
    ) -> OrderData | None:
        data = await self._get(
            f"/orders/{order_id}",
            request_id=request_id,
            trace_id=trace_id,
        )
        if data is None:
            return None

        try:
            return OrderData.model_validate(data)
        except ValidationError as exc:
            raise BackendClientError("Backend API returned invalid order data") from exc

    async def _get(
        self,
        path: str,
        request_id: str,
        trace_id: str,
    ) -> dict | None:
        headers = {
            "X-Request-ID": request_id,
            "X-Trace-ID": trace_id,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}{path}", headers=headers)
        except httpx.TimeoutException as exc:
            raise BackendClientError("Backend API request timed out") from exc
        except httpx.RequestError as exc:
            raise BackendClientError("Backend API is unavailable") from exc

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            raise BackendClientError("Backend API returned an unexpected response")

        try:
            return response.json()
        except ValueError as exc:
            raise BackendClientError("Backend API returned invalid JSON") from exc
