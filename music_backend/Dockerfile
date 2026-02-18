# Base Image עם Python
FROM python:3.12-slim-bullseye


# מגדירים סביבה
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# התקנת ffmpeg וכלי build
RUN apt-get update && \
    apt-get install -y ffmpeg curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# עבודה בתיקייה /app
WORKDIR /app

# העתקת הקבצים של הפרויקט
COPY . /app

# התקנת תלותיות Python
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Expose פורט 8080 ל־Render
EXPOSE 8080

# הפעלת השרת
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080"]
