/*
/ Behaviorism
*/

/*
/	IDEAS
/ Present level objective icon interpretation in top right at the same time, e.g. infinity / symbol = "Chain!".
/ Take out levels and implement dynamic adaptive system.
/ Security of SVG uploads:
/ http://heideri.ch/svgpurifier/SVGPurifier/index.php
/http://www.hgi.ruhr-uni-bochum.de/media/hgi/veroeffentlichungen/2011/10/19/svgSecurity-ccs11.pdf
/
/	TODO
/		Subtract time on level screen from corSpeed calculation
*/

//UI
//Dimensions
var kGridX = 800;
var kGridY = 600;

var kMargin = 5;

var kCharSize = 50;
var kMsgSize = kCharSize;
var kScoreSize = kCharSize/2;

//Character Padding (Include Y values of Message, Score and Margin)
var kPadCharX = 0;
var kPadCharY = kMsgSize + kScoreSize;

//Size of grid without padding
var kGridPadX = kGridX;
var kGridPadY = kGridY - kPadCharY;

//Ensure that Possible Character Positions do not go past the edge of the canvas
var kPosCharX = kGridPadX - kCharSize;
var kPosCharY = kGridPadY - kCharSize;

//Centered Character positions
var kCentCharX = (kPosCharX/2) + (kCharSize/2) + (kPadCharX/2);
var kCentCharY = (kPosCharY/2) + (kCharSize/2) + (kPadCharY/2);

//View
var mainView;

//HTML Elements
var gCanvasElement;
var gDrawingContext;

//Array of possible letters
var aLetters = new Array();
//Array of correct letters - challenge mode
var aUsedLetters = new Array();
//Array of letters currently displayed
var aDispLetters = new Array();
//Array of letters currently displayed - distractors
var aDistLetters = new Array();
//Array of challenge letters completed
var aChalLetters = new Array();
//Array of characters in create new level
var aNewLevelChars = new Array();

//Array of images to preload and use
var aImages = new Array();
//Array of audio to preload and use
var aAudio = new Array();

//input
var user = null;
var viewTask = null;
var viewLevel = null;
var viewComment = null;

var aRef = [];

/*
/ Constructors
*/
function Letter()
{
	this.code = 0;
	this.x = 0;
	this.y = 0;
	
	this.size = kMsgSize;
	
	this.distractor = false;
	this.distractorTimeout = null;
}

function view()
{
	//Debug
	this.debug = true;
	
	this.vFrameRate = 30;
	
	this.scoreInfo = "";
	this.scoreNum = 0;
	this.dispScore = false;
	
	this.levelScreen = false;
	
	//How long the score is shown on the screen for
	this.scoreTimeout = 500;
	//How long until the score is shown on interval schedules
	this.intTimeout = 1000;
	//Don't queue up a interval timeout while we are waiting for one to show up
	this.scoreWait = false;
}

view.prototype.fillALetters = function()
{
	emptyArray(aLetters);
	if (currGame.state != 40) {
		while (aLetters.length < 26) {
			//lower-case letters a-z
			for (var i = 97; i <= 122; i++) {
				var temp = new Letter();
				temp.code = i;
				aLetters.push(temp);
			}
		}
	}
	else {
		aTemp = localStorage["tasks."+viewTask+".levels."+viewLevel+".chars"].split(',');
		for (var i = 0; i < aTemp.length; i++) {
			//push chars from custom level chars
			var temp = new Letter();
			temp.code = parseInt(aTemp[i]);
			aLetters.push(temp);
		}
	}
}

view.prototype.setupLetters = function()
{
	//Empty and fill aLetters with all the letters of the alphabet
	mainView.fillALetters();
	//Empty display letters
	emptyArray(aDispLetters);
	//Empty distractor letters
	emptyArray(aDistLetters);
		
	if (currGame.state < 8) {
		//Push a random letter from all letters into display letters
		var tChar = Math.floor(Math.random() * aLetters.length);
		aDispLetters.push(aLetters[tChar]);
		randomCharPosition(aDispLetters[0]);
		
		//If level 8 or 10, randomly show distractors
		if (currGame.level >= 8 && !aDispLetters[0].distractorTimeout) {
			var e = Math.random();
			if (e <= .25) {
				aDispLetters[0].distractor = true;
				var y = currGame.calcDistractorTimeout();
				aDispLetters[0].distractorTimeout = setTimeout('viewHandleKeypress()', y*1000);
			}
		}
	}
	else if (currGame.state == 8) {
		//Push in a letter to aDispLetters that is not in aChalLetters
		
		//Splice out successful challenge letters from aLetters
		var x = aLetters.length;
		while (aLetters.length > x-aChalLetters.length) {
			for (var i = 0; i < aChalLetters.length; i++) {
				for (var j = 0; j < aLetters.length; j++) {
					if (aChalLetters[i].code == aLetters[j].code) {
						aLetters.splice(j, 1);
					}
				}
			}
		}
		
		//Randomly choose from remaining letters which to show
		var y = Math.floor(Math.random() * aLetters.length);
		aDispLetters.push(aLetters[y]);
		
		//Rebuild aLetters
		mainView.fillALetters();
		
		//Splice out chosen letter
		var z = aLetters.length;
		while (aLetters.length > z-aDispLetters.length) {
			for (var i = 0; i < aDispLetters.length; i++) {
				for (var j = 0; j < aLetters.length; j++) {
					if (aDispLetters[i].code == aLetters[j].code) {
						aLetters.splice(j, 1);
					}
				}
			}
		}
		
		//Fill aDistLetters with 4 distractors
		var a = aLetters.length;
		while (aLetters.length > a-4) {
			for (var i = 0; i < 4; i++) {
				//Push a random letter from all letters into distractor letters
				var b = Math.floor(Math.random() * aLetters.length);
				aDistLetters.push(aLetters[b]);
				//Don't use the same letter twice
				aLetters.splice(b, 1);		
				//Every letter is a distractor except for first letter
				aDistLetters[i].distractor = true;
			}
		}
		
		for (var i = 0; i < aDispLetters.length; i++) {
			randomCharPosition(aDispLetters[i]);
		}
		for (var i = 0; i < aDistLetters.length; i++) {
			randomCharPosition(aDistLetters[i]);
		}
		
		//only need distractor timeout on one letter
		var y = currGame.calcDistractorTimeout();
		aDispLetters[0].distractorTimeout = setTimeout('viewHandleKeypress()', y*1000);
	}
	else if (currGame.state == 40) {
		//Push a random letter from all letters into display letters
		var tChar = Math.floor(Math.random() * aLetters.length);
		aDispLetters.push(aLetters[tChar]);
		randomCharPosition(aDispLetters[0]);
		
		aLetters.splice(tChar, 1);
		
		//Fill aDistLetters with 1 distractor
		//Push a random letter from all letters into distractor letters
		var b = Math.floor(Math.random() * aLetters.length);
		aDistLetters.push(aLetters[b]);	
		//Every letter is a distractor except for first letter
		aDistLetters[0].distractor = true;
		randomCharPosition(aDistLetters[0]);
		
		//only need distractor timeout on one letter
		var y = currGame.calcDistractorTimeout();
		aDispLetters[0].distractorTimeout = setTimeout('viewHandleKeypress()', y*1000);
	}
}

view.prototype.drawScore = function(msg, num)
{
	//Draw score and score info message
	//G6 - Provide feedback by placing the score number and objective icon in the user's view, i.e. where the user's eye is focused (near letter).
	if (this.dispScore) {
		//If score is negative, red text, if positive, green text
		if (num < 0) { gDrawingContext.fillStyle = "#FF0000"; }
		else if (num > 0) { gDrawingContext.fillStyle = "#00FF00"; }
		//Draw Message
		gDrawingContext.textAlign = "right";
		gDrawingContext.textBaseline = "top";
		gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
		gDrawingContext.fillText(msg, kGridX, kMsgSize);
		//Draw Score
		gDrawingContext.textAlign = "left";
		gDrawingContext.textBaseline = "bottom";
		gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
		gDrawingContext.fillText(num, aDispLetters[0].x+kScoreSize, aDispLetters[0].y-kScoreSize);
	}
	else {
		//Erase Message
		gDrawingContext.textAlign = "right";
		gDrawingContext.textBaseline = "top";
		gDrawingContext.fillStyle = "#FFF";
		gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
		gDrawingContext.fillText(msg, kGridX, kMsgSize);
		//Erase Score
		gDrawingContext.textAlign = "left";
		gDrawingContext.textBaseline = "bottom";
		gDrawingContext.fillStyle = "#FFF";
		gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
		gDrawingContext.fillText(num, aDispLetters[0].x+kScoreSize, aDispLetters[0].y-kScoreSize);
	}
}

