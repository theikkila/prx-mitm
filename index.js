const WebSocketServer = require('websocket').server;
const http = require('http');
const request = require('request');
const WebSocketClient = require('websocket').client;
const hat = require('hat')


const HTTP_PROXY_URL = 'https://chatend.cluster-edge.eapp.fi'
const WS_PROXY_URL = 'wss://chatend.cluster-edge.eapp.fi/graphql-ws'

const server = http.createServer(function(req, resp) {
    console.log((new Date()) + ' Received request for ' + req.url);
    const l = request(HTTP_PROXY_URL+req.url)
    req.pipe(l)
    l.pipe(resp)
});
server.listen(8014, function() {
    console.log((new Date()) + ' Server is listening on port 8014');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});



function createWSConnection(cid, received) {
  const client = new WebSocketClient();
  let connqueue = []
  client.on('connectFailed', function(error) {
      console.log(cid, ' - Connect Error: ' + error.toString());
  });

  client.on('connect', function(connection) {
      console.log(cid, ' - WebSocket Client Connected');
      setInterval(() => {
        while(connqueue.length > 0) {
          const msg = connqueue.pop()
          connection.sendUTF(msg)
        }
      }, 10)
      connection.on('error', function(error) {
          console.log(cid, " - Connection Error: " + error.toString());
      });
      connection.on('close', function() {
          console.log(cid, ' - Connection Closed');
      });
      connection.on('message', function(message) {
          if (message.type === 'utf8') {
              console.log(cid, " - Received: '" + message.utf8Data + "'");
              received(message.utf8Data)
          }
      });
  });
  this.send = (msg) => {
    connqueue.push(msg)
  }

  client.connect(WS_PROXY_URL, 'graphql-ws');
  return this
}



wsServer.on('request', function(request) {
    const connection = request.accept('graphql-ws', request.origin);
    const cid = hat();
    const client = createWSConnection(cid, (message) => {
      connection.sendUTF(message)
    })
    console.log(cid, ' - ' + (new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
      console.log(cid, ' - Received Message: ' + message.utf8Data);
      client.send(message.utf8Data)
    });
    connection.on('close', function(reasonCode, description) {
        console.log(cid, ' - '+(new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});
