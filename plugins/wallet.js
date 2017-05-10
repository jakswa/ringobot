const SlackWallet = require.main.require("./lib/slack_wallet");

class Wallet {
  static responseFor(message, rtm) {
    if (message.text.indexOf("check balance") > -1) {
      this.checkBalance(message, rtm);
    }
  }

  static checkBalance(message, rtm) {
    let target = message.text.match(/check balance <@(\w+)>/);
    target = target ? target[1] : message.user;
    SlackWallet.getBalance(target).then((bits) => {
      let msg = `<@${target}> is up to ${bits} bits.`
      rtm.sendMessage(msg, message.channel);
    }).catch((err) => rtm.sendMessage(err.message, message.channel))
  }
}

module.exports = Wallet;
