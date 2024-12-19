const Board = document.getElementById("board");
const HelpPopup = document.getElementById("helpPopup");
const BoardLengths = [[5,5], [5,10], [5,15], [10,10], [10,15], [15,15]];
const ColorAmounts = [[16,9], [32, 18], [51, 24], [67, 33], [102, 48], [161, 64]];
//ColorAmounts holds the amount of purple and yellow tiles for a puzzle of each size
var CurrentBoardType = 1; //The index for BoardLengths/ColorAmounts
var Parties = ["gold", "mediumpurple"];
var Height = 5;
var Width = 10; //Height and Width are redundant but easier to read, these are always set to the corresponding values in BoardLengths
var BoardState = []; //Used to track which tiles are currently selected, and which have already been submitted.
var SubmittedCounties = []; //A list of each submission
var SubmittedCountyIndex = -1; //Index of the last submission active, when using ctrl+z submissions are not removed from SubmittedCounties to allow redoing them with ctrl+y
var CountySize = -1; //All counties must be the same size, determined by the first one entered.
var CanChangeCountySize = true;
var CurrentPuzzleLayout = []; //Used for saving the layout when resetting or printing the board.

//When the user enters ctrl+z this calls undoSubmission, and for ctrl+y it calls redoSubmission
function keyPressHandler(event) {
  if(event.ctrlKey) {
    if(event.key == 'z') {
      undoSubmission();
    }
    else if(event.key == 'y') {
      redoSubmission();
    }
  }
}
document.addEventListener("keydown", keyPressHandler);

//Called when the BoardSize select is changed
function boardSizeChanged(size) {
  CurrentBoardType = size;
  Height = BoardLengths[CurrentBoardType][0];
  Width = BoardLengths[CurrentBoardType][1];
  resetBoard(false);
}

//Highlights or unhighlights the selected tile
function tileWasClicked(id) {
  var cell = Board.children[id];
  var y = Math.floor(id/Width);
  var x = id%Width;
  var currentState = BoardState[y][x];
  
  if(currentState == -1) return;
  
  if(currentState == 0) {
    cell.children[0].style.opacity = "50%";
    BoardState[y][x] = 1;
  } else {
    cell.children[0].style.opacity = "0%";
    BoardState[y][x] = 0;
  }
}

//Checks that a County submitted is valid, currently inefficient as it rechecks tiles that have already been checked. Still basically instant in the absolute worst case though
function validate(County) {
  var countiesLinked = new Set();
  countiesLinked.add(County[0]);
  var prevLenth = 0;
  while(prevLenth != countiesLinked.size) {
    prevLenth = countiesLinked.size;

    for(const i of countiesLinked) {
      var x = i%Width;
      var y = Math.floor(i/Width);

      if(x > 0 && BoardState[y][x-1] == 1) countiesLinked.add(i-1);
      if(x < Width-1 && BoardState[y][x+1] == 1) countiesLinked.add(i+1);
      if(y > 0 && BoardState[y-1][x] == 1) countiesLinked.add(i-Width);
      if(y < Height-1 && BoardState[y+1][x] == 1) countiesLinked.add(i+Width);
    }
  }
  return countiesLinked.size == County.length;
}

/*Called when the submit button is pressed.
* Gets all highlighted tiles for the district submission,
* checks that the submission is valid,
* then removes any submissions currently being remembered for the sake of ctrl+y
* and adds the new submission. Lastly checks if the puzzle is solved.
*/
function submitButton() {
  var clicked = [];
  for(var i = 0; i < Height; i++) {
    for(var j = 0; j < Width; j++) {
      if(BoardState[i][j] == 1) clicked.push(i*Width+j);
    }
  }
  
  if(clicked.length == 0 || !validate(clicked)) {
    alert("The County you have entered is invalid (Countys must have at least one tile and all tiles must connect).");
    return;
  }

  if(CanChangeCountySize) {
    CountySize = clicked.length;
    CanChangeCountySize = false;
  }
  else if(clicked.length != CountySize) {
    alert("The County selected is not the same size as the previous County (" + CountySize + " tiles)");
    return;
  }

  SubmittedCounties = SubmittedCounties.slice(0, SubmittedCountyIndex+1);
  SubmittedCounties.push(clicked); //Remove undone submissions and add the new one

  setSubmittedCounty(clicked);
  
  if(clicked.length*SubmittedCounties.length == Height*Width) checkSolved();
}

