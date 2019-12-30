const mustache = require("mustache");
const fs = require("fs");
const mjml = require("mjml");
const path = require("path");
const postmark = require("postmark");
const client = new postmark.Client(process.env.POSTMARK_API_KEY);
const nj = require("nunjucks");
const nunjucks = new nj.Environment();

const fns = require("date-fns");
const fnsz = require("date-fns-tz");
const { sanitize, createIcsFileBuilder } = require("../utils");
let server;

nunjucks.addFilter("date", (date, tz) => {
  let zone = "Etc/GMT";
  if (tz) {
    zone = tz;
  }
  let parsedDate;
  if (typeof date === "number") {
    parsedDate = fns.toDate(date);
  } else {
    parsedDate = fns.parseISO(date);
  }
  const zoned = fnsz.utcToZonedTime(parsedDate, tz);
  return fnsz.format(zoned, "PPpp z", { timeZone: tz });
});
module.exports = (hapiServer) => async (job) => {
  try {
    server = hapiServer;
    const type = job.data.type;
    const data = job.data.taskData;
    server.log(["taskWorker", "email_task_worker", "start"], {
      jobId: job.id,
      status: "started"
    });
    if (type === "invite-user-to-event") {
      try {
        const user = data.user;

        if (user.email) {
          let creator;
          if (!data.event.creator.id) {
            creator = await server
              .getService("user")
              .findById(data.event.creator);
          } else {
            creator = data.event.creator;
          }
          await sendInviteEmail("user_invite.njk", {
            to: user.email,
            subject: `You were invited to an event: ${data.event.name} on Juniper City`,
            data: {
              ...data,
              creator,
              description: sanitize(data.event.description)
            }
          });
        }
      } catch (e) {
        console.log(e);
      }
    }

    if (type === "create-event-pingback") {
      const user = data.user;
      if (user.email) {
        await sendEmail("event_created_by_email", {
          to: user.email,
          subject: "Event successfully created",
          data
        });
      }
    }

    if (type === "send-code") {
      if (data.code_type === "email") {
        const user = data.user;
        if (user.email) {
          await sendEmail("login_code", {
            to: user.email,
            subject: "Your Juniper City login code",
            data: {
              code: data.code
            }
          });
        }
      }
    }

    if (type === "send-validation") {
      if (data.validation.email) {
        await sendEmail("email_validation", {
          to: data.validation.email,
          subject: "Validate your email on Juniper City",
          data: {
            link: data.link
          }
        });
      }
    }

    if (type === "event-comments") {
      try {
        if (data.user.email) {
          await sendEmail("event_comments.njk", {
            to: data.user.email,
            subject: "New comments on events you're invited to on Juniper City",
            data: {
              events: data.events,
              sanitize,
              link: `https://junipercity.com`
            }
          });
        }
      } catch (e) {
        console.log(e);
      }
    }

    if (type === "user-did-rsvp") {
      if (data.creator.email) {
        await sendEmail("user_did_rsvp.njk", {
          to: data.creator.email,
          subject: `Someone RSVP'd to your event ${data.event.name} on Juniper City`,
          data: {
            event: data.event,
            user: data.user,
            invite: data.invite
          }
        });
      }
    }

    if (type === "notify-group-member-about-event") {
      if (data.member.email) {
        sendEmail("new_group_event.njk", {
          to: data.member.email,
          subject: `New event in your Juniper City group ${data.group.name}`,
          data: {
            event: data.event,
            group: data.group,
            date: new Date(data.event.date),
            description: sanitize(data.event.description)
          }
        });
      }
    }

    if (type === "event-invite-email-was-replied-to") {
      if (data.user.email) {
        const res = await client.sendEmail({
          To: data.user.email,
          From: `"Juniper Branch" <branch@junipercity.com>`,
          ReplyTo: data.from,
          Subject: `${data.from} replied to your invite to ${data.event.name} on Juniper City`,
          HtmlBody: data.content
        });
      }
    }

    if (type === "user-added-to-group") {
      if (data.user.email) {
        sendEmail("user_added_to_group.njk", {
          to: data.user.email,
          subject: `You were added to the group: ${data.group.name} on Juniper City`,
          data: {
            group: data.group,
            user: data.user,
            role: data.role,
            member: data.member,
            idOrPath: data.group.custom_path || data.group.id
          }
        });
      }
    }

    if (type === "upcoming-events-digest") {
      if (data.user.email) {
        sendEmail("upcoming_events_digest.njk", {
          to: data.user.email,
          subject: `Your upcoming events`,
          data: {
            user: data.user,
            events: data.events
          }
        });
      }
    }
    if (type === "user-first-login") {
      if (data.user.email) {
        sendEmail("welcome_user.njk", {
          to: data.user.email,
          subject: "Welcome to Juniper City!",
          data: {
            user: data.user
          }
        });
      }
    }

    if (
      type === "notify-user-event-location-changed" ||
      type === "notify-user-event-date-changed"
    ) {
      if (data.user.email) {
        let template = "event_date_changed";
        let subject = "Date for an event you are invited to changed";

        if (type === "notify-user-event-location-changed") {
          template = "event_location_changed";
          subject = "Location for an event you are invited to changed";
        }
        sendEmail(`${template}.njk`, {
          to: data.user.email,
          subject: subject,
          data: {
            event: data.event,
            user: data.user,
            link: `https://junipercity.com/events/${data.event.slug}?invite_key=${data.invite.invite_key}`
          }
        });
      }
    }

    server.log(["taskWorker", "send-email-task-worker"], {
      jobId: job.id,
      status: "complete"
    });
  } catch (e) {
    server.log(["taskWorker", "taskWorkerError"], {
      jobId: job.id,
      status: "fail",
      error: e.stack
    });
  }
};

