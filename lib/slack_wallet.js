const SlackInfo = require("./slack_info");
const Client = require("coinbase").Client;

const client = new Client({
  apiKey: process.env.COINBASE_KEY,
  apiSecret: process.env.COINBASE_SECRET
});

// wallets by user
const BIT_VALUE = 0.000001;
const MAIN_WALLET_NAME = 'SeedWallet';
const WALLETS = {};

class SlackWallet {
  constructor(wallet) {
    this.wallet = wallet;
  }

  refresh() {
    return new Promise((resolve, reject) => {
      client.getAccount(this.wallet.id, (err, acct) => {
        if (err) reject(err)
        else {
          this.wallet = acct;
          resolve(this);
        }
      })
    })
  }

  seed() {
    return new Promise((resolve, reject) => {
      SlackWallet.mainWallet().then((mainWallet) => {
        mainWallet.wallet.transferMoney({
          to: this.wallet.id,
          amount: 0.0003,
          currency: 'BTC',
          description: 'seed xfer'
        }, (err, tx) => {
          if (err) reject(err);
          else resolve(this.refresh());
        })
      });
    })
  }

  transfer(amount, userId) {
    return new Promise((resolve, reject) => {
      SlackWallet.forUser(userId).then((destWallet) => {
        this.wallet.transferMoney({
          to: destWallet.wallet.id,
          amount: amount,
          currency: 'BTC',
          description: 'seed xfer'
        }, (err, tx) => {
          if (err) reject(err);
          else resolve(tx);
        })
      });
    });
  }

  static forUser(userId) {
    return new Promise((resolve, reject) => {
      SlackInfo.nameFor(userId, (name) => {
        let walletName = userId + "-" + name;
        if (!WALLETS[walletName]) WALLETS[walletName] = this.promiseFor(walletName);
        WALLETS[walletName].then(resolve).catch(reject);
      });
    })
  }

  static getBalance(userId) {
    return this.forUser(userId)
      .then((sw) => sw.refresh())
      .then((sw) => parseFloat(sw.wallet.balance.amount) / BIT_VALUE);
  }

  static transfer(fromUserId, toUserId) {
    return this.forUser(fromUserId).then((fromWallet) => {
      return fromWallet.transfer(amount, toUserId);
    });
  }

  static mainWallet() {
    if (!WALLETS.main) WALLETS.main = new Promise((resolve, reject) => {
      client.getAccounts({}, (err, accnts) => {
        let accnt = accnts.find((a) => a.name === MAIN_WALLET_NAME);
        if (!accnt) reject(new Error("no main account found"))
        else resolve(new SlackWallet(accnt));
      });
    });
    return WALLETS.main;
  }

  /* We at least need to fetch the wallet
   * from the coinbase API, and if first time
   * we might create it as well.
   */
  static promiseFor(walletName) {
    return new Promise((resolve, reject) => {
      client.getAccounts({}, (err, acc) => {
        if (err) {
          reject(err);
          return;
        }

        let existing = acc.find((a) => a.name.indexOf(walletName) === 0);
        if (existing) {
          resolve(new SlackWallet(existing));
          return;
        }

        return this.createAccount(walletName)
          .then((wallet) => wallet.refresh())
          .then(resolve)
          .catch(reject);
      })
    });
  }

  static createAccount(walletName, resolve, reject) {
    return new Promise((resolve, reject) => {
      client.createAccount({name: walletName}, (err, acct) => {
        if (err) reject(err);
        else {
          let wallet = new SlackWallet(acct);
          // seed the wallet before offering it up for use :dance:
          wallet.seed().then(resolve).catch(reject);
        }
      });
    })
  }
}

module.exports = SlackWallet;
