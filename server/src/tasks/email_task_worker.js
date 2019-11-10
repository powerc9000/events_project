const mustache = require("mustache");
const fs = require("fs");
const mjml = require("mjml");
const path = require("path");
const postmark = require("postmark");
const client = new postmark.Client(process.env.POSTMARK_API_KEY);
const nunjucks = require("nunjucks");
const { sanitize } = require("../utils");
let server;
module.exports = (hapiServer) => async (job) => {
  server = hapiServer;
  const type = job.data.type;
  const data = job.data.taskData;

  if (type === "invite-user-to-event") {
    const user = data.user;
    if (user.email) {
      await sendEmail("user_invite", {
        to: user.email,
        subject: "You were invited to an event",
        data
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
      if (data.invite.user.email) {
        let key = "";
        if (data.invite.ivnite_key) {
          key = `?invite_key=${data.invite.invite_key}`;
        }
        await sendEmail("event_comments.njk", {
          to: data.invite.user.email,
          subject: "New comments on an event you're invited to",
          data: {
            event: data.event,
            sanitize,
            link: `https://junipercity.com/events/${data.event.slug}${key}`
          }
        });
      }
    } catch (e) {
      console.log(e);
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
