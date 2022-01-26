var io = require('socket.io-client');
var socket;
const myUsername = "Rishabh";
const readline = require("readline");

const amqplib = require('amqplib');

var rabbitMQServer = '34.228.17.124:5672'

const exchangeName = "joinRoom";
var msg = {
  username: "Rishabh",
  createRoom: "Group1"
}


const join = async () => {
    const connection = await amqplib.connect('amqp://'+rabbitMQServer);
    const channel = await connection.createChannel();
    //   await channel.assertExchange(exchangeName, 'fanout', {durable: false});
    const q = await channel.assertQueue('', {exclusive: true});
  msg['queue'] = q.queue;
  channel.publish(exchangeName, '', Buffer.from(JSON.stringify(msg)));
  console.log('Sent: ', msg);
  channel.consume(q.queue, msg => {
    if(msg.content) {

        let conDets = JSON.parse(msg.content.toString());
        // console.log({conDets})
        if(conDets.url)
            chatLive(conDets.url)
        else
            mainF();
    }
  }, {noAck: true})
//   setTimeout(() => {
//     connection.close();
//     process.exit(0);
//   }, 2000)
}

// sendMsg();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
var chat = true;

function chatLive(url) {
    console.log(url)
let fakeURL = 'http://localhost:'+(url.split(':'))[2]
// console.log(fakeURL)
socket = io(fakeURL);
socket.connect();
socket.on('clientCon', function(msg) {
    console.log(msg);
});
socket.on('receiveMessage', function(smsg) {
    // console.log({msg})
    if(smsg[0] != msg.username)
        console.log(`--> ${smsg[0]}:  ${smsg[1]}     T:${smsg[2]}`);
});
socket.on('disconnect', function() {
    console.log('disconnected from server.');
});
// socket.emit('username',myUsername);
// sendMessage();
socket.emit('clientCon',"its me friendfs")
sendMessage();
// setInterval(function(){
//     console.log('Sending heartbeat');
//     socket.emit('Heartbeat', myUsername);
// })
}

rl.on("close", function() {
    console.log("\nBYE BYE !!!");
    process.exit(0);
});


function sendMessage() {
    rl.question("", function(msg) {
        // console.log(msg);
        if(msg == "/exit") {
            console.log("leaving chat");
            socket.disconnect();
            mainF();
            return;
        }
        socket.emit('sendMessage',msg)
        sendMessage();
    });
}

function mainF() {
    rl.question("Enter Username: ", function(name) {
        rl.question("Enter Room Name: ", function(roomName) {
            msg.username = name;
            msg.createRoom = roomName
            join();
        })
    })
}
// sendMsg();
mainF();