//  ------------------- game constants and variables -------------------
const gravity = 0.02;                   
const courtSize = [1201, 443];          
const midCourt = 601;                   
const groundLevel = 409;                

const playerSize = [69, 175];               
const playerVelInterval = [0.8, -1.7];    
const playerGround = groundLevel - playerSize[1];
const shootLock = 450;

const ballRadius = 25;                  
const xBallVel = 0.4;                   
const ballGMultiplier = 0.02;
const ballDefaultVel = [xBallVel, 0];
const ballDefaultPos = [midCourt - ballRadius, 20];

const scaleTicks = 11;
const midTick = (scaleTicks - 1) / 2;
const jinx = [0.2 / midTick, 5 / midTick];
const scaleTickTime = 120;

const netRect = [597, 211, 8, 210];
const blockZoneSize = [50, 20]
const playerTerritory = {
    leftPlayer: [0, midCourt - playerSize[0]],
    rightPlayer: [midCourt, 1201 - playerSize[0]]
};

const blockZone = {
    leftPlayer: [midCourt - blockZoneSize[0], 
    groundLevel - blockZoneSize[1], blockZoneSize[0], blockZoneSize[1]],
    rightPlayer: [midCourt, groundLevel - blockZoneSize[1],
    blockZoneSize[0], blockZoneSize[1]]
};

const playerShootArea = {
    leftPlayer: [42, -65, 150, 150],
    rightPlayer: [-116, -65, 150, 150]
};

const playerShootAnimationArea = {
    leftPlayer: [52, 35, 35, 40],
    rightPlayer: [-11, 35, 35, 40]
};

const blockRect = {
    leftPlayer: [39, 0, 30, 88],
    rightPlayer: [0, 0, 30, 88]
};

const playerDefaultPos = {
    leftPlayer: [300 - playerSize[0], playerGround],
    rightPlayer: [900, playerGround]
};


//  ------------------- key handlers -------------------
function handleKeydown(gameState, playerName, eventCode){
    if (gameState){
        const player = gameState[playerName];
        switch (eventCode){
            case 'ArrowLeft':
                if (player.animationName !== 'shooting' &&
                    player.animationName !== 'blocking'){
                    // console.log('walking')
                    player.vel[0] = -playerVelInterval[0];
                }
                break;
            case 'ArrowRight':
                if (player.animationName !== 'shooting' &&
                    player.animationName !== 'blocking'){
                    // console.log('walking')
                    player.vel[0] = playerVelInterval[0]
                }
                break;
            case 'ArrowUp':
                if (player.animationName !== 'shooting' &&
                    player.animationName !== 'blocking'){
                    const playerRect = [...player.pos, ...playerSize];
                    if (rectRectCollision(playerRect, blockZone[playerName])){
                        player.animationName = 'blocking';
                        player.vel[1] = playerVelInterval[1];
                        player.vel[0] = 0;
                    }
                }
                break;
            case 'Space':
                const scale = gameState.scale;
                if (!player.shootValue){
                    player.shootValue = scale.currTick;
                }
                break;      
        }    
    }
}

function handleKeyUp(gameState, playerName, eventCode){
    if (gameState){
        const player = gameState[playerName];
        switch (eventCode){
            case 'ArrowLeft':
                player.vel[0] = 0;
                break;
            case 'ArrowRight':
                player.vel[0] = 0;
                break;
        }    
    }
}


//  ------------------- game state functions -------------------
function initGame(){
    const gameState = {
        winner: "none",
        leftPlayer: {
            pos: [...playerDefaultPos['leftPlayer']],
            animationName: 'standing',
            vel: [0, 0],
            shootValue: null,
            shootLock: 0
        },
        rightPlayer: {
            pos: [...playerDefaultPos['rightPlayer']],
            animationName: 'standing',
            vel: [0, 0],
            shootValue: null,
            shootLock: 0
        },
        ball: {
            pos: [...ballDefaultPos],
            vel: [...ballDefaultVel],
            visible: true
        },
        scale: {
            currTick: 0,
            nextTick: scaleTickTime,
            trend: 1
        },
        lastContact: null
    };
    if (Math.random() >= 0.5){
        gameState.ball.vel[0] *= -1;
    }
    return gameState;
}


