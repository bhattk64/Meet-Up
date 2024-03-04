const socket = io();

//Working with the overlay of the room
const overlayContainer = document.querySelector('#overlay');
const nameField = document.querySelector('#name-field');
const continueButton = document.querySelector('.continue-name');
let username;

// Hide Overlay and enter room when Continue Button is clicked
continueButton.addEventListener('click', () => {
    if (nameField.value == '') return;

    // Setting username to the text entered in Name field
    username = nameField.value;

    overlayContainer.style.visibility = 'hidden';

    //displaying peer name along with video in room
    document.querySelector("#myname").innerHTML = `${username} (You)`;

    socket.emit("join room", roomid, username);
});

// Pressing Enter key on keyboard to enter the room 
nameField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        continueButt.click();
    }
});

////////////////////////////////////////////////////////////////////////////

// roomid stores the Room Code
const roomid = params.get("room");
// Displaying the Room Code in the room window
document.querySelector('.roomcode').innerHTML = `${roomid}`

// STUN Server for our WebRTC Communication
const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] }

// Setting up media constraints
const mediaConstraints = { video: true, audio: true };

const videoContainer = document.querySelector('#vcont');   //videoContainer
const myvideo = document.querySelector("#vd1");            //myOwnVideoStream

//Changing the class for Video Container on the basis of Number of Users
socket.on('users', count => {
    if (count > 1) {
        videoContainer.className = 'video-cont';
    }
    else {
        videoContainer.className = 'video-cont-single';
    }
})

// Initially video is allowed, audio is allowed and hand is down
let videoAllowed = 1;
let audioAllowed = 1;
let handDown = 1;

// Hence visibility for all these three icons is initially set to HIDDEN
let mymuteicon = document.querySelector("#mymuteicon");
mymuteicon.style.visibility = 'hidden';

let myvideooff = document.querySelector("#myvideooff");
myvideooff.style.visibility = 'hidden';

let myhandup = document.querySelector("#myhandup");
myhandup.style.visibility = 'hidden';
//

let micInfo = {};
let videoInfo = {};
let handInfo = {};

let connections = {};
let cName = {};
let audioTrackSent = {};
let videoTrackSent = {};
let videoTrackReceived = {};

let streams = [];   //list-for-storing-streams

let mystream;

let peerConnection;

