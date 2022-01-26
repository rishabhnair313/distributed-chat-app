const amqplib = require('amqplib');

var rabbitMQServer = '34.228.17.124:5672'

const broadcast = async (exchangeName, msg) => {
  const connection = await amqplib.connect('amqp://'+rabbitMQServer);
  const channel = await connection.createChannel();
  await channel.assertExchange(exchangeName, 'fanout', {durable: false});
  channel.publish(exchangeName, '', Buffer.from(JSON.stringify(msg)));
  console.log(`BroadCast on ${exchangeName}: `,msg);
  return;
}


module.exports = broadcast