view.prototype.hideScore = function()
{
	//Hide score message
	mainView.dispScore = false;
	mainView.scoreWait = false;
}

view.prototype.showScore = function()
{
	//Show score message
	mainView.dispScore = true;
}

view.prototype.setupScreen = function()
{
	drawBG();
	gDrawingContext.fillStyle = "#000";
	gDrawingContext.textAlign = "left";
	gDrawingContext.textBaseline = "top";
	gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
}

view.prototype.handleClick = function(event)
{
	if (currGame.state == 31) {
		localStorage["tasks."+viewTask+".levels."+viewLevel+".x1"] = event.pageX-$('#Behaviorism_canvas').position().left;
		localStorage["tasks."+viewTask+".levels."+viewLevel+".y1"] = event.pageY-$('#Behaviorism_canvas').position().top;
		currGame.endState(32);
	}
	else if (currGame.state == 32) {
		localStorage["tasks."+viewTask+".levels."+viewLevel+".x1D"] = event.pageX-$('#Behaviorism_canvas').position().left;
		localStorage["tasks."+viewTask+".levels."+viewLevel+".y1D"] = event.pageY-$('#Behaviorism_canvas').position().top;
		currGame.endState(33);
	}
}

function player()
{
	this.score = 0;
	
	this.difficulty = 10;
	
	this.firstCor = null;
	this.currCor = null;
	this.timeCor = 0;
	this.updateTimeCor = 10;
	
	this.corSpeed = 0;
	this.prevCorSpeed = 0;
	
	this.challengeTime = null;
}

player.prototype.resetPlayer = function()
{
	this.correct = 0;
	this.incorrect = 0;
	
	this.corRowNum = 0;
	this.incorRowNum = 0;
}

player.prototype.calcSpeedRatio = function()
{
	if (this.firstCor == null) {return 0;}
	else if (this.currCor == null) {return 0;}
	else if (this.currCor - this.firstCor == 0) {return this.prevCorSpeed;}
	else {
		var a = this.timeCor/(this.currCor - this.firstCor);
		a *= 1000;
		return roundNumber(a,2);
	}
}

player.prototype.update = function()
{
	this.corSpeed = this.calcSpeedRatio();
}

function logic()
{
	this.changeLevel(null);
	
	this.level = 1;
	this.state = 0;
	this.stateInterval = null;
	this.stateCounter = 0;
	
	this.corRowNumLevel = 0;
	
	this.levelObj = [
		"",
		"Type as many letters correctly as you can.",
		"Avoid mistaken key presses.",
		"Chain correct responses together.",
		"Respond correctly as fast as you can.",
		"Avoid mistakes while keeping up your speed.",
		"Chain correct responses together quickly.",
		"Sharpen your skills. Pay close attention.",
		"Avoid the distractors. Ignore red letters."
		];
		
	this.challengeStartTime = null;
	this.challengeEndTime = null;
}

logic.prototype.calcDistractorTimeout = function()
{
	// adjust distractor timeout based on current correct in a row between .5 and 2 seconds
	var x = 1.5/26;
	return (2-(x*currPlayer.corRowNum));
}

logic.prototype.challengeLetterComplete = function(let)
{
	//Add completed character to completed array
	aChalLetters.push(let);
}

logic.prototype.resetChallenge = function()
{
	//Empty completed array
	emptyArray(aChalLetters);
	currPlayer.corRowNum = 0;
}

logic.prototype.changeLevel = function(newLevel)
{
	//G7, G8 - Show level assessment with stats; TODO - G8 - Develop a test that the user has to complete in order to provide a standard assessment of their learning.
	//G5, G2 - Show finger position panel (Image shows where fingers go, and which fingers hit which keys). At the same time, the user is informed of the next level's goal/objective.
	
	if (newLevel == null) { this.level = 1; }
	else if (newLevel > 8) {
		this.level = newLevel;
		currGame.endState();
	}
	else {
		//Ensure we are in normal game mode
		currGame.state = 6;
		//End level
		clearInterval(currGame.stateInterval);
		//Level up
		this.level = newLevel;
		//Show level screen
		mainView.levelScreen = true;
		drawLevel();
	}
}

