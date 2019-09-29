const vision = require("@hapi/vision");
const ejs = require("ejs");
const path = require("path");

module.exports = {
  name: "views",
  register: async (server, options) => {

    await server.register(vision);

    server.views({
      engines: {ejs},
      relativeTo: path.join(__dirname, "../../../", "client", "templates")
    })

    server.route({
      method: "GET",
      path: "/",
      handler: homepage
    })
  }
}


async function homepage(req, h){
  return h.view("homepage");
}