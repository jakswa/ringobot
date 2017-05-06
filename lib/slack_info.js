var WebClient = require('@slack/client').WebClient;
var bot_token = process.env.SLACKIN_BOT_TOKEN || '';
var client = new WebClient(bot_token);

module.exports = SlackInfo;

function SlackInfo () {}

SlackInfo.usersByID = {};

SlackInfo.nameFor = function(userid, cb) {
  var userInfo = this.usersByID[userid];
  if (userInfo) {
    if (cb) cb(userInfo.real_name);
    return userInfo.real_name;
  }

  // attempt to load from API (new employees, etc)
  client.users.list(function(err, info) { 
    if (err) {
      if (cb) cb('<name_error>');
      return;
    }
    info.members.forEach(function(i) {
      SlackInfo.usersByID[i.id] = i;
    });
    userInfo = SlackInfo.usersByID[userid];
    if (cb) cb(userInfo.real_name);
  });
};
