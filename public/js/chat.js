// const io = require('socket.io')
// let socket = io();
const amqplib = require('amqplib');

var rabbitMQServer = '54.87.8.82:5672'

const exchangeName = "joinRoom";

let searchQuery = window.location.search.substring(1);
let params = JSON.parse('{"' + decodeURI(searchQuery).replace(/&/g, '","').replace(/\+/g, ' ').replace(/=/g,'":"') + '"}');

const msg = {
  username: params.name,
  createRoom: params.room
}
const sendMsg = async () => {
  const connection = await amqplib.connect('amqp://'+rabbitMQServer);
  const channel = await connection.createChannel();
  await channel.assertExchange(exchangeName, 'fanout', {durable: false});
  const q = await channel.assertQueue('', {exclusive: true});
  msg['queue'] = q.queue;
  channel.publish(exchangeName, '', Buffer.from(JSON.stringify(msg)));
  console.log('Sent: ', msg);
  channel.consume(q.queue, msg => {
    if(msg.content) console.log("THe message is: ", msg.content.toString());
  }, {noAck: true})
}

function scrollToBottom() {
  let messages = document.querySelector('#messages').lastElementChild;
  messages.scrollIntoView();
}

function startChatting(conn) {
  socket = io(conn)
  socket.on('connect', function() {

  
    socket.emit('join', params, function(err) {
      if(err){
        alert(err);
        window.location.href = '/';
      }else {
        console.log('No Error');
      }
    })
  });
  
  socket.on('disconnect', function() {
    console.log('disconnected from server.');
  });
  
  socket.on('updateUsersList', function (users) {
    let ol = document.createElement('ol');
  
    users.forEach(function (user) {
      let li = document.createElement('li');
      li.innerHTML = user;
      ol.appendChild(li);
    });
  
    let usersList = document.querySelector('#users');
    usersList.innerHTML = "";
    usersList.appendChild(ol);
  })
  
  socket.on('newMessage', function(message) {
    const formattedTime = moment(message.createdAt).format('LT');
    const template = document.querySelector('#message-template').innerHTML;
    const html = Mustache.render(template, {
      from: message.from,
      text: message.text,
      createdAt: formattedTime
    });
  
    const div = document.createElement('div');
    div.innerHTML = html
  
    document.querySelector('#messages').appendChild(div);
    scrollToBottom();
  });
  
  socket.on('newLocationMessage', function(message) {
    const formattedTime = moment(message.createdAt).format('LT');
    console.log("newLocationMessage", message);
  
    const template = document.querySelector('#location-message-template').innerHTML;
    const html = Mustache.render(template, {
      from: message.from,
      url: message.url,
      createdAt: formattedTime
    });
  
    const div = document.createElement('div');
    div.innerHTML = html
  
    document.querySelector('#messages').appendChild(div);
    scrollToBottom();
  });
}

document.querySelector('#submit-btn').addEventListener('click', function(e) {
  e.preventDefault();

  socket.emit("createMessage", {
    text: document.querySelector('input[name="message"]').value
  }, function() {
    document.querySelector('input[name="message"]').value = '';
  })
})

document.querySelector('#send-location').addEventListener('click', function(e) {
  if (!navigator.geolocation) {
    return alert('Geolocation is not supported by your browser.')
  }

  navigator.geolocation.getCurrentPosition(function(position) {
    socket.emit('createLocationMessage', {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    })
  }, function() {
    alert('Unable to fetch location.')
  })
});

sendMsg();