// Handling errors that may occur when a user tries to join the room
function handleGetUserMediaError(e) {
    switch (e.name) {
        case "NotFoundError":
            alert("No camera and/or microphone were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }
}

function reportError(e) {
    console.log(e);
    return;
}

// Implementing the video call feature starts here //

function startCall() {

    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(localStream => {
            myvideo.srcObject = localStream;
            myvideo.muted = true;
            mystream = localStream;
            localStream.getTracks().forEach(track => {
                for (let key in connections) {
                    connections[key].addTrack(track, localStream);
                    if (track.kind === 'audio')
                        audioTrackSent[key] = track;
                    else
                        videoTrackSent[key] = track;
                }
            })

        })
        .catch(handleGetUserMediaError);
}


socket.on('video-offer', handleVideoOffer);

function handleVideoOffer(offer, sid, cname, micinf, vidinf, handinf) {

    cName[sid] = cname;
    console.log('Video offer recevied !!');
    micInfo[sid] = micinf;
    videoInfo[sid] = vidinf;
    handInfo[sid] = handinf;
    connections[sid] = new RTCPeerConnection(configuration);

    connections[sid].onicecandidate = function (event) {
        if (event.candidate) {
            console.log('Icecandidate fired !!');
            socket.emit('new icecandidate', event.candidate, sid);
        }
    };

    connections[sid].ontrack = function (event) {

        if (!document.getElementById(sid)) {
            console.log('Track event fired !!')
            let vidCont = document.createElement('div');
            let newvideo = document.createElement('video');
            let name = document.createElement('div');
            let muteIcon = document.createElement('div');
            let videoOff = document.createElement('div');
            let handUp = document.createElement('div');

            //Adding respective classes
            videoOff.classList.add('video-off');
            muteIcon.classList.add('mute-icon');
            handUp.classList.add('hand-icon');

            name.classList.add('nametag');
            name.innerHTML = `${cName[sid]}`;
            vidCont.id = sid;
            muteIcon.id = `mute${sid}`;
            videoOff.id = `vidoff${sid}`;
            handUp.id = `hand${sid}`;

            muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
            videoOff.innerHTML = 'Video Off';
            handUp.innerHTML = `<i class="fas fa-hand-paper"></i>`;

            vidCont.classList.add('video-box');
            newvideo.classList.add('video-frame');
            newvideo.autoplay = true;
            newvideo.playsinline = true; //playing video where it is ( instead of opening it up to fullscreen)
            newvideo.id = `video${sid}`;
            newvideo.srcObject = event.streams[0];

            streams.push(event.streams[0]); //adding-streams-in-our-list

            //Setting Up visibility according to the info
            if (micInfo[sid] == 'on')
                muteIcon.style.visibility = 'hidden';
            else
                muteIcon.style.visibility = 'visible';

            if (videoInfo[sid] == 'on')
                videoOff.style.visibility = 'hidden';
            else
                videoOff.style.visibility = 'visible';

            if (handUp[sid] == 'on')
                handUp.style.visibility = 'visible';
            else
                handUp.style.visibility = 'hidden';
            //

            vidCont.appendChild(newvideo);
            vidCont.appendChild(name);
            vidCont.appendChild(muteIcon);
            vidCont.appendChild(videoOff);
            vidCont.appendChild(handUp);

            videoContainer.appendChild(vidCont);
        }
    };

    connections[sid].onremovetrack = function (event) {
        if (document.getElementById(sid)) {
            document.getElementById(sid).remove();
            console.log('Removed a track !!');
        }
    };

    connections[sid].onnegotiationneeded = function () {

        connections[sid].createOffer()
            .then(function (offer) {
                return connections[sid].setLocalDescription(offer);
            })
            .then(function () {
                socket.emit('video-offer', connections[sid].localDescription, sid);
            })
            .catch(reportError);
    };

    let desc = new RTCSessionDescription(offer);

    connections[sid].setRemoteDescription(desc)
        .then(() => { return navigator.mediaDevices.getUserMedia(mediaConstraints) })
        .then((localStream) => {
            localStream.getTracks().forEach(track => {
                connections[sid].addTrack(track, localStream);
                console.log('Added local stream !!')
                if (track.kind === 'audio') {
                    audioTrackSent[sid] = track;
                    if (!audioAllowed)
                        audioTrackSent[sid].enabled = false;
                }
                else {
                    videoTrackSent[sid] = track;
                    if (!videoAllowed)
                        videoTrackSent[sid].enabled = false
                }
            })

        })
        .then(() => {
            return connections[sid].createAnswer();
        })
        .then(answer => {
            return connections[sid].setLocalDescription(answer);
        })
        .then(() => {
            socket.emit('video-answer', connections[sid].localDescription, sid);
        })
        .catch(handleGetUserMediaError);
}


socket.on('new icecandidate', handleNewIceCandidate);

function handleNewIceCandidate(candidate, sid) {
    console.log('New candidate recieved !!')
    var newcandidate = new RTCIceCandidate(candidate);

    connections[sid].addIceCandidate(newcandidate)
        .catch(reportError);
}


socket.on('video-answer', handleVideoAnswer);

function handleVideoAnswer(answer, sid) {
    console.log('Answered the offer !!')
    const ans = new RTCSessionDescription(answer);
    connections[sid].setRemoteDescription(ans);
}


// Function Call triggered from server.js 
socket.on('join room', async (conc, cnames, micinfo, videoinfo, handinfo) => {
    socket.emit('getCanvas');  // for whiteboard

    if (cnames)
        cName = cnames;

    if (micinfo)
        micInfo = micinfo;

    if (videoinfo)
        videoInfo = videoinfo;

    if (handinfo)
        handInfo = handinfo;

    console.log(cName);

    if (conc) {
        await conc.forEach(sid => {
            connections[sid] = new RTCPeerConnection(configuration);

            connections[sid].onicecandidate = function (event) {
                if (event.candidate) {
                    console.log('Icecandidate fired !!');
                    socket.emit('new icecandidate', event.candidate, sid);
                }
            };

            connections[sid].ontrack = function (event) {

                if (!document.getElementById(sid)) {
                    console.log('Track event fired !!')
                    let vidCont = document.createElement('div');
                    let newvideo = document.createElement('video');
                    let name = document.createElement('div');
                    let muteIcon = document.createElement('div');
                    let videoOff = document.createElement('div');
                    let handUp = document.createElement('div');

                    //Adding respective classes
                    videoOff.classList.add('video-off');
                    muteIcon.classList.add('mute-icon');
                    handUp.classList.add('hand-icon');

                    name.classList.add('nametag');
                    name.innerHTML = `${cName[sid]}`;
                    vidCont.id = sid;
                    muteIcon.id = `mute${sid}`;
                    videoOff.id = `vidoff${sid}`;
                    handUp.id = `hand${sid}`;

                    muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
                    videoOff.innerHTML = 'Video Off'
                    handUp.innerHTML = `<i class="fas fa-hand-paper"></i>`;

                    vidCont.classList.add('video-box');
                    newvideo.classList.add('video-frame');
                    newvideo.autoplay = true;
                    newvideo.playsinline = true; //playing video where it is ( instead of opening it up to fullscreen)
                    newvideo.id = `video${sid}`;
                    newvideo.srcObject = event.streams[0];
                    streams.push(event.streams[0]);

                    //Setting Up visibility according to the info
                    if (micInfo[sid] == 'on')
                        muteIcon.style.visibility = 'hidden';
                    else
                        muteIcon.style.visibility = 'visible';

                    if (videoInfo[sid] == 'on')
                        videoOff.style.visibility = 'hidden';
                    else
                        videoOff.style.visibility = 'visible';

                    if (handUp[sid] == 'on')
                        handUp.style.visibility = 'visible';
                    else
                        handUp.style.visibility = 'hidden';

                    vidCont.appendChild(newvideo);
                    vidCont.appendChild(name);
                    vidCont.appendChild(muteIcon);
                    vidCont.appendChild(videoOff);
                    vidCont.appendChild(handUp);

                    videoContainer.appendChild(vidCont);
                }
            };

            connections[sid].onremovetrack = function (event) {
                if (document.getElementById(sid)) {
                    document.getElementById(sid).remove();
                }
            }

            connections[sid].onnegotiationneeded = function () {

                connections[sid].createOffer()
                    .then(function (offer) {
                        return connections[sid].setLocalDescription(offer);
                    })
                    .then(function () {

                        socket.emit('video-offer', connections[sid].localDescription, sid);

                    })
                    .catch(reportError);
            };

        });

        console.log('added all sockets to connections');
        startCall();

    }
    else {
        //When peer is alone in the room
        console.log('Waiting for someone to join !!');
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localStream => {
                myvideo.srcObject = localStream;
                myvideo.muted = true;
                mystream = localStream;
            })
            .catch(handleGetUserMediaError);
    }
})

// Function Call triggered from server.js upon disconnecting
socket.on('remove peer', sid => {
    if (document.getElementById(sid)) {
        document.getElementById(sid).remove();
    }

    delete connections[sid];
})

///////////////////////////////////////////////////////////////////////////

// Called when Button for Copying Room Code is clicked
function CopyCodeText() {
    var textToBeCopied = document.querySelector('.roomcode');
    var currentRange;
    if (document.getSelection().rangeCount > 0) {
        currentRange = document.getSelection().getRangeAt(0);
        window.getSelection().removeRange(currentRange);
    }
    else {
        currentRange = false;
    }

    var CopyRange = document.createRange();
    CopyRange.selectNode(textToBeCopied);
    window.getSelection().addRange(CopyRange);
    document.execCommand("copy");

    window.getSelection().removeRange(CopyRange);

    if (currentRange) {
        window.getSelection().addRange(currentRange);
    }

    //Changing the text content from "Copy Code" to "Copied!" for few seconds
    document.querySelector(".copycode-button").textContent = "Copied!"
    setTimeout(() => {
        document.querySelector(".copycode-button").textContent = "Copy Code";
    }, 3000);
}

//////////////////////////////////////////////////////////////////////////////////////


// Video on/off toggle button
const videoButton = document.querySelector('.novideo');
// Mute/Unmute toggle button
const audioButton = document.querySelector('.audio');
// Button for Raising-Hand in the room
const handButton = document.querySelector('.raise-hand');


// Adding event listener to video toggle button //
videoButton.addEventListener('click', () => {

    if (videoAllowed) {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = false;
        }
        videoButton.innerHTML = `<i class="fas fa-video-slash"></i>`;
        videoAllowed = 0;
        videoButton.style.backgroundColor = "#b12c2c";

        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'video') {
                    track.enabled = false;
                }
            })
        }

        myvideooff.style.visibility = 'visible';

        socket.emit('action', 'videooff');
    }
    else {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = true;
        }
        videoButton.innerHTML = `<i class="fas fa-video"></i>`;
        videoAllowed = 1;
        videoButton.style.backgroundColor = "#c4c4c4";
        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'video')
                    track.enabled = true;
            })
        }


        myvideooff.style.visibility = 'hidden';

        socket.emit('action', 'videoon');
    }
})

