FROM postgres:9.6
ADD db.sql /docker-entrypoint-initdb.d

ENV POSTGRES_DB events 
