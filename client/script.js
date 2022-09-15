import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
import { drawHitboxes, initHitboxes } from "./hitboxes.js";
const socket = io("http://localhost:3000");

const ballElement = document.getElementById("ball");
const leftPlayerElement = document.getElementById('leftPlayer');
const rightPlayerElement = document.getElementById('rightPlayer');

const gameIndicatorElement = document.getElementById("gameIndicator");
const leftIndicatorElement = document.getElementById("leftIndicator");
const rightIndicatorElement = document.getElementById("rightIndicator");

const optionsWindowElement = document.getElementById('optionsWindow');
const keyInWindow = document.getElementById('keyInWindow');
const keyOutWindow = document.getElementById('keyOutWindow');
const gameFindWindowElement = document.getElementById('gameFindWindow');
const gameElement = document.getElementById('gameArea');

const leftPlayerScoreElement = document.getElementById('leftPlayerScore');
const rightPlayerScoreElement = document.getElementById('rightPlayerScore');

let prevGameState, myPlayer, scaleTicks, scaleMulti, a, b;
const indicatorWidth = 2;
gameIndicatorElement.style.setProperty('width', cssPercent(indicatorWidth));
// const keys = {
//     'optionsWindow': {
//         'newGame': document.getElementById('newGame'),
//         'joinGame': document.getElementById('joinGame'),
//         'findGame': document.getElementById('findGame'),
//     },
//     'keyInWindow': {
//         'return': document.querySelector('#keyInWindow button')
//     },
//     'keyOutWindow': {
//         'return': document.querySelector('#keyOutWindow button')
//     },
//     'gameFindWindow': {
//         'return': document.querySelector('#gameFindWindow button')
//     },
//     'court': {
//         'startGame': document.querySelector('#court #startGame'),
//         'return': document.querySelector('#court #return')
//     }
// };

// // optionsWindow keys
// document.getElementById('newGame').addEventListener('click', () => {
//     optionsWindowElement.style.setProperty('display', 'none');
//     keyWindowElement.style.setProperty('display', 'block');
// })

// // document.getElementById('joinGame').addEventListener('click', () => {
// //     optionsWindowElement.style.setProperty('display', 'none');
// //     keyInWindow.style.setProperty('display', 'block');
// // })

// document.getElementById('findGame').addEventListener('click', () => {
//     optionsWindowElement.style.setProperty('display', 'none');
//     gameFindWindowElement.style.setProperty('display', 'block');
// })



socket.on("debugInfo", (debugInfo) => initHitboxes(debugInfo));


socket.on("initData", (data) => {
    //scale
    scaleTicks = data.scaleTicks;
    a = (scaleTicks - 1) / 2;
    b = Math.pow(a, 3) 
    scaleMulti = (100 - indicatorWidth) / (2 * b);
    console.log(scaleMulti)
    
    //players
    if (socket.id == data.players.leftPlayer){
        myPlayer = 'leftPlayer';
        // setup viewport for leftPlayer
    }
    else if (socket.id == data.players.rightPlayer){
        myPlayer = 'rightPlayer';
        // setup viewport for rightPlayer
    }
    else{
        myPlayer = null;        // you are in spectator mode
        // setup viewport for spectator
    }
    prevGameState = data.gameState;
    updateScore(data.score);
});

socket.on("scoreUpdate", (newScore) => updateScore(newScore));


socket.on("connect", () => {
    console.log('connected');
    // optionsWindowElement.style.setProperty('display', 'block');
});


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