logic.prototype.stateFunctions = function()
{
	switch (this.state) {
		case 0:
			break;
		case 1:
			//G1 - Play a short clip of what the game looks like on the highest level to gain attention, fast and engaging
			//Set level to 3, start up a 3 second timer for the automatic play clip, begin automatic play.
			this.level = 4;
			
			setTimeout(this.endState, 3000);
			mainView.setupLetters();
			
			this.stateInterval = setInterval('updateScene()', mainView.vFrameRate);
			break;
		case 2:
			//Reset score from clip
			currPlayer.score = 0;
			//G2 - Inform learners of the objective.
			mainView.setupScreen();
			gDrawingContext.fillText("Letters", 0, 0);
			gDrawingContext.fillText("1) Train", 0, kMsgSize*2);
			gDrawingContext.fillText("2) Challenge", 0, kMsgSize*3);
			gDrawingContext.fillText("3) Create", 0, kMsgSize*4);
			gDrawingContext.fillText("Type 1, 2, or 3 to begin.", 0, kMsgSize*6);
			
			while (!user) {
				user = prompt("Username?");
			}
			localStorage["user"] = user;
			break;
		case 3:
			//G3 - Message, then play a 10 second test to recall previous learning and find placement level.
			mainView.setupScreen();
			gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
			gDrawingContext.fillText("Before you begin, show off your", 0, 0)
			gDrawingContext.fillText("skills for 10 seconds.", 0, kMsgSize)
			drawSpacebarMsg();
			break;
		case 4:
			//G3 cont. - Pre-test
			currPlayer.resetPlayer();
			setTimeout(this.endState, 10000);
			
			this.level = 1;
			
			mainView.setupLetters();
			this.stateInterval = setInterval('updateScene()', mainView.vFrameRate);
			break;
		case 5:
			//G4 - Set game session difficulty.
			//G5 - Draw level screen, wait for spacebar.
			//Show level screen for the level they are on.
			this.changeLevel(1);
			break;
		case 6:
			//G4 - Normal game state.
			currPlayer.resetPlayer();
			
			mainView.setupLetters();
			this.stateInterval = setInterval('updateScene()', mainView.vFrameRate);
			break;
		case 7:
			//End training
			drawBG();
			mainView.setupScreen();
			gDrawingContext.fillText("Score:", 0, 0);
			gDrawingContext.fillText(currPlayer.score, 167, 0);
			gDrawingContext.fillText("1) Replay Training", 0, kMsgSize*2);
			gDrawingContext.fillText("2) Continue to Challenge", 0, kMsgSize*3);
			gDrawingContext.fillText("3) Move to Create", 0, kMsgSize*4);
			gDrawingContext.fillText("Type 1, 2, or 3 to begin.", 0, kMsgSize*6);
			drawSpacebarMsg();
			break;
		case 8:
			//Challenge mode
			currPlayer.resetPlayer();
			currGame.level = 8;
			
			var d = new Date();
			var n = d.getTime();
			currGame.challengeStartTime = n;
			mainView.setupLetters();
			this.stateInterval = setInterval('updateScene()', mainView.vFrameRate);
			break;
		case 11:
			//Begin training
			//G2 - Inform learners of the objective.
			mainView.setupScreen();
			gDrawingContext.fillText("This game hones your", 0, 0);
			gDrawingContext.fillText("psychomotor skills by", 0, kMsgSize);
			gDrawingContext.fillText("challenging your brain to process", 0, kMsgSize*2);
			gDrawingContext.fillText("and correctly act on rapid", 0, kMsgSize*3);
			gDrawingContext.fillText("stimulus presented across your", 0, kMsgSize*4);
			gDrawingContext.fillText("visual field.", 0, kMsgSize*5);
			gDrawingContext.fillText("Simply type the letter presented.", 0, kMsgSize*7);
			gDrawingContext.fillText("Ready to begin?", 0, kMsgSize*9);
			drawSpacebarMsg();
			break;
		case 12:
			//Begin challenge
			mainView.setupScreen();
			gDrawingContext.fillText("This is a standardized", 0, 0);
			gDrawingContext.fillText("assessment of the psychomotor", 0, kMsgSize);
			gDrawingContext.fillText("skills developed during training", 0, kMsgSize*2);
			gDrawingContext.fillText("mode.", 0, kMsgSize*3);
			gDrawingContext.fillText("Get as far as you can as", 0, kMsgSize*5);
			gDrawingContext.fillText("quickly as you can without", 0, kMsgSize*6);
			gDrawingContext.fillText("making any mistakes.", 0, kMsgSize*7);
			gDrawingContext.fillText("Ready to begin?", 0, kMsgSize*9);
			drawSpacebarMsg();
			break;
		case 13:
			//End challenge
			var d = new Date();
			var n = d.getTime();
			currGame.challengeEndTime = n;
			currPlayer.challengeTime = roundNumber(((currGame.challengeEndTime - currGame.challengeStartTime) / 1000), 2);
			localStorage[user + ".challenge.letters"] = aChalLetters.length;
			localStorage[user + ".challenge.time"] = currPlayer.challengeTime;
			currGame.updateScores();
			currGame.resetChallenge();
			
			mainView.setupScreen();
			gDrawingContext.fillText("Letters:", 0, 0);
			gDrawingContext.fillText(aChalLetters.length, 193, 0);
			gDrawingContext.fillText("Time:", 0, kMsgSize);
			gDrawingContext.fillText(currPlayer.challengeTime, 144, kMsgSize);
			gDrawingContext.fillText("High Scores:", 0, kMsgSize*3);
			gDrawingContext.fillText("1) " + localStorage["challenge.scores.one"], 0, kMsgSize*5);
			gDrawingContext.fillText("2) " + localStorage["challenge.scores.two"], 0, kMsgSize*6);
			gDrawingContext.fillText("3) " + localStorage["challenge.scores.three"], 0, kMsgSize*7);
			gDrawingContext.fillText("4) " + localStorage["challenge.scores.four"], 0, kMsgSize*8);
			gDrawingContext.fillText("5) " + localStorage["challenge.scores.five"], 0, kMsgSize*9);
			drawSpacebarMsg();
			break;
		case 14:
			//End challenge - after high scores
			mainView.setupScreen();
			gDrawingContext.fillText("Letters:", 0, 0);
			gDrawingContext.fillText(aChalLetters.length, 193, 0);
			gDrawingContext.fillText("Time:", 0, kMsgSize);
			gDrawingContext.fillText(currPlayer.challengeTime, 144, kMsgSize);
			gDrawingContext.fillText("1) Move to Training", 0, kMsgSize*3);
			gDrawingContext.fillText("2) Replay Challenge", 0, kMsgSize*4);
			gDrawingContext.fillText("3) Continue to Create", 0, kMsgSize*5);
			gDrawingContext.fillText("Type 1, 2, or 3 to continue.", 0, kMsgSize*7);			
			break;
		case 20:
			//Create main table
			currGame.updateTasks();
			
			mainView.setupScreen();
			gDrawingContext.fillText("Tasks:", 0, 0);
			gDrawingContext.fillText("1) + Create a new task", 0, kMsgSize*2);
			gDrawingContext.fillText("2) " + localStorage["tasks.2.title"], 0, kMsgSize*3);
			gDrawingContext.fillText("3) " + localStorage["tasks.3.title"], 0, kMsgSize*4);
			gDrawingContext.fillText("4) " + localStorage["tasks.4.title"], 0, kMsgSize*5);
			gDrawingContext.fillText("5) " + localStorage["tasks.5.title"], 0, kMsgSize*6);
			gDrawingContext.fillText("Choose a task to continue.", 0, kMsgSize*11);
			break;
		case 21:
			//Create new task
			localStorage["tasks.2.title"] = prompt("Title:");
			localStorage["tasks.2.description"] = prompt("Description:");
			localStorage["tasks.2.references"] = prompt("References (separate with comma, 3 max!):");
			localStorage["tasks.2.user"] = user;
			
			mainView.setupScreen();
			gDrawingContext.fillText("New task", 0, 0);
			gDrawingContext.fillText("1) Title: ", 0, kMsgSize*2);
			gDrawingContext.fillText(localStorage["tasks.2.title"], 185, kMsgSize*2);
			gDrawingContext.fillText("2) Description: ", 0, kMsgSize*4);
			gDrawingContext.fillText(localStorage["tasks.2.description"], 0, kMsgSize*5);
			gDrawingContext.fillText("3) References: ", 0, kMsgSize*7);
			gDrawingContext.fillText(localStorage["tasks.2.references"], 0, kMsgSize*8);
			drawSpacebarMsg();
			break;
		case 22:
			//View task
			mainView.setupScreen();
			gDrawingContext.fillText("Title: ", 0, 0);
			gDrawingContext.fillText(localStorage["tasks."+viewTask+".title"], 130, 0);
			gDrawingContext.fillText("by "+localStorage["tasks."+viewTask+".user"], 130, kMsgSize);
			gDrawingContext.fillText("Description: ", 0, kMsgSize*3);
			gDrawingContext.font = kMsgSize/2+"px sans-serif";
			gDrawingContext.fillText(localStorage["tasks."+viewTask+".description"], 0, kMsgSize*4);
			gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
			gDrawingContext.fillText("References: ", 0, kMsgSize*6);
			aRef = localStorage["tasks."+viewTask+".references"].split(',');
			for (var i = 0; i < aRef.length; i++) {
				if (aRef[i] != 'null' && aRef[i] !== '') gDrawingContext.fillText((i+1)+") ", i*(kMsgSize*2), kMsgSize*7);
			}
			gDrawingContext.fillText("B) Back", 0, kMsgSize*9);
			gDrawingContext.fillText("L) Levels", 0, kMsgSize*10);
			gDrawingContext.fillText("C) Comments", 0, kMsgSize*11);
			break;
		case 23:
			//View task levels
			mainView.setupScreen();
			gDrawingContext.fillText(localStorage["tasks."+viewTask+".title"], 0, 0);
			gDrawingContext.fillText("by "+localStorage["tasks."+viewTask+".user"], 0, kMsgSize);
			gDrawingContext.fillText("Levels: ", 0, kMsgSize*3);
			if (localStorage["tasks."+viewTask+".levels"] == undefined || parseInt(localStorage["tasks."+viewTask+".levels"]) < 4) {
				gDrawingContext.fillText("1) + Create a new level", 0, kMsgSize*4);
			}
			if (localStorage["tasks."+viewTask+".levels"]) {
				for (var i = 0; i < localStorage["tasks."+viewTask+".levels"]; i++) {
					gDrawingContext.fillText((i+2)+") "+localStorage["tasks."+viewTask+".levels."+(i+1)+".title"], 0, kMsgSize*(5+i));
				}
			}
			gDrawingContext.fillText("B) Back", 0, kMsgSize*11);
			break;
		case 25:
			//View level
			mainView.setupScreen();
			gDrawingContext.fillText(localStorage["tasks."+viewTask+".levels."+viewLevel+".title"], 0, 0);
			gDrawingContext.fillText("by "+localStorage["tasks."+viewTask+".levels."+viewLevel+".user"], 0, kMsgSize);
			gDrawingContext.fillText("Characters: ", 0, kMsgSize*3);
			gDrawingContext.font = kMsgSize/2+"px sans-serif";
			gDrawingContext.fillText(localStorage["tasks."+viewTask+".levels."+viewLevel+".chars"], 290, (kMsgSize*3)+(kMsgSize/4));
			gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
			gDrawingContext.fillText("Background: set", 0, kMsgSize*4);
			gDrawingContext.fillText("Show Score: "+localStorage["tasks."+viewTask+".levels."+viewLevel+".showScore"], 0, kMsgSize*5);
			gDrawingContext.fillText("1) View Task", 0, kMsgSize*10);
			gDrawingContext.fillText("2) Play Level", 0, kMsgSize*11);
			break;
		case 30:
			//Create a new level
			viewLevel = localStorage["tasks."+viewTask+".levels"] ? parseInt(localStorage["tasks."+viewTask+".levels"]) + 1 : 1;
			localStorage["tasks."+viewTask+".levels"] = viewLevel;
			localStorage["tasks."+viewTask+".levels."+viewLevel+".user"] = user;
			mainView.setupScreen();
			localStorage["tasks."+viewTask+".levels."+viewLevel+".title"] = prompt("Title:");
			gDrawingContext.fillText("Type the characters to appear", 0, 0);
			gDrawingContext.fillText("in level: "+localStorage["tasks."+viewTask+".levels."+viewLevel+".title"], 0, kMsgSize);
			drawSpacebarMsg();
			break;
		case 31:
			alert("Draw a background. (Disabled in evaluation.)");
			gDrawingContext.drawImage(aImages[2], 0, 0);
			alert("Click where prompt letters should appear.");
			break;
		case 32:
			alert("Click where distractor letters should appear.");
			break;
		case 33:
			localStorage["tasks."+viewTask+".levels."+viewLevel+".showScore"] = confirm("Show the player score?");
			currGame.endState(25);
			break;
		case 40:
			//Play custom level
			currPlayer.resetPlayer();
			currGame.level = 10;
			mainView.setupLetters();
			this.stateInterval = setInterval('updateScene()', mainView.vFrameRate);
			drawSpacebarMsg();
			break;
		case 50:
			//View task comments
			mainView.setupScreen();
			gDrawingContext.fillText(localStorage["tasks."+viewTask+".title"], 0, 0);
			gDrawingContext.fillText("by "+localStorage["tasks."+viewTask+".user"], 0, kMsgSize);
			gDrawingContext.fillText("Comments: ", 0, kMsgSize*3);
			if (localStorage["tasks."+viewTask+".comments"]) {
				if (parseInt(localStorage["tasks."+viewTask+".comments"]) < 4) {
					gDrawingContext.fillText("1) + Create a new comment", 0, kMsgSize*4);
				}
			}
			else gDrawingContext.fillText("1) + Create a new comment", 0, kMsgSize*4);
			if (localStorage["tasks."+viewTask+".comments"]) {
				for (var i = 0; i < localStorage["tasks."+viewTask+".comments"]; i++) {
					gDrawingContext.fillText((i+2)+") "+localStorage["tasks."+viewTask+".comments."+(i+1)+".title"], 0, kMsgSize*(5+i));
				}
			}
			gDrawingContext.fillText("B) Back", 0, kMsgSize*11);
			break;
		case 51:
			//Create a new comment
			viewComment = localStorage["tasks."+viewTask+".comments"] ? parseInt(localStorage["tasks."+viewTask+".comments"]) + 1 : 1;
			localStorage["tasks."+viewTask+".comments"] = viewComment;
			localStorage["tasks."+viewTask+".comments."+viewComment+".user"] = user;
			mainView.setupScreen();
			localStorage["tasks."+viewTask+".comments."+viewComment+".title"] = prompt("Title:");
			localStorage["tasks."+viewTask+".comments."+viewComment+".comment"] = prompt("Comment:");
			currGame.endState(52);
			break;
		case 52:
			//View comment
			mainView.setupScreen();
			gDrawingContext.fillText(localStorage["tasks."+viewTask+".comments."+viewComment+".title"], 0, 0);
			gDrawingContext.fillText("by "+localStorage["tasks."+viewTask+".comments."+viewComment+".user"], 0, kMsgSize);
			gDrawingContext.font = kMsgSize/2+"px sans-serif";
			gDrawingContext.fillText(localStorage["tasks."+viewTask+".comments."+viewComment+".comment"], 0, kMsgSize*3);
			gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
			gDrawingContext.fillText("1) View Task Comments", 0, kMsgSize*11);
			break;
		default:
			break;
	}
}

