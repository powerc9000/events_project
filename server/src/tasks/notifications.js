module.exports = (server) => async (job) => {
  try {
    const type = job.data.type;
    const data = job.data.taskData;
    console.log("notification queue");

    if (job.data.type === "check-comments") {
      const users = await server.getService("events").getEventsCommentDigest();

      users.forEach((user) => {
        if (user.events) {
          server.createTask("event-comments", {
            user,
            events: user.events
          });
        }
      });
    }

    if (type === "event-created") {
      if (data.event.group_id) {
        const groupService = server.getService("groups");
        const group = await groupService.getGroup(data.event.group_id);
        const members = await groupService.getGroupMembers(group.id);
        members.forEach((member) => {
          server.createTask("notify-group-member-about-event", {
            member,
            group,
            event: data.event
          });
        });
      }
    }

    if (type === "upcoming-event-digest") {
      const users = await server.getService("events").getUpcomingEventsDigest();
      console.log(users);
      users.forEach((user) => {
        console.log(user);
        if (user.events) {
          server.createTask("upcoming-events", {
            user,
            events: user.events
          });
        }
      });
    }
  } catch (e) {
    console.log(e);
  }
};
