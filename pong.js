const WebSocket = require('ws');
function setupWsHeartbeat(ws) {
    // will close the connection if there's no ping from the server
     function heartbeat() {
      clearTimeout(this.pingTimeout);
  
      // Use `WebSocket#terminate()` and not `WebSocket#close()`. Delay should be
      // equal to the interval at which server sends out pings plus an assumption of the latency.
      this.pingTimeout = setTimeout(() => {
        this.terminate();
      }, 3000 + 1000);
    }
  
    ws.on('open', heartbeat);
    ws.on('ping', heartbeat);
    ws.on('close', function clear() {
      clearTimeout(this.pingTimeout);
    });
    ws.fail(function(err) {
        console.log("An error occurred." + util.inspect(err))
    });
    ws.on('error', function(err) {
        console.log(err)
    })
  }
  
  function createWebSocketConnection(endpoint) {
      try {
          const ws = new WebSocket(endpoint);
          ws.onopen = (ev) => console.log('Websocket open');
          ws.onmessage = (ev) => console.log('Websocket message');
        ws.fail(function(err) {
        console.log("An error occurred." + util.inspect(err))
    });
    ws.on('error', function(err) {
        console.log(err)
    })
          // heartbeat will check connection is alive
          setupWsHeartbeat(ws);
        
          return ws;

      } catch (e) {
          console.log("Websocket failed")
      }
  }
  module.exports = createWebSocketConnection;