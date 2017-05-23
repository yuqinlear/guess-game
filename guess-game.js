/**
 * Created by chli on 4/4/2017.
 */
'use strict';

const rp = require('request-promise');
const _ = require('lodash');
const bb = require('bluebird');

const MATCHED_STRING_FOUND = 'matched string found';
// const NOT_A_MATCHED_WORD = 'not a matched word';

function GuessGame(host, username) {
  this.host = host;
  this.username = username;
  this.dictUrl = host + '/dict'; //e.g. http://rocky-everglades-1153.herokuapp.com/dict
  this.tokenUrl = host + '/start'; //e.g. http://rocky-everglades-1153.herokuapp.com/start?name=paul
  this.patternUrl = host + '/phrase'; // e.g. http://rocky-everglades-1153.herokuapp.com/phrase?token=5224342386892206846
  this.guessUrl =  host + '/guess'; // e.g. http://rocky-everglades-1153.herokuapp.com/guess?token=5224342386892206846&guess=bello+wierd
  this.token = '';
  this.dictMap = {};
  this.patternLenArr = [];
  this.matchedStr = '';  // e.g. "hello"
  this.spaceOutPatterStr = '';  // e.g. "hello world" => "           "
  this.matchedWordArr = []; // e.g. ["hello", "world"]
  this.matchedStrLength = 0; // "           " => 1 ; the space is matched
  this.allSpaceNum = 0;
  this.matchedWordsLength = 0;
  this.foundStr = false;
  this.isDone = false;
}

GuessGame.prototype.initialize = function() {
  this.patternLenArr = [];
  this.matchedStr = '';  // e.g. "hello"
  this.spaceOutPatterStr = '';  // e.g. "hello world" => "           "
  this.matchedWordArr = []; // e.g. ["hello", "world"]
  this.matchedStrLength = 0; // "           " => 1 ; the space is matched
  this.allSpaceNum = 0;
  this.matchedWordsLength = 0;
  this.foundStr = false;
};

GuessGame.prototype.setup = function() {
  return Promise.all([
    this.fetchDictionary(),
    this.fetchToken()
  ]).catch(err => {
    console.error(err);
  });

};

GuessGame.prototype.guessNextString = function() {
  this.fetchPattern()
    .then(() => {
      if (this.isDone) {
        console.log('done!!!');
        return;
      } else {
        this.guessNextWord()
          .then(( ) => {
            this.initialize();
            this.guessNextString();
          })
      }
    })
    .catch((err) => {
      console.error(err);
    })
};

GuessGame.prototype.fetchDictionary = function() {
  return rp({
    uri: this.dictUrl
  }).then((response) => {
    let dictArr = JSON.parse(response.replace(/\'/g, '"'));
    this.dictMap = _.groupBy(dictArr, 'length');
    // console.log(this.dictMap);
  }).catch((err) => {
    console.error(err);
  })
};

GuessGame.prototype.fetchToken = function() {
  return rp({
    uri: this.tokenUrl,
    qs: {
      name: 'paul'
    }
  }).then((response) => {
    this.token = response;
    // console.log(response);
  }).catch((err) => {
    console.error(err);
  });
};

GuessGame.prototype.fetchPattern = function() {
  return rp({
    uri: this.patternUrl,
    qs: {
      token: this.token,
    }
  }).then((response) => {
    if (_.isEmpty(response)) {
      this.isDone = true;
      return 'done';
    }
    this.pattern = response.split(" ").map((word) => word.length);
    this.allSpaceNum = this.pattern.length - 1;
    this.spaceOutPatterStr = response.replace(/./g, " " );
    // console.log(this.pattern);
    // console.log(this.matchedStr);
  }).catch((err) => {
    console.error(err);
  });
};

GuessGame.prototype.guessNextWord = function() {
  let nextWordLength = this.pattern[this.matchedWordArr.length];
  return bb.any(
      this.dictMap[nextWordLength].map((attemptWord) => this.guess(attemptWord))
    ).then((matchedNewWord) => {
      // console.log(matchedNewWord);
      this.matchedWordArr.push(matchedNewWord);
      this.matchedWordsLength += matchedNewWord.length;
      if (this.matchedWordArr.length === this.pattern.length) {
        console.log("bingo");
        console.log(this.matchedWordArr.toString());
        return MATCHED_STRING_FOUND;
      } else {
        return this.guessNextWord();
      }
    }).catch((err) => {
      // console.error(err);
    })
};

GuessGame.prototype.guess = function(attemptWord) {
  // let attemptStr = this.matchedStr === '' ? attemptWord : this.matchedStr + ' ' + attemptWord;
  let matchedStr = this.matchedWordArr.length === 0 ? '': this.matchedWordArr.reduce((prev, curr) => prev + ' ' + curr);
  let attemptStr = matchedStr === '' ? attemptWord : matchedStr + ' ' + attemptWord;
  attemptStr = attemptStr + this.spaceOutPatterStr.substring(attemptStr.length, this.spaceOutPatterStr.length);
  let expectedLength = this.matchedWordsLength + this.allSpaceNum + attemptWord.length;
  return rp({
    uri: this.guessUrl,
    qs: {
      token: this.token,
      guess: attemptStr
    }
  }).then((response) => {
    let temptMatchedLength = parseInt(response);
    if (isNaN(temptMatchedLength)) throw response;
    if (temptMatchedLength === expectedLength) { // !found a new matched word;
      // this.matchedWordArr.push(attemptWord);
      // this.matchedWordsLength += attemptWord.length;
      return attemptWord;
    } else {
      return Promise.reject('not a matched word');
    }
  }).catch((err) => {
    // console.error(err);
    throw err;
  });
};

module.exports = GuessGame;