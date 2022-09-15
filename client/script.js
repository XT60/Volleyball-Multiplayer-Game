import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
import { drawHitboxes, initHitboxes } from "./hitboxes.js";
const socket = io("http://localhost:3000");

const ballElement = document.getElementById("ball");
const leftPlayerElement = document.getElementById('leftPlayer');
const rightPlayerElement = document.getElementById('rightPlayer');

const leftPlayerScoreElement = document.getElementById('leftPlayerScore');
const rightPlayerScoreElement = document.getElementById('rightPlayerScore');

const gameIndicatorElement = document.getElementById("gameIndicator");
const leftIndicatorElement = document.getElementById("leftIndicator");
const rightIndicatorElement = document.getElementById("rightIndicator");

const optionsWindowElement = document.getElementById('optionsWindow');
const keyInWindowElement = document.getElementById('keyInWindow');
const keyOutWindowElement = document.getElementById('keyOutWindow');
const gameFindWindowElement = document.getElementById('gameFindWindow');
const gameElement = document.getElementById('gameArea');

const readyMsgElement = document.getElementById('readyMsg');

let prevGameState, myPlayer, scaleTicks, scaleMulti, a, b, myRoomId;
const indicatorWidth = 2;
gameIndicatorElement.style.setProperty('width', cssPercent(indicatorWidth));
const formInputElements = document.querySelectorAll('#keyInWindowElement input'); 
const spectatorCheckboxElement = document.getElementById('spectatorCheckbox');
const playerCheckboxElement = document.getElementById("playerCheckbox");
const keyOutElement = document.getElementById('keyOut');
const keyInElement = keyInWindowElement.querySelector('form input[type="text"]');
const formErrorMsgElement = keyInWindowElement.querySelector(".errorMsg");
playerCheckboxElement.addEventListener('click', () => {
    spectatorCheckboxElement.checked = false;
});
spectatorCheckboxElement.addEventListener('click', () => {
    playerCheckboxElement.checked = false;
});

//events toDo


socket.on("connect", () => {
    console.log('connected');
    optionsWindowElement.style.setProperty('display', 'block');
});


// optionsWindow
document.getElementById('newGame').addEventListener('click', () => {
    optionsWindowElement.style.setProperty('display', 'none');
    keyOutWindowElement.style.setProperty('display', 'block');
    socket.emit('createRoom');
    keyOutElement.innerHTML = socket.id;
});

document.getElementById('joinGame').addEventListener('click', () => {
    optionsWindowElement.style.setProperty('display', 'none');
    keyInWindowElement.style.setProperty('display', 'block');
    for (let element of formInputElements){
        element.innerHTML = "";
    };
});

document.getElementById('findGame').addEventListener('click', () => {
    optionsWindowElement.style.setProperty('display', 'none');
    gameFindWindowElement.style.setProperty('display', 'block');
});


// keyInWindow
keyInWindowElement.querySelector('button').addEventListener('click', () => {
    keyInWindowElement.style.setProperty('display', 'none');
    optionsWindowElement.style.setProperty('display', 'block');
});

keyInWindowElement.querySelector('form input[type="submit"]').addEventListener('click', (e) => {
    e.preventDefault();
    let role;
    const roomId = keyInElement.innerHTML;
    if (playerCheckboxElement.getAttribute('checked')){
        role = 'player';
    }
    else if (spectatorCheckboxElement.getAttribute('checked')){
        role = 'spectator';
    }
    else{
        formErrorMsgElement.innerHTML = 'any of checkboxes is not checked';
        return;
    }
    
    socket.emit("joinRoomAttempt", roomId, socket, role, (success, errorMsg) => {
        if (!success){
            console.log(errorMsg);
        }
        else{
            console.log(`${socket.id} successfully joined room: ${roomId}`)
            keyInWindowElement.style.setProperty('display', 'none');
            optionsWindowElement.style.setProperty('display', 'block');
        }
    });

});


// keyOutWindow
keyOutWindowElement.querySelector('button').addEventListener('click', () => {
    keyOutWindowElement.style.setProperty('display', 'none');
    optionsWindowElement.style.setProperty('display', 'block');
    socket.emit('leaveRoom');
});

// gameFindWindow
gameFindWindowElement.querySelector('button').addEventListener('click', () => {
    gameFindWindowElement.style.setProperty('display', 'none');
    optionsWindowElement.style.setProperty('display', 'block');
});

//court
document.querySelector('#startGameBtn').addEventListener('click', () => {
    socket.emit('declareReady');
});
// SAME THING BUT WITH UNREADY
// document.querySelector('#startGameBtn').addEventListener('click', () => {
//     socket.to(myRoomId).emit('declareUnready');
// });


document.querySelector('#returnBtn').addEventListener('click', () => {
    // socket.emit('leaveGame');
    gameElement.style.setProperty('display', 'none');
    optionsWindowElement.style.setProperty('display', 'block');
});


socket.on("opponentReady", () => {
    readyMsgElement.style.setProperty('display', 'block');
});

socket.on("opponentUnready", () => {
    readyMsgElement.style.setProperty('display', 'none');
})

socket.on("debugInfo", (debugInfo) => initHitboxes(debugInfo));


socket.on("initData", (data) => {
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
});

socket.on("scoreUpdate", (newScore) => updateScore(newScore));





socket.on("newGameState", (gameState) => {
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

addEventListener('keydown', (e) => socket.emit("keydown", e.code));
addEventListener('keyup', (e) => socket.emit("keyup", e.code));


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
};