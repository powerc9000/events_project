const fetch = require("node-fetch");
let server;
module.exports = (hapiServer) => async (job) => {
  server = hapiServer;
  server.log(["taskWorker", "sms-task-worker", "start"], {
    status: "started"
  });
  try {
    const type = job.data.type;
    const data = job.data.taskData;
    if (type === "send-code") {
      if (data.code_type === "sms") {
        const user = data.user;
        try {
          const res = await sendText(
            user.phone,
            `You Juniper City login code is: ${data.code}`
          );
          console.log(res);
        } catch (e) {
          console.log(e);
        }
      }
    }

    if (type === "invite-user-to-event") {
      const user = data.user;
      if (user.phone) {
        try {
          const shortlink = await server
            .getService("shortlinks")
            .create(data.link);

          const link = `https://junipercity.com/s/${shortlink.key}`;
          const res = await sendText(
            user.phone,
            `You have been invited to an event on Juniper City: ${link}`
          );
          console.log(res);
        } catch (e) {
          console.log(e);
        }
      }
    }

    if (type === "send-validation") {
      if (data.validation.phone) {
        const shortlink = await server
          .getService("shortlinks")
          .create(data.link);
        const link = `https://junipercity.com/s/${shortlink.key}`;
        const res = await sendText(
          data.validation.phone,
          `Validate your phone on Juniper City ${link}`
        );
      }
    }

    if (type === "user-did-rsvp") {
      if (data.creator.phone) {
        const name = data.user.name || data.user.email || data.user.phone;
        await sendText(
          data.creator.phone,
          `${name} RSVP'd to your event ${data.event.name}`
        );
      }
    }

    if (type === "event-comments") {
      if (data.user.phone) {
        try {
          await sendText(
            data.user.phone,
            `New comments your events in Juniper City https://junipercity.com/`
          );
        } catch (e) {
          console.log(e);
        }
      }
    }

    if (type === "notify-group-member-about-event") {
      if (data.member.phone) {
        try {
          const idOrCustom = data.group.custom_path || data.group.id;
          const shortlink = await server
            .getService("shortlinks")
            .create(`https://junipercity.com/groups/${idOrCustom}/events`);
          const link = `https://junipercity.com/s/${shortlink.key}`;
          await sendText(
            data.member.phone,
            `New event in your Juniper City Group ${link}`
          );
        } catch (e) {
          console.log(e);
        }
      }
    }

    if (type === "user-added-to-group") {
      if (data.user.phone) {
        const idOrCustom = data.group.custom_path || data.group.id;
        const key = await server
          .getService("shortlinks")
          .create(
            `https://junipercity.com/groups/${idOrCustom}?member_key=${data.member.member_key}`
          );
        const link = `https://junipercity.com/s/${key.key}`;
        await sendText(
          data.user.phone,
          `You were invited to the group: ${data.group.name} on Juniper City ${link}`
        );
      }
    }

    server.log(["taskWorker", "sms-task-worker", "end"], {
      status: "complete"
    });
  } catch (e) {
    server.log(["taskWorker", "sms-task-worker", "end", "taskWorkerError"], {
      status: "fail",
      error: e
    });
  }
};

async function sendText(phone, message) {
  try {
    const req = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `phone=${encodeURIComponent(phone)}&message=${encodeURIComponent(
        message
      )}&key=${process.env.TEXTBELT_API_KEY}`
    });

    const json = await req.json();
    server.log(["taskWorker", "sms-task-worker", "info"], {
      sendTextResponse: json
    });
    return json;
  } catch (e) {
    server.log(["taskWorker", "sms-task-worker", "error"], {
      sendTextError: e
    });
  }
}
