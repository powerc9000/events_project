const mustache = require("mustache");
const fs = require("fs");
const mjml = require("mjml");

module.exports = (server) => async (job) => {
  const type = job.data.type;
  const data = job.data.taskData;

  if (data.type === "invite-user") {
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
};

async function sendEmail(templateName, payload) {
  const templateString = await getTemplate(templateName);
  const template = mustache.render(templateString, payload.data);
  const subject = mustach.render(payload.subject, payload.data);
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

  await server.aws.ses.sendEmail(params).promise();
}

function getTemplate(name) {
  return new Promise((resolve, reject) => {
    fs.readFile(
      path.join(__dirname, "../email_templates/", name, ".mjml"),
      (err, data) => {
        if (!err) {
          return data.toString("utf-8");
        } else {
          reject(err);
        }
      }
    );
  });
}
