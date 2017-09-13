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
          currency: 'BTC'
        }, (err, tx) => {
          if (err) {
            console.log("transfer xfer failed", amount, this.wallet.id, destWallet.wallet.id, err);
            reject(err);
          } else resolve(tx);
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

  static getBalanceInfo(userId) {
    return this.forUser(userId)
      .then((sw) => sw.refresh())
      .then((sw) => {
        let bits = parseFloat(sw.wallet.balance.amount) / BIT_VALUE;
        return {
          wallet: sw.wallet,
          inBits: bits
        }
      });
  }

  static transfer(amount, fromUserId, toUserId) {
    return this.forUser(fromUserId).then((fromWallet) => {
      return fromWallet.transfer(amount, toUserId);
    });
  }

  static mainWallet() {
    if (!WALLETS.main) WALLETS.main = new Promise((resolve, reject) => {
      this.accountList().then((accnts) => {
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
    return this.accountList().then((accounts) => {
      let existing = accounts.find((a) => a.name.indexOf(walletName) === 0);
      if (existing) {
        return new SlackWallet(existing);
      }

      return this.createAccount(walletName)
        .then((wallet) => wallet.refresh())
    });
  }

  static accountList(startPagination) {
    return new Promise((resolve, reject) => {
      client.getAccounts(startPagination, (err, list, pagination) => {
        if (err) {
          reject(err);
          return;
        }
        if (pagination.next_uri) {
          // recursively fetch next page and combine the results
          this.accountList(pagination).then((nextPage) => resolve(list.concat(nextPage)));
        } else {
          resolve(list);
        }
      });
    })
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
