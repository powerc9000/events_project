module.exports = {
  name: "Api",
  register: async function(server, options) {
    server.route({
      method: "POST",
      path: "/events",
      handler: createEvent
    });
  }
};

async function createEvent(req, h) {
  const events = server.getService("events");

  const result = await events.createEvent(req.app.user, req.payload);

  return result;
}
