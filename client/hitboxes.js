const canvasElement = document.querySelector('canvas');
const context = canvasElement.getContext('2d');

// playerTerritory      green       #52BE80
// playerShootArea      red         #C0392B
// netRect              yellow      #F1C40F 
// blockArea            purple      #7D3C98

const red = "#C0392B";
const yellow = "#F1C40F";
const purple = "#7D3C98";

let playerShootArea;
let netRect;
let blockArea;


export function initHitboxes(debugInfo){
    playerShootArea = debugInfo.playerShootArea
    netRect = debugInfo.netRect
    blockArea = debugInfo.blockArea
} 


export function drawHitboxes(gameState){
    context.clearRect(0, 0, canvasElement.width, canvasElement.height);

    drawRect(getRect(gameState.leftPlayer.pos, playerShootArea.leftPlayer), red);
    drawRect(getRect(gameState.rightPlayer.pos, playerShootArea.rightPlayer), red);

    drawRect(netRect, yellow);

    drawRect(blockArea.leftPlayer, purple);
    drawRect(blockArea.rightPlayer, purple);
}


function getRect(pos, relRect){
    return [pos[0] + relRect[0], pos[1] + relRect[1],
    relRect[2], relRect[3]];
}


function drawRect(rect, color){
    context.beginPath();
    context.fillStyle = color;
    context.rect(...rect);
    context.fill();
    context.stroke();
}