const amqplib = require('amqplib');

var rabbitMQServer = '34.228.17.124:5672'

const exchangeName = "createRoom";
const msg = {
  username: "Rishabh",
  createRoom: "Group1"
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
  setTimeout(() => {
    connection.close();
    process.exit(0);
  }, 2000)
}


sendMsg();