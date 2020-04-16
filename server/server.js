"use strict";
const loopback = require("loopback");
const boot = require("loopback-boot");
let bodyParser = require("body-parser");
const app = (module.exports = loopback());
const Sentry = require('@sentry/node');
const socketInit = require("./SocketHelper/socketinit");

Sentry.init({ dsn: 'https://73eaaaace2ce44f48283ce2565918223@sentry.mindworks.xyz/11', environment: 'staging' });

app.use(bodyParser.urlencoded({ extended: true, limit: 10485760 }));

app.start = () => {
  return app.listen(() => {
    app.emit("started");
    const baseUrl = app.get("url").replace(/\/$/, "");
    console.log("Web server listening at: %s", baseUrl);
    if (app.get("loopback-component-explorer")) {
      const explorerPath = app.get("loopback-component-explorer").mountPath;
      console.log("Browse your REST API at %s%s", baseUrl, explorerPath);
    }
  });
};

boot(app, __dirname, err => {
  if (err) throw err;
  if (require.main === module) {
    app.io = require("socket.io")(app.start());
    socketInit.socketIntializer(app.models);
  }
});
