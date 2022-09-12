
//actions: standing moving shooting blocking
const gravity = 0.02;
const courtSize = [1201, 443];
const midCourt = 601;
const playerSize = [69, 175];
const ballRadius = 25; 
const groundLevel = 409;
const netRect = [599, 191, 8, 220];
const playerShootArea = {
    leftPlayer: [42, 72, 27, 24],
    rightPlayer: [3, 72, 27, 24]
};
const shootVel = [10, 20];
const players = {
    leftPlayer: null,
    rightPlayer: null
}
const playerDefaultPos = {
    leftPlayer: [300 - playerSize[0], groundLevel - playerSize[1]],
    rightPlayer: [900, groundLevel - playerSize[1]]
};
const playerVelInterval = [0.8, -2];
const ballDefaultPos = [midCourt - ballRadius, 20];
const ballDefaultVel = [0.6, 0];
const ballGMultiplier = 0.05;
const playerTerritory = {
    leftPlayer: [0, midCourt - playerSize[0]],
    rightPlayer: [midCourt, 1201 - playerSize[0]]
}
const blockAreaSize = [50, 20]
const blockArea = {
    leftPlayer: [midCourt - blockAreaSize[0], 
    groundLevel - blockAreaSize[1], blockAreaSize[0], blockAreaSize[1]],
    rightPlayer: [midCourt, groundLevel - blockAreaSize[1],
    blockAreaSize[0], blockAreaSize[1]]
}

function initGame(){
    const gameState = {
        leftPlayer: {
            pos: [...playerDefaultPos['leftPlayer']],
            action: 'standing',
            vel: [0, 0]
        },
        rightPlayer: {
            pos: [...playerDefaultPos['rightPlayer']],
            action: 'standing',
            vel: [0, 0]
        },
        ball: {
            pos: [...ballDefaultPos],
            vel: [...ballDefaultVel]
        }
    }
    
    if (Math.random() >= 0.5){
        gameState.ball.vel[0] *= -1;
    }
    return gameState;
}

function addPlayer(socketID) {
    if (!players['leftPlayer']){
        players['leftPlayer'] = socketID;
        return false;
    }
    else{
        players['rightPlayer'] = socketID;
        return true;
    }
}


function getPlayerName(playerId){
    if (playerId == players.leftPlayer){
        return 'leftPlayer';
    }
    else if(playerId == players.rightPlayer){
        return 'rightPlayer';
    }
    else{
        console.log("unknown playerID");
    }
}

function handleKeydown(gameState, socketID, eventCode){
    if (gameState){
        const playerName = getPlayerName(socketID);
        const player = gameState[playerName];
        switch (eventCode){
            case 'ArrowLeft':
                if (player.action !== 'shooting' &&
                    player.action !== 'blocking'){
                    player.action = 'moving';
                    player.vel[0] = -playerVelInterval[0];
                }
                break;
            case 'ArrowRight':
                if (player.action !== 'shooting' &&
                    player.action !== 'blocking'){
                    player.action = 'moving';
                    player.vel[0] = playerVelInterval[0]
                }
                break;
            case 'Space':
                if (player.action !== 'shooting' &&
                    player.action !== 'blocking'){
                    const playerRect = [...player.pos, ...playerSize];
                    console.log(blockArea[playerName])
                    console.log(playerRect)
                    if (rectRectCollision(playerRect, blockArea[playerName])){
                        console.log('blocking')
                        player.action = 'blocking';
                        player.vel[1] = playerVelInterval[1];
                    }
                    else{
                        player.action = 'shooting';
                    }
                    player.vel[0] = 0;
                }
                break;      
        }    
    }
}

function handleKeyUp(gameState, socketID, eventCode){
    if (gameState){
        const playerName = getPlayerName(socketID);
        const player = gameState[playerName];
        switch (eventCode){
            case 'ArrowLeft':
                if (player.action === 'moving'){
                    player.action = 'standing';
                    player.vel[0] = 0;
                    console.log("movement left stopped")
                }
                break;
            case 'ArrowRight':
                if (player.action === 'moving'){
                    player.action = 'standing';
                    player.vel[0] = 0;
                }
                break;
        }    
    }
}


function updatePlayer(gameState, playerName, timeInterval){
    const player = gameState[playerName];
    const territory = playerTerritory[playerName];

    //position X
    let newX = player.pos[0] + player.vel[0] * timeInterval;
    if (newX < territory[0]){
        newX = territory[0];
        player.vel[0] = 0;
        player.action = 'standing';
    }
    else if(newX > territory[1]){
        newX = territory[1];
        player.vel[0] = 0;
        player.action = 'standing';
    }
    player.pos[0] = newX;

    //position Y
    let newY = player.pos[1] + player.vel[1] * timeInterval;
    if(newY > groundLevel - playerSize[1]){
        newY = groundLevel - playerSize[1];
        if (player.action === 'blocking'){
            player.pos[1] = groundLevel - playerSize[1];
            if (player.vel[0] != 0) {
                player.action = 'moving';
            }
            else{
                player.action = 'standing';
            }
        }
        player.vel[1] = 0;
    }
    player.pos[1] = newY;

    //velocity
    player.vel[1] += gravity * timeInterval;

    // shooting a ball
    if (player.action === 'shooting'){
        const area = playerShootArea[playerName];
        const shootArea = [player.pos[0] + area[0], player.pos[1] + area[1], area[2], area[3]];
        if (rectCircleCollision(shootArea, gameState.ball.pos, ballRadius)){
            if (playerName === 'leftPlayer'){
                gameState[ball].vel = [...shootVel];
            }
            else{
                gameState[ball].vel = [shootVel[0] * -1, shootVel[1]];
            }
        }
        else{
            player.action = 'moving';
        }
    }
}


function updateBall(gameState, timeInterval){
    // position
    const ball = gameState['ball'];
    ball.pos[0] += ball.vel[0] * timeInterval;
    ball.pos[1] += ball.vel[1] * timeInterval * ballGMultiplier;
    if (ball.pos[0] < 0 || ball.pos[0] > courtSize[0] ||
        ball.pos[1] > groundLevel || rectCircleCollision(netRect, ball.pos, ballRadius)){
            return true;
        }

    // velocity
    ball.vel[1] += gravity * timeInterval;
    return false;
}

function rectCircleCollision(rect, cPos, cRadius){
    return !(cPos[0] < rect[0] - cRadius || rect[0] + rect[2] + cRadius < cPos[0] || 
        cPos[1] < rect[1] - cRadius || rect[1] + rect[3] + cRadius < cPos[1]) 
}

function rectRectCollision(recta, rectb){
    console.log(recta[0] + recta[2] < rectb[0])
    console.log(recta[1] + recta[3] < rectb[1])
    console.log(recta[0] > rectb[0] + rectb[2]) 
    console.log(recta[0] > rectb[1] + rectb[3])
    return !(recta[0] + recta[2] < rectb[0] ||
            recta[1] + recta[3] < rectb[1] ||
            recta[0] > rectb[0] + rectb[2] || 
            recta[1] > rectb[1] + rectb[3]) 
}


module.exports = {
    handleKeydown,
    updatePlayer,
    updateBall,
    initGame,
    addPlayer,
    handleKeyUp,

    playerShootArea,
    netRect,
    blockArea,
}