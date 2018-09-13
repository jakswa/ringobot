# Ringobot

This is a slack bot. It passes heard messages to any registered plugins.
If any plugin returns a value, ringobot sends that response.
Responses appear in the room they were heard.

# Plugin sources

- **Local** plugins in the `/plugins` directory get loaded automatically.
- **NPM** plugins need to be `npm install --save`'d and then have their name inserted into `external_plugin_list.json` (for `require`-ing)

# Plugin interface

Everything happens right now with `responseFor(slackMessage, realTimeClient)`.
We loop through plugins, essentially calling:

```javascript
var plugin = require('your_plugin');
plugin.responseFor(message, rtm, webClient); // if the plugin cares about chat messages
plugin.reacted(reaction, rtm, webClient); // if the plugin cares about emoji reactions
plugin.slachCommand(params, rtm, webClient); // if ringobot receives a slash command your plugin cares about
                                             // (these are configured on slack's website, for your organization)
```

## Parameters

- `slackMessage` (`message`) is a https://api.slack.com/events/message
- `realTimeClient` (`rtm`) is RTM client from the [Slack Node SDK](https://github.com/slackapi/node-slack-sdk#posting-a-message-with-the-real-time-messaging-api)
  - in the future, we can PM/etc using this object
- [`webClient`](https://slackapi.github.io/node-slack-sdk/web_api) is how I've been adding new reactions (couldn't figure out how to do it with RTM client)

# ENV variables

- `SLACKIN_BOT_TOKEN`: your slack bot token 
  - create/manage your bots under `<your_org>.slack.com/apps/manage/custom-integrations`
  - you need to `/invite` your bot into a channel, for it to hear/respond
- `RINGOBOT_SECRETS_KEY`: token for reading secret configs
  - secret files are stored in `/secrets` (currently only trivia_questions)
  - get this from Jake if you need add/edit secret values, like trivia questions

# Plugin Examples

I made two simple plugin examples, one local and the other an NPM module. You can find "hello" in the plugins directory. [RingoMomma](https://github.com/jakswa/ringo_momma) is an NPM module that I've added to the project by doing:
  - `npm install --save ringo_momma`
  - add `'ringo_momma'` to the `external_plugin_list.json` file
  - committed those two file changes
