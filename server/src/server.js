const hapi = require("@hapi/hapi");
const api = require("./api");
const views = require("./views");
const services = require("./services");

async function start() {
  const server = hapi.server({
    port: 8000,
    host: "0.0.0.0"
  });

  await server.register(api, {
    routes: {
      prefix: "/api"
    }
  });

  await server.register(views);
  await server.register(services);

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