// Adding event listener to Audio toggle button //
audioButton.addEventListener('click', () => {

    if (audioAllowed) {
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = false;
        }
        audioButton.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
        audioAllowed = 0;
        audioButton.style.backgroundColor = "#cc4e4e";

        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'audio')
                    track.enabled = false;
            })
        }

        mymuteicon.style.visibility = 'visible';

        socket.emit('action', 'mute');
    }
    else {
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = true;
        }
        audioButton.innerHTML = `<i class="fas fa-microphone"></i>`;
        audioAllowed = 1;
        audioButton.style.backgroundColor = "#c4c4c4";

        if (mystream) {
            mystream.getTracks().forEach(track => {
                if (track.kind === 'audio')
                    track.enabled = true;
            })
        }

        mymuteicon.style.visibility = 'hidden';

        socket.emit('action', 'unmute');
    }
})


// Adding event listener to hand raise button //
handButton.addEventListener('click', () => {
    if (handDown) {
        myhandup.style.visibility = 'visible';
        handDown = 0;
        handButton.innerHTML = `<i class="fas fa-hand-rock"></i><span class="tooltiptext">Lower Hand</span>`;
        socket.emit('action', 'up');
    }
    else {
        myhandup.style.visibility = 'hidden';
        handDown = 1;
        handButton.innerHTML = `<i class="fas fa-hand-paper"></i><span class="tooltiptext">Raise Hand</span>`;
        socket.emit('action', 'down');
    }
});


