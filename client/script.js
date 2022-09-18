import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
import { drawHitboxes, initHitboxes } from "./hitboxes.js";
const socket = io("http://localhost:3000");

let prevGameState, myPlayer, scaleTicks, scaleMulti, a, b, myRoomId;
let inGame = false;
const indicatorWidth = 2;

const ballElement = document.getElementById("ball");
const leftPlayerElement = document.getElementById('leftPlayer');
const rightPlayerElement = document.getElementById('rightPlayer');

const leftPlayerScoreElement = document.getElementById('leftPlayerScore');
const rightPlayerScoreElement = document.getElementById('rightPlayerScore');

const gameIndicatorElement = document.getElementById("gameIndicator");
const leftIndicatorElement = document.getElementById("leftIndicator");
const rightIndicatorElement = document.getElementById("rightIndicator");

const canvasElement = document.querySelector("canvas");
const optionsWindowElement = document.getElementById('optionsWindow');
const keyInWindowElement = document.getElementById('keyInWindow');
const keyOutWindowElement = document.getElementById('keyOutWindow');
const gameFindWindowElement = document.getElementById('gameFindWindow');
const gameElement = document.getElementById('gameArea');

const formInputElements = document.querySelectorAll('#keyInWindowElement input'); 
const spectatorCheckboxElement = document.getElementById('spectatorCheckbox');
const playerCheckboxElement = document.getElementById("playerCheckbox");
const keyInElement = keyInWindowElement.querySelector('form input[type="text"]');
const formErrorMsgElement = keyInWindowElement.querySelector(".errorMsg");
const keyOutElement = document.getElementById('keyOut');
const summaryWindowElement = document.getElementById("gameSummaryWindow");
const gameEndCauseElement = summaryWindowElement.querySelector("p");
const summaryHeaderElement = summaryWindowElement.querySelector("h2");
const scoreBoardElement = document.getElementById("scoreBoard");
const readyMsgElement = document.getElementById('readyMsg');
const powerMeterElement = document.getElementById("powerMeter");
const rematchInfoElement = document.getElementById("rematchInfo");

gameIndicatorElement.style.setProperty('width', cssPercent(indicatorWidth));
playerCheckboxElement.addEventListener('click', () => {
    spectatorCheckboxElement.checked = false;
});
spectatorCheckboxElement.addEventListener('click', () => {
    playerCheckboxElement.checked = false;
});


// optionsWindow
document.getElementById('newGame').addEventListener('click', createRoom);

document.getElementById('joinGame').addEventListener('click', () => {
    changeWindows(optionsWindowElement, keyInWindowElement);
    for (let element of formInputElements){
        element.innerHTML = "";
    };
});

document.getElementById('findGame').addEventListener('click', () => {
    changeWindows(optionsWindowElement, gameFindWindowElement);
    findOpponent();
});

// keyInWindow
keyInWindowElement.querySelector('button').addEventListener('click', () => {
    changeWindows(keyInWindowElement, optionsWindowElement);
});

keyInWindowElement.querySelector('form input[type="submit"]').addEventListener('click', (e) => {
    e.preventDefault();
    let role;
    const roomId = keyInElement.value;
    if (playerCheckboxElement.checked){
        role = 'player';
    }
    else if (spectatorCheckboxElement.checked){
        role = 'spectator';
    }
    else{
        formErrorMsgElement.innerHTML = 'any of checkboxes is not checked';
        return;
    }
    
    socket.emit("joinRoomAttempt", roomId, role, (success, errorMsg) => {
        if (!success){
            console.log(errorMsg);
        }
        else{
            myRoomId = roomId;
            if (role == 'player'){
                myPlayer = "rightPlayer";
            }
            console.log(`${socket.id} successfully joined room: ${roomId}`)
            changeWindows(keyInWindowElement, gameElement);
        }
    });
});

// keyOutWindow
keyOutWindowElement.querySelector('.returnBtn').addEventListener('click', () => {
    leaveRoom(() => {
        changeWindows(keyOutWindowElement, optionsWindowElement);   
    })
});

// gameFindWindow
gameFindWindowElement.querySelector('button').addEventListener('click', () => {
    socket.emit("cancelSearch", (s, e) => handleResponse(s, e, () => {
        changeWindows(gameFindWindowElement, optionsWindowElement);
    })); 
});

