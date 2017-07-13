// Mario queue plugin.
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

// list of active mario queues, by message timestamp
const MATCHES = {};
// list of match types, with their match attrs
const COMMANDS = {
  "/mario": { users: 4, name: "mario", titles: "racers"}
}; 
const LUNCH_MSGS = [
  "I'm on lunch break. A bot's gotta eat! :nomnom:",
  "frantic /mario mode is engaged during lunch hour (physical mario queueing only).",
  "physical queues get priority during lunch hour. Go stand by the TV!"
];
// :oo: because it is final piece of M A R I O
const FINISH_REACTIONS = ['white_check_mark', 'oo'];

class Matchmaker {
  constructor(message, creator, attrs) {
    this.matchAttrs = attrs;
    this.timestamp = message.thread_ts || message.ts;
    this.channel = message.channel;
    this.creator = creator;
    this.users = [creator];
  }

  userReacted(reaction, rtm, web) {
    if (this.users.indexOf(reaction.user) > -1) {
      // participating users can lock the match in (tired of waiting on 4)
      if (FINISH_REACTIONS.includes(reaction.reaction)) {
        this.complete(rtm, web);
      }
      return;
    }

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
      text: `${this.matchAttrs.name} is on! ${this.matchAttrs.titles}: ${users}`,
      channel: this.channel,
      thread_ts: this.timestamp
    });
  }

  static responseFor(message, rtm, web) {
    let match = message.text.match(/(?:<@([^>]+)> )?needs? (\d+) (.+) for (\w+\W?\w+)/);
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
    // lunchtime is frantic mode for mario kart
    if (params.command === '/mario' && this.outToLunch()) {
      let ind = Math.floor(Math.random() * LUNCH_MSGS.length);
      return {
        text: `Sorry <@${params.user_id}>, ${LUNCH_MSGS[ind]}`,
        response_type: "in_channel"
      }
    }
    let config = COMMANDS[params.command];
    if (config) {
      return {
        text: `<@${params.user_id}> needs ${config.users} ${config.titles} for ${config.name}! Join in with any emoji reaction.`,
        response_type: "in_channel"
      }
    }
    return null;
  }

  static outToLunch() {
    let lunchStart = new Date();
    lunchStart.setHours(12);
    lunchStart.setMinutes(0);
    lunchStart.setSeconds(0);
    lunchStart.setMilliseconds(0);

    let diff = (new Date()) - lunchStart;
    return diff > 0 && diff <= 3600000; // difference within an hour
  }
}

module.exports = Matchmaker;
