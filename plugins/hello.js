module.exports = {
  responseFor: function(message, rtm) {
    // Turns out I picked an awkward API to write a hello bot for,
    // since it's not dead-easy to answer: Is my bot being mentioned?
    // activeUserId mentioned in:
    // https://github.com/slackapi/node-slack-sdk/issues/203
    // and is part of varibles set in:
    // https://github.com/slackapi/node-slack-sdk/blob/507f9b0/lib/clients/rtm/client.js#L280
    if (message.text.indexOf(`<@${rtm.activeUserId}> hello`) > -1) {
      return `<@${message.user}> hi!`
    }
  }
}