//court
document.querySelector('#startGameBtn').addEventListener('mousedown', (e) => {
    e.preventDefault();
    socket.emit('declareReady', myRoomId, myPlayer, (success, errorMsg) => {
        if (!success){
            console.log(errorMsg);
        }
        else{
            addEventListener('keydown', keyDown);
            addEventListener('keyup', keyUp);
        }
    });
});

document.getElementById('returnBtn').addEventListener('click', () => {
    leaveRoom(() => {
        changeWindows(gameElement, optionsWindowElement);
    })
});

//gameSummaryWindow
document.getElementById("leaveGameBtn").addEventListener('click', () => {
    leaveRoom(() => {
        reset();
        changeWindows(summaryWindowElement, optionsWindowElement);
    })
});

document.getElementById("playAgainBtn").addEventListener('click', () => {
    socket.emit("declareRematch", myRoomId, myPlayer);
});

document.getElementById("newOpponentBtn").addEventListener('click', () => {
    changeWindows(summaryWindowElement, gameFindWindowElement);
    findOpponent();
});

document.getElementById("backToKeyOutBtn").addEventListener('click', () => {
    leaveRoom(() => {
        changeWindows(summaryWindowElement, keyOutElement);
            createRoom();
    })
});



socket.on("connect", () => {
    console.log('connected');
    reset();
});


socket.on("someoneJoined", () => {
    changeWindows(keyOutWindowElement, gameElement);
});


socket.on("opponentReady", () => {
    readyMsgElement.style.setProperty('display', 'block');
});


socket.on("opponentUnready", () => {
    readyMsgElement.style.setProperty('display', 'none');
})


socket.on("opponentFound", (roomId, role) => {
    myPlayer = role;
    myRoomId = roomId;
    changeWindows(gameFindWindowElement, gameElement);
});


socket.on("rematchStarted", () => {
    changeWindows(summaryWindowElement, gameElement);
})

socket.on("debugInfo", (debugInfo) => initHitboxes(debugInfo));


socket.on("initData", (data, recieved) => {
    const room = data.room;
    scaleTicks = data.scaleTicks;
    myRoomId = data.roomId;
    //scale
    a = (scaleTicks - 1) / 2;
    b = Math.pow(a, 3) 
    scaleMulti = (100 - indicatorWidth) / (2 * b);
    console.log(scaleMulti)
    
    //players
    if (socket.id == room.leftPlayer){
        myPlayer = 'leftPlayer';
        // setup viewport for leftPlayer
    }
    else if (socket.id == room.rightPlayer){
        myPlayer = 'rightPlayer';
        // setup viewport for rightPlayer
    }
    else{
        myPlayer = null;        // you are in spectator mode
        // setup viewport for spectator
    }
    prevGameState = room.gameState;
    updateScore(room.score);
    recieved(true);
});


// Socket.io Events
socket.on("scoreUpdate", (newScore) => updateScore(newScore));


socket.on("newGameState", (gameState) => {
    if (!inGame){
        inGame = true;
        scoreBoardElement.style.setProperty('display', 'block');
        readyMsgElement.style.setProperty('display', 'block');
        leftPlayerElement.style.setProperty('display', 'block');
        rightPlayerElement.style.setProperty('display', 'block');
        ballElement.style.setProperty('display', 'block');
        powerMeterElement.style.setProperty('display', 'block');
        canvasElement.style.setProperty('display', 'block');
    }
    // console.log('got new gameState');
    updatePosition(ballElement, gameState.ball.pos);
    updatePlayers(gameState)
    if (prevGameState.scale.currTick != gameState.scale.currTick){
        updateIndicatorPos(gameIndicatorElement, gameState.scale.currTick);
        // console.log(gameState.scale.currTick);
    }
    drawHitboxes(gameState)
    // console.log(gameState.scale.currTick)

    //action handling, sprites etc
    prevGameState = gameState;
});


socket.on("opponentLeft", () => {
    changeWindows(gameElement, summaryWindowElement);
    window.alert('your opponent left the game');
    // prevGameState = undefined;
    // myPlayer = 'leftPlayer';
});


socket.on('gameHasEnded', (cause, score) => {
    let winnerMsg;
    if (score.leftPlayer > score.rightPlayer){
        winnerMsg = "left player won";
    }
    else{
        winnerMsg = "right player won";
    }

    summaryHeaderElement.innerHTML = winnerMsg + "<br>" + 
        `left player: ${score.leftPlayer}<br>right player: ${score.rightPlayer}`
    gameEndCauseElement.innerHTML = cause;
    rematchInfoElement.style.setProperty('display', 'none');
    changeWindows(gameElement, summaryWindowElement);
});


