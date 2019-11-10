const fetch = require("node-fetch");
module.exports = (server) => async (job) => {
  const type = job.data.type;
  const data = job.data.taskData;
  if (type === "send-code") {
    if (data.code_type === "sms") {
      const user = data.user;
      try {
        const res = await sendText(
          user.phone,
          `You occassions login code is: ${data.code}`
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
      const shortlink = await server.getService("shortlinks").create(data.link);
      const link = `https://junipercity.com/s/${shortlink.key}`;
      const res = await sendText(
        data.validation.phone,
        `Validate your phone on Juniper City ${link}`
      );

      console.log(res);
    }
  }

  if (type === "event-comments") {
    if (data.invite.user.phone) {
      try {
        let key = "";
        if (data.invite.ivnite_key) {
          key = `?invite_key=${data.invite.invite_key}`;
        }
        const short = await server
          .getService("shortlinks")
          .create(`https://junipercity.com/events/${data.event.slug}${key}`);
        await sendText(
          data.invite.user.phone,
          `New comments on an event in Juniper City https://junipercity.com/s/${short.key}`
        );
      } catch (e) {
        console.log(e);
      }
    }
  }
};

async function sendText(phone, message) {
  const req = await fetch("https://textbelt.com/text", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `phone=${encodeURIComponent(phone)}&message=${encodeURIComponent(
      message
    )}&key=${process.env.TEXTBELT_API_KEY}`
  });

  return req.json();
}
