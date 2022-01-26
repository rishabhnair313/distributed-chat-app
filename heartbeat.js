const WebSocket = require('ws');
const broadcast = require('./broadcast.js');
class heartbeats {
  constructor(client, managerId, oldClients) {
    this.myClients = new Set();
    this.clientMap = new Map();
    this.client = client;
    this.managerId = managerId;
    this.serverList = new Set();
    
    // this.pingClients(this.serverList)
  }

//   createWebSocketConnection('ws://localhost:3001/myName');

 setupWsHeartbeat(wss, obj) {
    function noop() {}
    function heartbeat() {
      this.isAlive = true;
    }
    
    wss.on('connection', function connection(ws) {
      ws.isAlive = true;
      ws.on('pong', heartbeat);
      let myClients = obj.getClient();
      obj.addClient(ws)
      const interval = setInterval(function ping() {
        //   console.log(myClients)
          // for(w in wss.clients[0])
          //     console.log(w)
          myClients.forEach(function each(ws) {
            console.log("HeartBeat Received from "+ws['upgradeReq']['url']);
              if(ws.readyState === 1) {
                  if (ws.isAlive === false) {
                      console.log('Failre detetcted at '+ws['upgradeReq']['url'])
                      ws.terminate();
                      obj.deleteClient(ws);
                      return;
                  }
                  ws.isAlive = false;
                  ws.ping(noop);

              } else {
                  console.log("Failure detected")
                  console.log(ws['upgradeReq']['url'])
                  obj.failureDetected(ws);
                  obj.deleteClient(ws);
              }
          // client did not respond the ping (pong)
        });
      }, 5000);
    });

    wss.on('disconnect', function close() {
        console.log('disconnected');
      });
        
  }
  getClient() {
    return this.myClients;
  }
  async addClient(ws) {
    console.log(ws['upgradeReq']['url'])
    let name = (ws['upgradeReq']['url'].split('/'))[1];
    let serverDetails = await getRed(this.client,`${name}:details`).catch(e => {
      console.log("heartbeat error")
      ws.terminate();
      return;
    });
    serverDetails = JSON.parse(serverDetails);
    this.myClients.add(ws);
    // if(!this.serverList.has(name)) {
    //   let pongws = pong(`ws://localhost:${serverDetails.heartbeatSocket}/${this.managerId}`);
    //   serverDetails['ws']= ws;
    //   serverDetails['pongws']= pongws;
    //   this.clientMap.set(name, serverDetails);
    // }
  }

   deleteClient(ws) {
    let name = (ws['upgradeReq']['url'].split('/'))[1];
    this.myClients.delete(ws);
    this.serverList.delete(name);
  }
  async failureDetected(ws) {
    let name = (ws['upgradeReq']['url'].split('/'))[1];
    let msg = {
      managerId : name,
      isLeader : false
    }
    let lead = await getRed(this.client, 'leader');
    if(name == lead) {
      await del(this.client, 'leader');
      msg.isLeader = true;
    }
    lead = await remSet(this.client,'Servers',name)
    console.log(name,lead)
    broadcast('failureDetected', msg);
  }
  // async pingClients(serv) {

  //     if(serv != this.managerId) {
  //       let serverDetails = await getRed(this.client,`${serv}:details`);
  //       serverDetails = JSON.parse(serverDetails);
  //       console.log({serverDetails})
  //       this.serverList.add(serv)
  //       pong(`ws://localhost:${serverDetails.heartbeatSocket}/${this.managerId}`)
  //     }
  // }


}

var del = (cl,key)=>{
  return new Promise(function(resolve,reject){
    cl.del(key,function(err,reply){
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
  // const wsInstance = WebSocket.Server({port: 3001});
  // setupWsHeartbeat(wsInstance);

  module.exports = heartbeats;