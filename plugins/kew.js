/*
 * SYNTAX1: queue for [thing]
 * SYNTAX2: queue behind <user> for [thing]
 */
// <name> -> [users] mapping
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
    if (!KEWS[kewName]) KEWS[kewName] = [initBehind];
    var q = KEWS[kewName];

    var behind = q[q.length-1];
    var behindMsg = behind ? `You're #${q.length > 1 ? q.length : 'next' } in line, behind <@${behind}>!` : 'You are next!';
    q.push(message.user);

    rtm.send({
      type: RTM_EVENTS.MESSAGE,
      text: `Queued you for ${kewName}! ${behindMsg}`,
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

module.exports = Kew
