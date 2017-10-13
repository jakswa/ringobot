const SlackWallet = require.main.require("./lib/slack_wallet");
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

class Wallet {
  static responseFor(message, rtm, web) {
    if (message.text.indexOf("check balance") > -1) {
      this.checkBalance(message, rtm);
    }

    let xfer = message.text.match(/transfer (\d+) bits to <@(\w+)>/)
    if (xfer) {
      let value = parseInt(xfer[1]);
      let target = xfer[2]
      this.xfer(value, message.user, target, rtm, web, message);
    }
  }


  static reacted(reaction, rtm, web) {
    // this plugin reacts to 10/100/1000 bits
    let match = reaction.reaction.match(/(10{1,3})bits$/);
    if (!match) return;

    // only support bits for instant transfers
    let value = parseInt(match[1]);
    this.xfer(value, reaction.user, reaction.item_user, rtm, web, reaction.item);
  }

  static react(emoji, web, item) {
    web.reactions.add(response, {
      channel: item.channel,
      timestamp: item.ts
    }, (err, resp) => {});
  }

  // white check mark
  static toast(response, web, item) {
    web.reactions.add(response, {
      channel: item.channel,
      timestamp: item.ts
    }, (err, resp) => {
      setTimeout(() => {
        web.reactions.remove(response, {
          channel: item.channel,
          timestamp: item.ts
        }, () => {});
      }, 2000)
    });
  }

  static xfer(value, fromUser, toUser, rtm, web, item) {
    value = value * 0.000001;
    SlackWallet.getBalance(fromUser).then((bits) => {
      if (value > bits) {
        rtm.send({
          type: RTM_EVENTS.MESSAGE,
          text: "Looks like your balance is only " + bits,
          channel: item.channel,
          thread_ts: item.ts
        })
        return;
      }


      let xfer = SlackWallet.transfer(value, fromUser, toUser);

      xfer.then(() => this.react("white_check_mark", web, item))
        .catch((err)=> { 
          console.log(err);
          this.react("x", web, item)
        })
    });
  }

  static checkBalance(message, rtm) {
    let target = message.text.match(/check balance <@(\w+)>/);
    target = target ? target[1] : message.user;
    SlackWallet.getBalanceInfo(target).then((info) => {
      let native = info.wallet.native_balance;
      let msg = `<@${target}> is at ${parseInt(info.inBits)} bits (${native.amount} ${native.currency}).`
      rtm.send({
        type: RTM_EVENTS.MESSAGE,
        text: msg,
        channel: message.channel,
        thread_ts: message.thread_ts || message.ts
      });
    }).catch((err) => rtm.sendMessage(err.message, message.channel))
  }
}

module.exports = Wallet;