function resetGameState(gameState){
    gameState.leftPlayer.animationName = 'standing';
    gameState.leftPlayer.vel = [0, 0];
    gameState.leftPlayer.shootValue = null;
    gameState.leftPlayer.shootLock = 0;
    gameState.leftPlayer.pos[1] = playerGround;

    gameState.rightPlayer.animationName = 'standing';
    gameState.rightPlayer.vel = [0, 0];
    gameState.rightPlayer.shootValue = null;
    gameState.rightPlayer.shootLock = 0;
    gameState.rightPlayer.pos[1] = playerGround;

    gameState.ball.pos = [...ballDefaultPos];
    gameState.ball.vel = [...ballDefaultVel];

    gameState.lastContact = null;
    if (Math.random() >= 0.5){
        gameState.ball.vel[0] *= -1;
    }
}


//  ------------------- update functions -------------------
function updatePlayer(gameState, playerName, timeInterval){
    const player = gameState[playerName];
    const territory = playerTerritory[playerName];
    let moved = false;
    player.shootLock -= timeInterval;

    if (player.shootLock <= 0){                                     // position X
        let newX = player.pos[0] + player.vel[0] * timeInterval;
        if (newX < territory[0]){
            newX = territory[0];
            player.vel[0] = 0;
        }
        else if(newX > territory[1]){
            newX = territory[1];
            player.vel[0] = 0;
        }
        if (player.pos[0] != newX){
            moved = true;
            player.pos[0] = newX;
        }
    }

    let newY = player.pos[1] + player.vel[1] * timeInterval;        // position Y
    if(newY > playerGround){
        newY = playerGround;
        if (player.animationName === 'blocking'){
            player.pos[1] = playerGround;
            if (player.vel[0] != 0) {
                player.animationName = 'walking';
            }
            else{
                player.animationName = 'standing';
            }
        }
        player.vel[1] = 0;
    }
    if (player.pos[1] != newY){
        moved = true;
        player.pos[1] = newY;
    }

    player.vel[1] += gravity * timeInterval;                        // Y velocity

    const animArea = getWolrdRect(player.pos, playerShootAnimationArea[playerName]);                // shooting a ball
    const ballPos = [gameState.ball.pos[0] + ballRadius, gameState.ball.pos[1] + ballRadius];
    if (rectCircleCollision(animArea, ballPos, ballRadius)){
        const shootArea = getWolrdRect(player.pos, playerShootArea[playerName]);
        if (rectCircleCollision(shootArea, ballPos, ballRadius) && determineTerritory(ballPos) === playerName){
            shootBall(gameState, playerName, player.animationName === 'blocking');
        }
        if (player.animationName !== 'blocking'){
            player.animationName = 'shooting';
            player.shootLock = shootLock;
        }
    }
    else{
        if (player.animationName !== 'blocking' && player.shootLock < 0){
            if (moved){
                player.animationName = 'walking';
            }
            else{
                player.animationName = 'standing';
            }
        }
    }
}

function updateBall(gameState, timeInterval){
    // position
    const ball = gameState['ball'];
    ball.pos[0] += ball.vel[0] * timeInterval;
    ball.pos[1] += ball.vel[1] * timeInterval * ballGMultiplier;

    // velocity
    ball.vel[1] += gravity * timeInterval;
    if (ball.pos[0] < 0 || ball.pos[0] > courtSize[0] - 2 * ballRadius){
        hideBall(gameState);
        return otherPlayer(gameState.lastContact);
    }

    if (ball.pos[1] > groundLevel - 2 * ballRadius){
        hideBall(gameState);
        if (gameState.lastContact === 'rightPlayer'){
            if (ball.pos[0] < netRect[0] - ballRadius/2){
                return 'rightPlayer';
            }
            return 'leftPlayer';
        }
        if (ball.pos[0] < netRect[0] - ballRadius){
            return 'rightPlayer';
        }
        return 'leftPlayer';
    }
        
    const ballPos = [ball.pos[0] + ballRadius, ball.pos[1] + ballRadius]
    if (rectCircleCollision(netRect, ballPos, ballRadius)){
        hideBall(gameState);
        return otherPlayer(gameState.lastContact);
    }
    return null;
}

