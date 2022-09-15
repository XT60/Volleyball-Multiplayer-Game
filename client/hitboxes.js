const canvasElement = document.querySelector('canvas');
const context = canvasElement.getContext('2d');

// playerTerritory      green       #52BE80
// playerShootArea      red         #C0392B
// netRect              yellow      #F1C40F 
// blockZone            purple      #7D3C98
// blockRect            orange

const red = "#C0392B";
const yellow = "#F1C40F";
const purple = "#7D3C98";
// const orange = "#ff8c00";

let playerShootArea;
let netRect;
let blockZone;
let blockRect;

export function initHitboxes(debugInfo){
    playerShootArea = debugInfo.playerShootArea;
    netRect = debugInfo.netRect;
    blockZone = debugInfo.blockZone;
    blockRect = debugInfo.blockRect;
} 


export function drawHitboxes(gameState){
    context.clearRect(0, 0, canvasElement.width, canvasElement.height);

    drawRect(getRect(gameState.leftPlayer.pos, playerShootArea.leftPlayer), red);
    drawRect(getRect(gameState.rightPlayer.pos, playerShootArea.rightPlayer), red);

    drawRect(netRect, yellow);

    drawRect(blockZone.leftPlayer, purple);
    drawRect(blockZone.rightPlayer, purple);

    // drawRect(getRect(gameState.leftPlayer.pos, blockRect.leftPlayer), orange);
    // drawRect(getRect(gameState.rightPlayer.pos, blockRect.rightPlayer), orange);
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