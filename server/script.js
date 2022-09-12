const { createServer } = require("http");
const http = createServer(); 

const { handleKeyUp, handleKeydown, updatePlayer, updateBall , initGame, addPlayer} = require("./game");

const { playerShootArea, netRect, blockArea } = require("../server/game.js")

const io = require("socket.io")(http, {
    cors: {
        origin: "http://127.0.0.1:5500"
    }
});


const loopInterval = 1000 / 45;
let lastFrame = 0;
let isGameFinished = false;
const gameState = initGame(); 
let startDelay = 5000;
const maxInterval = 200; 

io.on("connection", (socket) => {
    socket.join("commonRoom");
    console.log(`${socket.id} connected and joined commonRoom, `+ `roomSize: ${io.sockets.adapter.rooms.get('commonRoom').size}`);
    socket.on("keydown", (eventCode) => handleKeydown(gameState, socket.id, eventCode));
    socket.on("keyup", (eventCode) => handleKeyUp(gameState, socket.id, eventCode));
    if (addPlayer(socket.id)){
        startGame()
    }

}); 



function startGame(){
    initGame();
    // debug only
    io.emit("debugInfo", {
        playerShootArea, 
        netRect, 
        blockArea
    });
    //
    console.log("game started");
    myInterval = setInterval(() => {
        if (isGameFinished){
            console.log('game has ended');
            clearInterval(myInterval);
        }

        date = new Date();
        const currTime = date.getTime();
        const interval = Math.min(currTime - lastFrame, maxInterval);
        // console.log(1000 / interval);
        lastFrame = currTime;

        if (startDelay < 0 && !isGameFinished){
            updatePlayer(gameState, 'leftPlayer', interval);
            updatePlayer(gameState, 'rightPlayer', interval);
            // isGameFinished = updateBall(gameState, interval);
    
            io.emit("newGameState", gameState);
        }
        else{
            startDelay -= interval;
        }

    }, loopInterval);
}

http.listen(3000);