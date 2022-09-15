const { createServer } = require("http");
const http = createServer(); 

const { handleKeyUp, handleKeydown, updatePlayer, updateBall , initGame, addPlayer, updateScale, getPlayers} = require("./game");

const { playerShootArea, netRect, blockArea, scaleTicks } = require("../server/game.js")

const io = require("socket.io")(http, {
    cors: {
        origin: "http://127.0.0.1:5500"
    }
});


const loopInterval = 1000 / 45;
let lastFrame = 0;
let winner = false;
let gameState; 
let startDelay = 1000;
const maxInterval = 100; 
const score = {
    leftPlayer: 0,
    rightPlayer: 0
}
const restartDelay = 1000;

io.on("connection", (socket) => {
    socket.join("commonRoom");
    console.log(`${socket.id} connected and joined commonRoom, `+ `roomSize: ${io.sockets.adapter.rooms.get('commonRoom').size}`);
    socket.on("keydown", (eventCode) => handleKeydown(gameState, socket.id, eventCode));
    socket.on("keyup", (eventCode) => handleKeyUp(gameState, socket.id, eventCode));
    if (addPlayer(socket.id)){
        startGame();
    }
}); 

function startGame(){
    gameState = initGame();
    io.emit("debugInfo", {
        playerShootArea, 
        netRect, 
        blockArea,
    });

    io.emit("initData", {
        scaleTicks,
        players: getPlayers(),
        gameState,
        score
    })

    console.log("game started");
    // after game has endeed:       clearInterval(myInterval)
    const myInterval = setInterval(() => {
        if (winner){
            score[winner] += 1;
            console.log(`${winner} earned a point`);
            gameState = initGame();
            io.emit('scoreUpdate', score);
            startDelay = restartDelay;
            winner = null; 
        }

        date = new Date();
        const currTime = date.getTime();
        const interval = Math.min(currTime - lastFrame, maxInterval);
        // console.log(1000 / interval);
        lastFrame = currTime;

        if (startDelay < 0 && !winner){
            updatePlayer(gameState, 'leftPlayer', interval);
            updatePlayer(gameState, 'rightPlayer', interval);
            winner = updateBall(gameState, interval);
            updateScale(gameState, currTime)
    
            io.emit("newGameState", gameState);
        }
        else{
            startDelay -= interval;
        }

    }, loopInterval);
}

http.listen(3000);