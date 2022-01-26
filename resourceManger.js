var isLeader = false;
var myPort = Number(process.argv[2]) 
console.log("Start Port---> ", myPort);
const uuidv4 = require('uuid');
var managerId = uuidv4.v1()
var redisCon;
var os = require('os');
var ifaces = os.networkInterfaces();
const http = require('http');
var createTopicSubscriber = require('./sub.js');

const fork = require('child_process').fork;
const broadcast = require('./broadcast.js')
const redis = require("redis");
const client = redis.createClient();

client.on("error", function(error) {
    console.error(error);
});

// console.log(cluster.add('123.123.123'));
;
var myserverDetails = {
    capacity: 20,
    chatPort: myPort+2,
    managerId: managerId,
    leader: false,
    runningPort: myPort,
    heartbeatSocket: myPort+1
};

var cluster = new Set();
var clusterMap = new Map();
var groups = new Map();
var rr = new Array();

var clusterLeader;

 async function allocate(groupName) {
   if(groups.has(groupName)) {
     return clusterMap.get(groups.get(groupName))
   }

     var allocServer = rr.shift();
     rr.push(allocServer);
     console.log({allocServer})
     var allocDetails = await getRed(client,`${allocServer}:details`);
     allocDetails = JSON.parse(allocDetails);
     groups.set(allocServer, allocDetails);
     return allocDetails;

 }

 function introduce() {
     cluster = getCluster();
 }

 async function firstTImeSetup() {
     var doRegister = await register();
     clusterLeader = await getRed(client,'leader')
     cluster = await getCluster();
     startClusterComm();
 }

 async function register() {

 }

 var getRed = (cl,key)=>{
    return new Promise(function(resolve,reject){
      cl.get(key,function(err,reply){
        if(err){
          reject(err)
        }
        else if(reply==null){
          reject('Invalid or Expired Key ',key)
        }
        else {
          resolve(reply)
        }
      })
    })
}

var setRed = (cl,key,value)=>{
    return new Promise(function(resolve,reject){
      cl.set(key,value,function(err,reply){
        if(err){
          reject(err)
        }
        else if(reply){
          resolve(reply)
        }
        else {
          reject('Invalid or Expired Key ',key)
        }
      })
    })
}

var addSet = (cl,key,value)=>{
    return new Promise(function(resolve,reject){
      cl.sadd(key,value,function(err,reply){
        if(err){
          reject(err)
        }
        else if(reply){
          resolve(reply)
        }
        else {
          reject('Already Exists or Invalid input',key)
        }
      })
    })
}
var getSet = (cl,key)=>{
    return new Promise(function(resolve,reject){
      cl.smembers(key,function(err,reply){
        if(err){
          reject(err)
        }
        else if(reply){
          resolve(reply)
        }
        else {
          reject('Invalid or Expired Key ',key)
        }
      })
    })
}
var remSet = (cl,key,value)=>{
  return new Promise(function(resolve,reject){
    cl.srem(key,value,function(err,reply){
      if(err){
        reject(err)
      }
      else if(reply){
        resolve(reply)
      }
      else {
        reject('Already Exists or Invalid input',key)
      }
    })
  })
}

var getIP = async ()=>{
    return new Promise(function(resolve,reject){
      Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;

        ifaces[ifname].forEach(function (iface) {
          if ('IPv4' !== iface.family || iface.internal !== false) {
            return;
          }

          if (alias >= 1) {
            console.log(ifname + ':' + alias, iface.address);
          } else {
            var options = {
                host: 'ipv4bot.whatismyipaddress.com',
                port: 80,
                path: '/'
              };
              
              http.get(options, function(res) {
                console.log("status: " + res.statusCode);
              
                res.on("data", function(chunk) {
                    resolve({localIp: iface.address, pubIp : chunk.toString()});
                });
              }).on('error', function(e) {
                resolve({localIp: iface.address, pubIp : null});
              });
          }
          ++alias;
        });
      });
    })
}

var register = async() => {
    var ip = await getIP();
    console.log(ip);
    myserverDetails['publicIp'] = ip.pubIp;
    myserverDetails['localIp'] = ip.localIp;
    var storeServer = await addSet(client,'Servers',myserverDetails.managerId).catch(e => console.log(e));
    var storeServerDetails = await setRed(client, `${myserverDetails.managerId}:details`, JSON.stringify(myserverDetails)).catch(e => console.log("e error"));
    var msg = {
      managerId: managerId,
      serverDetails: myserverDetails
    }
    broadcast('newNode',msg)
}

