// Function for creating a random Room Code
function newRoomCode() {
    return 'xxyxyxxyx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Adding event listener to the logo ( from UX point of view )
const logoButton = document.querySelector(".logo");

logoButton.addEventListener('click', (e) => {
    location.href = `/`;
});

// Adding event listener to the create room button
const createButton = document.querySelector("#createroom");

createButton.addEventListener('click', (e) => {
    e.preventDefault();
    location.href = `/room.html?room=${newRoomCode()}`;
});

// Adding event listener to Join Room Button
const joinButton = document.querySelector('#joinroom');
const codeContent = document.querySelector('#roomcode');

joinButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (codeContent.value.trim() == "") {
        return;
    }
    const code = codeContent.value;
    location.href = `/room.html?room=${code}`;
})

//////////////////////////////////////////////////////////////

const videoContent = document.querySelector('.video-self');
const mic = document.querySelector('#mic');
const cam = document.querySelector('#webcam');

let micAllowed = 1;
let camAllowed = 1;

// setting up media constraints
let mediaConstraints = { video: true, audio: true };

// Adding video stream from our webcam to the video container
navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(localstream => {
        videoContent.srcObject = localstream;
    })

// Adding event listener to the video ( camera ) toggle button
cam.addEventListener('click', () => {
    if (camAllowed) {
        mediaConstraints = { video: false, audio: micAllowed ? true : false };
        cam.classList = "nodevice";
        cam.innerHTML = `<i class="fas fa-video-slash"></i>`;
        camAllowed = 0;
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
                videoContent.srcObject = localstream;
            })
    }
    else {
        mediaConstraints = { video: true, audio: micAllowed ? true : false };
        cam.classList = "device";
        cam.innerHTML = `<i class="fas fa-video"></i>`;
        camAllowed = 1;
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
                videoContent.srcObject = localstream;
            })
    }
})

// Adding event listener to the audio ( mic ) toggle button
mic.addEventListener('click', () => {
    if (micAllowed) {
        mediaConstraints = { video: camAllowed ? true : false, audio: false };
        mic.classList = "nodevice";
        mic.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
        micAllowed = 0;
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
                videoContent.srcObject = localstream;
            })
    }
    else {
        mediaConstraints = { video: camAllowed ? true : false, audio: true };
        mic.innerHTML = `<i class="fas fa-microphone"></i>`;
        mic.classList = "device";
        micAllowed = 1;
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localstream => {
                videoContent.srcObject = localstream;
            })
    }
})