//Used to change the appearance of tiles in a set county
function setSubmittedCounty(County) {
  SubmittedCountyIndex++;
  
  for(var i = 0; i < County.length; i++) {
    var cell = Board.children[County[i]];

    var x = County[i]%Width;
    var y = Math.floor(County[i]/Width);
    BoardState[y][x] = -1;

    cell.innerHTML = SubmittedCountyIndex+1;
    cell.style.filter = "grayscale(75%)";
  }
}

//Used to reset the appearance of tiles just removed from a county
function unsetSubmittedCounty(County) {
  SubmittedCountyIndex--;
  
  for(var i = 0; i < County.length; i++) {
    var index = County[i];
    var cell = Board.children[index];

    var x = index%Width;
    var y = Math.floor(index/Width);
    BoardState[y][x] = 0;

    setTileHighlight(index);
    cell.style.filter = "grayscale(0%)";
  }
}

//Counts the winners from each county, and verifies that the puzzle has been solved. Also alerts the user if a tie has occurred
function checkSolved() {
  var CountysWon = {"Tie": -1};
  var electionResult = "Tie";
  
  for(var i = 0; i < SubmittedCounties.length; i++) {
    var votes = {"Tie": -1};
    var winner = "Tie";
    for(var j = 0; j < SubmittedCounties[i].length; j++) {
      var party = Board.children[SubmittedCounties[i][j]].style.backgroundColor;
      if(party in votes) votes[party]++;
      else votes[party] = 1;

      if(votes[party] > votes[winner]) winner = party;
      if(votes[party] == votes[winner] && party != winner) winner = "Tie";
    }
    if(winner == "Tie") {
      alert("Ties are not allowed, puzzle failed (County " + (i+1) + " has tied).");
      return false;
    }
    
    if(winner in CountysWon) CountysWon[winner]++;
    else CountysWon[winner] = 1;

    if(CountysWon[winner] > CountysWon[electionResult]) electionResult = winner;
    if(CountysWon[winner] == CountysWon[electionResult] && winner != electionResult) electionResult = "Tie";
  }

  if(electionResult == "Tie") alert("The election was a tie, puzzle failed.");
  else if(electionResult != Parties[1]) {
    alert("The purple party did not win the election, puzzle failed (Purple had only " + CountysWon[Parties[1]] + " votes, while the winner had " + CountysWon[winner] + " votes).");
    console.log(electionResult, CountysWon);
  }
  else alert("Purple has won the election, puzzle completed!");
}

//Used to set the Highlight child element of a tile (the tile must already be in the board)
function setTileHighlight(index) {
  var cell = Board.children[index];
  cell.innerHTML = "";
  var highlight = document.createElement("div");
  highlight.setAttribute("class", "highlight");
  highlight.style.width = "100%";
  highlight.style.height = "100%";
  highlight.style.opacity = "0%";
  cell.appendChild(highlight);
}

//Resets the board and adds elements for the given height and width.
function populateGrid() {
  Board.innerHTML = "";
  BoardState = [];
  for (var i = 0; i < Height; i++) {
    BoardState.push([]);
    for(var j = 0; j < Width; j++) {
      var cell = document.createElement("div");
      cell.setAttribute("class", "cell");
      cell.setAttribute("onclick", "tileWasClicked(this.id)");
      cell.setAttribute("id", i*Width+j);
      cell.style.width = "5vmin";
      cell.style.height = "5vmin";
      
      Board.appendChild(cell);
      setTileHighlight(i*Width+j);
      BoardState[i].push(0);
    }
  }
  Board.style.gridTemplateColumns = "repeat(" + Width + ", 1fr)";
  Board.style.gridTemplateRows = "repeat(" + Height + ", 1fr)";
}

