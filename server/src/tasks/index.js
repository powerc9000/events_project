let server;
const Queue = require("bull");
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

    const normalizedPath = require("path").join(__dirname, "/handlers");
    require("fs")
      .readdirSync(normalizedPath)
      .forEach((file) => {
        const handler = require(`./handlers/${file}`);

        const queue = new Queue(handler.name, {
          redis: redisConnection
        });

        queue.process(handler.func(server));
        queues.push(queue);

        handler.onCreate(queue);
      });

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
