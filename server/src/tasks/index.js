let server;
const Queue = require("bull");
const email = require("./email_task_worker");
module.exports = {
  name: "tasks",
  register: async function(hapiServer) {
    server = hapiServer;
    const queues = [];
    const emailQueue = new Queue("email", {
      redis: { port: process.env.REDIS_PORT, host: process.env.REDIS_HOST }
    });

    emailQueue.process(email);

    queues.push(emailQueue);

    server.decorate("server", "createTask", function(data) {
      queues.forEach((queue) => {
        queue.add(data);
      });
    });
  }
};
