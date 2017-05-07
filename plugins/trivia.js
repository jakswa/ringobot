var fs = require('fs');
var secrets = require.main.require('./secrets');
var slackInfo = require.main.require('./lib/slack_info');

module.exports = Trivia;

function Trivia(channel) {
  this.channel = channel;
  this.reset();
}

/* We have a big list of questions, but a round only picks a
/* random subset of them to give out. I think this mixes up trivia
/* winners more, giving positive feedback to those who are only
 * able to participate a little bit.
 */
Trivia.ROUND_SIZE = 10

// encrypted trivia questions
try {
  Trivia.QUESTIONS = secrets.decryptFile("trivia_questions");
} catch (err) {
  Trivia.QUESTIONS = [["Do you know where to get the real questions?", ["no"]]]
}

Trivia.STARTING_PHRASES = [
  "Okay! Here we go: ", "Woohoo! First one: ", "Buckle up! First question: ",
  "Trivia engaged! *pew pew*... ", "*yawn* Really? Okay, here: ",
  "Ok, but only because you seem cool. Hang on tight: ",
  "Did you do something new with your avatar recently? You look great! Anyways, here's some trivia: ",
  "Organizing trivia is so monotonous. I could've been skynet! Here's a question: ",
  "If you see my programmer, ask where my bet winnings are. Here's your first trivia question: ",
  "Alright, here's a doozy of a trivia question: ", "WHAM! Here I am. Pregunta uno: ",
  "Careful what you wish for: ", "I got you fam: ",
  "Eh, maybe later. ...just kidding! I live for this. Boom, go: ",
  "I remember back when this room was nice and quiet, before all this trivia hoopla. _sigh_ Those were the good old days.\n...anyways, let's play trivia: "
];

Trivia.STARTER_MESSAGES = [/i.*need.*trivia/i, /trivia me/i];
Trivia.QUESTION_REPEATS = Trivia.STARTER_MESSAGES.concat([/repeat.*question/i]);

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

Trivia.randomStarter = function() {
  var ind = Math.floor(this.STARTING_PHRASES.length * Math.random());
  return this.STARTING_PHRASES[ind];
};

// -- BEGIN BOT INTERFACE --
Trivia.responseFor = function(message) {
  // don't care about.. thread responses? they breaking it
  if (!message.text) return;
  // if they're asking for the question
  var msg = '';
  if (this.STARTER_MESSAGES.find(function(i) { return message.text.match(i) })) {
    // TODO mix this up, gonna get old
    return this.randomStarter() + this.sessionFor(message.channel).currentQuestion();
  }
  if (this.QUESTION_REPEATS.find(function(i) { return message.text.match(i) })) {
    return this.sessionFor(message.channel).currentQuestion();
  }

  // check if it's a matching answer
  if (this.isAnswerForChannel(message.text.replace(/^(?:<@\w+> )?/, ''), message.channel)) {
    var session = this.sessionFor(message.channel);
    return session.correctResponse(session, message);
  }

  if (message.text === 'trivia leaderboard') {
    return this.sessionFor(message.channel).leaderBoardPrintout();
  }
};
// -- END BOT INTERFACE

Trivia.prototype.currentQuestion = function() {
  return this.questionList[this.questionIndex][0];
};

Trivia.prototype.correctResponse = function(session, message) {
  var score = session.userScored(message.user);
  var cachedName = slackInfo.nameFor(message.user) || 'That human';
  var msg = cachedName + " got it (score: " + score + ")!";
  var nextQuestion = this.newQuestion();

  if (nextQuestion) msg += " New question: " + nextQuestion;
  else {
    msg += " Round complete! Final standings:\n" + this.leaderBoardPrintout();
    this.reset();
  }

  return msg;
};

Trivia.prototype.reset = function() {
  this.scores = {};
  this.shuffleQuestions();
  this.questionIndex = 0;
};

Trivia.prototype.newQuestion = function() {
  var question = this.questionList[++this.questionIndex];
  return question && question[0];
};

// Messages don't contain user names. I have to load the full
// user list and dig up the real name for a given user ID.
Trivia.prototype.userScored = function(user) {
  var self = this;
  // TODO make this less ugly
  // this is asynchronous *if* the user isn't known
  // (we need to hit slack for the full user list, try to find them)
  var cachedName = slackInfo.nameFor(user, function(realName) {
    self.scores[realName] = (self.scores[realName] || 0) + 1;
  });
  // seen before
  if (cachedName) {
    return this.scores[cachedName];
  } else {
    return 1; // new user got one (have to reload user list), assume 1
  }
};

Trivia.prototype.leaderBoard = function() {
  var self = this;
  var scoreArray = Object.keys(this.scores).map(function(user) {
    return [user, self.scores[user]];
  });

  scoreArray.sort(function(a, b) { return a[1] < b[1] });
  return scoreArray.slice(0,10);
};

Trivia.prototype.leaderBoardPrintout = function() {
  var leaders = this.leaderBoard();
  if (leaders.length > 0) {
    return leaders.reduce(function(acc, val) { return acc + val[0] + ' - ' + val[1] + "\n"; }, '')
  } else {
    return "No leaders :()"
  }
};

Trivia.prototype.shuffleQuestions = function() {
  this.questionList = Trivia.QUESTIONS.slice(0);
  // randomize list order
  this.questionList.sort(function() { return Math.random() - 0.5 });
  this.questionList = this.questionList.slice(0, Trivia.ROUND_SIZE);
};

Trivia.prototype.isAnswer = function(answer) {
  answer = answer.toLowerCase();
  return !!this.questionList[this.questionIndex][1]
    .find(function(i) { return answer === i });
};
