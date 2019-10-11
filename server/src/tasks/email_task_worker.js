const mustache = require("mustache");
const fs = require("fs");
const mjml = require("mjml");
const path = require("path");
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
        data: {
          user,
          event: data.event
        }
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
};

async function sendEmail(templateName, payload) {
  try {
    const templateString = await getTemplate(templateName);
    const template = mustache.render(templateString, payload.data);
    const subject = mustache.render(payload.subject, payload.data);
    const html = mjml(template).html;
    const params = {
      Destination: {
        ToAddresses: [payload.to]
      },
      Source: "clay.murray8@gmail.com",
      Message: {
        Body: {
          Html: {
            Data: html
          }
        },
        Subject: {
          Data: subject
        }
      }
    };

    console.log(params);

    const res = await server.app.aws.ses.sendEmail(params).promise();
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
