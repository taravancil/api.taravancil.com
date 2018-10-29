"use strict";

const Hapi = require("hapi");
const Joi = require("joi");
const Bcrypt = require("bcrypt");
const fs = require("fs");

const server = Hapi.server({
  port: 3000,
  host: "localhost",
  routes: { cors: true }
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

    try {
      const data = fs.readFileSync("/data/wishlist/purchases", "utf8");
      purchases = data.split("\n").filter(Boolean);
      return purchases;
    } catch (err) {
      return h.response().code(500);
    }
  },
  options: {
    cors: {
      origin: ["https://taravancil.com"],
      maxAge: 15
    }
  }
});

server.route({
  method: "POST",
  path: "/wishlist/purchases",
  handler: async (request, h) => {
    // authenticate
    const hash = "REDACTED";
    const matches = await Bcrypt.compare(request.payload.code, hash);

    if (matches) {
      // write the file
      try {
        fs.appendFileSync(
          "/data/wishlist/purchases",
          "\n" + request.payload.url
        );
        return h.response().code(201);
      } catch (err) {
        return h.response().code(500);
      }
    } else {
      return h.response().code(401);
    }
  },
  options: {
    cors: {
      origin: ["https://taravancil.com"],
      maxAge: 15
    },
    validate: {
      payload: {
        url: Joi.string().uri({
          scheme: ["http", "https"]
        }),
        code: Joi.string()
          .length(6)
          .required()
      }
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
