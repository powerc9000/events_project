const joi = require("@hapi/joi");
let server;
module.exports = {
  name: "Api",
  register: async function(hapiServer, options) {
    server = hapiServer;
    server.route({
      method: "POST",
      path: "/events",
      handler: createEvent,
      options: {
        validate: {
          payload: joi.object({
            name: joi.string().required(),
            description: joi.string()
          })
        }
      }
    });
  }
};

async function createEvent(req, h) {
  const events = server.getService("events");

  const result = await events.createEvent(req.app.user, req.payload);

  return result;
}
