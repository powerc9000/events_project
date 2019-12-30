const sql = require("slonik").sql;

module.exports = (server) => async (job) => {
  server.log(["taskWorker", "notifications"], {
    type: job.data.type,
    status: "started",
    jobId: job.id
  });
  try {
    const type = job.data.type;
    const data = job.data.taskData;
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

    if (type === "check-event-digest") {
      const users = await server.getService("events").getUpcomingEventsDigest();
      users.forEach((user) => {
        if (user.events) {
          server.createTask("upcoming-events-digest", {
            user,
            events: user.events
          });
        }
      });
    }
    if (type === "user-did-login") {
      if (data.count === 1) {
        server.createTask("user-first-login", {
          user: data.user
        });
      }
    }

    if (type === "event-date-changed" || type === "event-location-changed") {
      const users = await server.app.db.any(
        sql`SELECT users.*, invites.invite_key from users inner join invites on invites.user_id = users.id where invites.event_id = ${data.event.id}`
      );

      let taskType = `notify-user-${type}`;

      users.forEach((user) => {
        server.createTask(taskType, {
          event: data.event,
          invite: {
            invite_key: user.invite_key
          },
          user
        });
      });
    }

    server.log(["taskWorker", "notifications"], {
      type: job.data.type,
      status: "complete",
      jobId: job.id
    });
  } catch (e) {
    server.log(["taskWorker", "notifications", "error"], {
      type: job.data.type,
      status: "failed",
      error: e,
      jobId: job.id
    });
    console.log(e);
  }
};