logic.prototype.endState = function(newState)
{
	if (newState) {
		currGame.state = newState;
	}
	else {
		//If game is in normal state, go back to 
		if (currGame.state == 6 && currGame.level <= 8) { currGame.state = 6; }
		else if ( currGame.state == 4 ) {
			//calculate player difficulty
			currPlayer.difficulty = currPlayer.correct;
			currGame.state += 1;
		}
		else { currGame.state += 1; }
	}
	clearInterval(currGame.stateInterval);
	currGame.stateFunctions();
}

logic.prototype.playIntro = function()
{
	/*Cognitivism introduction to the learning experience
			Cognitive Process*			Instructional Event
		1	Reception							1	Gaining attention
		1	Expectancy						2	Informing learners of the objective
		1	Retrieval**						3	Stimulating recall of prior learning
		2	Selective Perception	4	Presenting the stimulus
		2	Semantic Encoding			5	Providing learning guidance
		2	Responding						6	Eliciting performance
		3	Reinforcement					7	Providing feedback
		3	Retrieval							8	Assessing performance
		3	Generalization				9	Enhancing retention and transfer

		*Internal executive control process
		**Prior knowledge
	*/
	
	this.state = 1;
	this.stateFunctions();
}

logic.prototype.createMode = function()
{
	// TODO - G9 - Play a short game mode to generalize what they have learned, user is presented with random letters (not completely randomized, but adaptive to the rule presented in Tom Chatfield's YouTube clip. They have to complete the sentence "The quick brown fox jumps over the lazy dog" without making any mistakes (mistakes are incorrect keypresses, or keypresses that are too slow).
	// This could be better, think of a better way to generalize this. I'm not teaching typing, but honing psychomotor skills. What about using this to improve attention and salience? To learn how to create salience? For example, what if every so often there was a red letter that was worth more points. And then in later levels the letter wasn't red anymore but was part of a sentence, such as the lazy dog sentence. And then in later levels you had to use the random letters to create your own sentence. The challenge here is to figure out how to make the last phase of this work. It doesn't seem like it can just be worth more points, but maybe it has to disappear after a short time. Something like that.
	
}

logic.prototype.updateLevel = function()
{
	// TODO use an adjusted level difficulty based on pre-test
	// set up level 9 (test/assessment), 10 (generalization/transfer)
	/*
	/ 1 - Number correct
	/ 2 - Correct/Incorrect ratio
	/ 3 - Correct in a row
	/ 4 - Number correct + speed
	/ 5 - Correct/Incorrect ratio + speed
	/ 6 - Correct in a row + speed
	/ 7 - (add difficulty) Font size changes
	/ 8 - (add difficulty) Distractors (font color changes)
	*/
	switch (currGame.state) {
		case 1:
			//Do not level up during clip
			break;
		case 4:
			//Do not level up during pre-test
			break;
		case 40:
			//Do not level up during custom level
			break;
		default:
			if (currGame.level == 1) {
				if (currPlayer.correct >= 15) {
					currGame.changeLevel(currGame.level + 1);
				}
			}
			else if (currGame.level == 2) {
				if ((currPlayer.correct >= 15) && (currPlayer.correct/currPlayer.incorrect >= currPlayer.difficulty/4)) {
					currGame.changeLevel(currGame.level + 1);
				}
			}
			else if (currGame.level == 3) {
				if ((currPlayer.correct >= 15) && (currPlayer.correct/currPlayer.incorrect >= currPlayer.difficulty/4) && (currPlayer.corRowNum >= currPlayer.difficulty/2)) {
					currGame.changeLevel(currGame.level + 1);
				}
			}
			else if (currGame.level == 4) {
				if ((currPlayer.correct >= 15) && (currPlayer.corSpeed >= currPlayer.difficulty/10)) {
					currGame.changeLevel(currGame.level + 1);
				}
			}
			else if (currGame.level == 5) {
				if ((currPlayer.correct >= 15) && (currPlayer.correct/currPlayer.incorrect >= currPlayer.difficulty/4) && (currPlayer.corSpeed >= currPlayer.difficulty/10)) {
					currGame.changeLevel(currGame.level + 1);
				}
			}
			else if (currGame.level == 6) {
				if ((currPlayer.correct >= 15) && (currPlayer.correct/currPlayer.incorrect >= currPlayer.difficulty/4) && (currPlayer.corRowNum >= currPlayer.difficulty/2) && (currPlayer.corSpeed >= currPlayer.difficulty/10)) {
					currGame.changeLevel(currGame.level + 1);
				}
			}
			else if (currGame.level == 7) {
				if ((currPlayer.correct >= 15) && (currPlayer.correct/currPlayer.incorrect >= currPlayer.difficulty/4) && (currPlayer.corRowNum >= currPlayer.difficulty/2) && (currPlayer.corSpeed >= currPlayer.difficulty/10)) {
					currGame.changeLevel(currGame.level + 1);
				}
			}
			else if (currGame.level == 8) {
				if ((currPlayer.correct >= 15) && (currPlayer.correct/currPlayer.incorrect >= currPlayer.difficulty/4) && (currPlayer.corRowNum >= currPlayer.difficulty/2) && (currPlayer.corSpeed >= currPlayer.difficulty/10)) {
					currGame.changeLevel(currGame.level + 1);
				}
			}
			break;
	}
}

