const canvasElement = document.querySelector('canvas');
const context = canvasElement.getContext('2d');

// playerTerritory              green       #52BE80
// playerShootArea              red         #C0392B
// netRect                      yellow      #F1C40F 
// blockZone                    purple      #7D3C98
// playerShootAnimationArea     pink        #FF1493

const red = "#C0392B";
const yellow = "#F1C40F";
const purple = "#7D3C98";
const pink = "#FF1493";

let playerShootArea,
    netRect,
    blockZone,
    blockRect,
    playerShootAnimationArea;

export function initHitboxes(debugInfo){
    playerShootArea = debugInfo.playerShootArea;
    netRect = debugInfo.netRect;
    blockZone = debugInfo.blockZone;
    blockRect = debugInfo.blockRect;
    playerShootAnimationArea = debugInfo.playerShootAnimationArea;
} 


export function drawHitboxes(gameState){
    context.clearRect(0, 0, canvasElement.width, canvasElement.height);

    drawRect(getRect(gameState.leftPlayer.pos, playerShootArea.leftPlayer), red);
    drawRect(getRect(gameState.rightPlayer.pos, playerShootArea.rightPlayer), red);

    drawRect(getRect(gameState.leftPlayer.pos, playerShootAnimationArea.leftPlayer), pink);
    drawRect(getRect(gameState.rightPlayer.pos, playerShootAnimationArea.rightPlayer), pink);

    drawRect(netRect, yellow);

    drawRect(blockZone.leftPlayer, purple);
    drawRect(blockZone.rightPlayer, purple);
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