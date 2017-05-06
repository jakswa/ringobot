var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var bot_token = process.env.SLACKIN_BOT_TOKEN || '';

var rtm = new RtmClient(bot_token);

var botModules = [require('./trivia')]

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload if you want to cache it
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  console.log(message.user, message.text)
  for (var i = 0; i < botModules.length; i++) {
    var module = botModules[i];
    // if a bot has registered that it cares about messages, pass it in
    var response = module.responseFor(message);
    if (response) {
      console.log('  ->', response)
      rtm.sendMessage(response, message.channel).catch(function(err) { 
        console.log('err:', err)
      });
      break;
    }
  }
});

rtm.start();
