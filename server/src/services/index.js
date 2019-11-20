const slonik = require("slonik");
const _ = require("lodash");
const pg = require("pg");

const services = [
  require("./events.service"),
  require("./user.service"),
  require("./groups.service"),
  require("./shortlinks.service")
];

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
    });

    server.decorate("toolkit", "loginAndRedirectUser", async function(
      user,
      redirect = false
    ) {
      const token = await server.getService("user").generateLoginToken(user.id);
      const redirectPath = this.request.state.login_redirect || "/";
      this.unstate("login_redirect");
      this.state("user", token);
      if (!redirect) {
        return this.response({
          path: redirectPath
        }).code(200);
      } else {
        return this.redirect(redirectPath);
      }
    });

    server.decorate("toolkit", "toLogin", function() {
      //Check for same domain.
      const location = `/login?redirect_to=${this.request.path}`;
      const res = this.response();
      this.state("turbo_redirect", location);
      return res.redirect(location);
    });

    server.decorate("toolkit", "turboRedirect", function(path) {
      this.state("turbo_redirect", path);

      return this.redirect(path);
    });

    server.decorate("request", "loggedIn", function() {
      return !!this.app.user;
    });

    server.decorate("request", "userId", function() {
      return _.get(this, "app.user.id");
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
            slonik.sql`select * from logins where id = ${token} and expires > now()`
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
  const config = {
    user: process.env["DB_USER"],
    host: process.env["DB_HOST"],
    password: process.env["DB_PASSWORD"],
    database: process.env["DB_DATABASE"],
    port: process.env["DB_PORT"],
    connectionTimeoutMillis: 60000,
    ssl: process.env["DB_SSL"]
  };

  const connection = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}?ssl=${config.ssl}`;

  const db = slonik.createPool(connection, {
    connectionTimeout: config.connectionTimoutMillis
  });

  server.app.db = db;
}
