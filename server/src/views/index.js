const vision = require("@hapi/vision");
const inert = require("@hapi/inert");
const ejs = require("ejs");
const path = require("path");

let server;

module.exports = {
  name: "views",
  register: async (hapiServer, options) => {
    server = hapiServer;

    await server.register(vision);
    await server.register(inert);

    server.views({
      engines: { ejs },
      relativeTo: path.join(__dirname, "../../../", "templates"),
      isCached: process.env.NODE_ENV !== "develop"
    });

    //The source map url gets mapped wrong from parcel...
    //I still like source maps so here it is
    server.route({
      method: "GET",
      path: "/static/main.css.map",
      handler: {
        file: path.join(__dirname, "../../../", "client", "css", "main.css.map")
      }
    });
    server.route({
      method: "GET",
      path: "/static/{param*}",
      handler: {
        directory: {
          path: path.join(__dirname, "../../../", "client"),
          listing: true
        }
      }
    });

    server.route({
      method: "GET",
      path: "/",
      handler: homepage
    });

    server.route({
      method: "GET",
      path: "/create",
      handler: createEvent
    });
  }
};

async function homepage(req, h) {
  const events = await server
    .getService("events")
    .getAllEventsForUser(req.app.user);
  console.log(events);
  return h.view("homepage");
}

async function createEvent(req, h) {
  return h.view("create");
}