// Buttons for sending reactions to all peers in the room
const clapButton = document.querySelector('.clap');
const thumbsupButton = document.querySelector('.thumbsup');
const heartButton = document.querySelector('.heart')


// Adding event listeners to all reaction buttons

clapButton.addEventListener('click', () => {
    socket.emit('action', 'clap');
});

thumbsupButton.addEventListener('click', () => {
    socket.emit('action', 'thumbsup');
});

heartButton.addEventListener('click', () => {
    socket.emit('action', 'heart');
});

///////////////////////////////////////////////////////////////

socket.on('action', (msg, sid) => {
    if (msg == 'mute') {
        console.log(sid + ' muted');
        document.querySelector(`#mute${sid}`).style.visibility = 'visible';
        micInfo[sid] = 'off';
    }
    else if (msg == 'unmute') {
        console.log(sid + ' unmuted');
        document.querySelector(`#mute${sid}`).style.visibility = 'hidden';
        micInfo[sid] = 'on';
    }
    else if (msg == 'videooff') {
        console.log(sid + ' video off');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'visible';
        videoInfo[sid] = 'off';
    }
    else if (msg == 'videoon') {
        console.log(sid + ' video on');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'hidden';
        videoInfo[sid] = 'on';
    }
    else if (msg == 'up') {
        console.log(sid + 'raised his hand');
        document.querySelector(`#hand${sid}`).style.visibility = 'visible';
        handInfo[sid] = 'on';
        let audio = new Audio("../audio/raiseHand.mp3");
        audio.play();
    }
    else if (msg == 'down') {
        console.log(sid + 'lowered his hand');
        document.querySelector(`#hand${sid}`).style.visibility = 'hidden';
        handInfo[sid] = 'off';
    }
    else if (msg == 'clap') {
        let audio = new Audio("../audio/notification.wav");
        audio.play();
        document.querySelector(".reactbypeer").innerHTML = cName[sid] + " Clapped !!";
        setTimeout(() => {
            document.querySelector(".reactbypeer").innerHTML = "";
        }, 3000);
    }
    else if (msg == 'thumbsup') {
        let audio = new Audio("../audio/notification.wav");
        audio.play();
        document.querySelector(".reactbypeer").innerHTML = cName[sid] + " gave a Thumbs Up !!";
        setTimeout(() => {
            document.querySelector(".reactbypeer").innerHTML = "";
        }, 3000);
    }
    else if (msg == 'heart') {
        let audio = new Audio("../audio/notification.wav");
        audio.play();
        document.querySelector(".reactbypeer").innerHTML = cName[sid] + " reacted Heart !!";
        setTimeout(() => {
            document.querySelector(".reactbypeer").innerHTML = "";
        }, 3000);
    }
})

