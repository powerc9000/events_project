module.exports = (server) => async (job) => {
  console.log(job.data);
  if (job.data.type === "check-comments") {
    try {
      const events = await server.getService("events").getEventsCommentDigest();

      events.forEach((event) => {
        if (event.invites) {
          event.invites.forEach((invite) => {
            if (invite.user.id === event.creator.id) return;
            server.createTask("event-comments", {
              invite,
              event
            });
          });
        }
        server.createTask("event-comments", {
          event,
          invite: {
            user: event.creator
          }
        });
      });
    } catch (e) {
      console.log(e);
    }
  }
};
