var RtmClient = require('@slack/client').RtmClient;
var WebClient = require('@slack/client').WebClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const http = require('http');
const path = require('path');
const fs = require('fs');

var bot_token = process.env.SLACKIN_BOT_TOKEN || '';
var rtm = new RtmClient(bot_token);
var webClient = new WebClient(bot_token);

// Loading Ringobot plugins
var plugins = [];
// local plugins, in `/plugins` directory
fs.readdirSync(path.join(__dirname, "plugins")).forEach(function(file) {
  plugins.push(require("./plugins/" + file));
});
// NPM-installed plugins, from list
require("./external_plugin_list").forEach(function (name) {
  plugins.push(require(name));
});


// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload if you want to cache it
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} (${rtm.activeUserId}) of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  // don't care about.. thread responses? they breaking it
  // TODO: figure out what all kinds of messages we should care about
  if (!message.text) return;
  if (process.env.DEV && !message.text.match(/DEV/)) return;
  for (var i = 0; i < plugins.length; i++) {
    var plugin = plugins[i];
    // if a bot has registered that it cares about messages, pass it in
    var response = plugin.responseFor && plugin.responseFor(message, rtm, webClient);
  }
});

rtm.on(RTM_EVENTS.REACTION_ADDED, function(reaction) {
  // ignore this user's reactions
  if (reaction.user === rtm.activeUserId) return;
  for (var i = 0; i < plugins.length; i++) {
    var plugin = plugins[i];
    plugin.reacted && plugin.reacted(reaction, rtm, webClient);
  }
});

rtm.start();

const server = http.createServer((req, res) => {
  res.end();
});

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(process.env['PORT']);

