const hapi = require("hapi");
const api = require("./api")

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
  await server.start();

  console.log("server running");
}

module.exports = {
  start
}