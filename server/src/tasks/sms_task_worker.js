module.exports = (server) => async (job) => {
  const type = job.data.type;
  const data = job.data.taskData;
  console.log(type, data);
  if (type === "send-code") {
    if (data.code_type === "sms") {
      const user = data.user;
      try {
        await server.app.aws.sns
          .publish({
            Message: `Your occasions login code is: ${data.code}`,
            PhoneNumber: user.phone
          })
          .promise();
      } catch (e) {
        console.log(e);
      }
    }
  }

  if (type === "invite-user-to-event") {
    const user = data.user;
    if (user.phone) {
      console.log("hello ran", data);
      try {
        await server.app.aws.sns
          .publish({
            Message: `You have been invited to an event: ${data.link}`,
            PhoneNumber: user.phone
          })
          .promise();
      } catch (e) {
        console.log(e);
      }
    }
  }
};