async function getCluster() {
    rr = (await getSet(client, 'Servers')).sort();
    cluster = new Set(rr);
    for(serv of cluster) {
        console.log(serv);
        var serverDetails = await getRed(client,`${serv}:details`);
        serverDetails = JSON.parse(serverDetails);
        clusterMap.set(serv,serverDetails);
        console.log(clusterMap.get(serv));
    }
    return cluster;
}

async function leaderFunctions() {
    var curLeader = await getRed(client, 'leader').catch(e => {
      console.log('No leader available');
      startElection().then;
    });
    if(curLeader != managerId)
        return;
    var chatRoom = await createTopicSubscriber('createRoom');
    chatRoom.ch.consume(chatRoom.q.queue, msg => {
        if(msg.content) {
            var message = JSON.parse(msg.content.toString());
            console.log(message);
            allocate(message.createRoom).then(det => {
                chatRoom.ch.sendToQueue(message.queue,Buffer.from(`Your connection url ${det.chatPort}:${det.runningPort}`));
            })
        }
        // var groupCreate = await createRoom(message.createRoom);
    }, {noAck: true})
  var joinRoom = await createTopicSubscriber('joinRoom');
  joinRoom.ch.consume(joinRoom.q.queue, mg => {
    if(mg.content) {
        var message = JSON.parse(mg.content.toString());
        console.log(message);
        allocate(message.createRoom).then(det => {
            let conDet = {
              url : `http://${det.publicIp}:${det.chatPort}/?rname=${message.createRoom}&usr=${message.username}`,
              room : message.createRoom
            }
            console.log({conDet})
            joinRoom.ch.sendToQueue(message.queue,Buffer.from(JSON.stringify(conDet)));
        })
    }
    // var groupCreate = await createRoom(message.createRoom);
}, {noAck: true})

}

async function startElection() {
  rr = (await getSet(client, 'Servers')).sort();
  console.log(rr)
  if(rr[0] == managerId) {
    console.log('leader is '+managerId);
    var elected = await setRed(client, 'leader', managerId);
    leaderFunctions();
    return elected
  } 
}

async function failureDetection() {
  var fail = await createTopicSubscriber('failureDetected');
  fail.ch.consume(fail.q.queue, mg => {
    if(mg.content) {
        var message = JSON.parse(mg.content.toString());
        // console.log(message);
        if(message.isLeader) {
          startElection();
        }
    }
    // var groupCreate = await createRoom(message.createRoom);
}, {noAck: true})
}

async function newLeader() {}

async function start() {
  await register();
  await getCluster();
  await leaderFunctions();
  await newNodeBroadcast();
  await failureDetection();
  const WebSocket = require('ws');
  const wsInstance = WebSocket.Server({port: myserverDetails.heartbeatSocket});
    // setupWsHeartbeat(wsInstance);
  var check = require('./heartbeat.js')
  // check.createWebSocketConnection('ws://localhost:3001/w3wd33');
  let rr = (await getSet(client, 'Servers')).sort();
  var l = new check(client, managerId, rr);
  l.setupWsHeartbeat(wsInstance, l)
  for(let serv of rr) {
    if(serv != managerId) {
      let det = clusterMap.get(serv)
      try {

        pong(`ws://localhost:${det.heartbeatSocket}/${managerId}`)
      } catch(e) {
          console.log("Erorrrrrrr ",e)
      }
    }
  }
}
async function newNodeBroadcast() {
  var joinRoom = await createTopicSubscriber('newNode');
  joinRoom.ch.consume(joinRoom.q.queue, mg => {
    if(mg.content) {
        var message = JSON.parse(mg.content.toString());
        console.log(message);
        if(message.managerId != managerId) {
          // getCluster();
          pong(`ws://localhost:${message.serverDetails.heartbeatSocket}/${managerId}`)
        }
    }
    // var groupCreate = await createRoom(message.createRoom);
}, {noAck: true})
}

start();
const ls = fork('./groupChatLive.js',[myserverDetails.chatPort]);

const pong = require('./pong.js')