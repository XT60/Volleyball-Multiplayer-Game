import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
import { drawHitboxes, initHitboxes } from "./hitboxes.js";
const socket = io("http://localhost:3000");

const ballElement = document.getElementById("ball");
const leftPlayerElement = document.getElementById('leftPlayer');
const rightPlayerElement = document.getElementById('rightPlayer');

const optionsWindowElement = document.getElementById('optionsWindow');
const keyInWindow = document.getElementById('keyInWindow');
const keyOutWindow = document.getElementById('keyOutWindow');
const gameFindWindowElement = document.getElementById('gameFindWindow');
const courtElement = document.getElementById('court');

const keys = {
    'optionsWindow': {
        'newGame': document.getElementById('newGame'),
        'joinGame': document.getElementById('joinGame'),
        'findGame': document.getElementById('findGame'),
    },
    'keyInWindow': {
        'return': document.querySelector('#keyInWindow button')
    },
    'keyOutWindow': {
        'return': document.querySelector('#keyOutWindow button')
    },
    'gameFindWindow': {
        'return': document.querySelector('#gameFindWindow button')
    },
    'court': {
        'startGame': document.querySelector('#court #startGame'),
        'return': document.querySelector('#court #return')
    }
};

socket.on("connect", () => {
    console.log('connected');
    optionsWindowElement.style.setProperty('display', 'block');
});

// optionsWindow keys
document.getElementById('newGame').addEventListener('click', () => {
    optionsWindowElement.style.setProperty('display', 'none');
    keyWindowElement.style.setProperty('display', 'block');
})

// document.getElementById('joinGame').addEventListener('click', () => {
//     optionsWindowElement.style.setProperty('display', 'none');
//     keyInWindow.style.setProperty('display', 'block');
// })

document.getElementById('findGame').addEventListener('click', () => {
    optionsWindowElement.style.setProperty('display', 'none');
    gameFindWindowElement.style.setProperty('display', 'block');
})


// debug only
socket.on("debugInfo", (debugInfo) => initHitboxes(debugInfo));


socket.on("newGameState", (gameState) => {
    // console.log('got new gameState');
    updatePosition(ballElement, gameState.ball.pos);
    updatePosition(leftPlayerElement, gameState.leftPlayer.pos);
    updatePosition(rightPlayerElement, gameState.rightPlayer.pos);

    // debug only
    drawHitboxes(gameState)

    //action handling, sprites etc
});

addEventListener('keydown', (e) => socket.emit("keydown", e.code));
addEventListener('keyup', (e) => socket.emit("keyup", e.code));


function updatePosition(element, pos){
    element.style.setProperty('left', `${pos[0]}px`);
    element.style.setProperty('top', `${pos[1]}px`);
}