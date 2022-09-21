const { v4 } = require('uuid');
const { createServer } = require("http");
const http = createServer(); 
const { handleKeyUp, handleKeydown, updatePlayer, updateBall, 
    initGame, updateScale} = require("./game");

const { playerShootArea, netRect, blockZone, scaleTicks, 
    scaleTickTime, blockRect} = require("../server/game.js");

const io = require("socket.io")(http, {
    cors: {
        origin: "http://127.0.0.1:5500"
    }
});

const rooms = {};
const waitingRoom = [];

const loopInterval = 1000 / 45;
const startDelay = 1000;
const maxInterval = 100; 
const winnerScore = 100;
const restartDelay = 1000;
let lastFrame = 0;


io.on("connection", (socket) => {
    console.log(`${socket.id} connected`);

    socket.on('createRoom', connected);
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
        handleKeydown(rooms[roomId].gameState, role, eventCode)
    });

    socket.on("keyup", (roomId, role, eventCode) => {
        if (!isDataValid(roomId, socket.id, role)){
            return;
        }
        handleKeyUp(rooms[roomId].gameState, role, eventCode)
    });


    function connected(callback){
        const roomId = createRoom();
        socket.join(roomId);
        rooms[roomId].leftPlayer = socket.id;
        callback(roomId);
    }

    function disconnecting(socket){
        console.log(`${socket.id} disconnected`);
        socket.rooms.forEach(room => io.to(room).emit('opponentLeft'));
    }

    function createRoom (){
        const roomId = v4(); 
        rooms[roomId] = {
            status: 'waitingForPlayer',    // full, inGame
            gameState: null,
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
        console.log(`created room ${roomId}`);
        return roomId;
    }

    function joinRoom(roomId, socket, role, callback){
        const room = rooms[roomId];
        if (!room){
            callback(false, "this room does't exist");
            console.log(`room: ${roomId} you want to join does not exist`);
            return;
        }
        if (role === "spectator"){
            socket.join(room.specId);
            callback(true);
            return;
        }
        
        if (!room.status == 'waitingForPlayer'){
            callback(false, 'room is full');
        }
    
        if (!room.leftPlayer){
            room.leftPlayer = socket.id;
            callback(true);
            return;
        }
        room.rightPlayer = socket.id;
        room.status = 'full';
        socket.join(roomId);
        room.playerReady = {
            leftPlayer: false,
            rightPlayer: false            
        };
    
        io.to(room.leftPlayer).emit('someoneJoined');
        console.log(`player ${socket.id} successfully joined room ${roomId}`);
        callback(true);
    }

    function leaveRoom(socket, roomId, callback){
        // const roomId = socket.rooms.find(room => room != socket.id);
        const room = rooms[roomId];
        if (!room){
            // console.log(rooms);
            const errorMsg = `room ${roomId} you want to leave doesn't exist`;
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
        console.log(`${socket.id} successfully leaved room: ${roomId}`);
        callback(true);
    }

    function findOpponent(){
        if (waitingRoom.length === 0){
            waitingRoom.push(socket);
            return;
        }
        const opponent = waitingRoom.pop();
        const roomId = createRoom();
        opponent.join(roomId);
        socket.join(roomId);
        io.to(socket.id).emit("opponentFound", roomId, 'leftPlayer');
        io.to(opponent.id).emit("opponentFound", roomId, 'rightPlayer');
        const room = rooms[roomId];
        room.leftPlayer = socket.id;
        room.rightPlayer = opponent.id
        console.log(`${socket.id} joined room ${roomId}`);
        console.log(`${opponent.id} joined room ${roomId}`);
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

    function declareReady(roomId, socket, playerRole, callback){
        console.log("got declare ready event from" + `${socket.id}`);
        const room = rooms[roomId];
        
        // validation 
        if (!room){
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

        //action
        room.playerReady[playerRole] = true;
        const other = otherPlayer(playerRole);
        if (!room.playerReady[other]){
            io.to(room[other]).emit('opponentReady');
        }
        else{
            startGame(roomId);
        }
        console.log(`player ${socket.id} is ready`);
        callback(true);
    }
}); 


function startGame(roomId){
    console.log(`game started in room ${roomId}`);
    // console.log(io.sockets.adapter.rooms.get(roomId));
    const room = rooms[roomId];
    room.gameState = initGame();
    room.startDelay = startDelay;
    room.status = "inGame";
    room.score = {
        leftPlayer: 0,
        rightPlayer: 0
    };
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
        scaleTickTime
    });
}

setInterval(() => {
    const currTime = new Date();
    const interval = Math.min(currTime - lastFrame, maxInterval);
    for (const roomId in rooms){
        const room = rooms[roomId];
        if (room.status === 'inGame'){
            let winner;
            lastFrame = currTime;
            
            if (room.startDelay < 0){
                updatePlayer(room.gameState, 'leftPlayer', interval);
                updatePlayer(room.gameState, 'rightPlayer', interval);
                winner = updateBall(room.gameState, interval);
                updateScale(room.gameState, currTime)
                io.to(roomId).to(room.specId).emit("newGameState", room.gameState);
            }
            else{
                room.startDelay -= interval;
            }

            if (winner){
                room.score[winner] += 1;
                if (room.score[winner] >= winnerScore){
                    room.status = 'full';
                    io.to(roomId).emit("gameHasEnded", 'one of the players exceeded winnerScore', room.score);
                    io.to(room.specId).emit("gameHasEnded", 'one of the players exceeded winnerScore', room.score);
                }
                else{
                    room.gameState = initGame();
                    io.to(roomId).to(room.specId).emit('scoreUpdate', room.score);
                    room.startDelay = restartDelay;
                }
            }
        }
    }
}, loopInterval);


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
        console.log(`cannot handle keyup: room ${roomId} doesn't exist`);
        return false;
    }
    if (role === 'spectator'){
        console.log(`spectators cannot change game states: ${socketId}`);
        return false;
    }
    if (room[role] !== socketId){
        console.log(`role: ${role} does not match the player ${socketId}`);
        return false;
    }
    return true
}


http.listen(3000);