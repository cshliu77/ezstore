FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.20 /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY server.py ./

EXPOSE 8000

ENV MCP_HOST=0.0.0.0 \
    MCP_PORT=8000

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD uv run --no-sync python -c "import httpx,sys; r=httpx.post('http://127.0.0.1:8000/mcp', json={'jsonrpc':'2.0','id':1,'method':'ping'}, headers={'Accept':'application/json, text/event-stream','Content-Type':'application/json'}); sys.exit(0 if r.status_code < 500 else 1)"

CMD ["uv", "run", "--no-sync", "python", "server.py"]
