const mustache = require("mustache");
const ical = require("ical-toolkit");
const fs = require("fs");
const mjml = require("mjml");
const path = require("path");
const postmark = require("postmark");
const client = new postmark.Client(process.env.POSTMARK_API_KEY);
const nunjucks = require("nunjucks");
const fns = require("date-fns");
const { sanitize } = require("../utils");
let server;
module.exports = (hapiServer) => async (job) => {
  server = hapiServer;
  const type = job.data.type;
  const data = job.data.taskData;

  if (type === "invite-user-to-event") {
    const user = data.user;
    if (user.email) {
      const creator = await server
        .getService("user")
        .findById(data.event.creator);
      let method = sendInviteEmail;

      if (!creator.email) {
        method = sendEmail;
      }
      await method("user_invite", {
        to: user.email,
        subject: "You were invited to an event",
        data: {
          ...data,
          creator,
          description: sanitize(data.event.description)
        }
      });
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
          subject: "Your login code",
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
          subject: "New comments on events you're invited to",
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
    if (data.user.email) {
      await sendEmail("user_did_rsvp.njk", {
        to: data.user.email,
        subject: "Someone RSVP'd to your event",
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
        subject: `New event in your Juniper City group`,
        data: {
          event: data.event,
          group: data.group,
          date: new Date(data.event.date),
          description: sanitize(data.event.description)
        }
      });
    }
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

    console.log(res);
  } catch (e) {
    console.log(e);
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
    const builder = ical.createIcsFileBuilder();
    const subject = mustache.render(payload.subject, payload.data);
    const html = mjml(template).html;

    const data = payload.data;
    builder.method = "REQUEST";
    builder.events.push({
      start: new Date(data.event.date),
      end: new Date(data.event.date + 1000 * 60 * 30),
      summary: data.event.name,
      stamp: data.event.created,
      status: "CONFIRMED",
      description: data.event.description,
      organizer: {
        name: data.creator.name || data.creator.email,
        email: data.creator.email,
        sentBy: "invites@test.stem.junipercity.com"
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
      ReplyTo: "branch@stem.junipercity.com",
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

    console.log(res);
  } catch (e) {
    console.log(e);
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
