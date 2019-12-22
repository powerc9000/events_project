let server;
const Queue = require("bull");
const email = require("./email_task_worker");
const sms = require("./sms_task_worker");
const inboundEmail = require("./inbound_email");
const notifications = require("./notifications");
module.exports = {
  name: "tasks",
  register: async function(hapiServer) {
    server = hapiServer;
    const queues = [];

    const redisConnection = {
      port: process.env.REDIS_PORT,
      host: process.env.REDIS_HOST,
      connectTimeout: 30000,
      ...(process.env.NODE_ENV === "production"
        ? {
            tls: {},
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD
          }
        : {})
    };

    const emailQueue = new Queue("email", {
      redis: redisConnection
    });
    const smsQueue = new Queue("sms", {
      redis: redisConnection
    });
    const inboundEmailQueue = new Queue("inbound-email", {
      redis: redisConnection
    });

    const notificationsQueue = new Queue("notifications", {
      redis: redisConnection
    });

    emailQueue.process(email(server));
    smsQueue.process(sms(server));
    inboundEmailQueue.process(inboundEmail(server));
    notificationsQueue.process(notifications(server));

    queues.push(emailQueue);
    queues.push(smsQueue);
    queues.push(inboundEmailQueue);
    queues.push(notificationsQueue);

    if (process.env.NODE_ENV !== "production") {
      const jobs = await notificationsQueue.getRepeatableJobs();
      jobs.forEach((job) => {
        notificationsQueue.removeRepeatableByKey(job.key);
      });
    }
    notificationsQueue.add(
      {
        type: "check-comments"
      },
      {
        jobId: "check-comments",
        repeat: {
          every: 60 * 1000 * 5 // Five minutes
        }
      }
    );
    const repeat =
      process.env.NODE_ENV !== "production" ? 1000 * 30 : 60 * 60 * 1000;
    const repeatOpts = {
      jobId: "upcoming-event-digest",
      repeat: {
        every: repeat //Hour
      }
    };

    notificationsQueue.add(
      {
        type: "check-event-digest"
      },
      repeatOpts
    );

    server.decorate("server", "createTask", function(type, data) {
      server.log(["task-created", "info"], {
        type
      });
      queues.forEach((queue) => {
        queue.add({
          type: type,
          taskData: data
        });
      });
    });
  }
};
