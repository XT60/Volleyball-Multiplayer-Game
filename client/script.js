import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
import { drawHitboxes, initHitboxes } from "./hitboxes.js";
const socket = io("http://127.0.0.1:3000", {
    withCredentials: true,
});

const indicatorWidth = 2,
gameAreaSize = [1201, 443],
maxCourtfill = 0.9,
maxScale = 1500 / gameAreaSize[0],


currAnimation = {
    leftPlayer: {
        name: 'walking',
        trend: 1,
        frame: 0,
    },
    rightPlayer: {
        name: 'walking',
        trend: 1,
        frame: 0,
    } 
},

animationFrameCount = {
    standing: 1,
    walking: 4,
    blocking: 1,
    shooting: 2,
    winning: 3,
};

    
let prevGameState, myPlayer, scaleTicks, scaleMulti, a, b, myRoomId, scaleTickTime,
    scaleInterval, prevTime, animationFrameSpan,
    inGame = false,
    currScale = 1,
    intervalRunning = false,
    nextAnimationFrame = {
        leftPlayer: 0,
        rightPlayer: 0,
    };



//  ------------------- HTML DOM elements -------------------
const ballElement = document.getElementById("ball"),
    playerElements = {
        leftPlayer: document.getElementById('leftPlayer'),
        rightPlayer: document.getElementById('rightPlayer')
    },

    playerLabelElements = {
        leftPlayer: document.getElementById('leftPlayerLabel'),
        rightPlayer: document.getElementById('rightPlayerLabel')
    },

    animationElements = {
        leftPlayer: { 
            "standing": document.querySelector('#leftPlayer .walkAnimation'), 
            "walking": document.querySelector('#leftPlayer .walkAnimation'),
            "shooting": document.querySelector('#leftPlayer .shootAnimation'),
            "blocking": document.querySelector('#leftPlayer .jumpAnimation'),
            "winning": document.querySelector('#leftPlayer .winAnimation')
        },
        rightPlayer: { 
            "standing": document.querySelector('#rightPlayer .walkAnimation'),
            "walking": document.querySelector('#rightPlayer .walkAnimation'),
            "shooting": document.querySelector('#rightPlayer .shootAnimation'),
            "blocking": document.querySelector('#rightPlayer .jumpAnimation'),
            "winning": document.querySelector('#rightPlayer .winAnimation')
        }
    },

    mobileButtons = {
        left: document.querySelector(".leftMoveButton"),
        right: document.querySelector(".rightMoveButton"),
        up: document.querySelector(".upMoveButton"),
        shoot: document.querySelector(".specialActionButton")
    },

    leftPlayerScoreElement = document.getElementById('leftPlayerScore'),
    rightPlayerScoreElement = document.getElementById('rightPlayerScore'),

    gameIndicatorElement = document.getElementById("gameIndicator"),
    leftIndicatorElement = document.getElementById("leftIndicator"),
    rightIndicatorElement = document.getElementById("rightIndicator"),

    canvasElement = document.querySelector("canvas"),
    optionsWindowElement = document.getElementById('optionsWindow'),
    keyInWindowElement = document.getElementById('keyInWindow'),
    keyOutWindowElement = document.getElementById('keyOutWindow'),
    gameFindWindowElement = document.getElementById('gameFindWindow'),
    gameElement = document.getElementById('gameArea'),

    courtElement = document.getElementById('court'),
    formInputElements = document.querySelectorAll('#keyInWindowElement input'), 
    spectatorCheckboxElement = document.getElementById('spectatorCheckbox'),
    playerCheckboxElement = document.getElementById("playerCheckbox"),
    keyInElement = keyInWindowElement.querySelector('form input[type="text"]'),
    formErrorMsgElement = keyInWindowElement.querySelector(".errorMsg"),
    keyOutElement = document.getElementById('keyOut'),
    summaryWindowElement = document.getElementById("gameSummaryWindow"),
    gameEndCauseElement = summaryWindowElement.querySelector("p"),
    summaryHeaderElement = summaryWindowElement.querySelector("h2"),
    scoreBoardElement = document.getElementById("scoreBoard"),
    readyMsgElement = document.getElementById('readyMsg'),
    powerMeterElement = document.getElementById("powerMeter"),
    rematchInfoElement = document.getElementById("rematchInfo"),
    startGameBtnElement = document.querySelector('#startGameBtn'),
    courtImgElement = document.querySelector('#courtImg'),
    gameContainerElement = document.querySelector('.gameContainer'),
    returnBtnElement = document.querySelector('#returnBtn'),
    returnBtnSmallElement = document.querySelector('#returnBtnSmall'),
    movementButttonsElement = document.querySelector('.movementButttons'),
    copyBtnElement = document.querySelector('.copyBtn');
    


