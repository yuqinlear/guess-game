/**
 * Created by chli on 4/4/2017.
 */
'use strict';
const GuessGame = require('./guess-game');

let game = new GuessGame('http://rocky-everglades-1153.herokuapp.com', 'paul');
game
  .setup()
  .then(() => game.guessNextString());
