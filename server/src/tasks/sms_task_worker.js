const fetch = require("node-fetch");
module.exports = (server) => async (job) => {
  const type = job.data.type;
  const data = job.data.taskData;
  console.log(type, data);
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
        const res = await sendText(
          user.phone,
          `You have been invited to an event on Juniper City: ${data.link}`
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
