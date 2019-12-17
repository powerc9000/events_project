let server;
const ics = require("ical.js");
module.exports = (hapiServer) => {
  server = hapiServer;

  return async (job) => {
    const task = job.data;
    const data = task.taskData;

    if (task.type === "inbound-email") {
      const juniperCityEmail = data.ToFull.find((from) => {
        return from.Email.indexOf("junipercity.com") > -1;
      });
      if (!juniperCityEmail) {
        return;
      }
      if (juniperCityEmail.Email.indexOf("invites") > -1) {
        try {
          inviteResponse(data);
        } catch (e) {
          console.log(e);
        }
      }

      if (juniperCityEmail.Email.indexOf("events") > -1) {
        bulkInvite(data);
      }
      if (juniperCityEmail.Email.indexOf("invite_reply") > -1) {
        replyToInvite(data);
      }
    }
  };
};
const statusMap = {
  ACCEPTED: "going",
  DECLINED: "declined",
  TENTATIVE: "maybe"
};
async function inviteResponse(data) {
  const eventsService = server.getService("events");
  const userService = server.getService("user");
  if (data.Attachments) {
    const attachment = data.Attachments.find((attach) => {
      return attach.ContentType.indexOf("text/calendar") > -1;
    });

    if (attachment) {
      const file = Buffer.from(attachment.Content, "base64").toString("utf-8");
      // Get the basic data out
      const jCalData = ics.parse(file);
      const comp = new ics.Component(jCalData);

      // Fetch the VEVENT part
      const vevent = comp.getFirstSubcomponent("vevent");

      const status = vevent
        .getFirstProperty("attendee")
        .getParameter("partstat");

      const eventId = vevent.getFirstPropertyValue("uid");
      const userId = vevent.getFirstPropertyValue("x-user-id");
      if (!userId || !eventId) {
        return;
      }

      const canRSVP = await eventsService.canRSVPToEvent(eventId, userId);

      if (!canRSVP) {
        return;
      }

      await eventsService.rsvpToEvent(
        eventId,
        userId,
        statusMap[status] || "maybe",
        false
      );
    }
  }
}

async function replyToInvite(data) {
  const eventService = server.getService("events");
  const userService = server.getService("user");
  const event = await eventService.getEventByEmailHash(data.MailboxHash);
  if (!event) {
    return;
  }
  const user = await userService.findById(event.creator);
  if (!user) {
    return;
  }

  server.createTask("event-invite-email-was-replied-to", {
    event,
    user,
    from: data.FromFull.Email,
    content: data.HtmlBody || data.TextBody
  });
}

async function bulkInvite(data) {
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
