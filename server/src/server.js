const hapi = require("@hapi/hapi");
const api = require("./api")
const views = require("./views");

async function start(){
  const server = hapi.server({
    port: 8000,
    host: "0.0.0.0"
  })

  await server.register(api, {
   routes: {
    prefix: "/api"
   } 
  });
  

  await server.register(views);

  await server.start();

  console.log("server running");
}

module.exports = {
  start
}