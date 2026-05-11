FROM python:3.11-slim

WORKDIR /app

COPY social-trends-api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY social-trends-api/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
