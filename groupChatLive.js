const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

//port can be set manually using the command line, for example "env PORT=8888 node index.js"
const port = process.argv[2];
let clients = {};
var groupSet = new Set();

let userList = new Array();

app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/createRoom', (req, res) => {
  console.log(req.query);
})
//socket.io:
io.on('connection', function (socket) {
  //each socket is unique to each client that connects:
  console.log(socket.id);
  let room = socket.handshake['query']['rname'];
  let usr = socket.handshake['query']['usr'];
  console.log(room, usr);
  socket.username = usr
  socket.join(room);

  //let the clients know how many online users are there:
  clients[`${room}`] = clients[`${room}`] == null ? 1 : clients[`${room}`]+1;
  console.log(clients)
  io.to(room).emit('clientCon', { msg: "New User has joined, Welcome "+usr} );
  // socket.broadcast.emit('clientCon', { msg: 'New User is joining'});

  // socket.on('username', function (username_from_client) {
  //   socket.username = username_from_client;

  //   //let all users know that this user has connected:
  //   io.to(room).emit('clientCon', { msg: `Welcome ${socket.username}`});
  // });

 

  //handle adding a message to the chat.
  socket.on('sendMessage', function (msg) {
    //io.emit(..., ...); - sending the message to all of the sockets.
    console.log(msg)
    io.to(room).emit('receiveMessage', [socket.username, msg, getParsedTime()]);
  });

  // socket.on('createMessage', (message, callback) => {
  //   let user = users.getUser(socket.id);

  //   if(user && isRealString(message.text)){
  //       io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
  //   }
  //   callback('This is the server:');
  // })


  socket.on('disconnect', function () {
    io.to(room).emit('clientCon', { msg: `${socket.username} has left`});
    // io.emit('updateNumUsersOnline', --num_users_online);
    clients[room]--;
  });
});


//start our server:
http.listen(port, function () {
  console.log('listening on localhost:' + port);
});

// -------------------------------------------------
function getParsedTime() {
  const date = new Date();

  let hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + hour;

  let min = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;

  return (hour + ":" + min);
}


function totalClients() {
  var cl = 0;
  for(cli of clients)
    cl += cli;
  return cl;
}