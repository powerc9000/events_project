FROM node:10.16.3

RUN mkdir -p /var/www/events
ADD server/ca-certificate.crt /usr/local/share/ca-certificates/DO-PG-CA.crt
RUN chmod 644 /usr/local/share/ca-certificates/DO-PG-CA.crt && update-ca-certificates

WORKDIR /var/www/events

RUN npm install -g nodemon
COPY ./server/package.json server/package.json
RUN cd server && npm install --verbose --only=prod

COPY ./server/src server/src
COPY ./client/templates templates
COPY ./client/build client
COPY ./server/mutual-aid.json server

