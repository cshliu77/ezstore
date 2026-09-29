FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml .
RUN uv pip install --system --no-cache -r pyproject.toml

COPY . .

EXPOSE 8080

ENV ALLOW_ORIGINS="http://localhost:3000"

CMD adk api_server --host 0.0.0.0 --port 8080 --allow_origins "$ALLOW_ORIGINS" .
