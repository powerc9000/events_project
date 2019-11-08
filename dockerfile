FROM node:10.16.3

RUN mkdir -p /var/www/events

WORKDIR /var/www/events

RUN npm install -g nodemon
COPY ./server/package.json server/package.json
RUN cd server && npm install --verbose --only=prod

COPY ./server/src server/src
COPY ./client/templates templates
COPY ./client/build client



RUN cd server && ls node_modules