logic.prototype.calcScore = function(response)
{
	// TODO Update score messages to reflect level objectives
	// Update points to better reflect difficulty and mistakes
	mainView.dispScore = false;
	if (this.state != 4) {
		switch (this.level) {
			case 1:
				// Shaping - Level 1 - Positive reinforcement, fixed ratio schedule
				if (response) {
					currPlayer.score += 10;
					mainView.scoreInfo = "Correct!";
					mainView.scoreNum = 10;
					mainView.dispScore = true;
					var timeoutID = window.setTimeout(mainView.hideScore, mainView.scoreTimeout);
				}
				break;
			case 2:
				// Shaping - Level 2 - Negative reinforcement
				if (response) {
					currPlayer.score += 10;
					mainView.scoreInfo = "Correct!";
					mainView.scoreNum = 10;
					mainView.dispScore = true;
					var timeoutID = window.setTimeout(mainView.hideScore, mainView.scoreTimeout);
				}
				else {
					currPlayer.score -= 10;
					mainView.scoreInfo = "Incorrect!";
					mainView.scoreNum = -10;
					mainView.dispScore = true;
					var timeoutID = window.setTimeout(mainView.hideScore, mainView.scoreTimeout);
				}
				break;
			case 3:
				// Chaining - Level 3 - Fixed interval schedule
				if (!mainView.scoreWait) {
					if (response) {
						var a = 10 + currPlayer.corRowNum;
						currPlayer.score += a;
						mainView.scoreNum = a;
						mainView.scoreInfo = "Chain!";
						mainView.scoreWait = true;
						var showTimeout = window.setTimeout(mainView.showScore, mainView.intTimeout);
						var hideTimeout = window.setTimeout(mainView.hideScore, mainView.intTimeout+mainView.scoreTimeout);
					}
					else {
						var a = 10 + currPlayer.incorRowNum;
						currPlayer.score -= a;
						mainView.scoreNum = -a;
						mainView.scoreInfo = "Broken!";
						mainView.scoreWait = true;
						var showTimeout = window.setTimeout(mainView.showScore, mainView.intTimeout);
						var hideTimeout = window.setTimeout(mainView.hideScore, mainView.intTimeout+mainView.scoreTimeout);
					}
				}
				break;
			case 4:
				// Chaining - Level 4 - Variable ratio schedule
				if (response) {
					if (Math.random() < Math.random()) {
						var a = Math.floor(currPlayer.corSpeed * currPlayer.corRowNum * 2);
						currPlayer.score += a;
						mainView.scoreNum = a;
						mainView.scoreInfo = "Fast!";
						mainView.dispScore = true;
						var timeoutID = window.setTimeout(mainView.hideScore, mainView.scoreTimeout);
					}
				}
				else {
					if (Math.random() < Math.random()) {
						var a = Math.floor(currPlayer.corSpeed * currPlayer.incorRowNum * 2);
						currPlayer.score -= a;
						mainView.scoreNum = -a;
						mainView.scoreInfo = "Oops!";
						mainView.dispScore = true;
						var timeoutID = window.setTimeout(mainView.hideScore, mainView.scoreTimeout);
					}
				}
				break;
			case 5:
				// Fading - Level 5 - Variable internal schedule
				if (!mainView.scoreWait) {
					if (response) {
						var a = Math.floor(currPlayer.corSpeed * currPlayer.corRowNum * 2);
						currPlayer.score += a;
						mainView.scoreNum = a;
						mainView.scoreInfo = "Fast!";
						mainView.scoreWait = true;
						var b = Math.random() * mainView.intTimeout;
						var showTimeout = window.setTimeout(mainView.showScore, b);
						var hideTimeout = window.setTimeout(mainView.hideScore, b+mainView.scoreTimeout);
					}
					else {
						var a = Math.floor(currPlayer.corSpeed * currPlayer.incorRowNum * 2);
						currPlayer.score -= a;
						mainView.scoreNum = -a;
						mainView.scoreInfo = "Oops!";
						mainView.scoreWait = true;
						var b = Math.random() * mainView.intTimeout;
						var showTimeout = window.setTimeout(mainView.showScore, b);
						var hideTimeout = window.setTimeout(mainView.hideScore, b+mainView.scoreTimeout);
					}
				}
				break;
			case 6:
				// Fading - Level 6 - Positive removal, variable ratio
				if (response) {
					if (currPlayer.corRowNum != 1) {
						if (Math.random() < Math.random()) {
							var a = Math.floor(currPlayer.corSpeed * currPlayer.corRowNum * 2);
							currPlayer.score += a;
							mainView.scoreNum = a;
							mainView.scoreInfo = "Fast!";
							mainView.dispScore = true;
							var timeoutID = window.setTimeout(mainView.hideScore, mainView.scoreTimeout);
						}
					}
				}
				else {
					if (Math.random() < Math.random()) {
						var a = Math.floor(currPlayer.corSpeed * currPlayer.incorRowNum * 2);
						currPlayer.score -= a;
						mainView.scoreNum = -a;
						mainView.scoreInfo = "Oops!";
						mainView.dispScore = true;
						var timeoutID = window.setTimeout(mainView.hideScore, mainView.scoreTimeout);
					}
				}
				break;
			case 7:
				// Fading - Level 7 - Negative Removal, variable interval
				if (!mainView.scoreWait) {
					if (response) {
						if (currPlayer.corRowNum != 1) {
							if (Math.random() < .5) {
								var a = Math.floor(currPlayer.corSpeed * currPlayer.corRowNum * 2);
								currPlayer.score += a;
								mainView.scoreNum = a;
								mainView.scoreInfo = "Fast!";
								mainView.scoreWait = true;
								var b = Math.random() * mainView.intTimeout;
								var showTimeout = window.setTimeout(mainView.showScore, b);
								var hideTimeout = window.setTimeout(mainView.hideScore, b+mainView.scoreTimeout);
							}
						}
					}
					else {
						if (currPlayer.corRowNum == 1) {
							if (Math.random() < .5) {
								var a = Math.floor(currPlayer.corSpeed * currPlayer.incorRowNum * 2);
								currPlayer.score -= a;
								mainView.scoreNum = -a;
								mainView.scoreInfo = "Oops!";
								mainView.scoreWait = true;
								var b = Math.random() * mainView.intTimeout;
								var showTimeout = window.setTimeout(mainView.showScore, b);
								var hideTimeout = window.setTimeout(mainView.hideScore, b+mainView.scoreTimeout);
							}
						}
					}
				}
				break;
			case 8:
				// F Level 8 - No reinforcement
				break;
			case 10:
				// Custom Level
				if (currGame.state == 40) {
					if (localStorage["tasks."+viewTask+".levels."+viewLevel+".showScore"] === 'true') {
						if (response) {
							currPlayer.score += 10;
							mainView.scoreInfo = "Correct!";
							mainView.scoreNum = 10;
							mainView.dispScore = true;
							var timeoutID = window.setTimeout(mainView.hideScore, mainView.scoreTimeout);
						}
						else {
							currPlayer.score -= 10;
							mainView.scoreInfo = "Incorrect!";
							mainView.scoreNum = -10;
							mainView.dispScore = true;
							var timeoutID = window.setTimeout(mainView.hideScore, mainView.scoreTimeout);
						}
					}
				}
				break;
			default:
				break;
		}
	}
}

