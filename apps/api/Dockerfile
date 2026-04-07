FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY pyproject.toml README.md alembic.ini ./
COPY alembic ./alembic
COPY src ./src

RUN pip install --no-cache-dir .

ENV PYTHONPATH=/app/src

CMD ["uvicorn", "gp_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
