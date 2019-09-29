const services = [require("./events.service")];
const _ = require("lodash");
const pg = require("pg");

module.exports = {
  name: "services",
  register: async (server) => {
    server.app.services = {};
    services.forEach((service) => {
      service.init(server);
      server.app.services[service.name] = service;
    });

    server.decorate("server", "getService", (name) => {
      return _.get(server, ["app", "services", name]);
    });

    initDb(server);
  }
};

async function initDb(server) {
  const db = new pg.Pool({
    user: process.env["DB_USER"],
    host: process.env["DB_HOST"],
    password: process.env["DB_PASSWORD"],
    database: process.env["DB_DATABASE"],
    port: process.env["DB_PORT"],
    connectionTimeoutMillis: 60000
  });

  server.app.db = db;
}
