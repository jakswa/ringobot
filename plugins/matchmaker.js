// Mario queue plugin.
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

// list of active mario queues, by message timestamp
const MATCHES = {};
// list of match types, with their match attrs
const COMMANDS = {
  "/mario": { users: 4, name: "mario", titles: "racers"}
}; 

class Matchmaker {
  constructor(message, creator, attrs) {
    this.matchAttrs = attrs;
    this.timestamp = message.thread_ts || message.ts;
    this.channel = message.channel;
    this.creator = creator;
    this.users = [creator];
  }

  userReacted(reaction, rtm, web) {
    if (this.users.indexOf(reaction.user) > -1) return;

    this.users.push(reaction.user);
    if (this.users.length >= this.matchAttrs.users) {
      this.complete(rtm, web);
    }
  }

  complete(rtm, web) {
    delete MATCHES[this.timestamp];
    web.reactions.add("white_check_mark", {
      channel: this.channel,
      timestamp: this.timestamp
    }, () => {});

    let users = this.users.map((user) => `<@${user}>`).join(' ');
    rtm.send({
      type: RTM_EVENTS.MESSAGE,
      text: `${this.matchAttrs.name} is on! Join in ${users}`,
      channel: this.channel,
      thread_ts: this.timestamp
    });
  }

  static responseFor(message, rtm, web) {
    let match = message.text.match(/(?:<@([^>]+)> )?needs? (\d+) (people|racers) for (\w+\W?\w+)/);
    if (match) {
      let matchmaker = new Matchmaker(message, match[1] || message.user, {
        name: match[4],
        titles: match[3],
        users: parseInt(match[2])
      });
      MATCHES[message.ts] =  matchmaker;
      this.callToAction(matchmaker, web);
    }
  }

  static callToAction(matchmaker, web) {
    // add our 'call to action' emojis
    let target = {
      channel: matchmaker.channel,
      timestamp: matchmaker.timestamp
    }
    web.reactions.add("arrow_right", target, (err) => {
      if (!err) web.reactions.add("raised_hand", target, () => {});
    })
  }

  static reacted(reaction, rtm, web) {
    let item = reaction.item;
    let matchmaker = MATCHES[item.ts];
    if (!matchmaker) return;

    matchmaker.userReacted(reaction, rtm, web);
  }

  static slashCommand(params, rtm, web) {
    let config = COMMANDS[params.command];
    if (config) {
      return {
        text: `<@${params.user_id}> needs ${config.users} ${config.titles} for ${config.name}! Jump in.`,
        response_type: "in_channel"
      };
    }
    return null;
  }
}

module.exports = Matchmaker;