//  ------------------- user input listeners -------------------
gameIndicatorElement.style.setProperty('width', cssPercent(indicatorWidth));
playerCheckboxElement.addEventListener('click', () => {
    spectatorCheckboxElement.checked = false;
});

spectatorCheckboxElement.addEventListener('click', () => {
    playerCheckboxElement.checked = false;
});

window.addEventListener("resize", resize);



//  ------------------- window buttons -------------------
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
keyInWindowElement.querySelector('button').addEventListener('click', (e) => {
    e.preventDefault();
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
            window.alert(errorMsg);
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
startGameBtnElement.addEventListener('mousedown', (e) => {
    e.preventDefault();
    socket.emit('declareReady', myRoomId, myPlayer, (success, errorMsg) => {
        if (!success){
            console.log(errorMsg);
        }
        else{
            addEventListener('keydown', keyDown);
            addEventListener('keyup', keyUp);
            addMobileBtnListeners();
        }
    });
});

document.getElementById('returnBtn').addEventListener('click', () => {
    leaveRoom(() => {
        changeWindows(gameElement, optionsWindowElement);
    })
});

returnBtnSmallElement.addEventListener('click', () => {
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
    resetGameElement();
});

document.getElementById("backToKeyOutBtn").addEventListener('click', () => {
    leaveRoom(() => {
        changeWindows(summaryWindowElement, keyOutElement);
            createRoom();
    })
});



//  ------------------- server events -------------------
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


socket.on("initData", (data) => {
    const room = data.room;
    scaleTicks = data.scaleTicks;
    scaleTickTime = data.scaleTickTime;
    myRoomId = data.roomId;
    animationFrameSpan = data.animationFrameSpan;
    nextAnimationFrame.leftPlayer = nextAnimationFrame.rightPlayer = animationFrameSpan;
    scaleMulti = (100 - indicatorWidth) / (scaleTicks - 1);
    
    //players
    if (socket.id == room.leftPlayer){
        myPlayer = 'leftPlayer';
    }
    else if (socket.id == room.rightPlayer){
        myPlayer = 'rightPlayer';
    }
    else{
        myPlayer = null;        // you are in spectator mode
    }
    prevGameState = room.gameState;
    updateScore(room.score);
});


socket.on("scoreUpdate", (newScore) => updateScore(newScore));


socket.on("newGameState", (gameState) => {
    if (!inGame){
        inGame = true;
        updatePlayerLabels();
        nextAnimationFrame.leftPlayer = 0;
        nextAnimationFrame.rightPlayer = 0;
        scoreBoardElement.style.setProperty('display', 'flex');
        readyMsgElement.style.setProperty('display', 'block');
        playerElements.leftPlayer.style.setProperty('display', 'block');
        playerElements.rightPlayer.style.setProperty('display', 'block');
        ballElement.style.setProperty('display', 'block');
        powerMeterElement.style.setProperty('display', 'block');
        canvasElement.style.setProperty('display', 'block');
        readyMsgElement.style.setProperty('display', 'none');
        startGameBtnElement.style.setProperty('display', 'none');
        courtImgElement.style.setProperty('display','block');
        gameContainerElement.classList.remove('centerClass');
        returnBtnElement.style.setProperty('display', 'none');
        returnBtnSmallElement.style.setProperty('display', 'block');
        movementButttonsElement.style.setProperty('display', 'flex');

        prevTime = new Date;
        intervalRunning = true;
        startIndicatorInterval()
    }

    if (gameState.winner == "none"){
        if (!intervalRunning){
            startIndicatorInterval()
        }
    }
    else{
        if (intervalRunning){
            stopIndicatorInterval()
        }
    }

    const currTime = new Date();
    const interval = currTime - prevTime;
    prevTime = currTime;
    
    updateAllPositions(gameState);
    updateVIsibility(ballElement, gameState.ball.visible, prevGameState.ball.visible);
    updateAnimation(gameState, interval, 'leftPlayer');
    updateAnimation(gameState, interval, 'rightPlayer');
    
    updateLeftPlayerIndicator(gameState);
    updateRightPlayerIndicator(gameState);
    if (prevGameState.scale.currTick != gameState.scale.currTick){
        updateIndicatorPos(gameIndicatorElement, gameState.scale.currTick);
    }

    prevGameState = gameState;
});


socket.on("opponentLeft", () => {
    changeWindows(gameElement, summaryWindowElement);
    gameEndCauseElement.innerHTML = "Your opponent left the game";
    summaryHeaderElement.innerHTML = "Game was not finished";
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



//  ------------------- events handling functions -------------------
function changeWindows(from, to){
    from.style.setProperty('display', 'none');
    if (to === gameElement){
        resetGameElement()
        to.style.setProperty('display', 'flex');
        return;
    }
    to.style.setProperty('display', 'block');
}


function findOpponent(){
    socket.emit("findOpponent");
}


async function leaveRoom(response){
    socket.emit('leaveRoom', myRoomId, (s, e) => handleResponse(s, e, () => {
        console.log(`successfully left room: ${myRoomId}`)
        myRoomId = null;
        removeEventListener('keydown', keyDown);
        removeMobileBtnListeners();
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

        copyBtnElement.addEventListener('click', () => {
            navigator.clipboard.writeText(roomId);
        });
    });
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


function handleResponse(success, errorMsg, callback){
    if (!success){
        console.log(errorMsg);
        return;
    }
    callback();
}


// player input listeners
function keyDown(e){
    socket.emit("keydown", myRoomId, myPlayer, e.code)
}


function keyUp(e){
    socket.emit("keyup", myRoomId, myPlayer, e.code)
}


function addMobileBtnListeners(){
    mobileButtons.left.addEventListener('touchstart', () => {
        socket.emit("keydown", myRoomId, myPlayer, "ArrowLeft");
    });
    mobileButtons.right.addEventListener('touchstart', () => {
        socket.emit("keydown", myRoomId, myPlayer, "ArrowRight");
    });
    mobileButtons.up.addEventListener('touchstart', () => {
        socket.emit("keydown", myRoomId, myPlayer, "ArrowUp");
    });
    mobileButtons.shoot.addEventListener('touchstart', () => {
        socket.emit("keydown", myRoomId, myPlayer, "Space");
    });
    mobileButtons.left.addEventListener('touchend', () => {
        socket.emit("keyup", myRoomId, myPlayer, "ArrowLeft");
    });
    mobileButtons.right.addEventListener('touchend', () => {
        socket.emit("keyup", myRoomId, myPlayer, "ArrowRight");
    });
    mobileButtons.up.addEventListener('touchend', () => {
        socket.emit("keyup", myRoomId, myPlayer, "ArrowUp");
    });
    mobileButtons.shoot.addEventListener('touchend', () => {
        socket.emit("keyup", myRoomId, myPlayer, "Space");
    });
}


function removeMobileBtnListeners(){
    mobileButtons.left.removeEventListener('touchstart', () => {
        socket.emit("keydown", myRoomId, myPlayer, "ArrowLeft");
    });
    mobileButtons.right.removeEventListener('touchstart', () => {
        socket.emit("keydown", myRoomId, myPlayer, "ArrowRight");
    });
    mobileButtons.up.removeEventListener('touchstart', () => {
        socket.emit("keydown", myRoomId, myPlayer, "ArrowUp");
    });
    mobileButtons.shoot.removeEventListener('touchstart', () => {
        socket.emit("keydown", myRoomId, myPlayer, "Space");
    });
    mobileButtons.left.removeEventListener('touchend', () => {
        socket.emit("keyup", myRoomId, myPlayer, "ArrowLeft");
    });
    mobileButtons.right.removeEventListener('touchend', () => {
        socket.emit("keyup", myRoomId, myPlayer, "ArrowRight");
    });
    mobileButtons.up.removeEventListener('touchend', () => {
        socket.emit("keyup", myRoomId, myPlayer, "ArrowUp");
    });
    mobileButtons.shoot.removeEventListener('touchend', () => {
        socket.emit("keyup", myRoomId, myPlayer, "Space");
    });
}



//  ------------------- other functions -------------------
function updateScaleTick(gameState, interval){
    const scale = gameState.scale
    scale.nextTick -= interval;
    if (scale.nextTick < 0){
        if (scale.currTick + scale.trend >= scaleTicks || scale.currTick + scale.trend < 0){
            scale.trend *= -1;
        } 
        scale.nextTick += scaleTickTime;
        scale.currTick += scale.trend;
        updateIndicatorPos(gameIndicatorElement, scale.currTick);
    }
}


function updateLeftPlayerIndicator(gameState){
    updatePosition(playerElements.leftPlayer, gameState.leftPlayer.pos);
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
}


function updateRightPlayerIndicator(gameState){
    updatePosition(playerElements.rightPlayer, gameState.rightPlayer.pos);
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


function startIndicatorInterval(){
    if (intervalRunning) return 
    intervalRunning = true;
    let prevTime, currTime;
    prevTime = currTime = new Date();
    scaleInterval = setInterval(() => {
        currTime = new Date();
        updateScaleTick(prevGameState, currTime - prevTime);
        prevTime = currTime;
    }, 30);

}


function stopIndicatorInterval(){
    if (!intervalRunning) return
    intervalRunning = false;
    clearInterval(scaleInterval);
}


function updateIndicatorPos(indicator, tick){
    const newPos = calculateScaleY(tick) * scaleMulti;
    indicator.style.setProperty('left', cssPercent(newPos));
}


function updateAllPositions(gameState){
    updatePosition(ballElement, gameState.ball.pos);
    updatePosition(playerElements.leftPlayer, gameState.leftPlayer.pos);
    updatePosition(playerElements.rightPlayer, gameState.rightPlayer.pos);
}


function updatePosition(element, pos){
    element.style.setProperty('left', `${pos[0] * currScale}px`);
    element.style.setProperty('top', `${pos[1] * currScale}px`);
}


function updatePlayerElement(playerName){
    const animation = currAnimation[playerName];    
    animationElements[playerName][animation.name].style.setProperty('left', `${-100 * animation.frame}%`);
}


function updateAnimation(gameState, interval, playerName){
    const animation = currAnimation[playerName];
    nextAnimationFrame[playerName] -= interval;
    if (nextAnimationFrame[playerName] > 0)     return     
    if (gameState[playerName].animationName === animation.name){
        if (animationFrameCount[animation.name] === 1)  return
        const newFrame = animation.frame + animation.trend;
        if (newFrame >= animationFrameCount[animation.name] || newFrame < 0){
            animation.trend *= -1;
        }
        animation.frame += animation.trend;
    }
    else{
        animation.trend = 1;
        animation.frame = 0;
        changeAnimation(playerName, animation.name, gameState[playerName].animationName);
        animation.name = gameState[playerName].animationName;
    }
    updatePlayerElement(playerName);
    nextAnimationFrame[playerName] = animationFrameSpan;
}


function changeAnimation(playerName, from, to){
    animationElements[playerName][from].style.setProperty('display', 'none');
    animationElements[playerName][to].style.setProperty('display', 'block');
}


function updatePlayerLabels(){
    playerLabelElements[myPlayer].innerHTML = 'you';
    playerLabelElements[otherPlayer(myPlayer)].innerHTML = 'opponent'

}


function otherPlayer(playerName){
    if (playerName === "leftPlayer"){
        return "rightPlayer";
    }
    return "leftPlayer";
}


function updateVIsibility(element, isVisible, wasVisible){
    if (isVisible !== wasVisible){
        if (isVisible){
            element.style.setProperty('opacity', "1");
        }
        else{
            element.style.setProperty('opacity', "0");
        }
    }
}


function updateScore(newScore){
    leftPlayerScoreElement.innerHTML = '' + newScore.leftPlayer;
    rightPlayerScoreElement.innerHTML = '' + newScore.rightPlayer;
}


function updateElementSize(element, width, height){
    element.style.setProperty("width", `${width}px`);
    element.style.setProperty("height", `${height}px`);
}


function resize(){
    const tmp = Math.min(maxCourtfill * window.innerWidth / gameAreaSize[0],
    maxCourtfill * window.innerHeight / gameAreaSize[1]); 
    if (tmp >= maxScale){
        if (currScale === maxScale){
            return;
        }
        currScale = maxScale;
    }
    else{
        currScale = tmp;
    }
    const newWidth = currScale * gameAreaSize[0];
    const newHeight = currScale * gameAreaSize[1];
    updateElementSize(courtElement, newWidth, newHeight);
    updateElementSize(canvasElement, newWidth, newHeight);
    if (inGame) updateAllPositions(prevGameState);
}


function resetGameElement(){
    inGame = false;
    stopIndicatorInterval()
    intervalRunning = false;
    leftPlayerScoreElement.innerHTML = '0';
    rightPlayerScoreElement.innerHTML = '0';
    resize();
    
    scoreBoardElement.style.setProperty('display', 'none');
    readyMsgElement.style.setProperty('display', 'none');
    playerElements.leftPlayer.style.setProperty('display', 'none');
    playerElements.rightPlayer.style.setProperty('display', 'none');
    ballElement.style.setProperty('display', 'none');
    powerMeterElement.style.setProperty('display', 'none');
    canvasElement.style.setProperty('display', 'none');
    startGameBtnElement.style.setProperty('display', 'inline');
    courtImgElement.style.setProperty('display','none');
    gameContainerElement.classList.add('centerClass');
    returnBtnElement.style.setProperty('display', 'block');
    returnBtnSmallElement.style.setProperty('display', 'none');
    movementButttonsElement.style.setProperty('display', 'none');
    updateVIsibility(ballElement, true, false);
}


function cssPercent(number){
    return `${number}%`
}


function calculateScaleY(x) {
    if (x < 0 || x >= scaleTicks){
        console.log(`wrong scale X argument: ${x}`);
        return -1;
    }
    return x
}