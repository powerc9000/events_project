const hapi = require("@hapi/hapi");
const api = require("./api");
const views = require("./views");
const aws = require("aws-sdk");
const services = require("./services");
const tasks = require("./tasks");
const fetch = require("node-fetch");

global.__projectdir = "/var/www/events";
async function start() {
  const server = hapi.server({
    port: 8000,
    host: "0.0.0.0",
    routes: {
      cors: false,
      response: {
        failAction: "log"
      },
      validate: {
        failAction: async (request, h, err) => {
          if (process.env.NODE_ENV === "production") {
            // In prod, log a limited error message and throw the default Bad Request error.
            console.error("ValidationError:", err.message); // Better to use an actual logger here.
            throw Boom.badRequest(`Invalid request payload input`);
          } else {
            // During development, log and respond with the full error.
            console.error(err);
            throw err;
          }
        }
      }
    }
  });

  server.events.on("response", function(request) {
    if (!request.response) {
      return;
    }
    if (request.app.isStatic) {
      return;
    }

    request.log("info", {
      method: request.method.toUpperCase(),
      path: request.url.pathname,
      status: request.response.statusCode
    });
  });

  server.events.on("log", (event, tags) => {
    // if we ever need to log deep objects, see https://stackoverflow.com/questions/10729276/how-can-i-get-the-full-object-in-node-jss-console-log-rather-than-object
    const options = {
      depth: null
    };

    if (tags.error) {
      fetch(`${process.env.BASECAMP_LOG_CHAT}.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: `
						<details><summary>Server Error 🚨</summary><pre>${JSON.stringify(
              event,
              null,
              2
            )}</pre></details>
						`
        })
      });
    }

    if (process.env["NODE_ENV"] !== "production") {
      //Hard to see logs with worker counts in dev
      if (!tags.TaskWorker) {
        // if not tagged with TaskWorker, always log
        console.dir(
          {
            event,
            tags
          },
          options
        );
      } else if (!server.app.config.squelchTaskLogs) {
        // if tagged with TaskWorker but not squelching, then log too
        console.dir(
          {
            event,
            tags
          },
          options
        );
      } else {
        // if tagged with TaskWorker and squelching, then do nothing
      }
    } else {
      console.dir(
        {
          event,
          tags
        },
        options
      );
    }
  });

  server.events.on("request", (event, tags) => {
    // if we ever need to log deep objects, see https://stackoverflow.com/questions/10729276/how-can-i-get-the-full-object-in-node-jss-console-log-rather-than-object

    if (tags.error) {
      console.log(tags);
    } else {
      // For `request`, the `event` contains mostly information about the
      // the request, which is not very interesting if we just `request.log` something.
      console.log(tags);
    }
  });

  await server.register(api, {
    routes: {
      prefix: "/api"
    }
  });

  const Minute = 1000 * 60;
  const Hour = Minute * 60;
  const Day = Hour * 24;
  const _2Weeks = Day * 14;
  server.state("user", {
    ttl: _2Weeks,
    isSecure: false, //This server will never be listening on https the load balancer will handle that
    isHttpOnly: true,
    isSameSite: "Lax",
    path: "/",
    encoding: "base64json",
    clearInvalid: false, // remove invalid cookies
    strictHeader: true // don't allow violations of RFC 6265
  });

  server.state("session_key", {
    ttl: Hour,
    isSecure: false, //This server will never be listening on https the load balancer will handle that
    isHttpOnly: true,
    isSameSite: false,
    path: "/",
    encoding: "base64",
    clearInvalid: false, // remove invalid cookies
    strictHeader: true // don't allow violations of RFC 6265
  });

  server.state("turbo_redirect", {
    ttl: Hour,
    isSecure: false, //This server will never be listening on https the load balancer will handle that
    isHttpOnly: true,
    isSameSite: false,
    path: "/",
    encoding: "base64",
    clearInvalid: false, // remove invalid cookies
    strictHeader: true // don't allow violations of RFC 6265
  });

  server.state("login_redirect", {
    ttl: Hour,
    isSecure: false, //This server will never be listening on https the load balancer will handle that
    isHttpOnly: true,
    isSameSite: false,
    path: "/",
    encoding: "base64",
    clearInvalid: false, // remove invalid cookies
    strictHeader: true // don't allow violations of RFC 6265
  });

  await server.register(views);
  await server.register(services);
  await server.register(tasks);

  server.app.featureFlags = {};

  await server.start();

  console.log("server running");
}

process.on("uncaughtException", (e) => {
  console.log(e);
});

process.on("unhandledRejection", (e) => {
  console.log(e);
});

module.exports = {
  start
};