//Sets the color of each tile once the board is populated. Uses the number of additional tiles needed of each color to weight the randomness (ie: if purple has 1 and yellow has 2, there will be a 2/3 chance for a yellow tile)
function generatePuzzle() {
  var totalTiles = Height*Width;
  var eachColor = [...ColorAmounts[CurrentBoardType]];
  
  for(var i = 0; i < Height*Width; i++) {
    var rand = Math.floor(Math.random()*totalTiles);
    
    var party;
    for(party = 0; party < eachColor.length-1; party++) {
      if(rand < eachColor[party]) break;
      rand -= eachColor[party];
    }
    
    Board.children[i].style.backgroundColor = Parties[party];
    eachColor[party]--;
    totalTiles--;
  }
}

//Used to set the value of CurrentPuzzleLayout correctly.
function getCurrentPuzzle() {
  CurrentPuzzleLayout = [];
  for(var i = 0; i < Height*Width; i++) {
    CurrentPuzzleLayout.push(Parties.indexOf(Board.children[i].style.backgroundColor));
  }
}

//Never called by the program, can be used from the console if ever needed.
function printCurrentPuzzle() {
  getCurrentPuzzle();
  console.log(CurrentPuzzleLayout);
}

//Used to set the board to the layout provided (defaults to the current layout). Can also change the board size, though this is only needed if this function is called from the console by the user.
function setCurrentPuzzle(puzzle = CurrentPuzzleLayout) {
  if(puzzle.length == 25) boardSizeChanged(0);
  else if(puzzle.length == 50) boardSizeChanged(1);
  else if(puzzle.length == 75) boardSizeChanged(2);
  else if(puzzle.length == 100) boardSizeChanged(3);
  else if(puzzle.length == 150) boardSizeChanged(4);
  else if(puzzle.length == 225) boardSizeChanged(5);
  
  for(var i = 0; i < puzzle.length; i++) {
    Board.children[i].style.backgroundColor = Parties[puzzle[i]];
  }
}

//Called by the reset button, takes a parameter for whether to ask the user for confirmation or not (defaults to true)
function resetBoard(askReset = true) {
  if(askReset) {
    if(!confirm("Are you sure you want to reset the board?")) return;
    getCurrentPuzzle();
  }
  Board.innerHTML = "";
  BoardState = [];
  SubmittedCounties = [];
  SubmittedCountyIndex = -1;
  CountySize = -1;
  CanChangeCountySize = true;
  populateGrid();
  if(askReset) setCurrentPuzzle();
  else generatePuzzle();
}

//Undoes the last submission pointed to by SubmittedCountyIndex. If there are no more submissions to undo, nothing happens.
function undoSubmission() {
  if(SubmittedCountyIndex < 0) return;

  unsetSubmittedCounty(SubmittedCounties[SubmittedCountyIndex]);

  if(SubmittedCountyIndex == -1) CanChangeCountySize = true;
}

//Redoes the next submission in SubmittedCounties. If there aren't any more, nothing happens.
function redoSubmission() {
  if(SubmittedCountyIndex+1 >= SubmittedCounties.length) return;

  setSubmittedCounty(SubmittedCounties[SubmittedCountyIndex+1]);

  if(SubmittedCountyIndex == 0) CanChangeCountySize = false;
}

//Called by the help button, toggles the help popup.
function helpButton() {
  if(HelpPopup.style.display == "block") HelpPopup.style.display = "none";
  else HelpPopup.style.display = "block";
}

//Code executed when website is first loaded, simply sets up the board.
resetBoard(false);
