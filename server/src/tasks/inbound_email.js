module.exports = (server) => async (job) => {
  const task = job.data;
  const data = task.taskData;

  if (task.type === "inbound-email") {
    const eventService = server.getService("events");
    const userService = server.getService("user");

    const user = await userService.findUserByEmail(data.FromFull.Email);

    if (!user) {
      //They need to create an account. I think I want to do that.
      //Beucase we need time zone etc for it.
      //
      return;
    }
    console.log(data);
    const messageIdHeader = data.Headers.find((h) => {
      return h.Name === "Message-ID";
    });
    const messageId = messageIdHeader.Value;
    try {
      const event = await eventService.createEvent(user, {
        name: data.Subject,
        description: data.TextBody,
        date: Date.now(),
        is_private: true,
        allow_comments: true,
        show_participants: true,
        source: "email",
        email_message_id: messageId
      });

      await eventService.inviteUsersToEvent(
        event.id,
        data.ToFull.filter((to) => {
          return (
            to.Email.indexOf("postmarkapp.com") === -1 &&
            to.Email.indexOf("stem.junipercity.com") === -1
          );
        }).map((to) => {
          return {
            email: to.Email,
            name: to.Name
          };
        })
      );

      server.createTask("create-event-pingback", {
        user,
        event,
        subject: data.Subject
      });
    } catch (e) {
      console.log(e);
    }
  }
  return true;
};
