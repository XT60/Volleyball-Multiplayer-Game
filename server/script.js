// to run command: 
//     npm run loik  (in ./server directory)

const { v4 } = require('uuid');
const { createServer } = require("http");
const http = createServer(); 

const { handleKeyUp, handleKeydown, updatePlayer, updateBall, 
    initGame, updateScale, showBall, resetGameState, isOnGround} = require("./game");

const { playerShootArea, netRect, blockZone, scaleTicks, 
    scaleTickTime, blockRect, playerShootAnimationArea} = require("./game.js");

const io = require("socket.io")(http, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST"],
        credentials: true
      }
});


//  ------------------- constants and variables -------------------
const rooms = {};
const waitingRoom = [];

const loopInterval = 1000 / 45;
const startDelay = 1000;
const maxInterval = 100; 
const winnerScore = 21;
const animationFrameSpan = 150;
const winAnimationSpan = animationFrameSpan * 5 - 40;
let nextRoundDelay = winAnimationSpan;
let lastFrame = 0;


//  ------------------- server events -------------------
io.on("connection", (socket) => {
    console.log(`${socket.id}:\t connected`);
    io.to(socket.id).emit("debugInfo", {
        playerShootArea, 
        playerShootAnimationArea,
        netRect, 
        blockZone,
        blockRect
    });

    socket.on('createRoom', createAndJoinRoom);
    socket.on('leaveRoom', (roomId, callback) => leaveRoom(socket, roomId, callback));
    socket.on('declareReady', (roomId, playerRole, callback) => declareReady(roomId, socket, playerRole, callback));
    socket.on('joinRoomAttempt', (roomId, role, callback) => joinRoom(roomId, socket, role, callback))
    socket.on("cancelSearch", (callback) => removeFromWaitingRoom(socket.id, callback));
    socket.on("findOpponent", findOpponent);
    socket.on("declareRematch", declareRematch);
    socket.on("disconnecting", () => disconnecting(socket));

    socket.on("keydown", (roomId, role, eventCode) => {
        if (!isDataValid(roomId, socket.id, role)){
            return;
        }
        const room = rooms[roomId];
        if (!room.inputDisabled){
            handleKeydown(room.gameState, role, eventCode)
        }
    });

    socket.on("keyup", (roomId, role, eventCode) => {
        if (!isDataValid(roomId, socket.id, role)){
            return;
        }
        const room = rooms[roomId];
        if (!room.inputDisabled){
            handleKeyUp(room.gameState, role, eventCode)
        }
    });


//  ------------------- event handlers -------------------
    function createAndJoinRoom(callback){
        const roomId = createRoom();
        joinRoom(roomId, socket, 'player');
        callback(roomId);
    }

    function createRoom (){
        const roomId = v4(); 
        rooms[roomId] = {
            status: 'waitingForPlayer',     // full, inGame
            gameState: initGame(),
            gameStatus: "playing",          // falling - when point is scored but one of the players is in the air
                                            // winning - one of the players plays winning animation
            startDelay: startDelay,
            leftPlayer: null,
            rightPlayer: null,
            playerReady: {
                leftPlayer: false,
                rightPlayer: false            
            },
            rematchStatus: {
                leftPlayer: false,
                rightPlayer: false
            },
            score: {
                leftPlayer: 0,
                rightPlayer: 0
            },
            specId: v4()
        };
        console.log(`created room:\t ${roomId}`);
        return roomId;
    }

    function joinRoom(roomId, socket, role, callback){
        function afterValidation(roomId, socket, outRole, callback){
            socket.join(roomId);
            io.to(socket.id).emit("initData", {
                room,
                roomId,
                scaleTicks,
                scaleTickTime,
                animationFrameSpan
            });
            console.log(`${socket.id}:\t joined room ${roomId} as ${outRole}`);
            if (callback) callback(true);
        }

        const room = rooms[roomId];
        if (!room){
            if (callback)   callback(false, "this room does't exist");
            console.log(`${roomId}:\t room does not exist ( you want to join )`);
            return;
        }
        if (role === "spectator"){
            socket.join(room.specId);
            afterValidation(roomId, socket, 'spectator', callback)
            return;
        }
        
        if (room.status !== 'waitingForPlayer'){
            if (callback)   callback(false, 'room is full');
            console.log(`${roomId}:\t is full (join rejected)`)
            return
        }
        
        let outRole;
        if (!room.leftPlayer){
            room.leftPlayer = socket.id;
            afterValidation(roomId, socket, 'leftPlayer', callback);
        }
        else{
            room.rightPlayer = socket.id;
            outRole = 'rightPlayer';
            room.status = 'full';
            room.playerReady = {
                leftPlayer: false,
                rightPlayer: false            
            };
            io.to(room.leftPlayer).emit('someoneJoined');
            afterValidation(roomId, socket, 'rightPlayer', callback);
        }
    }

    function leaveRoom(socket, roomId, callback){
        // const roomId = socket.rooms.find(room => room != socket.id);
        const room = rooms[roomId];
        if (!room){
            // console.log(rooms);
            const errorMsg = `${roomId}:\t room doesn't exist (doesn't exist in our room structure)(you want to leave)`;
            callback(false, errorMsg);
            console.log(errorMsg);
            return;
        }
        socket.leave(roomId);
        let isPlayer = false;
        if (room.leftPlayer == socket.id){
            isPlayer = true;
            room.leftPlayer = room.rightPlayer;
        }
        if (isPlayer || room.rightPlayer == socket.id){
            room.gameFlag = false;
            room.leftPlayer = null;
            room.status = "waitingForPlayer";
            room.rematchStatus = {
                leftPlayer: false,
                rightPlayer: false
            };
            room.declareReady = {
                leftPlayer: false,
                rightPlayer: false
            };
            room.status = 'waitingForPlayer';
            io.to(roomId).emit('gameHasEnded', "your opponent left the game", room.score);
        }
        console.log(`${socket.id}:\t successfully leaved room:\t ${roomId}`);
        callback(true);
    }

    function findOpponent(){
        if (waitingRoom.length === 0){
            waitingRoom.push(socket);
            return;
        }
        const opponent = waitingRoom.pop();
        const roomId = createRoom();
        joinRoom(roomId, opponent, 'player');
        joinRoom(roomId, socket, 'player');
        io.to(socket.id).emit("opponentFound", roomId, 'leftPlayer');
        io.to(opponent.id).emit("opponentFound", roomId, 'rightPlayer');
        const room = rooms[roomId];
        room.leftPlayer = socket.id;
        room.rightPlayer = opponent.id
        console.log(`${socket.id}:\t joined room:\t ${roomId}`);
        console.log(`${opponent.id}:\t joined room:\t ${roomId}`);
    }

    function declareReady(roomId, socket, playerRole, callback){
        console.log(`${socket.id}:\t got declare ready event from"`);
        const room = rooms[roomId];
        
        if (!room){                                         // validation 
            callback(false, "room with given roomId doesn't exist");
            return;
        }
        if (room[playerRole] != socket.id){
            callback(false, "you do not have permissions for for that player "+
            "or that role does not exist");
            return;
        }
        if (room.playerReady[playerRole]){
            callback(false, 'player has already declared ready');
            return 
        }

        room.playerReady[playerRole] = true;                //action
        const other = otherPlayer(playerRole);
        if (!room.playerReady[other]){
            io.to(room[other]).emit('opponentReady');
        }
        else{
            startGame(roomId);
        }
        console.log(`${socket.id}:\t player is ready`);
        callback(true);
    }

    function startGame(roomId){
        console.log(`${roomId}:\t game started in this room`);
        const room = rooms[roomId];
        room.startDelay = startDelay;
        room.status = "inGame";
        room.score = {
            leftPlayer: 0,
            rightPlayer: 0
        };
    }

    function declareRematch(roomId, role){
        if (!isDataValid(roomId, socket.id, role)){
            return;
        }
        const other = otherPlayer(role);
        const room = rooms[roomId]; 
        if (!room.rematchStatus[other]){
            room.rematchStatus[role] = true;
            io.to(room[other]).emit("rematchProposal");
            return;
        }
        
        room.rematchStatus = {
            leftPlayer: false,
            rightPlayer: false
        };
        room.playerReady = {
            leftPlayer: false,
            rightPlayer: false
        };
        room.gameState = initGame();
        io.emit("rematchStarted");
    }

    function removeFromWaitingRoom(socketId, callback){
        const i = waitingRoom.findIndex(x => x.id == socketId);
        if (i != -1){
            waitingRoom.splice(i, 1);
            callback(true);
        }
        callback(false, `there is not a socket in waiting room with given ID: ${socketId}`);
    }


    function disconnecting(socket){
        console.log(`${socket.id}:\t disconnected`);
        socket.rooms.forEach(room => leaveRoom(socket, room, () => {}));
    }
}); 