socket.on("rematchProposal", () => {
    rematchInfoElement.style.setProperty('display', 'block');
});


// Helper Fucntions
function changeWindows(from, to){
    from.style.setProperty('display', 'none');
    to.style.setProperty('display', 'block');
    if (to === gameElement)     resetGameElement();
}


function findOpponent(){
    socket.emit("findOpponent");
}


async function leaveRoom(response){
    socket.emit('leaveRoom', myRoomId, (s, e) => handleResponse(s, e, () => {
        console.log(`successfully left room: ${myRoomId}`)
        myRoomId = null;
        removeEventListener('keydown', keyDown);
        removeEventListener('keyup', keyUp);
        response()
    }));
}


function createRoom(){
    socket.emit('createRoom', (roomId) => {
        if (!roomId){
            console.log("did not manage to create a room")
            return;
        }
        myRoomId = roomId;
        myPlayer = "leftPlayer";
        changeWindows(optionsWindowElement, keyOutWindowElement);
        keyOutElement.innerHTML = roomId;
    });
}


function keyDown(e){
    socket.emit("keydown", myRoomId, myPlayer, e.code)
}


function keyUp(e){
    socket.emit("keyup", myRoomId, myPlayer, e.code)
}


function updatePlayers(gameState){
    // leftPlayer
    updatePosition(leftPlayerElement, gameState.leftPlayer.pos);
    if (prevGameState.leftPlayer.shootValue != gameState.leftPlayer.shootValue){
        if(gameState.leftPlayer.shootValue === null){
            leftIndicatorElement.style.setProperty('display', 'none');
        }
        else{
            if (prevGameState.leftPlayer.shootValue === null){
                leftIndicatorElement.style.setProperty('display', 'block');
            }
            updateIndicatorPos(leftIndicatorElement, gameState.leftPlayer.shootValue);
        }

    } 
    // rightPlayer
    updatePosition(rightPlayerElement, gameState.rightPlayer.pos);
    if (prevGameState.rightPlayer.shootValue != gameState.rightPlayer.shootValue){
        if(gameState.rightPlayer.shootValue === null){
            rightIndicatorElement.style.setProperty('display', 'none');
        }
        else{
            if (prevGameState.rightPlayer.shootValue === null){
                rightIndicatorElement.style.setProperty('display', 'block');
            }
            updateIndicatorPos(rightIndicatorElement, gameState.rightPlayer.shootValue);
        }
    } 
}


function updateIndicatorPos(indicator, tick){
    const newPos = calculateScaleY(tick) * scaleMulti;
    indicator.style.setProperty('left', cssPercent(newPos));
    // console.log({
    //     newPos,
    //     currTick: gameState.scale.currTick,
    // })
}


function updateScore(newScore){
    leftPlayerScoreElement.innerHTML = '' + newScore.leftPlayer;
    rightPlayerScoreElement.innerHTML = '' + newScore.rightPlayer;
}


function updatePosition(element, pos){
    element.style.setProperty('left', `${pos[0]}px`);
    element.style.setProperty('top', `${pos[1]}px`);
}


function cssPercent(number){
    return `${number}%`
}


function calculateScaleY(x) {
    if (x < 0 || x >= scaleTicks){
        console.log(`wrong scale X argument: ${x}`);
        return -1;
    }
    return Math.pow(x - a, 3) + b;
}


function handleResponse(success, errorMsg, callback){
    if (!success){
        console.log(errorMsg);
        return;
    }
    callback();
}


function reset(){
    prevGameState = undefined;
    myPlayer = undefined;
    myRoomId = undefined;
    const windows = document.querySelectorAll("body > div");
    for (const element of windows){
        element.style.setProperty('display', 'none');
    }
    gameElement.style.setProperty('display', 'none');
    optionsWindowElement.style.setProperty('display', 'block');
}


function resetGameElement(){
    inGame = false;
    leftPlayerScoreElement.innerHTML = '0';
    rightPlayerScoreElement.innerHTML = '0';
    
    scoreBoardElement.style.setProperty('display', 'none');
    readyMsgElement.style.setProperty('display', 'none');
    leftPlayerElement.style.setProperty('display', 'none');
    rightPlayerElement.style.setProperty('display', 'none');
    ballElement.style.setProperty('display', 'none');
    powerMeterElement.style.setProperty('display', 'none');
    canvasElement.style.setProperty('display', 'none');
}