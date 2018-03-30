var RtmClient = require('@slack/client').RtmClient;
var WebClient = require('@slack/client').WebClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
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
  if (message.user === rtm.activeUserId) return;
  if (process.env.DEV && !message.text.match(/DEV/)) return;
  var systemResp = helpResponse(message);
  if (systemResp) {
    rtm.send({
      type: RTM_EVENTS.MESSAGE,
      text: systemResp,
      channel: message.channel,
      thread_ts: message.thread_ts || message.ts
    });
    return;
  }
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

// ---- BEGIN WEB INTERFACE FOR SLASH COMMANDS ----

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}));

app.post("/slash-commands", function (req, res) {
  let params = req.body;

  for (var i = 0; i < plugins.length; i++) {
    var plugin = plugins[i];
    // if a bot has registered that it cares about messages, pass it in
    if (!plugin.slashCommand) continue;
    var resp = plugin.slashCommand(params, rtm, webClient);
    if (resp && resp.message) {
      res.status(201).json(resp);
    } else {
      res.status(201).send(resp || null);
    }
  }
});

let port = process.env['PORT'] || 3000;
app.listen(port, function() {
  console.log("Listenin' for slash commands on port " + port);
});

function helpResponse(message) {
  var regex = new RegExp(`^<@${rtm.activeUserId}> help *(.*)$`);
  var match = message.text.match(regex);
  var msgs = [];
  if (match) {
    var query = match[1];
    plugins.forEach((plugin) => {
      if (plugin.help) {
        plugin.help.forEach((help) => {
          if(!query || help.includes(query)) {
            msgs.push(help); 
          }
        });
      }
    });
    if (msgs.length > 0) {
      return msgs.join("\n");
    } else {
      return `Could not find any help for ${query} :sadpanda:`;
    }
  }
}