//  ------------------- main loop -------------------
setInterval(() => {
    const currTime = new Date();
    const interval = Math.min(currTime - lastFrame, maxInterval);
    for (const roomId in rooms){
        const room = rooms[roomId];
        const gameState = room.gameState;
        if (room.status === 'inGame'){
            let winner;
            lastFrame = currTime;

            switch (room.gameStatus){
                case "playing":
                    updatePlayer(gameState, 'leftPlayer', interval);
                    updatePlayer(gameState, 'rightPlayer', interval);
                    winner = updateBall(gameState, interval);
                    updateScale(gameState, interval);
                    if (winner){
                        gameState.winner = winner;
                        room.score[winner] += 1;
                        room.inputDisabled = true;
                        nextRoundDelay = winAnimationSpan;
                        if (isOnGround(gameState, 'leftPlayer') && isOnGround(gameState, 'rightPlayer')){
                            room.gameStatus = "winning"
                        }
                        else{
                            room.gameStatus = "falling"
                        }
                    }
                    break;
                case 'falling':
                    updatePlayer(gameState, 'leftPlayer', interval);
                    updatePlayer(gameState, 'rightPlayer', interval);
                    if (isOnGround(gameState, 'leftPlayer') && isOnGround(gameState, 'rightPlayer')){
                        room.gameStatus = 'winning';
                    }
                    else{
                        break;
                    }
                case 'winning':
                    if (nextRoundDelay === winAnimationSpan){
                        const winner = gameState.winner;
                        gameState[winner].animationName = 'winning';
                    }
                    nextRoundDelay -= interval;
                    if (nextRoundDelay < 0){
                        const winner = gameState.winner;
                        if (room.score[winner] >= winnerScore){
                            room.status = 'full';
                            io.to(roomId).emit("gameHasEnded", 'one of the players exceeded winnerScore', room.score);
                            io.to(room.specId).emit("gameHasEnded", 'one of the players exceeded winnerScore', room.score);
                        }
                        else{
                            io.to(roomId).to(room.specId).emit('scoreUpdate', room.score);
                            room.inputDisabled = false;
                            resetGameState(room.gameState);
                            showBall(gameState);
                            gameState.winner = "none";
                            room.gameStatus = "playing";
                        }
                    }
            }
            io.to(roomId).to(room.specId).emit("newGameState", gameState);
        }
    }
}, loopInterval);


//  ------------------- helper functions -------------------
function otherPlayer(player){
    if (player === "leftPlayer"){
        return "rightPlayer";
    }
    else if (player === "rightPlayer"){
        return "leftPlayer";
    }
    console.log("unknown player role")
}

function isDataValid(roomId, socketId, role){
    const room = rooms[roomId];
    if (!room){
        console.log(`${roomId}:\t room  doesn't exist (cannot handle keyup)`);
        return false;
    }
    if (role === 'spectator'){
        console.log(`${socketId}:\t spectators cannot change game states: `);
        return false;
    }
    if (room[role] !== socketId){
        console.log(`${socketId}:\t role '${role}' does not match the player`);
        return false;
    }
    return true
}


http.listen(process.env.PORT || 3000);