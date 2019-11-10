module.exports = (server) => async (job) => {
  console.log(job.data);
  if (job.data.type === "check-comments") {
    try {
      const users = await server.getService("events").getEventsCommentDigest();

      users.forEach((user) => {
        if (user.events) {
          server.createTask("event-comments", {
            user,
            events: user.events
          });
        }
      });
    } catch (e) {
      console.log(e);
    }
  }
};
