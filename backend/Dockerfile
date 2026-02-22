FROM python:3.10-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
# Standard lightweight build
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port 7860"
