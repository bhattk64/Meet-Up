// Requiring all the modules needed in the application
const path = require('path');
const express = require('express')
const http = require('http')

const moment = require('moment-timezone'); // for playing with date and time and setting default time zone as well
// timezone set to "Asia/Kolkata" in subsequent use of moment //

const socketio = require('socket.io');
require('dotenv').config();
const mongoose = require('mongoose'); // for using MongoDB database for saving chat messages
const mongoDB = 'mongodb+srv://' + process.env.ADMIN + ':' + process.env.PASSWORD + '@cluster0.0v9er.mongodb.net/' + process.env.DBNAME + '?retryWrites=true&w=majority';

// CONNECTING TO DATABASE //
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('database connected');
}).catch(err => console.log(err))

const Msg = require("./models/messages.js"); // messages.js has the message schema defined

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};
let socketroom = {};
let socketname = {};
let micSocket = {};
let videoSocket = {};
let roomBoard = {};

io.on('connect', socket => {

    socket.on("join room", (roomid, username) => {
        socket.join(roomid);
        socketroom[socket.id] = roomid;
        socketname[socket.id] = username;
        micSocket[socket.id] = 'on';
        videoSocket[socket.id] = 'on';

        if (rooms[roomid] && rooms[roomid].length > 0) {
            rooms[roomid].push(socket.id);
            //Notifying other peers that a new peer has joined the room via chat update by "Bot"
            socket.to(roomid).emit('message', `${username} joined the room.`, 'Bot', moment.tz("Asia/Kolkata").format(
                "MMMM Do YYYY, h:mm a"
            ));

            io.to(socket.id).emit('join room', rooms[roomid].filter(pid => pid != socket.id), socketname, micSocket, videoSocket);
        }
        else {
            rooms[roomid] = [socket.id];
            io.to(socket.id).emit('join room', null, null, null, null);
        }

        io.to(roomid).emit('users', rooms[roomid].length);  //Number of users

        // Fetching messages from database for the newly joined user
        Msg.find({roomId: roomid})
        .sort({ createdAt: -1 })
        .limit(100)
        .then(messages => {
            io.to(roomid).emit('display', messages.reverse());  // reversing in order to display in correct order
        })
        .catch(error => console.log(`error: ${error.message}`));

    });

    // audio/video toggling actions
    socket.on('action', msg => {
        if (msg == 'mute')
            micSocket[socket.id] = 'off';
        else if (msg == 'unmute')
            micSocket[socket.id] = 'on';
        else if (msg == 'videoon')
            videoSocket[socket.id] = 'on';
        else if (msg == 'videooff')
            videoSocket[socket.id] = 'off';

        socket.to(socketroom[socket.id]).emit('action', msg, socket.id);
    })

    socket.on('video-offer', (offer, sid) => {
        socket.to(sid).emit('video-offer', offer, socket.id, socketname[socket.id], micSocket[socket.id], videoSocket[socket.id]);
    })

    socket.on('new icecandidate', (candidate, sid) => {
        socket.to(sid).emit('new icecandidate', candidate, socket.id); 
    })

    socket.on('video-answer', (answer, sid) => {
        socket.to(sid).emit('video-answer', answer, socket.id);
    })

    // when a new message is being sent
    socket.on('message', (msg, username, roomid) => {
        // for the purpose of saving the messages in database //
        let messageAttributes = {
            content: msg,
            senderName: username,
            time: moment.tz("Asia/Kolkata").format("MMMM Do YYYY, h:mm a"),
            roomId: roomid
        },
        m = new Msg(messageAttributes);
        m.save()
            .then(() => {
                io.to(roomid).emit('message', msg, username, moment.tz("Asia/Kolkata").format("MMMM Do YYYY, h:mm a")
            );
        })
        .catch(error => console.log(`error: ${error.message}`));
    })

    // actions related to whiteboard //
    socket.on('getCanvas', () => {
        if (roomBoard[socketroom[socket.id]])
            socket.emit('getCanvas', roomBoard[socketroom[socket.id]]);
    });

    socket.on('draw', (newx, newy, prevx, prevy, color, size) => {
        socket.to(socketroom[socket.id]).emit('draw', newx, newy, prevx, prevy, color, size);
    })

    socket.on('clearBoard', () => {
        socket.to(socketroom[socket.id]).emit('clearBoard');
    });

    socket.on('store canvas', url => {
        roomBoard[socketroom[socket.id]] = url;
    })

    // when a user disconnects
    socket.on('disconnect', () => {
        if (!socketroom[socket.id]) return;
        // notifying other peers in the room via a message in chat by "Bot" //
        socket.to(socketroom[socket.id]).emit('message', `${socketname[socket.id]} left the room.`, `Bot`, moment.tz("Asia/Kolkata").format(
            "MMMM Do YYYY, h:mm a"
        ));

        //removing the id of the socket from socket room
        socket.to(socketroom[socket.id]).emit('remove peer', socket.id);
        var index = rooms[socketroom[socket.id]].indexOf(socket.id);
        rooms[socketroom[socket.id]].splice(index, 1);
        io.to(socketroom[socket.id]).emit('users', rooms[socketroom[socket.id]].length);
        delete socketroom[socket.id];
    });
})

// listening on port //
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is Up and Running on Port ${PORT}`));