//////////////////////////////////////////////////////////////////


// CHAT FEATURE + SAVING ATTENDIES ACTIVITY FEATURE STARTS HERE //

let chatMessages = [];  // collect chat messages to download them later if needed
let attendiesData = []; // collect time of attendies entering and leaving the room

const msgSaveButton = document.querySelector('.msg-save');   // button clicking which messages can be downloaded
const chatRoom = document.querySelector('.chat-cont');       //area on the screen where messages get displayed
const sendButton = document.querySelector('.chat-send');     //button clicking which message is sent
const messageField = document.querySelector('.chat-input');  //input area where user types a message

const AttendiesDataButton = document.querySelector('.attendies-data');  //button clicking which attendies activity can be downloaded

//Adding event listener to send message button
sendButton.addEventListener('click', () => {
    const msg = messageField.value;
    messageField.value = '';
    socket.emit('message', msg, username, roomid);
})

//When Enter key on keyboard is pressed
messageField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        sendButton.click();
    }
});


socket.on('message', (msg, sendername, time) => {
    if (msg.length == 0) return;

    // collect attendies data to save it later
    if (sendername == "Bot") {
        attendiesData.push({
            Time: time,
            Status: msg,
        });
    }

    // collect chat messages to save it later
    if (sendername != "Bot") {
        chatMessages.push({
            Time: time,
            Name: sendername,
            Text: msg
        });
    }

    //displaying messages in the chat room 
    chatRoom.scrollTop = chatRoom.scrollHeight;
    chatRoom.innerHTML += `<div class="message">
    <div class="info">
    <div class="username">${sendername}</div>
    <div class="time">${time}</div>
    </div>
    <div class="content">
    ${msg}
    </div>
    </div>`
});


// Displaying messages from the Database to new peer upon joining / existing user rejoins
// function call triggered from server.js
socket.on('display', messages => {
    if (chatMessages.length != 0) return;
    //looping through all the messages fetched from database
    messages.forEach(msg => {
        chatRoom.scrollTop = chatRoom.scrollHeight;
        chatRoom.innerHTML += `<div class="message">
        <div class="info">
        <div class="username">${msg.senderName}</div>
        <div class="time">${msg.time}</div>
        </div>
        <div class="content">
        ${msg.content}
        </div>
        </div>`

        // collecting chat messages to Download them later if needed
        chatMessages.push({
            Time: msg.time,
            Name: msg.senderName,
            Text: msg.content
        });
    });
})

