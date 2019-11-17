module.exports = (server) => async (job) => {
  const type = job.data.type;
  const data = job.data.taskData;

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

  if (type === "event-created") {
    try {
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
    } catch (e) {
      console.log(e);
    }
  }
};