logic.prototype.updateScores = function()
{
	localStorage["challenge.scores.one"] = localStorage["user"] + "\t" + localStorage[user + ".challenge.letters"] + "\t" + localStorage[user + ".challenge.time"];
	localStorage["challenge.scores.two"] = "Sarah" + "\t" + "15" + "\t" + "14.35";
	localStorage["challenge.scores.three"] = "James" + "\t" + "12" + "\t" + "10.01";
	localStorage["challenge.scores.four"] = "Roger" + "\t" + "9" + "\t" + "7.92";
	localStorage["challenge.scores.five"] = "Jane" + "\t" + "4" + "\t" + "3.56";
}

logic.prototype.updateTasks = function()
{
	localStorage["tasks.3.title"] = "Driving with a phone";
	localStorage["tasks.3.description"] = "What it's like to drive with a\nphone in your hand.";
	localStorage["tasks.3.references"] = null;
	localStorage["tasks.3.user"] = "Sarah";
	
	localStorage["tasks.4.title"] = "Catching butterflies";
	localStorage["tasks.4.description"] = "How to catch butterflies\nin a net.";
	localStorage["tasks.4.references"] = "https://monarchlab.org/biology-and-research/monarch-rearing/catching-butterflies";
	localStorage["tasks.4.user"] = "James";
	
	localStorage["tasks.5.title"] = "Dancing the tango";
	localStorage["tasks.5.description"] = "Follow the steps of the tando\nwith your fingers.";
	localStorage["tasks.5.references"] = "https://fisher.osu.edu/blogs/gradlife/2010/02/21/it-takes-two-to-tango/";
	localStorage["tasks.5.user"] = "Roger";
}

logic.prototype.updateComments = function()
{
	localStorage["tasks.3.comments"] = '3';
	localStorage["tasks.3.comments.1.title"] = "This task sucks";
	localStorage["tasks.3.comments.1.comment"] = "I wish this task was better. I don't like it at all.";
	localStorage["tasks.3.comments.1.user"] = "Sarah";
	localStorage["tasks.3.comments.2.title"] = "This task is awesome";
	localStorage["tasks.3.comments.2.comment"] = "This task could not be any better. It is the best!";
	localStorage["tasks.3.comments.2.user"] = "James";
	localStorage["tasks.3.comments.3.title"] = "This task is alright";
	localStorage["tasks.3.comments.3.comment"] = "This tasks suits me. It could be better, but it also could be worse.";
	localStorage["tasks.3.comments.3.user"] = "Roger";

	localStorage["tasks.4.comments"] = '3';
	localStorage["tasks.4.comments.1.title"] = "This task sucks";
	localStorage["tasks.4.comments.1.comment"] = "I wish this task was better. I don't like it at all.";
	localStorage["tasks.4.comments.1.user"] = "Sarah";
	localStorage["tasks.4.comments.2.title"] = "This task is awesome";
	localStorage["tasks.4.comments.2.comment"] = "This task could not be any better. It is the best!";
	localStorage["tasks.4.comments.2.user"] = "James";
	localStorage["tasks.4.comments.3.title"] = "This task is alright";
	localStorage["tasks.4.comments.3.comment"] = "This tasks suits me. It could be better, but it also could be worse.";
	localStorage["tasks.4.comments.3.user"] = "Roger";
	
	localStorage["tasks.5.comments"] = '3';
	localStorage["tasks.5.comments.1.title"] = "This task sucks";
	localStorage["tasks.5.comments.1.comment"] = "I wish this task was better. I don't like it at all.";
	localStorage["tasks.5.comments.1.user"] = "Sarah";
	localStorage["tasks.5.comments.2.title"] = "This task is awesome";
	localStorage["tasks.5.comments.2.comment"] = "This task could not be any better. It is the best!";
	localStorage["tasks.5.comments.2.user"] = "James";
	localStorage["tasks.5.comments.3.title"] = "This task is alright";
	localStorage["tasks.5.comments.3.comment"] = "This tasks suits me. It could be better, but it also could be worse.";
	localStorage["tasks.5.comments.3.user"] = "Roger";
}

/* 
/ Initialize
*/
function initBehaviorism(canvasElement) {
	if (!canvasElement) {
		canvasElement = document.createElement("canvas");
		canvasElement.id = "Behaviorism_canvas";
		document.getElementById('Behaviorism').appendChild(canvasElement);
	}
	
	gCanvasElement = canvasElement;
	gCanvasElement.width = kGridX;
	gCanvasElement.height = kGridY;
	gDrawingContext = gCanvasElement.getContext("2d");
	
	$(window).keypress(function(event) {
		viewHandleKeypress(event);
	});

	mainView = new view();
	currPlayer = new player();
	currPlayer.resetPlayer();
	currGame = new logic();
	
	currGame.updateComments();
	
	$("#Behaviorism_canvas").click(function(event) {
		mainView.handleClick(event);
	});
	
	currGame.playIntro();
}