// Adding event listener to the button clicking which messages get downloaded ( txt file )
msgSaveButton.addEventListener("click", (e) => {
    if (chatMessages.length != 0) {
        let a = document.createElement("a");
        a.href =
            "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(chatMessages, null, 1));
        a.download = getDataTimeString() + "-CHAT.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }
    alert("No chat messages to save !!");
});

// Adding event listener to the button clicking which attendies activity get downloaded ( txt file )
AttendiesDataButton.addEventListener("click", (e) => {
    if (attendiesData.length != 0) {
        let a = document.createElement("a");
        a.href =
            "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(attendiesData, null, 1));
        a.download = getDataTimeString() + "-ATTENDIES_ACTIVITY.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }
    alert("No Attendee entered the room after you yet !!");
});

///////////////////////////////////////////////////////////////

// SCREEN SHARING FEATURE STARTS HERE //
const screenShareButton = document.querySelector('.screenshare');

let myscreenshare;

screenShareButton.addEventListener('click', () => {
    // Useful when a user whose video is off shares his screen
    videoButton.innerHTML = `<i class="fas fa-video"></i>`;
    videoAllowed = 1;
    videoButton.style.backgroundColor = "#c4c4c4";
    myvideooff.style.visibility = 'hidden';
    socket.emit('action', 'videoon');
    // otherwise both "video off" text and user's video stream appears simultaneouly upon stopping screen sharing
    screenShareToggle();
});

let screenshareEnabled = false;

function screenShareToggle() {
    let screenMediaPromise;
    if (!screenshareEnabled) {
        if (navigator.getDisplayMedia) {
            screenMediaPromise = navigator.getDisplayMedia({ video: true, audio: true });
        } else if (navigator.mediaDevices.getDisplayMedia) {
            screenMediaPromise = navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } else {
            screenMediaPromise = navigator.mediaDevices.getUserMedia({
                video: { mediaSource: "screen" },
            });
        }
    } else {
        screenMediaPromise = navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
    screenMediaPromise
        .then((myscreenshare) => {
            screenshareEnabled = !screenshareEnabled;
            for (let key in connections) {
                const sender = connections[key]
                    .getSenders()
                    .find((s) => (s.track ? s.track.kind === "video" : false));
                sender.replaceTrack(myscreenshare.getVideoTracks()[0]);
            }
            myscreenshare.getVideoTracks()[0].enabled = true;
            const newStream = new MediaStream([
                myscreenshare.getVideoTracks()[0],
            ]);
            myvideo.srcObject = newStream;
            myvideo.muted = true;
            mystream = newStream;

            screenShareButton.innerHTML = (screenshareEnabled
                ? `<i class="fas fa-desktop"></i><span class="tooltiptext">Stop Share Screen</span>`
                : `<i class="fas fa-desktop"></i><span class="tooltiptext">Share Screen</span>`
            );
            myscreenshare.getVideoTracks()[0].onended = function () {
                if (screenshareEnabled) screenShareToggle();
            };
        })
        .catch((e) => {
            alert("Unable to share screen:" + e.message);
            console.error(e);
        });
}

// SCREEN SHARING FEATURE ENDS HERE //

///////////////////////////////////////////////////////////////////////////////////

//WHITEBOARD FEATURE STARTS HERE //
const whiteboardButton = document.querySelector('.board-icon');
const whiteboardCont = document.querySelector('.whiteboard-cont');

//Adding event listener to Whiteboard button
whiteboardButton.addEventListener('click', () => {
    if (boardVisisble) {
        whiteboardButton.innerHTML = `<i class="fas fa-chalkboard-teacher"></i><span class="tooltiptext">Open Whiteboard</span>`;
        whiteboardCont.style.visibility = 'hidden';
        boardVisisble = false;
    }
    else {
        whiteboardButton.innerHTML = `<i class="fas fa-chalkboard-teacher"></i><span class="tooltiptext">Close Whiteboard</span>`;
        whiteboardCont.style.visibility = 'visible';
        boardVisisble = true;
    }
})

// setting up our whiteboard canvas starts here //

const canvas = document.querySelector("#whiteboard");
const ctx = canvas.getContext('2d');

// Initially whiteboard is'nt visible
let boardVisisble = false;
whiteboardCont.style.visibility = 'hidden';  

let isDrawing = 0;  //initial 
let x = 0;
let y = 0;

// default colur is set to black
let color = "black";
let drawsize = 3;
let colorRemote = "black";
let drawsizeRemote = 3;

function fitToContainer(canvas) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

fitToContainer(canvas);

// getCanvas call is made under the join room call
socket.on('getCanvas', url => {
    let img = new Image();
    img.onload = start;
    img.src = url;

    function start() {
        ctx.drawImage(img, 0, 0);
    }
    // for showing the updates whiteboard to all the participants
    console.log('Got canvas', url);
})

// Setting up color options
function setColor(newcolor) {
    color = newcolor;
    drawsize = 3;
}

// Setting up eraser
function setEraser() {
    color = "white";
    drawsize = 20;
}

// Setting up the whiteboard drawing functionality starts here //
function draw(newx, newy, oldx, oldy) {
    ctx.strokeStyle = color;
    ctx.lineWidth = drawsize;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();

    socket.emit('store canvas', canvas.toDataURL());

}

// drawing is done through mouse movements //

function drawRemote(newx, newy, oldx, oldy) {
    ctx.strokeStyle = colorRemote;
    ctx.lineWidth = drawsizeRemote;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();

}

canvas.addEventListener('mousedown', e => {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = 1;
})

canvas.addEventListener('mousemove', e => {
    if (isDrawing) {
        draw(e.offsetX, e.offsetY, x, y);
        socket.emit('draw', e.offsetX, e.offsetY, x, y, color, drawsize);
        x = e.offsetX;
        y = e.offsetY;
    }
})

window.addEventListener('mouseup', e => {
    if (isDrawing) {
        isDrawing = 0;
    }
})

socket.on('draw', (newX, newY, prevX, prevY, color, size) => {
    colorRemote = color;
    drawsizeRemote = size;
    drawRemote(newX, newY, prevX, prevY);
})

// Setting up the whiteboard drawing functionality ends here //

// For saving the whiteboard as an image ( png )
function saveBoard() {
    let link = document.createElement("a");
    link.download = getDataTimeString() + "WHITEBOARD.png";
    link.href = canvas.toDataURL();
    link.click();
    link.delete;
}

// For clearing the entire board in one click
function clearBoard() {
    if (window.confirm('Are you sure you want to clear board?')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('store canvas', canvas.toDataURL());
        socket.emit('clearBoard');
    }
    else return;
}

// Board is cleared for all the peers
socket.on('clearBoard', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
})

///////////////////////////////////////////////////////////////

// OWN VIDEO STREAM RECORDING + SCREEN RECORDING FEATURE STARTS HERE //

//sharing screen to recorder
function shareScreen() {
    if (this.userMediaAvailable()) {
        recordedStream = navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        return recordedStream;
    }

    else {
        throw new Error('User media not available');
    }
}

function userMediaAvailable() {
    return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
}

// RECORDING ENTIRE SCREEN //

const recordScreenButton = document.querySelector('.record-screen');
let isScreenRecording = false; // initially screen is not being recorded

//share the screen to the "recorder" first
recordScreenButton.addEventListener("click", (e) => {
    if (isScreenRecording) {
        recordScreenButton.innerHTML = `<i class="fas fa-record-vinyl"></i><span class="tooltiptext">Record Entire Screen</span>`;
        recordScreenButton.style.color = "#9958e6";
        isScreenRecording = false;
        stopRecording();
    }
    else {
        shareScreen().then((screenStream) => {
            startRecording(screenStream);
            isScreenRecording = true;
            recordScreenButton.innerHTML = (isScreenRecording
                ? `<i class="fas fa-record-vinyl"></i><span class="tooltiptext">Stop Recording</span>`
                : `<i class="fas fa-record-vinyl"></i><span class="tooltiptext">Record Entire Screen</span>`
            );
            recordScreenButton.style.color = (isScreenRecording
                ? "red"
                : "#9958e6"
            );
            screenStream.getVideoTracks()[0].onended = function () {
                if (isScreenRecording) {
                    isScreenRecording = false;
                    recordScreenButton.innerHTML = `<i class="fas fa-record-vinyl"></i><span class="tooltiptext">Record Entire Screen</span>`;
                    recordScreenButton.style.color = "#9958e6";
                }
            };
        })
        .catch((e) => {
            alert("Unable to record screen:" + e.message);
            console.error(e);
        });
    }
});

// RECORDING OWN VIDEO STREAM //

const recordStreamButton = document.querySelector('.record');
let isStreamRecording = false; // initially video stream is not being recorded

recordStreamButton.addEventListener("click", (e) => {
    if (isStreamRecording) {
        recordStreamButton.innerHTML = `<i class="fas fa-camera"></i><span class="tooltiptext">Record Your Video</span>`;
        recordStreamButton.style.color = "#9958e6";
        isStreamRecording = false;
        stopRecording();
    } else {
        recordStreamButton.innerHTML = `<i class="fas fa-camera"></i><span class="tooltiptext">Stop Recording</span>`;
        recordStreamButton.style.color = "red";
        isStreamRecording = true;
        startRecording(mystream);
    }
});

//startRecording function definition ( using MediaRecorder )
function startRecording(stream) {
    recordedBlobs = [];
    let options = { mimeType: "video/webm;codecs=vp9,opus" };

    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not supported`);
        options = { mimeType: "video/webm;codecs=vp8,opus" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.error(`${options.mimeType} is not supported`);
            options = { mimeType: "video/webm" };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.error(`${options.mimeType} is not supported`);
                options = { mimeType: "audio/webm" };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.error(`${options.mimeType} is not supported`);
                    options = { mimeType: "" };
                }
            }
        }
    }

    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (err) {
        console.error("Exception while creating MediaRecorder:", err);
        alert(err);
        return;
    }

    console.log("Created MediaRecorder", mediaRecorder, "with options", options);
    mediaRecorder.onstop = (event) => {
        console.log("MediaRecorder stopped: ", event);
        console.log("MediaRecorder Blobs: ", recordedBlobs);

        downloadRecordedStream();

    };

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
    console.log("MediaRecorder started", mediaRecorder);
}

//StopRecording function definition
function stopRecording() {
    mediaRecorder.stop();
}

//handleDataAvailable function definition
function handleDataAvailable(event) {
    console.log("handleDataAvailable", event);
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

//DownloadRecordedStream function definition ( webm file )
function downloadRecordedStream() {
    try {
        const blob = new Blob(recordedBlobs, { type: "video/webm" });
        const recFileName = getDataTimeString() + "-REC.webm";
        const blobFileSize = bytesToSize(blob.size);

        // save the recorded file to device
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = recFileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
    catch (err) {
        alert(err);
    }
}

//getDataTimeString function definition
function getDataTimeString() {
    const d = new Date();
    const date = d.toISOString().split("T")[0];
    const time = d.toTimeString().split(" ")[0];
    return `${date}-${time}`;
}

//bytesToSize function definition
function bytesToSize(bytes) {
    let sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes == 0) return "0 Byte";
    let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

////////////////////////////////////////////////////////////////////////

// MUTE / HIDE INCOMING STREAM FEATURE STARTS HERE //

const muteEveryoneButton = document.querySelector('.mute-everyone');
const hideEveryoneButton = document.querySelector('.hide-everyone');

// initial states
let ishidden = 0;
let ismuted = 0;

// Adding event listener to mute everyone button //
muteEveryoneButton.addEventListener('click', () => {
    if (ismuted == 0) {
        ismuted = 1;
        muteEveryoneButton.innerHTML = `<i class="fas fa-microphone-slash"></i><span class="tooltiptext">Unmute Incoming Audios</span>`;
        muteEveryoneButton.style.color = "red";
        for (let i = 0; i < streams.length; i++) {
            streams[i].getAudioTracks()[0].enabled = false;
        }
    }
    else {
        ismuted = 0;
        muteEveryoneButton.innerHTML = `<i class="fas fa-microphone-slash"></i><span class="tooltiptext">Mute Incoming Audios</span>`;
        muteEveryoneButton.style.color = "#9958e6";
        for (let i = 0; i < streams.length; i++) {
            streams[i].getAudioTracks()[0].enabled = true;
        }
    }
});

// Adding event listener to hide everyone button //
hideEveryoneButton.addEventListener('click', () => {
    if (ishidden == 0) {
        ishidden = 1;
        hideEveryoneButton.innerHTML = `<i class="fas fa-video-slash"></i><span class="tooltiptext">Unhide Incoming Videos</span>`;
        hideEveryoneButton.style.color = "red";
        for (let i = 0; i < streams.length; i++) {
            streams[i].getVideoTracks()[0].enabled = false;
        }
    }
    else {
        ishidden = 0;
        hideEveryoneButton.innerHTML = `<i class="fas fa-video-slash"></i><span class="tooltiptext">Hide Incoming Videos</span>`;
        hideEveryoneButton.style.color = "#9958e6";
        for (let i = 0; i < streams.length; i++) {
            streams[i].getVideoTracks()[0].enabled = true;
        }
    }
});

//////////////////////////////////////////////////////////////

// Button for leaving the room //
const cutCall = document.querySelector('.cutcall');

cutCall.addEventListener('click', () => {
    location.href = '/';
})
