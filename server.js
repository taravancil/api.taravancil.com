"use strict";

const Hapi = require("hapi");
const Joi = require("joi");
const Bcrypt = require("bcrypt");
const fs = require("fs");

const server = Hapi.server({
  port: 3000,
  host: "localhost",
  routes: {
    cors: {
      maxAge: 15,
      additionalHeaders: ["Cookie"],
      additionalExposedHeaders: ["Set-Cookie"],
      credentials: true
    }
  }
});

const sessionID = fs.readFileSync("/data/session", "utf8").replace("\n", "");

server.state("session", {
  ttl: 168 * 60 * 60 * 1000, // one week
  isSecure: true,
  isHttpOnly: true,
  isSameSite: false,
  encoding: "base64json",
  path: "/"
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
  path: "/session",
  handler: (request, h) => {
    if (validateSession(request.state)) {
      return { name: "Tara", avatar: "/images/avatar.jpg" };
    } else {
      return {};
    }
  },
  options: {
    cors: {
      origin: ["*"], // TODO
      credentials: true
    }
  }
});

server.route({
  method: "GET",
  path: "/wishlist/purchases",
  handler: (request, h) => {
    var purchases = [];

    // read the file
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

server.route({
  method: "GET",
  path: "/tasks",
  handler: (request, h) => {
    if (validateSession(request.state)) {
      let tasks = [];

      try {
        let files = fs.readdirSync("/data/tasks");
        for (let i = 0; i < files.length; i++) {
          let task = fs.readFileSync(`/data/tasks/${files[i]}`, "utf8");
          task = JSON.parse(task);
          tasks.push(task);
        }
        return tasks;
      } catch (err) {
        return h.response().code(500);
      }
    } else {
      return h.response().code(401);
    }
  },
  options: {
    cors: {
      origin: ["https://tasks.taravancil.com"],
      maxAge: 15
    }
  }
});

server.route({
  method: "POST",
  path: "/tasks",
  handler: async (request, h) => {
    if (validateSession(request.state)) {
      // write the file
      try {
        const { id, createdAt, title, notes } = JSON.parse(request.payload);

        const task = { id, createdAt: id, title, notes, completed: false };

        fs.writeFileSync(`/data/tasks/${createdAt}.json`, JSON.stringify(task));
        return h.response().code(201);
      } catch (err) {
        console.warn("ERR", err);
        return h.response().code(500);
      }
    } else {
      return h.response().code(401);
    }
  },
  options: {
    cors: {
      origin: ["https://tasks.taravancil.com"],
      maxAge: 15
    }
  }
});

server.route({
  method: "DELETE",
  path: "/tasks/{id}",
  handler: async (request, h) => {
    if (validateSession(request.state)) {
      // remove the file
      try {
        fs.unlinkSync(`/data/tasks/${id}.json`);
        console.log("DELETE 200");
        return h.response().code(200);
      } catch (err) {
        return h.response().code(404);
      }
    } else {
      return h.response().code(401);
    }
  },
  options: {
    cors: {
      origin: ["https://tasks.taravancil.com"],
      maxAge: 15
    }
  }
});

server.route({
  method: "POST",
  path: "/tasks/login",
  handler: async (request, h) => {
    // redacted
    const hash = "REDACTED";
    const matches = await Bcrypt.compare(request.payload.password, hash);

    if (matches) {
      h.state("session", sessionID);
      return h.response().code(200);
    } else {
      return h.response().code(401);
    }
  },
  options: {
    cors: {
      origin: ["https://tasks.taravancil.com"],
      maxAge: 15,
      additionalHeaders: ["Cookie"],
      additionalExposedHeaders: ["Set-Cookie"],
      credentials: true
    },
    validate: {
      payload: {
        password: Joi.string().required()
      }
    }
  }
});

server.route({
  method: "GET",
  path: "/tasks/logout",
  handler: async (request, h) => {
    h.state("session", null);
    return h.response().code(200);
  },
  options: {
    cors: {
      origin: ["https://tasks.taravancil.com"],
      maxAge: 15
    }
  }
});

/*
-----
UTILS
-----
*/

function validateSession(state) {
  if (state.session && state.session === sessionID) {
    return true;
  }
  return false;
}

const init = async () => {
  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
};

process.on("unhandledRejection", err => {
  console.log(err);
  process.exit(1);
});

init();
