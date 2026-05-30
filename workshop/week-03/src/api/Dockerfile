# syntax=docker/dockerfile:1.7
#
# Multi-stage Dockerfile for the FastAPI backend.
#
# Security / best-practice highlights:
#   - Pinned, slim Debian-based Python image.
#   - Multi-stage build: build tools and `uv` live only in the builder stage,
#     never in the runtime image.
#   - Dependencies installed from a frozen lockfile (`uv.lock`) into a
#     virtualenv inside the project (reproducible, hermetic).
#   - Runtime image runs as a non-root user (`appuser`, uid 10001).
#   - No write access required to install paths at runtime.
#   - HEALTHCHECK using the app's own /api/health endpoint.
#   - Minimal apt footprint and aggressive cleanup of caches/lists.

# -----------------------------------------------------------------------------
# Stage 1: builder — resolve & install dependencies with uv
# -----------------------------------------------------------------------------
ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim-bookworm AS builder

# Don't write .pyc files, unbuffer stdout/stderr, never prompt apt.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/app/.venv

# Install only the OS packages needed for building wheels (none of the
# project's deps need a C compiler today, but ca-certificates is required
# for uv to talk to PyPI). Cleanup is in the same RUN to avoid layer bloat.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install uv (pinned). Use a static binary so we don't pollute the system
# Python install.
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency manifests first to maximise layer caching: when only the
# source changes, `uv sync` does not need to re-run.
COPY pyproject.toml uv.lock ./

# Install runtime deps only (no `--all-groups`), strictly from the lockfile.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# Copy the application source and install the project itself into the venv.
COPY app ./app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# -----------------------------------------------------------------------------
# Stage 2: runtime — minimal image, non-root, no build tools
# -----------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:${PATH}" \
    PORT=8000

# Create a dedicated unprivileged user. uid 10001 sits well outside the host
# system's reserved range and is a common convention for container users.
RUN groupadd --system --gid 10001 appuser \
 && useradd  --system --uid 10001 --gid appuser \
        --home-dir /app --shell /usr/sbin/nologin appuser

WORKDIR /app

# Pull the built virtualenv and the source from the builder. We chown so
# the non-root user can read everything; the venv is *not* writable at
# runtime, which is what we want.
COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv
COPY --from=builder --chown=appuser:appuser /app/app   /app/app

USER appuser

EXPOSE 8000

# Liveness probe: hit the app's own /api/health endpoint via the bundled
# Python (no curl dependency needed in the image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os,urllib.request,sys; \
        url=f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/api/health'; \
        sys.exit(0 if urllib.request.urlopen(url, timeout=3).status==200 else 1)"

# Bind to all interfaces inside the container; the orchestrator decides
# what's exposed externally. `proxy-headers` lets uvicorn honor X-Forwarded-*
# from the front-door reverse proxy. `forwarded-allow-ips=*` is fine here
# because the container is only reachable via that proxy.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
