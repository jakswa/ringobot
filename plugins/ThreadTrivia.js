const secrets = require.main.require('./secrets');
const slackInfo = require.main.require('./lib/slack_info');
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

const ROUND_SIZE = 10;
const START_DELAY = 5; // seconds to allow thread joining
const TRIVIA_STARTS = [/i.*need.*trivia/i, /trivia me/i, /host some trivia/i];
const LETS_GO = [
  'My friends! Trivia starts in a few seconds, join me in the thread below!'
];
const TRIVIA_SESSIONS = {};

try {
  var QUESTIONS = secrets.decryptFile('trivia_questions');
} catch (err) {
  var QUESTIONS = [['Did you get the secret question key from Jake?', ['no']]];
}


class ThreadTrivia {
  constructor(threadParent) {
    this.threadParent = threadParent
    this.scores = {};
    this.shuffleQuestions();
    this.questionIndex = 0;
  }

  shuffleQuestions() {
    this.questionList = QUESTIONS.slice(0);
    this.questionList.sort(function() { return Math.random() - 0.5 });
    this.questionList = this.questionList.slice(0, ROUND_SIZE);
  }

  sendQuestion(rtm) {
    let question = this.questionList[this.questionIndex][0];
    let questionNumber = this.questionIndex + 1
    this.send(question, rtm)
  }

  send(msg, rtm) {
    rtm.send({
      type: RTM_EVENTS.MESSAGE,
      text: msg,
      channel: this.threadParent.channel,
      thread_ts: this.threadParent.ts
    });
  }

  matchingAnswer(answer) {
    answer = answer.replace(/^(?:<@\w+> )?/, '').toLowerCase();
    let question = this.questionList[this.questionIndex]
    return question && question[1]
      .find(function(i) { return answer === i });
  }

  checkMessage(message, rtm) {
    let answer = this.matchingAnswer(message.text);
    if (!answer) return;

    this.userScored(message.user);
    let newQuestion = answer && this.newQuestion();
    if (newQuestion) {
      this.send(answer + "! <@" + message.user + "> got it! New question: " + newQuestion, rtm);
    } else {
      let msg = " Round complete! Final standings:\n" +
        this.leaderBoardPrintout();
      this.send(msg, rtm);
      this.finishSession();
    }
  }

  leaderBoard() {
    var scoreArray = Object.keys(this.scores).map((user) => {
      return [user, this.scores[user]];
    });

    scoreArray.sort(function(a, b) { return a[1] < b[1] });
    return scoreArray.slice(0,10);
  }

  leaderBoardPrintout() {
    var leaders = this.leaderBoard();
    if (leaders.length > 0) {
      return leaders.reduce(function(acc, val) { return acc + val[0] + ' - ' + val[1] + "\n"; }, '')
    } else {
      return "No leaders :()"
    }
  }

  userScored(user) {
    // TODO make this less ugly
    // this is asynchronous *if* the user isn't known
    // (we need to hit slack for the full user list, try to find them)
    var cachedName = slackInfo.nameFor(user, (realName) => {
      this.scores[realName] = (this.scores[realName] || 0) + 1;
    });
    // seen before
    if (cachedName) {
      return this.scores[cachedName];
    } else {
      return 1; // new user got one (have to reload user list), assume 1
    }
  }

  finishSession() {
    // let this session fall out of reference, begone
    delete TRIVIA_SESSIONS[this.threadParent.ts];
  }

  newQuestion() {
    let question = this.questionList[++this.questionIndex];
    return question && question[0];
  }

  static responseFor(message, rtm) {
    if (!message.thread_ts && TRIVIA_STARTS.find((start) => message.text.match(start))) {
      let announceMsg = LETS_GO[Math.floor(LETS_GO.length * Math.random())];
      this.startTrivia(announceMsg, message.channel, rtm)
    }

    var activeSession = TRIVIA_SESSIONS[message.thread_ts];
    if (activeSession) activeSession.checkMessage(message, rtm);
  }

  static startTrivia(announceMsg, channel, rtm) {
    rtm.sendMessage(announceMsg, channel, (err, topMsg) => {
      if (err) throw err;
      let newSession = new ThreadTrivia(topMsg);
      TRIVIA_SESSIONS[topMsg.ts] = newSession;
      newSession.send("This message is only here to make it easy to join the thread.", rtm)
      setTimeout(() => newSession.sendQuestion(rtm), START_DELAY * 1000);
    })
  }
}

module.exports = ThreadTrivia;
