module.exports = {
  responseFor: function(message, botUserId) {
    if (message.text.indexOf(`<@${botUserId}> hello`) > -1) {
      return `<@${message.user}> hi!`
    }
  }
}
