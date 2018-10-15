"use strict";

const Hapi = require("hapi");

const server = Hapi.server({
  port: 3000,
  host: "localhost"
});

server.route({
  method: "GET",
  path: "/",
  handler: (request, h) => {
    return "Private API for taravancil.com";
  }
});

server.route({
  method: "GET",
  path: "/wishlist/purchases",
  handler: (request, h) => {
    var purchases = [];
    return purchases;
  },
  options: {
    cors: {
      origin: ["https://taravancil.com"],
      maxAge: 15
    }
  }
});

const init = async () => {
  await server.start();
};

process.on("unhandledRejection", err => {
  console.log(err);
  process.exit(1);
});

init();
