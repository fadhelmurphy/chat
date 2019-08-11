var express = require('express');
var app = express();
var open = require('open');
var serverPort = (4443);
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
var sockets = {};
var users = {};
function sendTo(connection, message) {
   connection.send(message);
}

// Set public folder as root
app.use(express.static('public'));

// Provide access to node_modules folder
app.use('/scripts', express.static(`${__dirname}/node_modules/`));

app.get('/', function (req, res) {
   console.log('get /');
   res.sendFile(`${__dirname}/public/index.html`);
});

io.on('connection', function (socket) {
   console.log("user connected");

   socket.on('disconnect', function () {
      console.log("user disconnected");
      if (socket.name) {
         delete users[socket.name];
         socket.broadcast.to("chatroom").emit('roommessage', { type: "disconnect", username: socket.name, userlist: users })
         delete sockets[socket.name];
      }

   });

   socket.on('subscribe', function(room) {
      console.log('joining room', room);
      socket.join(room);
  });

   socket.on('message', function (message) {

      var data = message;

      switch (data.type) {

         case "login":
            console.log("User logged", data.name);
            //if anyone is logged in with this username then refuse
            if (sockets[data.name]) {
               sendTo(socket, {
                  type: "login",
                  success: false
               });
            } else {
               //save user connection on the server
               sockets[data.name] = socket;
               socket.name = data.name;
               console.log(socket.name);
               users[data.name] = socket.id
               sendTo(socket, {
                  type: "login",
                  success: true,
                  username: data.name,
                  userlist: users
               });
               socket.broadcast.to("chatroom").emit('roommessage', { type: "login", username: data.name, userlist: users })
               socket.join("chatroom");
               //users[data.name] = socket.id
               
            }

            break;
         case "call_user":
            // chek if user exist
            if (sockets[data.name]) {
               console.log("user called");
               console.log(data.name);
               console.log(data.callername);
               sendTo(sockets[data.name], {
                  type: "answer",
                  callername: data.callername
               });
            } else {
               sendTo(socket, {
                  type: "call_response",
                  response: "offline"
               });
            }
            break;
         case "call_accepted":
            console.log('data diterima ', data.callername);
            sendTo(sockets[data.callername], {
               type: "call_response",
               response: "accepted",
               responsefrom: data.from,
               callername: data.callername

            });
            break;
         case "call_rejected":
            sendTo(sockets[data.callername], {
               type: "call_response",
               response: "rejected",
               responsefrom: data.from
            });
            break;
         case "call_busy":
            sendTo(sockets[data.callername], {
               type: "call_response",
               response: "busy",
               responsefrom: data.from
            });
         case "chat_message":
            //console.log(data)
            /*socket.broadcast.to("personal").emit('roommessage', {
               type: "chat_message",
               message: data.message,
               from: data.from,
               postedOn: data.postedOn
            });*/
            // chek if user exist
            if (sockets[data.to]) {
               //console.log('mengirim',data.room);
               // socket.broadcast.to(data.room).emit('privatechat', {
               //    type: "chat_message",
               //    message: data.message,
               //    to:data.to,
               //    from: data.from,
               //    postedOn: data.postedOn
               // });
               sendTo(sockets[data.to], {
                  type: "chat_message",
                  message: data.message,
                  to:data.to,
                  from: data.from,
                  join:data.join,
                  postedOn: data.postedOn
               });
            } else {
               sendTo(socket, {
                  type: "chat_response",
                  response: "offline"
               });
            }
            break;
         default:
            sendTo(socket, {
               type: "error",
               message: "Command not found: " + data.type
            });
            break;
      }

   })
})

server.listen(serverPort, function () {
   console.log('server up and running at %s port', serverPort);
});