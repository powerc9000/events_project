let server;
const Queue = require("bull");
const email = require("./email_task_worker");
const sms = require("./sms_task_worker");
module.exports = {
  name: "tasks",
  register: async function(hapiServer) {
    server = hapiServer;
    const queues = [];

    const redisConnection = {
      port: process.env.REDIS_PORT,
      host: process.env.REDIS_HOST,
      connectTimeout: 30000,
      tls: {},
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD
    };

    const emailQueue = new Queue("email", {
      redis: redisConnection
    });
    const smsQueue = new Queue("sms", {
      redis: redisConnection
    });

    emailQueue.process(email(server));
    smsQueue.process(sms(server));

    queues.push(emailQueue);
    queues.push(smsQueue);

    server.decorate("server", "createTask", function(type, data) {
      console.log(type, data);
      queues.forEach((queue) => {
        queue.add({
          type: type,
          taskData: data
        });
      });
    });
  }
};
