FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --no-input

EXPOSE 8000

# Apply database migrations on every start, then serve. Render provides $PORT.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn tab.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]