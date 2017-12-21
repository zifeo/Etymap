FROM tiangolo/uwsgi-nginx-flask:python3.6

COPY server /app/app
COPY build /app/build
COPY data /app/data
COPY uwsgi.ini /app/uwsgi.ini