/*
/ Events
*/
function viewHandleKeypress(event)
{
	//Check for automatic play
	if (currGame.state == 1) {
		//Make it a correct answer 75% of the time
		if (Math.random() < .75) { event.charCode = aDispLetters[0].code; }
		else { event.charCode = aDispLetters[0].code - 1; }
	}
	//If on splash screen and waiting for input to start different modes
	else if ((currGame.state == 2) || (currGame.state == 7) || (currGame.state == 14)) {
		switch (event.charCode) {
			case 49:
				currGame.endState(11);
				break;
			case 50:
				currGame.endState(12);
				break;
			case 51:
				currGame.endState(20);
				break;
		}
		return;
	}
	//If waiting for spacebar
	else if ((currGame.state == 3) || (currGame.state == 5)) {
		if (event.charCode == 32) {
			currGame.endState();
			return;
		}
	}
	else if (currGame.state == 11) {
		if (event.charCode == 32) {
			currGame.endState(3);
			return;
		}
	}
	else if (currGame.state == 12) {
		if (event.charCode == 32) {
			currGame.endState(8);
			return;
		}
	}
	else if (currGame.state == 13) {
		if (event.charCode == 32) {
			currGame.endState(14);
			return;
		}
	}
	else if ((currGame.state == 6) && (mainView.levelScreen)) {
		if (event.charCode == 32) {
			mainView.levelScreen = false;
			currGame.endState();
			return;
		}
	}
	else if (currGame.state == 21) {
		if (event.charCode == 32) {
			currGame.endState(20);
		}
	}
	//Waiting for input on create main table
	else if (currGame.state == 20) {
		if (event.charCode == 49) {
			currGame.endState(21);
		}
		else if (event.charCode == 50 && localStorage['tasks.2.user'] != undefined) {
			viewTask = 2;
			currGame.endState(22);
		}
		else if (event.charCode == 51) {
			viewTask = 3;
			currGame.endState(22);
		}
		else if (event.charCode == 52) {
			viewTask = 4;
			currGame.endState(22);
		}
		else if (event.charCode == 53) {
			viewTask = 5;
			currGame.endState(22);
		}
	}
	//Waiting for input on view task
	else if (currGame.state == 22) {
		if (event.charCode == 49 && aRef[0] != undefined && aRef[0] !== '') {
			window.open(aRef[0]);
		}
		else if (event.charCode == 50 && aRef[1] != undefined && aRef[1] !== '') {
			window.open(aRef[1]);
		}
		else if (event.charCode == 51 && aRef[2] != undefined && aRef[2] !== '') {
			window.open(aRef[2]);
		}
		else if (event.charCode == 66) {
			currGame.endState(20);
		}
		else if (event.charCode == 76) {
			currGame.endState(23);
		}
		else if (event.charCode == 67) {
			currGame.endState(50);
		}
	}
	//Waiting for input on view task levels
	else if (currGame.state == 23) {
		if (event.charCode == 49) {
			currGame.endState(30);
		}
		else if (event.charCode == 50) {
			viewLevel = 1;
			currGame.endState(25);
		}
		else if (event.charCode == 51) {
			viewLevel = 2;
			currGame.endState(25);
		}
		else if (event.charCode == 52) {
			viewLevel = 3;
			currGame.endState(25);
		}
		else if (event.charCode == 53) {
			viewLevel = 4;
			currGame.endState(25);
		}
		else if (event.charCode == 66) {
			currGame.endState(22);
		}
	}
	//Waiting for input on view task comments
	else if (currGame.state == 50) {
		if (event.charCode == 49 && parseInt(localStorage['tasks.'+viewTask+'.comments']) < 4) {
			currGame.endState(51);
		}
		else if (event.charCode == 50) {
			viewComment = 1;
			currGame.endState(52);
		}
		else if (event.charCode == 51) {
			viewComment = 2;
			currGame.endState(52);
		}
		else if (event.charCode == 52) {
			viewComment = 3;
			currGame.endState(52);
		}
		else if (event.charCode == 53) {
			viewComment = 4;
			currGame.endState(52);
		}
		else if (event.charCode == 66) {
			currGame.endState(22);
		}
	}
	//Waiting for input on view comment
	else if (currGame.state == 52) {
		if (event.charCode == 49) {
			currGame.endState(50);
		}
	}
	//Waiting for input on view levels
	else if (currGame.state == 25) {
		if (event.charCode == 49) {
			currGame.endState(23);
		}
		else if (event.charCode == 50) {
			currGame.endState(40);
			return;
		}
	}
	//Waiting for input on create new level - characters
	else if (currGame.state == 30) {
		if (event.charCode != 32) {
			aNewLevelChars.push(event.charCode);
			aAudio[0].elem.get(0).play();
			mainView.setupScreen();
			gDrawingContext.font = kMsgSize/2+"px sans-serif";
			gDrawingContext.fillText(aNewLevelChars.join(), 0, kMsgSize*3);
			drawSpacebarMsg();
		}
		else if (event.charCode == 32) {
			localStorage["tasks."+viewTask+".levels."+viewLevel+".chars"] = aNewLevelChars.join();
			currGame.endState(31);
		}
	}
	//If game is playing
	if (currGame.state == 1 || currGame.state == 4 || (currGame.state == 6 && !mainView.levelScreen)) {
		if (aDispLetters[0].distractor) {
			//If the distractor is up and the user presses any key, they are incorrect
			//If the distractor clock runs out, they are correct
			clearTimeout(aDispLetters[0].distractorTimeout);
			aDispLetters[0].distractorTimeout = null;
			//set up new char
			mainView.setupLetters();

			if (event) {
				currPlayer.incorrect += 1;
				currPlayer.corRowNum = 0;
				currPlayer.incorRowNum += 1;
		
				currGame.calcScore(false);
			
				//If not pre-test, Play Bad Sound
				if (currGame.state != 4 && currGame.state != 8) {
					aAudio[1].elem.get(0).play();
				}
			}
			else {
				//give score
				currPlayer.correct += 1;
				currPlayer.corRowNum += 1;
				currPlayer.incorRowNum = 0;
				//Get time of keydown X times ago
				var d = new Date();
				var n = d.getTime();
				
				currPlayer.currCor = n;
				currPlayer.timeCor++;
		
				if (currPlayer.firstCor == null) {
					currPlayer.firstCor = n;
				}
				else if (currPlayer.timeCor >= currPlayer.updateTimeCor) {
					currPlayer.prevCorSpeed = currPlayer.corSpeed;
					currPlayer.firstCor = n;
					currPlayer.timeCor = 0;
				}
		
				currGame.calcScore(true);
			
				//If not pre-test, Play Good Sound
				if (currGame.state != 4 && currGame.state != 8) {
					aAudio[0].elem.get(0).play();
				}
			}
			
			return;
		}
		else if (event.charCode == aDispLetters[0].code)
		{
			//set up new char
			mainView.setupLetters();
			//give score
			currPlayer.correct += 1;
			currPlayer.corRowNum += 1;
			currPlayer.incorRowNum = 0;
			//Get time of keydown X times ago
			currPlayer.currCor = event.timeStamp;
			currPlayer.timeCor++;
		
			if (currPlayer.firstCor == null) {
				currPlayer.firstCor = event.timeStamp;
			}
			else if (currPlayer.timeCor >= currPlayer.updateTimeCor) {
				currPlayer.prevCorSpeed = currPlayer.corSpeed;
				currPlayer.firstCor = event.timeStamp;
				currPlayer.timeCor = 0;
			}
		
			currGame.calcScore(true);
			
			//If not pre-test, Play Good Sound
			if (currGame.state != 4 && currGame.state != 8) {
				aAudio[0].elem.get(0).play();
			}	
		}
		else {
			currPlayer.incorrect += 1;
			currPlayer.corRowNum = 0;
			currPlayer.incorRowNum += 1;
		
			currGame.calcScore(false);
			
			//If not pre-test, Play Bad Sound
			if (currGame.state != 4 && currGame.state != 8) {
				aAudio[1].elem.get(0).play();
			}
		}
		currGame.updateLevel();
	}
	else if (currGame.state == 8) {
		//If coming from a keypress (event), check to make sure keypress matches the letter that is not a distractor, if not, reset the whole state.
		//If coming from distractortimeout (!event), then reset the whole state (no mistakes)
		if (event) {
			if (event.charCode == aDispLetters[0].code) {
				currGame.challengeLetterComplete(aDispLetters[0]);
				currPlayer.corRowNum += 1;
			}
			else {
				currGame.endState(13);
			}
		}
		else {
			currGame.endState(13);
		}
		
		clearTimeout(aDispLetters[0].distractorTimeout);
		aDispLetters[0].distractorTimeout = null;
		//set up new char
		mainView.setupLetters();
	}
	else if (currGame.state == 40) {		
		if (event) {
			if (event.charCode == 32) {
				currGame.endState(25);
				clearTimeout(aDispLetters[0].distractorTimeout);
				aDispLetters[0].distractorTimeout = null;
				return;
			}
			else if (event.charCode == aDispLetters[0].code)
			{
				//give score
				currPlayer.correct += 1;
				currPlayer.corRowNum += 1;
				currPlayer.incorRowNum = 0;
				//Get time of keydown X times ago
				currPlayer.currCor = event.timeStamp;
				currPlayer.timeCor++;
		
				if (currPlayer.firstCor == null) {
					currPlayer.firstCor = event.timeStamp;
				}
				else if (currPlayer.timeCor >= currPlayer.updateTimeCor) {
					currPlayer.prevCorSpeed = currPlayer.corSpeed;
					currPlayer.firstCor = event.timeStamp;
					currPlayer.timeCor = 0;
				}
		
				currGame.calcScore(true);
			
				//If not pre-test, Play Good Sound
				if (currGame.state != 4 && currGame.state != 8) {
					aAudio[0].elem.get(0).play();
				}	
			}
			else {
				currPlayer.incorrect += 1;
				currPlayer.corRowNum = 0;
				currPlayer.incorRowNum += 1;
		
				currGame.calcScore(false);
			
				//If not pre-test, Play Bad Sound
				if (currGame.state != 4 && currGame.state != 8) {
					aAudio[1].elem.get(0).play();
				}
			}
		}
		else {
			currPlayer.incorrect += 1;
			currPlayer.corRowNum = 0;
			currPlayer.incorRowNum += 1;

			currGame.calcScore(false);
	
			//If not pre-test, Play Bad Sound
			if (currGame.state != 4 && currGame.state != 8) {
				aAudio[1].elem.get(0).play();
			}
		}
		
		clearTimeout(aDispLetters[0].distractorTimeout);
		aDispLetters[0].distractorTimeout = null;
		//set up new char
		mainView.setupLetters();
	}
}

