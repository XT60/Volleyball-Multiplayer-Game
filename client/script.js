import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
import { drawHitboxes, initHitboxes } from "./hitboxes.js";
const socket = io("https://sandball.herokuapp.com/", {
    withCredentials: true,
});

const indicatorWidth = 2,
gameAreaSize = [1201, 443],
maxCourtfill = 0.9,
animationFrameSpan = 150,
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
    shooting: 2
}   ;

    
let prevGameState, myPlayer, scaleTicks, scaleMulti, a, b, myRoomId, scaleTickTime, myInterval, prevTime,
    inGame = false,
    currScale = 1,
    nextAnimationFrame = animationFrameSpan;


const ballElement = document.getElementById("ball"),
    playerElements = {
        left: document.getElementById('leftPlayer'),
        right: document.getElementById('rightPlayer')
    },

    animationElements = {
        leftPlayer: { 
            "standing": document.querySelector('#leftPlayer .walkAnimation'), 
            "walking": document.querySelector('#leftPlayer .walkAnimation'),
            "shooting": document.querySelector('#leftPlayer .shootAnimation'),
            "blocking": document.querySelector('#leftPlayer .jumpAnimation')
        },
        rightPlayer: { 
            "standing": document.querySelector('#rightPlayer .walkAnimation'),
            "walking": document.querySelector('#rightPlayer .walkAnimation'),
            "shooting": document.querySelector('#rightPlayer .shootAnimation'),
            "blocking": document.querySelector('#rightPlayer .jumpAnimation')
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

gameIndicatorElement.style.setProperty('width', cssPercent(indicatorWidth));
playerCheckboxElement.addEventListener('click', () => {
    spectatorCheckboxElement.checked = false;
});

spectatorCheckboxElement.addEventListener('click', () => {
    playerCheckboxElement.checked = false;
});

window.addEventListener("resize", resize);


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
    //scale

    // a = (scaleTicks - 1) / 2;
    // b = Math.pow(a, 3) 
    // scaleMulti = (100 - indicatorWidth) / (2 * b);
    // console.log(scaleMulti)
    scaleMulti = (100 - indicatorWidth) / (scaleTicks - 1);
    
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


// Socket.io Events
socket.on("scoreUpdate", (newScore) => updateScore(newScore));


socket.on("newGameState", (gameState) => {
    if (!inGame){
        inGame = true;
        scoreBoardElement.style.setProperty('display', 'flex');
        readyMsgElement.style.setProperty('display', 'block');
        playerElements.left.style.setProperty('display', 'block');
        playerElements.right.style.setProperty('display', 'block');
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
        myInterval = setInterval(() => {
            updateScaleTick(prevGameState, new Date());
        }, 30);
    }
    const currTime = new Date();
    const interval = currTime - prevTime;
    prevTime = currTime;

    nextAnimationFrame -= interval;
    
    updateAllPositions(gameState);
    updateAnimation(gameState, 'leftPlayer');
    updateAnimation(gameState, 'rightPlayer');
    
    updateLeftPlayerIndicator(gameState);
    updateRightPlayerIndicator(gameState);
    if (prevGameState.scale.currTick != gameState.scale.currTick){
        updateIndicatorPos(gameIndicatorElement, gameState.scale.currTick);
    }

    // drawHitboxes(gameState)

    //action handling, sprites etc
    prevGameState = gameState;
});


function updateAnimation(gameState, playerName){
    const animation = currAnimation[playerName];
    if (nextAnimationFrame > 0)     return

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
    nextAnimationFrame = animationFrameSpan;
}


function changeAnimation(playerName, from, to){
    animationElements[playerName][from].style.setProperty('display', 'none');
    animationElements[playerName][to].style.setProperty('display', 'block');
}


function updatePlayerElement(playerName){
    const animation = currAnimation[playerName];    
    animationElements[playerName][animation.name].style.setProperty('left', `${-100 * animation.frame}%`);
}


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


// Helper Fucntions
function changeWindows(from, to){
    from.style.setProperty('display', 'none');
    if (to === gameElement){
        resetGameElement()
        to.style.setProperty('display', 'flex');
        return;
    }
    to.style.setProperty('display', 'block');
}


function updateScaleTick(gameState, currTime){
    const scale = gameState.scale
    if (currTime > scale.nextTick){
        if (scale.currTick + scale.trend >= scaleTicks || scale.currTick + scale.trend < 0){
            scale.trend *= -1;
        } 
        scale.nextTick = scale.nextTick + scaleTickTime;
        scale.currTick += scale.trend;
        updateIndicatorPos(gameIndicatorElement, scale.currTick);
    }
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


function keyDown(e){
    socket.emit("keydown", myRoomId, myPlayer, e.code)
}


function keyUp(e){
    socket.emit("keyup", myRoomId, myPlayer, e.code)
}


function updateLeftPlayerIndicator(gameState){
    updatePosition(playerElements.left, gameState.leftPlayer.pos);
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
    updatePosition(playerElements.right, gameState.rightPlayer.pos);
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


function updateAllPositions(gameState){
    updatePosition(ballElement, gameState.ball.pos);
    updatePosition(playerElements.left, gameState.leftPlayer.pos);
    updatePosition(playerElements.right, gameState.rightPlayer.pos);
}


function updateIndicatorPos(indicator, tick){
    const newPos = calculateScaleY(tick) * scaleMulti;
    indicator.style.setProperty('left', cssPercent(newPos));
}


function updateScore(newScore){
    leftPlayerScoreElement.innerHTML = '' + newScore.leftPlayer;
    rightPlayerScoreElement.innerHTML = '' + newScore.rightPlayer;
}


function updatePosition(element, pos){
    element.style.setProperty('left', `${pos[0] * currScale}px`);
    element.style.setProperty('top', `${pos[1] * currScale}px`);
}

function updateElementSize(element, width, height){
    element.style.setProperty("width", `${width}px`);
    element.style.setProperty("height", `${height}px`);
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
    // return Math.pow(x - a, 3) + b;
}


function handleResponse(success, errorMsg, callback){
    if (!success){
        console.log(errorMsg);
        return;
    }
    callback();
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


function resetGameElement(){
    inGame = false;
    clearInterval(myInterval);
    leftPlayerScoreElement.innerHTML = '0';
    rightPlayerScoreElement.innerHTML = '0';
    resize();
    
    scoreBoardElement.style.setProperty('display', 'none');
    readyMsgElement.style.setProperty('display', 'none');
    playerElements.left.style.setProperty('display', 'none');
    playerElements.right.style.setProperty('display', 'none');
    ballElement.style.setProperty('display', 'none');
    powerMeterElement.style.setProperty('display', 'none');
    canvasElement.style.setProperty('display', 'none');
    startGameBtnElement.style.setProperty('display', 'inline');
    courtImgElement.style.setProperty('display','none');
    gameContainerElement.classList.add('centerClass');
    returnBtnElement.style.setProperty('display', 'block');
    returnBtnSmallElement.style.setProperty('display', 'none');
    movementButttonsElement.style.setProperty('display', 'none')
}

