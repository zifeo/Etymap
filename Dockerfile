FROM tiangolo/uwsgi-nginx-flask:python3.6

COPY server /app
COPY build /build