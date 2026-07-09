FROM python:3.11-slim
WORKDIR /app

# InsightFace / OpenCV native deps.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# The buffalo_l model downloads to /root/.insightface on first run — mount a
# volume there (see compose) so it isn't re-downloaded on every restart.
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
