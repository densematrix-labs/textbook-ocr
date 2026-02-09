from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import APIRouter, Response
import os

TOOL_NAME = os.getenv("TOOL_NAME", "textbook-ocr")

# HTTP metrics
http_requests = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["tool", "endpoint", "method", "status"]
)

http_request_duration = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration",
    ["tool", "endpoint", "method"]
)

# Business metrics
ocr_requests = Counter(
    "ocr_requests_total",
    "Total OCR requests",
    ["tool", "file_type"]
)

tokens_consumed = Counter(
    "tokens_consumed_total",
    "Total tokens consumed",
    ["tool"]
)

free_trial_used = Counter(
    "free_trial_used_total",
    "Free trial uses",
    ["tool"]
)

payment_success = Counter(
    "payment_success_total",
    "Successful payments",
    ["tool", "product_sku"]
)

payment_revenue = Counter(
    "payment_revenue_cents_total",
    "Total revenue in cents",
    ["tool"]
)

# SEO metrics
page_views = Counter(
    "page_views_total",
    "Page views",
    ["tool", "page"]
)

crawler_visits = Counter(
    "crawler_visits_total",
    "Crawler visits",
    ["tool", "bot"]
)

programmatic_pages = Gauge(
    "programmatic_pages_count",
    "Number of programmatic SEO pages",
    ["tool"]
)

# Metrics router
metrics_router = APIRouter()


@metrics_router.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
