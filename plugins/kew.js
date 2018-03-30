const HELP = [
  '`queue for [thing]` - Queues you for thing. If queue is empty, you immediately go.',
  '`queue behind @<user> for [thing]` - Queues you for thing. If queue is empty, <user> goes in front of you',
  ':checkered_flag: - This moves queues forward. Reacting user must be in queue. Reaction target must contain the text [thing].'
];
const KEWS = {};
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const FINISH_MOJIS = ['checkered_flag'];

class Kew {
  static responseFor(message, rtm, web) {
    let match = message.text.match(/(?:i'm )?queued? (?:me )?(?:up )?(?:behind <@(\S+)> )?for (\S+)/i);
    if (match) this.enkew(match[2], match[1], message, rtm);
    match = message.text.match(/my queue position/)
    if (match) this.listUserKews(message, rtm);
  }

  static listUserKews(message, rtm) {
    var msgs = [];
    for(var n in KEWS) {
      var q = KEWS[n];
      if (!q.includes(message.user)) continue;
      msgs.push(`${n}: position ${q.indexOf(message.user)}`);
    }

    if(msgs.length === 0) {
      msgs.push("You aren't queued for anything! The world is your oyster.");
    }
    rtm.send({
      type: RTM_EVENTS.MESSAGE,
      text: msgs.join("\n"),
      channel: message.channel,
      thread_ts: message.thread_ts || message.ts
    });
  }

  static enkew(kewName, initBehind, message, rtm) {
    if (!KEWS[kewName]) KEWS[kewName] = [];
    var q = KEWS[kewName];
    if (initBehind && q.length === 0) {
      q.push(initBehind);
    }

    var msg = `Put you into the ${kewName} queue!`;
    // queueing up with no 'behind <user>', and its empty... you go!
    if (q.length === 0) {
      msg += " The queue was empty! You are up!";
    } else {
      var behind = q[q.length-1];
      msg += ` You're ${q.length > 1 ? ("#" + q.length) : 'next' } in line, behind <@${behind}>!`;
    }
    q.push(message.user);

    rtm.send({
      type: RTM_EVENTS.MESSAGE,
      text: msg,
      channel: message.channel,
      thread_ts: message.thread_ts || message.ts
    });
  }

  static reacted(reaction, rtm, web) {
    var msg;
    if (!FINISH_MOJIS.includes(reaction.reaction)) {
      return;
    }
    for(var kewName in KEWS) {
      // `null` is at the front of the queue if someone failed to add 'behind <@user>' to start it
      if(KEWS[kewName].includes(reaction.user) || KEWS[kewName].includes(null)) {
        this.loadMsg(reaction.item, web).then((msg) => {
          // also check attachment :O
          if (msg.text.includes(kewName) || (msg.attachments && msg.attachments[0].title.includes(kewName))) {
            KEWS[kewName].shift();
            let next = KEWS[kewName][0];
            if (!next) {
              delete KEWS[kewName];
              var msgText = `The ${kewName} line moved. It's now empty.`;
            } else {
              msgText = `The ${kewName} line moved. <@${next}>'s turn. ${KEWS[kewName].length - 1} behind them in line.`;
            }

            rtm.send({
              type: RTM_EVENTS.MESSAGE,
              text: msgText,
              channel: reaction.item.channel,
              thread_ts: msg.thread_ts || msg.ts
            });
          }
        });
        return;
      }
    }
  }

  static loadMsg(lightMsg, web) {
    return new Promise((resolve, reject) => {
      web.channels.history(lightMsg.channel, {
        channel: lightMsg.channel,
        latest: lightMsg.ts,
        oldest: lightMsg.ts,
        count: 1,
        inclusive: true
      }, (err, resp) => {
        if (err) reject(err);
        else resolve(resp.messages[0]);
      });
    })
  }
}

Kew.help = HELP;

module.exports = Kew
