const io = require('socket.io')(3000, {
    cors: {
        origin: ['http://localhost:5500'] // allow origin
    }
});

let CLIENTS = [];
let SOCKET;

// To start conection
io.on('connection', socket => {
    SOCKET = socket; // for global access

    // send message to client
    socket.on('sendMessage', (message , room) => {
        console.log(message , 'roo',  room);
        if(room){
            // Send message only to room
            socket.to(room).emit('receiveMessage' , message);
        }
    })



    /**
     * To join on a private room
     * @pram room: string room key to join on a private room
     * @pram confirmation: callback function to pass to confirmation (optional)
     * */ 

    socket.on('joinRoom', (room, avatar, confirmation) => {
        socket.join(room);
       

        
        // Update Client list with avatar details 
        CLIENTS = CLIENTS.map(user => {
            if(user.id === socket.id){
                user = {...user , ...avatar}
            }
            return user
        } );

        // send joined user list to client 
        let clients = CLIENTS.filter(client => client.room === room);
        socket.to(room).emit('activeClients' , clients);

        confirmation({room , id: socket.id, clients});
        console.log('Join xxxx', CLIENTS );
        
    });




  	socket.on("file-meta",function(data){
		socket.to(data.uid).emit("fs-meta", data.metadata);
	});
	socket.on("fs-start",function(data){
		socket.to(data.uid).emit("fs-share", {});
	});
	socket.on("file-raw",function(data){
		socket.to(data.uid).emit("fs-share", data.buffer);
	})
      


})


// !!! HIT FIRST
// ! LifeCycleHook : User Join the room 
io.of("/").adapter.on("join-room", (room, id) => {
    // User join on PP room
    if(room !== id){
         // send joined user list to client 
        let clients = CLIENTS.filter(client => client.room === room);
        SOCKET.to(room).emit('activeClients' , clients);
        // Update client list based on user Joined
        CLIENTS.push({ id , room});

        console.log('JOIND Clients', CLIENTS)
    }
});

// ! LifeCycleHook : User left the room 
io.of("/").adapter.on("leave-room", (room, id) => {
  console.log(`socket ${id} has left room ${room}`);

    // User left on PP room
    if(room !== id){
        // Update client list based on user left
        CLIENTS = CLIENTS.filter(client => client.id !== id);
        // send joined user list to client 
        let clients = CLIENTS.filter(client => client.room === room);
        SOCKET.to(room).emit('activeClients' , clients);
    }

  console.log('Left Clients', CLIENTS)
});