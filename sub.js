const amqplib = require('amqplib');
var rabbitMQServer = '34.228.17.124:5672'

const receiveMsg = async (exchangeName) => {
    console.log("Starting")
  const connection = await amqplib.connect('amqp://'+rabbitMQServer);
  const channel = await connection.createChannel();
  await channel.assertExchange(exchangeName, 'fanout', {durable: false});
  const q = await channel.assertQueue('', {exclusive: true});
  console.log(`Waiting for messages in queue: ${q.queue}`);
  channel.bindQueue(q.queue, exchangeName, '');
  // channel.consume(q.queue, msg => {
  //   if(msg.content) console.log("THe message is: ", msg.content.toString());
  // }, {noAck: true})
  return {ch: channel,q: q};
}

module.exports = receiveMsg;