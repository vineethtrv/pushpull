import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
const socket = io('http://localhost:3000');

const CHAT_CONTAINER_EL = document.getElementById('chat-container');
const HERO_EL = document.getElementById('hero');
const CHAT_AREA_EL = document.getElementById('chat-area');
const CHAT_CONTROL_EL = document.getElementById('chat-control');
const ACTIVE_CLIENTS_EL = document.getElementById('active-clients');

const ROOM_NO_EL = document.getElementById('room-no');
const ROOM_INPUT_EL = document.getElementById('room-control');
const ROOM_LINK_EL = document.querySelector('#room-link input');

const SHARE_BTN = document.getElementById('share-btn');
const SEND_BTN = document.getElementById('btn-send');
const JOIN_BTN = document.getElementById('btn-join');
const COPY_LINK_BTN = document.getElementById('copy-link');
const LOGOUT_BTN = document.getElementById('logout-btn');

let messageHistory = [];
let avatarColor;
let joinLink;
let socketId = '';
let room = '';


// Set avatarColor
if(localStorage.getItem('avatarColor')){
    avatarColor = localStorage.getItem('avatarColor')
} else{
    avatarColor = '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
    localStorage.setItem('avatarColor' , avatarColor)
}


// Identify the Client Operating System 
const getOS = ()=> {
  let userAgent = window.navigator.userAgent,
      platform = window.navigator.platform,
      macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
      windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
      iosPlatforms = ['iPhone', 'iPad', 'iPod'],
      os = null;

    if (macosPlatforms.indexOf(platform) !== -1) {
        os = 'Mac';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = 'Windows';
    } else if (/Android/.test(userAgent)) {
        os = 'Android';
    } else if (!os && /Linux/.test(platform)) {
        os = 'Linux';
    }
  return os;
}

const os = getOS();

// Generate UUID
const generateUUID = () => {
  return  ([1e7]+8e3).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(32) )
}
// Get Avatar Name
const getAvatarName = (os) => {
    let avatarName = ''
    switch (os) {
        case 'Windows':
            avatarName = 'Windows computer';
            break;
        case 'Mac':
            avatarName = 'Mac computer';
            break;
        case 'Linux':
            avatarName = 'Linux computer';
            break;
        case 'iOS':
            avatarName = 'Iphone';
            break;
        case 'Android':
            avatarName = 'Android phone';
            break;
    }
    return avatarName;
}



socket.on('connect', ()=> {
    const params = new URLSearchParams(window.location.search)
    room = localStorage.getItem('room')? localStorage.getItem('room'): params.get('room');
    if(room){
        joinRoom(room);
    }{
        HERO_EL.classList.remove('hide');
        CHAT_CONTAINER_EL.classList.add('hide');
    }
})


// Receive Message
socket.on('receiveMessage', message => {
    console.log('Receive Message', message);
    displayMessage(message);
    // Preserve the chat History for revisit
    storeMessage(message);
})




// Create a new chat Room
const createNewRoom = () => {
    console.log('Create new room');
    room = generateUUID();
    joinRoom(room);
}

// Create a new chat room
document.getElementById('create-new-room').addEventListener('click', () => createNewRoom());

// Join on a room 

