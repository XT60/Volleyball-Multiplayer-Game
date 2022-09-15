const { uuid } = require('uuidv4');
const { createServer } = require("http");
const http = createServer(); 
const { handleKeyUp, handleKeydown, updatePlayer, updateBall , initGame, addPlayer, updateScale, getPlayers} = require("./game");

const { playerShootArea, netRect, blockZone, scaleTicks, blockRect} = require("../server/game.js");
const { Z_FULL_FLUSH } = require("zlib");

const io = require("socket.io")(http, {
    cors: {
        origin: "http://127.0.0.1:5500"
    }
});

const rooms = {};
    // id: {
    //     gameState: null,
    //     gameFlag: true,
    //     status: inGame / full / waitingForPlayer,
    //     leftPlayer
    //     rightPlayer
    //     specId: id
    // }

let gameFlag = true;
const loopInterval = 1000 / 45;
let lastFrame = 0;
let gameState; 
const startDelay = 1000;
const maxInterval = 100; 

const restartDelay = 1000;

// events toDo: 
// on joinRoomAttempt (roomId, socket, role, callback(success, errorMsg))
// on declareReady
// on declareUnready
// on startGame
// cut down sent data by init event to must haves

io.on("connection", (socket) => {
    console.log(`${socket.id} connected`);
    socket.on('createRoom', createRoom(uuid(), socket));
    socket.on('leaveRoom', leaveRoom(socket));
    // socket.on('declareReady')

    // socket.join("commonRoom");
    // socket.on("keydown", (eventCode) => handleKeydown(gameState, socket.id, eventCode));
    // socket.on("keyup", (eventCode) => handleKeyUp(gameState, socket.id, eventCode));
    // if (addPlayer(socket.id)){
    //     startGame();
    // socket.on('declareReady', () => {
    //     sosocket.rooms[0]
    // });
    // }
}); 

function createRoom(roomId, socket){
    socket.join(roomId);
    rooms[roomId] = {
        status: 'waitingForPlayer',
        gameState: null,
        gameFlag: true,
        startDelay: startDelay,
        leftPlayer: socket.id,
        rightPlayer: null,
        playerReady: {
            leftPlayer: false,
            rightPlayer: false            
        },
        score: {
            leftPlayer: 0,
            rightPlayer: 0
        },
        specId: uuid()
    }
}

function leaveRoom(socket){
    const roomId = socket.rooms.find(room => room != socket.id);
    if (!roomId in rooms){
        console.log("room you want to leave doesn't exist");
        return
    }
    socket.leave(roomId);
    if (rooms[roomId].leftPlayer == socket.id){
        rooms[roomId].gameFlag = false;
        rooms[roomId].leftPlayer = null;
    }
    else if (rooms[roomId].rightPlayer == socket.id){
        rooms[roomId].gameFlag = false;
        rooms[roomId].rightPlayer = null;
    }
}


function startGame(roomId){
    const room = rooms[roomId];
    gameState = initGame();
    io.to(roomId).emit("debugInfo", {
        playerShootArea, 
        netRect, 
        blockZone,
        blockRect
    });

    io.to(roomId).emit("initData", {
        room,
        roomId,
        scaleTicks,
        
    })
}


    // after game has endeed:       clearInterval(myInterval)
const myInterval = setInterval(() => {
    for (const roomId in rooms){
        const room = rooms[roomId];
        if (!room.gameFlag){
            // check for the players, game cannot continue
        }
        let winner;
        const date = new Date();
        const currTime = date.getTime();
        const interval = Math.min(currTime - lastFrame, maxInterval);
        // console.log(1000 / interval);
        lastFrame = currTime;
        
        if (room.startDelay < 0){
            updatePlayer(gameState, 'leftPlayer', interval);
            updatePlayer(gameState, 'rightPlayer', interval);
            winner = updateBall(gameState, interval);
            updateScale(gameState, currTime)
            
            io.to(roomId).emit("newGameState", gameState);
        }
        else{
            room.startDelay -= interval;
        }

        if (winner){
            room.score[winner] += 1;
            console.log(`${winner} earned a point`);
            gameState = initGame();
            io.to(roomId).emit('scoreUpdate', score);
            startDelay = restartDelay;
            winner = null; 
        }
    }


}, loopInterval);

http.listen(3000);