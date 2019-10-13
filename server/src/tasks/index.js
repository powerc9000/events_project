let server;
const Queue = require("bull");
const email = require("./email_task_worker");
const sms = require("./sms_task_worker");
module.exports = {
  name: "tasks",
  register: async function(hapiServer) {
    server = hapiServer;
    const queues = [];
    const emailQueue = new Queue("email", {
      redis: { port: process.env.REDIS_PORT, host: process.env.REDIS_HOST }
    });
    const smsQueue = new Queue("sms", {
      redis: { port: process.env.REDIS_PORT, host: process.env.REDIS_HOST }
    });

    emailQueue.process(email(server));
    smsQueue.process(sms(server));

    queues.push(emailQueue);
    queues.push(smsQueue);

    server.decorate("server", "createTask", function(type, data) {
      queues.forEach((queue) => {
        queue.add({
          type: type,
          taskData: data
        });
      });
    });
  }
};
