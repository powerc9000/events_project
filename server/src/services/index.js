const services = [require("./events.service"), require("./user.service")];
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

    server.ext({
      type: "onPreHandler",
      method: async function(req, h) {
        const user = await req.getLoggedInUser();
        return h.continue;
      }
    });

    server.decorate("server", "getService", (name) => {
      return _.get(server, ["app", "services", name]);
    });

    server.decorate("toolkit", "loginUser", async function(user) {
      const token = await server.getService("user").generateLoginToken(user.id);
      this.state("user", token);
      return this.response().code(204);
    });

    server.decorate("request", "getLoggedInUser", async function() {
      if (this.app.user) {
        return this.app.user;
      }
      const token = _.get(this, "state.user.token.id", null);
      let user = null;
      if (token) {
        try {
          const tokenQuery = await this.server.app.db.query(
            "select * from logins where id = $1 and expires > now()",
            [token]
          );

          if (tokenQuery.rows.length) {
            user = await server
              .getService("user")
              .findById(tokenQuery.rows[0].user_id);
          }
        } catch (e) {
          console.log(e);
        }
      }

      this.app.user = user;
      return this.app.user;
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