/*
/	Methods
*/
function randomCharPosition(let)
{
	if (currGame.level == 1) {
		let.x = kCentCharX;
		let.y = kCentCharY;
	}
	else if (currGame.level > 1 && currGame.level < 10) {
		//Randomize possible character positions
		//Take a percentage of the whole space
		var a = kPosCharX * (currGame.level / 10);
		//Center that number
		var b = (kCentCharX) - (a/2);
		//Randomize the position within that centered percentage
		a = Math.random() * a;
		//Add the centered number and the random number together
		let.x = a + b;
		if (let.x < kCharSize) {let.x = kCharSize;}
		var c = kPosCharY * (currGame.level / 10);
		var d = (kCentCharY) - (c/2);
		c = Math.random() * c;
		let.y = c + d + kCharSize;
		if (let.y < kCharSize) {let.y = kCharSize;}
	}
	else if (currGame.level == 10) {
		if (let.distractor) {
			let.x = localStorage["tasks."+viewTask+".levels."+viewLevel+".x1D"];
			let.y = localStorage["tasks."+viewTask+".levels."+viewLevel+".y1D"];
		}
		else {
			let.x = localStorage["tasks."+viewTask+".levels."+viewLevel+".x1"];
			let.y = localStorage["tasks."+viewTask+".levels."+viewLevel+".y1"];
		}
	}
	//If level 7+, font size varies.
	if (currGame.level >= 7) {
		var a = kMsgSize*Math.random();
		if (a < 18) { a = 18; }
		let.size = a;
	}
	else { let.size = kMsgSize; }
}

function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

function updateScene()
{		
	currPlayer.update();

	drawBG();
	if (currGame.state == 40) {
		gDrawingContext.drawImage(aImages[2], 0, 0);
		drawSpacebarMsg();
	}
	drawScene();

	//debug
	if (debug) {
		$("#debug").html("<p>"+currPlayer.correct+"/"+currPlayer.incorrect+" "+currPlayer.corRowNum+" "+currPlayer.corSpeed+" "+currGame.level+" "+currPlayer.difficulty+"</p>");
	}
	
	//If in automatic play, trigger keypress 3 times a second
	currGame.stateCounter += 1;
	if (currGame.state == 1) {
		if (currGame.stateCounter == 5) {
			$(window).trigger("keypress");
			currGame.stateCounter = 0;
		}
	}
}

function drawBG()
{
	//Draw white background
	gDrawingContext.fillStyle = "#FFF";
	gDrawingContext.fillRect(0, 0, kGridX, kGridY);
}

function drawScene()
{
	//Draw Letters
	drawLetters();
	//Draw Score Total
	if (currGame.state != 4 && currGame.state != 8) {
		gDrawingContext.fillStyle = "#000";
		gDrawingContext.textAlign = "right";
		gDrawingContext.textBaseline = "bottom";
		gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
		gDrawingContext.fillText(currPlayer.score, kGridX, kMsgSize);
	}
	//Draw Score Message
	if (currGame.state != 4 && currGame.state != 8) {
		mainView.drawScore(mainView.scoreInfo, mainView.scoreNum);
	}
	//TODO - add instructions to beginning of experience - "type the key presented..." fades out after successful type, fades in after some time of inactivity
	
	//If challenge mode, draw objective on bottom of screen
	gDrawingContext.fillStyle = "#000";
	gDrawingContext.strokeStyle = "#000";
	
	if (currGame.state == 8) {
		var x = kGridX/26;
		for (var i = 0; i <= 25; i++) {
			if (i < aChalLetters.length) {
				gDrawingContext.fillRect((i*x), kGridY-x, x, x);
			}
			else {
				//gDrawingContext.strokeRect((i*x), kGridY-x, x, x);
			}
		}
	}
}

function drawLetters()
{
	//If challenge mode, draw more letters	
	for (var i = 0; i<aDistLetters.length; i++) {
		drawOneLetter(aDistLetters[i]);
	}
	for (var i = 0; i<aDispLetters.length; i++) {
		drawOneLetter(aDispLetters[i]);
	}
}

function drawOneLetter(let)
{
	//Draw Letters
	gDrawingContext.fillStyle = "#000";
	if (let.distractor) { gDrawingContext.fillStyle = "#FF0000"; }
	gDrawingContext.textAlign = "center";
	gDrawingContext.textBaseline = "middle";
	gDrawingContext.font = "bold "+let.size+"px sans-serif";
	gDrawingContext.fillText(String.fromCharCode(let.code), let.x, 	let.y);
}

function drawLevel()
{
	drawBG();
	
	//Draw the level screen when leveling up.
	gDrawingContext.fillStyle = "#000";
	gDrawingContext.strokeStyle = "#000";
	//Draw Level number and level objective.
	gDrawingContext.textAlign = "left";
	gDrawingContext.textBaseline = "top";
	gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
	gDrawingContext.fillText("Level:", 0, 0);
	for (var i = 1; i <= 8; i++) {
		if (i <= currGame.level) {
			gDrawingContext.fillRect(100+(i*50), 1, 45, 45);
		}
		else {
			gDrawingContext.strokeRect(100+(i*50), 1, 45, 45);
		}
	}
	gDrawingContext.font = "bold "+kMsgSize/1.5+"px sans-serif";
	gDrawingContext.fillText("Level Objective:", 0, kMsgSize);
	gDrawingContext.font = "bold "+kMsgSize/2+"px sans-serif";
	gDrawingContext.fillStyle = "#FF0000";
	gDrawingContext.fillText(currGame.levelObj[currGame.level], 0, kMsgSize+kMsgSize/1.5);
	
	//Draw Stats
	gDrawingContext.fillStyle = "#000";
	gDrawingContext.textAlign = "right";
	gDrawingContext.textBaseline = "top";
	gDrawingContext.font = "bold "+kMsgSize+"px sans-serif";
	gDrawingContext.fillText("Stats", kGridX, 0);
	gDrawingContext.font = "bold "+kMsgSize/2+"px sans-serif";
	gDrawingContext.fillText("Cor/Inc: "+currPlayer.correct+"/"+currPlayer.incorrect, kGridX, kMsgSize);
	gDrawingContext.fillText("Chain: "+currPlayer.corRowNum, kGridX, kMsgSize+kMsgSize/2);
	gDrawingContext.fillText("Cor/Min: "+currPlayer.corSpeed, kGridX, kMsgSize+kMsgSize);
	
	if (currGame.level < 4) {
		//Draw hand position image (1/2)
		gDrawingContext.drawImage(aImages[0], 25, 140);
	
		//Draw hand position description
		gDrawingContext.textAlign = "center";
		gDrawingContext.textBaseline = "bottom";
		gDrawingContext.font = "bold "+kMsgSize/2+"px sans-serif";
		gDrawingContext.fillStyle = "#000000";
		gDrawingContext.fillText("Improve your accuracy by placing your hands in the home position.", kGridX/2, kGridY-kMsgSize/2);
	}
	else if (currGame.level >= 4) {
		//Draw hand position image (2/2)
		gDrawingContext.drawImage(aImages[1], 25, 140);
	
		//Draw hand position description
		gDrawingContext.textAlign = "center";
		gDrawingContext.textBaseline = "bottom";
		gDrawingContext.font = "bold "+kMsgSize/2+"px sans-serif";
		gDrawingContext.fillStyle = "#000000";
		gDrawingContext.fillText("Improve your speed by typing each letter with the closest finger.", kGridX/2, kGridY-kMsgSize/2);

	}
  
  drawSpacebarMsg();
}

function drawSpacebarMsg()
{
	gDrawingContext.textAlign = "center";
	gDrawingContext.textBaseline = "bottom";
	gDrawingContext.font = "bold "+kMsgSize/2+"px sans-serif";
	gDrawingContext.fillStyle = "#FF0000";
	gDrawingContext.fillText("(Press spacebar to continue.)", kGridX/2, kGridY);
}

function emptyArray(a)
{
	while (a.length>0) {
		for (var i = 0; i<a.length; i++) { a.pop(); }
	}
}