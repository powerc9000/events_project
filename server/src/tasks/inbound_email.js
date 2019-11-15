module.exports = (server) => async (job) => {
  const task = job.data;
  const data = task.taskData;

  if (task.type === "inbound-email") {
    try {
      const eventService = server.getService("events");
      const userService = server.getService("user");

      const user = await userService.findUserByEmail(data.FromFull.Email);
      const allToAddr = data.ToFull.filter((to) => {
        return to.MailboxHash !== data.MailboxHash;
      }).map((to) => {
        return {
          name: to.Name || "",
          email: to.Email
        };
      });

      if (!user) {
        //They need to create an account. I think I want to do that.
        //Beucase we need time zone etc for it.
        console.log("no user");
        return;
      }
      console.log(data.MailboxHash);
      const event = await eventService.getEventByEmailHash(data.MailboxHash);

      if (!event) {
        console.log("no event");
        return;
      }

      const canInvite = await eventService.canInviteToEvent(event.id, user.id);

      if (!canInvite) {
        console.log("can't invite");
        return;
      }
      console.log(allToAddr);
      await eventService.inviteUsersToEvent(event.id, allToAddr);
      console.log("complete");
    } catch (e) {
      console.log(e);
    }
  }
  return true;
};
