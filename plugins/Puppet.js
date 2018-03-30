class Puppet {
  static responseFor(message, rtm, web) {
    if (!this.inDM(message)) return;

    var match = message.text.match(/:([^:]+): on <http.+\/archives\/(\w+)\/p(\w+)/);
    if (!match) return;

    var emoji = match[1]
    var channel = match[2];
    // insert . into timestamp
    var ts = match[3].split('');
    ts.splice(ts.length-6, 0, '.');
    ts = ts.join('');

    web.reactions.add(
      emoji,
      {channel: channel, timestamp: ts },
      (err, resp) => { rtm.sendMessage(err ? 'error: ' + err.message : "success", message.channel) }
    );
  }

  static inDM(message) {
    return message.channel && message.channel.match(/^D/);
  }
}

module.exports = Puppet