const joinRoom = (room)=> {
    console.log('joining' , room)
    let client = {os, avatarColor} // Client info
    localStorage.setItem('room', room); // Store for revisit


    socket.emit('joinRoom', room , client, conformation => {
        if(conformation){
            socketId = conformation.id;
            
            CHAT_CONTAINER_EL.classList.remove('hide');
            HERO_EL.classList.add('hide');

            displayActiveClients(conformation.clients);


            // Retire message from history
            if(localStorage.getItem('messageHistory')){
                let messageHistoryStringified = localStorage.getItem('messageHistory');
                messageHistory = JSON.parse(messageHistoryStringified);
                if(messageHistory.length > 0){
                    messageHistory.forEach(message=> {
                        if(message.avatarColor == avatarColor){
                            // Message from me 
                            displayMessage(message, false);
                        } else{
                            displayMessage(message)
                        }
                    })
                }
            }


            // Share room details
            joinLink = `www.pushpullweb.com?room=${room}`;
            qrCodeClear();

            new QRCode("qr-code", {
                text: joinLink,
                width: 150,
                height: 150,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            // Meeting join Share box details
            ROOM_LINK_EL.value = joinLink;
            ROOM_NO_EL.textContent =  room;

        }
    });
}






// Joined Client information
socket.on('activeClients', client => {
    displayActiveClients(client);
})




// Enter room key or link
ROOM_INPUT_EL.addEventListener('input', e => {
    let key = ROOM_INPUT_EL.value;
    // If value contain URL then extract the key from the URLSearchParams
    key = key.includes('?')? new URLSearchParams(key.split('?')[1]).get('room'): key;

 /**
  * Validate Key
  * 1: Value must
  * 2: Value must contain 12 characters
  * 3: Value must be in alphanumeric characters
  */
    if(key && key.length === 12 && /^[A-Za-z0-9]*$/.test(key) && key !== room) {

        JOIN_BTN.removeAttribute('disabled') ; // Enable join button
        room = key;
    } else {
        JOIN_BTN.setAttribute('disabled', 'disabled');
    }
})

// Join on the room
JOIN_BTN.addEventListener('click', (e) =>{
    e.preventDefault();
    joinRoom(room);
    closeJoinPopup();
})



// Watch Chat input control
CHAT_CONTROL_EL.addEventListener('input', (e) =>{
    // If next line in message
    CHAT_CONTROL_EL.style.height = CHAT_CONTROL_EL.value.includes('\n')? '65px' : '26px';

});


// Send message
SEND_BTN.addEventListener('click', (e) =>{
    e.preventDefault();
    sendTextMessage();
})




// Send Text Message
const sendTextMessage = ()=> {
    let message = CHAT_CONTROL_EL.value;
    if (message === '') return; // return if message is empty
    
    let date = new Date();
    // let room = ROOM_EL.value;
    let chatBubble = { message, os, avatarColor, date }

    displayMessage(chatBubble, false); // Display message with me icon

    socket.emit('sendMessage', chatBubble, room); // send message to server

    // Preserve the chat History for revisit
    storeMessage(chatBubble);

    CHAT_CONTROL_EL.value = ''; // Reset control value
    CHAT_CONTROL_EL.style.height = '26px';
}



/**
 * Display message on chat bubble
 * */ 
const displayMessage = (chatBubble , showAvatar = true) => {
    const CHAT_BUBBLE_EL = document.createElement("div");
    CHAT_BUBBLE_EL.classList.add("chat-bubble");

    // Show avatar for chat bubble from other Devices 
    if(showAvatar){
        const AVATAR = document.createElement("div");
        AVATAR.setAttribute('style', `--avatar-color: ${chatBubble.avatarColor}`);
        AVATAR.classList.add("avatar");
        AVATAR.setAttribute('data-os', chatBubble.os);
        CHAT_BUBBLE_EL.append(AVATAR);
    } else {
        // Mark as my device
        CHAT_BUBBLE_EL.classList.add("me");
    }


    // Display chat date and time
    const DATE = document.createElement("span");
    DATE.classList.add("chat-date");
    DATE.textContent = ` ${getAvatarName(chatBubble.os)}, ${getDisplayDate(chatBubble.date)}`;
    CHAT_BUBBLE_EL.append(DATE);


    // identify url links
    if( chatBubble.message.indexOf('https://') === 0 ||
        chatBubble.message.indexOf('http://') === 0 ||
        chatBubble.message.indexOf('www.') === 0 ){
            const   LINK_EL = document.createElement("a");
                    LINK_EL.setAttribute('href', chatBubble.message);
                    LINK_EL.classList.add("chat-text");
                    LINK_EL.setAttribute('target', '_blank');
                    LINK_EL.textContent = chatBubble.message;
                    CHAT_BUBBLE_EL.append(LINK_EL);
    } else {
        const   CHAT_TEXT = document.createElement("span");
                CHAT_TEXT.classList.add("chat-text");
                CHAT_TEXT.textContent = chatBubble.message;
                CHAT_BUBBLE_EL.append(CHAT_TEXT);
    }

    CHAT_AREA_EL.append(CHAT_BUBBLE_EL);
}






const getDisplayDate = (date) => {
    if(!date){ return }
    date = new Date(date);
    const cDate = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours = date.getHours() % 12 || 12;;
    const amPm = date.getHours() >= 12 ? 'pm' : 'am';
    let minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();

    // If it is same day
    if (date.getDate() === cDate.getDate() ) {
        return `Today at ${hours}:${minutes} ${amPm}`
    } else{
        return `${date.getDate()} ${months(date.getMonth())} ${date.getFullYear()} , ${hours}:${minutes} ${amPm}`;
    }

}





// Display active clients
const displayActiveClients = (clients) => {
    let clientEl = ''
    clients.forEach(client =>{
        // Display all active user except Me
        if(client.id !==  socketId){
            clientEl += `<div class="avatar-list">
                        <div class="avatar" data-os="${client.os}" style="--avatar-color: ${client.avatarColor}"></div>
                        <span class="avatar-name">${getAvatarName(client.os)}</span>
                    </div>`
        }
    })
    ACTIVE_CLIENTS_EL.innerHTML = clientEl;
}


// Share popup toggle
SHARE_BTN.addEventListener('click', () => {
    document.querySelector('.share-box').classList.toggle('hide');
    SHARE_BTN.classList.toggle('active');
});

// Copy room links
COPY_LINK_BTN.addEventListener('click', () => {
    navigator.clipboard.writeText(joinLink);
    COPY_LINK_BTN.setAttribute('data-title', 'Copied');
    ROOM_LINK_EL.select();

    setTimeout(() => { COPY_LINK_BTN.setAttribute('data-title', 'Copy'); }, 2000)
});


// Copy room links
LOGOUT_BTN.addEventListener('click', () => {
    localStorage.clear();
    qrCodeClear();
    window.location.href = window.location.href.split("?")[0];
});

// Clear QRCode
const qrCodeClear = ()=> {
    document.getElementById('qr-code').removeAttribute('title');
    document.getElementById('qr-code').innerHTML = '';
} 

/**
 * Store message history for later use
 * */ 
const storeMessage = (message) => {
    if(!message){
        return true;;
    }
    console.log(message);
    messageHistory.push(message);

    let messageHistoryStringified = JSON.stringify(messageHistory);
    let messageHistorySize = new Blob([messageHistoryStringified]).size;
    // Message history is higher than 3Mb
    if( messageHistorySize  > 2500000 ){
        // remove 25% of the message history 
        messageHistory.splice(0, Math.round( messageHistory.length / 4));
        messageHistoryStringified = JSON.stringify(messageHistory);
    }

    localStorage.setItem('messageHistory', JSON.stringify(messageHistory));
}




// Open Join room Popup
document.getElementById('join-room').addEventListener('click', (event) => {
    document.getElementById('join-room-popup').classList.add('open');
})

// Close  Join room Popup
const closeJoinPopup = ()=>{
    document.getElementById('join-room-popup').classList.remove('open');
}


// Clos Join room Popup by close button 
document.querySelector('.pop-close').addEventListener('click', closeJoinPopup);


/**************************************************************/ 

	document.querySelector("#chat-file-upload").addEventListener("change",function(e){
		let file = e.target.files[0];
		if(!file){
			return;		
		}
		let reader = new FileReader();
		reader.onload = function(e){
			let buffer = new Uint8Array(reader.result);
			
			shareFile({
				filename: file.name,
				total_buffer_size:buffer.length,
				buffer_size:1024,
			}, buffer);
		}
		reader.readAsArrayBuffer(file);
	});





    // Share file

	function shareFile(metadata,buffer){
		socket.emit("file-meta", {
			uid:room,
			metadata:metadata
		});
		
		socket.on("fs-share",function(){
			let chunk = buffer.slice(0,metadata.buffer_size);
			buffer = buffer.slice(metadata.buffer_size,buffer.length);
			if(chunk.length != 0){
				socket.emit("file-raw", {
					uid:room,
					buffer:chunk
				});
			} else {
				console.log("Sent file successfully");
			}
		});
	}



// Reciver

	let fileShare = {
        buffer: [],
        transmitted: 0,
        metadata: null
    };

	socket.on("fs-meta",function(metadata){
		fileShare.metadata = metadata;
		fileShare.transmitted = 0;
		fileShare.buffer = [];
		socket.emit("fs-start",{
			uid:room
		});
	});

    if(avatarColor !== '#32be32'){

        socket.on("fs-share",function(buffer){
            console.log("Buffer", buffer);
            fileShare.buffer.push(buffer);
            fileShare.transmitted += buffer.byteLength;
            if(fileShare.transmitted == fileShare.metadata.total_buffer_size){
                console.log("Download file: ", fileShare);
                download(new Blob(fileShare.buffer), fileShare.metadata.filename);



                fileShare = {};
            } else {
                socket.emit("fs-start",{
                    uid:room
                });
            }
        });
    }