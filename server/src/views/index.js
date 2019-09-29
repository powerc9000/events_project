const vision = require("@hapi/vision");
const ejs = require("ejs");
const path = require("path");

let server;

module.exports = {
  name: "views",
  register: async (hapiServer, options) => {
    server = hapiServer;
    await server.register(vision);

    server.views({
      engines: { ejs },
      relativeTo: path.join(__dirname, "../../../", "client", "templates"),
      isCached: process.env.NODE_ENV !== "develop"
    });

    server.route({
      method: "GET",
      path: "/",
      handler: homepage
    });
  }
};

async function homepage(req, h) {
  const events = await server.app.services.events.getAllEventsForUser();
  return h.view("homepage");
}
