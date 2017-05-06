var fs = require('fs');
var SlackInfo = require('./slack_info');

module.exports = Trivia;

function Trivia(channel) {
  this.channel = channel;
  this.questionList = Trivia.QUESTIONS.slice(0);
  // randomize list order
  this.questionList.sort(function() { return Math.random() });
  this.questionIndex = 0;
  this.scores = {};
}

Trivia.QUESTIONS = fs.readFileSync('trivia_questions.json');

Trivia.QUESTION_REPEATS = [/repeat.*question/i, /i.*need.*trivia/i, /trivia me/i];

Trivia.SESSIONS = {};

Trivia.sessionFor = function(channel) {
  if (!this.SESSIONS[channel]) {
    this.SESSIONS[channel] = new Trivia(channel);
  }
  return this.SESSIONS[channel];
};

Trivia.isAnswerForChannel = function(answer, channel) {
  // it's not matching if no trivia in progress (just joined)
  if (!this.SESSIONS[channel]) return;
  return this.SESSIONS[channel].isAnswer(answer);
};

// -- BEGIN BOT INTERFACE --
Trivia.responseFor = function(message) {
  // if they're asking for the question
  if (this.QUESTION_REPEATS.find(function(i) { return message.text.match(i) })) {
    return this.sessionFor(message.channel).currentQuestion();
  }

  // check if it's a matching answer
  if (this.isAnswerForChannel(message.text, message.channel)) {
    var session = this.sessionFor(message.channel);
    var score = session.userScored(message.user);
    var cachedName = SlackInfo.nameFor(message.user) || 'That human';
    return cachedName + " got it! They've got " + score + ". New question: " + session.newQuestion();
  }

  if (message.text === 'trivia leaderboard') {
    var leaders = this.sessionFor(message.channel).leaderBoard();
    if (leaders.length > 0) {
      return leaders.reduce(function(acc, val) { return acc + val[0] + ' - ' + val[1] + "\n"; }, '')
    } else {
      return "No leaders :()"
    }
  }
};
// -- END BOT INTERFACE

Trivia.prototype.currentQuestion = function() {
  return this.questionList[this.questionIndex][0];
};

Trivia.prototype.newQuestion = function() {
  this.questionIndex = (this.questionIndex + 1) % this.questionList.length;
  return this.questionList[this.questionIndex][0];
};

Trivia.prototype.userScored = function(user) {
  var self = this;
  var cachedName = SlackInfo.nameFor(user, function(realName) {
    self.scores[realName] = (self.scores[realName] || 0) + 1;
  });
  // seen before
  if (cachedName) {
    return this.scores[cachedName];
  } else {
    return 1;
  }
};

Trivia.prototype.leaderBoard = function() {
  var self = this;
  var scoreArray = Object.keys(this.scores).map(function(user) {
    return [user, self.scores[user]];
  });

  scoreArray.sort(function(a, b) { return a[1] > b[1] });
  return scoreArray.slice(0,10);
};

Trivia.prototype.isAnswer = function(answer) {
  return !!this.questionList[this.questionIndex][1]
    .find(function(i) { return answer === i });
};
