import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
import { drawHitboxes, initHitboxes } from "./hitboxes.js";
const socket = io("http://localhost:3000");

const ballElement = document.getElementById("ball");

const leftPlayerElement = document.getElementById('leftPlayer');
const rightPlayerElement = document.getElementById('rightPlayer');

function updatePosition(element, pos){
    element.style.setProperty('left', `${pos[0]}px`);
    element.style.setProperty('top', `${pos[1]}px`);
}


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

socket.on('disconnect', (socket) => {
    console.log(`${socket.id} disconnected`);
})








