FROM node:10.16.3

RUN mkdir -p /var/www/events

WORKDIR /var/www/events

RUN npm install -g nodemon

COPY ./server server
COPY ./client/templates templates
COPY ./client/build client


RUN cd server && npm install --verbose

RUN cd server && ls node_modules