async function sendEmail(templateName, payload) {
  try {
    const templateString = await getTemplate(templateName);
    let template;
    if (templateName.includes(".njk")) {
      template = nunjucks.renderString(templateString, payload.data);
    } else {
      template = mustache.render(templateString, payload.data);
    }
    const subject = mustache.render(payload.subject, payload.data);
    const html = mjml(template).html;
    const res = await client.sendEmail({
      To: payload.to,
      From: `"Juniper Branch" <branch@junipercity.com>`,
      ReplyTo: "branch@stem.junipercity.com",
      Subject: subject,
      HtmlBody: html
    });

    server.log(["taskWorker", "email-task-worker", "info"], {
      sendEmailResponse: res
    });
  } catch (e) {
    server.log(["taskWorker", "email-task-worker", "error"], {
      sendEmailError: e.stack
    });
  }
}

async function sendInviteEmail(templateName, payload) {
  try {
    const templateString = await getTemplate(templateName);
    let template;
    if (templateName.includes(".njk")) {
      template = nunjucks.renderString(templateString, payload.data);
    } else {
      template = mustache.render(templateString, payload.data);
    }
    const builder = createIcsFileBuilder();
    const subject = mustache.render(payload.subject, payload.data);
    const html = mjml(template).html;

    const data = payload.data;

    const end = data.event.end_date
      ? new Date(data.event.end_date)
      : new Date(data.event.date + 1000 * 60 * 60);

    builder.method = "REQUEST";
    builder.events.push({
      start: new Date(data.event.date),
      end: end,
      summary: data.event.name,
      stamp: data.event.created,
      status: "CONFIRMED",
      description: `${data.event.description}\n link: ${data.link}`,
      organizer: {
        name: data.creator.name || data.creator.email,
        email: `invites+${data.user.id}@${process.env.INBOUND_EMAIL_DOMAIN}`
      },
      additionalTags: {
        "X-INVITE-ID": data.invite.id,
        "X-USER-ID": data.user.id
      },
      attendees: [
        {
          email: payload.to,
          name: data.user.name || data.user.email,
          status: "NEEDS-ACTION",
          role: "REQ-PARTICIPANT",
          rsvp: true
        }
      ],
      uid: data.event.id,
      url: data.link
    });
    const content = builder.toString();

    const res = await client.sendEmail({
      To: payload.to,
      From: `"Juniper Branch" <branch@junipercity.com>`,
      ReplyTo: `invite_reply+${data.invite.id}@${process.env.INBOUND_EMAIL_DOMAIN}`,
      Subject: subject,
      HtmlBody: html,
      attachments: [
        {
          Name: "invitation.ics",
          Content: Buffer.from(content).toString("base64"),
          ContentType: "text/calendar; charset=utf-8; method=REQUEST"
        }
      ]
    });
    server.log(["taskWorker", "email-task-worker", "info"], {
      sendEmailResponse: res
    });
  } catch (e) {
    server.log(["taskWorker", "email-task-worker", "error"], {
      sendEmailError: e
    });
  }
}

function getTemplate(name) {
  return new Promise((resolve, reject) => {
    fs.readFile(
      path.join(__dirname, "../email_templates/", `${name}.mjml`),
      (err, data) => {
        if (!err) {
          resolve(data.toString("utf-8"));
        } else {
          reject(err);
        }
      }
    );
  });
}