function updateScale(gameState, interval){
    const scale = gameState.scale
    scale.nextTick -= interval;
    if (scale.nextTick > 0)    return false;
    if (scale.nextTick + scaleTickTime > 0){
        if (scale.currTick + scale.trend >= scaleTicks || scale.currTick + scale.trend < 0){
            scale.trend *= -1;
        } 
        scale.nextTick += scaleTickTime;
        scale.currTick += scale.trend;
        return true;
    }
    const missedTicks = intDev(interval - scale.nextTick, scaleTickTime);
    const missedTrends = intDev(missedTicks + scale.currTick, scaleTicks);
    if (missedTrends % 2 === 1){
        scale.trend *= -1;
        scale.currTick = scaleTicks - 1 - (scale.currTick + missedTicks) % scaleTicks; 
    }
    else{
        scale.currTick = (scale.currTick + missedTicks) % scaleTicks; 
    }
    
    scale.nextTick = interval - scaleTickTime * missedTicks;
    return true
}


//  ------------------- action functions -------------------
function shootBall(gameState, playerName, blocking = false){
    let shootValue = gameState[playerName].shootValue;
    if (shootValue === null){
        shootValue = 0;
    }
    const dest = [0, 0];
    const ball = gameState.ball;
    if(playerName === 'leftPlayer'){
        dest[0] = 900;
        ball.vel[0] = xBallVel;
    }
    else{
        dest[0] = 300;
        ball.vel[0] = -xBallVel;
    }
    const xInt = Math.abs(dest[0] - ball.pos[0])
    const time =  xInt / xBallVel;
    ball.vel[1] = -(gravity * time * 0.5 - xInt / time); 
    if (blocking) {
        ball.vel[0] /= 3;
    }  
    ball.vel[0] += getRandom(-jinx[0], jinx[0]) * (shootValue - midTick);
    ball.vel[1] += getRandom(-jinx[1], jinx[1]) * (shootValue - midTick);
    gameState[playerName].shootValue = null;
    gameState.lastContact = playerName;
}


//  ------------------- collision detection functions -------------------
function rectCircleCollision(rect, cPos, cRadius){
    //circle definitelly don't overlap rect
    const res = cPos[0] < rect[0] - cRadius || rect[0] + rect[2] + cRadius < cPos[0] || 
        cPos[1] < rect[1] - cRadius || rect[1] + rect[3] + cRadius < cPos[1];
    if (res) return false;
    
    let xDiff = rect[0] - cPos[0];
    let yDiff = rect[1] - cPos[1];

    // rest except the rect edges
    if ((-rect[2] - cRadius < xDiff && xDiff < cRadius &&  -rect[3] < yDiff && yDiff < 0) || (
        -rect[3] - cRadius < yDiff && yDiff < cRadius && -rect[2] < xDiff && xDiff < 0)){
            return true;
        }
        
    // rect edges
    if (yDiff <= -rect[3]){
        yDiff += rect[3];
    }
    if (xDiff <= -rect[2]){
        xDiff += rect[2];
    }
    // console.log(xDiff, yDiff);
    return xDiff * xDiff + yDiff * yDiff < cRadius * cRadius;
}

function rectRectCollision(recta, rectb){
    return !(recta[0] + recta[2] < rectb[0] ||
            recta[1] + recta[3] < rectb[1] ||
            recta[0] > rectb[0] + rectb[2] || 
            recta[1] > rectb[1] + rectb[3]) 
}


//  ------------------- helper functions -------------------
function isOnGround(gameState, playerName){
    return gameState[playerName].pos[1] === playerGround;
}

function hideBall(gameState){
    gameState.ball.visible = false;
}

function showBall(gameState){
    gameState.ball.visible = true;
}

function otherPlayer(playerName){
    if (playerName === 'leftPlayer'){
        return 'rightPlayer';
    }
    return 'leftPlayer';
}

function getRandom(a, b, accuracy = 100){
    if (b < a){
        console.log('invalid getRandom arguments: ' + `a=${a} and b=${b}`);
        return 0;
    }
    if (b == a)    return a;
    interval = (b - a) * accuracy;
    return (Math.random() % interval) / accuracy + a;
}

const intDev = (x, y) => Math.floor(x / y);

function determineTerritory(objectPos){
    if (objectPos[0] < midCourt){
        return 'leftPlayer';
    }
    return 'rightPlayer';
}

function getWolrdRect(pos, relRect){
    return [pos[0] + relRect[0], pos[1] + relRect[1], relRect[2], relRect[3]];
}


//  ------------------- exports -------------------
module.exports = {
    handleKeydown,
    handleKeyUp,
    initGame,
    resetGameState,
    updateScale,
    updatePlayer,
    updateBall,
    showBall,
    isOnGround,

    playerShootArea,
    playerShootAnimationArea,
    netRect,
    blockZone,
    scaleTicks,
    scaleTickTime,
    blockRect
};