
var socket = io();
let username;
let busy = false;
var incallwith = "";
const localVideoEl = $('#localVideo');
const remoteVideosEl = $('#remoteVideos');
const chatlist = $('.chatlist');
let remoteVideosCount = 0;
let webrtc;
const chatTemplate = Handlebars.compile($('#chat-template').html());
const chatContentTemplate = Handlebars.compile($('#chat-content-template').html());
const chatEl = $('#chat');
const messages = [];
let user_list = [];
let user_count = 0;
let join = false;
let openchat;

// Hide cameras until they are initialized
localVideoEl.hide();

const swrtc = () => {

  webrtc = new SimpleWebRTC({
    // the id/element dom element that will hold "our" video
    localVideoEl: 'localVideo',
    // the id/element dom element that will hold remote videos
    remoteVideosEl: 'remoteVideos',
    // immediately ask for camera access
    autoRequestMedia: true,
    debug: false,
    detectSpeakingEvents: true,
    autoAdjustMic: false,
  });
  // We got access to local camera
  webrtc.on('localStream', () => {
    localVideoEl.show();
  });

}


function user_login() {
  var login = document.getElementById('login').value;
  username = login;


  socket.send({
    type: "login",
    name: username
  })
}
function call_user() {
  var callerID = document.getElementById('callerID').value;
  if (callerID == "") {
    alert('Please enter caller ID');
  } else {
    //const roomid = username+"-"+callerID;
    //join(roomid);

    swrtc();

    createCall(username);

    var callerIDContainer = document.getElementById('callerIDContainer');
    callerIDContainer.parentElement.removeChild(callerIDContainer);
    busy = true;
    incallwith = callerID;

    socket.send({
      type: "call_user",
      name: callerID,
      callername: username
    })
  }
}
function onAnswer(data) {
  if (busy == false) {
    busy = true
    incallwith = data.callername
    var res = confirm(data.callername + " is calling you");
    if (res == true) {
      console.log("call accepted");

      swrtc();

      joinCall(data.callername);
      
      
      // code
      socket.send({
        type: "call_accepted",
        callername: data.callername,
        from: username
      })

    } else {
      console.log("call rejected");
      socket.send({
        type: "call_rejected",
        callername: data.callername,
        from: username
      })
      busy = false
      incallwith = ""
    }
  } else {
    console.log("call busy");
    socket.send({
      type: "call_busy",
      callername: data.callername,
      from: username
    })

  }
}

const chatlistcomponent = (object) => {
  let d = document.createElement('ul');
  d.className = 'cl';

  for(var i in object){
    d.innerHTML += '<li><a class="openchat notclickyet" href="#">' + i + '</a></li>';
    user_count++;
  }

  chatlist.html(d);
  openchat = $('.openchat');
  openchat.click((e)=>{
    if ($(e.target).hasClass("notclickyet")) {
      $(e.target).removeClass( 'notclickyet' );
      createRoom($(e.target).text());
    }else{
      joinRoom($(e.target).text());
    }
  }
  );
}

// Update Chat Messages
const updateChatMessages = (chatMessage,room) => {
  console.log(chatMessage);
      const html = chatContentTemplate({ chatMessage });
      const chatContentEl = $('#chat-content-'+room);
      chatContentEl.append(html);
      // automatically scroll downwards
      const scrollHeight = chatContentEl.prop('scrollHeight');
      chatContentEl.animate({ scrollTop: scrollHeight }, 'slow');

};

// Post Local Message
const postMessage = (message,room,join) => {
  const chatMessage = {
    type: "chat_message",
    from: username,
    to: room,
    message: message,
    join:join,
    postedOn: new Date().toLocaleString('id-ID'),
  };
  // Send to all peer messages
  socket.send(chatMessage)
  // Update messages locally
  updateChatMessages(chatMessage,room);
};

// Display Chat Interface
const showChatRoom = (room) => {
  const html = chatTemplate({ room });
  chatEl.append(html);
  $('.'+room+' #post-btn').on('click', () => {
    const message = $('.'+room+' #post-message').val();
    postMessage(message,room,join=false);
    $('.'+room+' #post-message').val('');
  });
  $('.'+room+' #post-message').on('keyup', (event) => {
    if (event.keyCode === 13) {
      console.log(room);
      const message = $('.'+room+' #post-message').val();
      postMessage(message,room,join=false);
      $('.'+room+' #post-message').val('');
    }
  });
};

// Register new Chat Room
const createRoom = (roomName) => {
  console.log(`Creating new room: ${roomName}`);

  showChatRoom(roomName);
  postMessage(`${username} created chatroom`,roomName,join=true);

};

//Call user
const createCall = (roomName) => {

    // Remote video was added
    webrtc.on('videoAdded', (video, peer) => {
      console.log("ini videoadded");
      // eslint-disable-next-line no-console
      let d = document.createElement('div');
      d.className = 'videoContainer';
      d.id = 'container_' + webrtc.getDomId(peer);
      d.appendChild(video);
      if (remoteVideosCount === 0) {
        remoteVideosEl.html(d);
      } else {
        remoteVideosEl.append(d);
      }
      remoteVideosCount += 1;
    });
    webrtc.createRoom(roomName, null);
  // webrtc.createRoom(roomName, (err, name) => {
  //   showChatRoom(name);
  //   postMessage(`${username} created chatroom`);
  // });
};

// Join call
const joinCall = (roomName) => {

    // Remote video was added
    webrtc.on('videoAdded', (video, peer) => {
      console.log("ini videoadded");
      // eslint-disable-next-line no-console
      let d = document.createElement('div');
      d.className = 'videoContainer';
      d.id = 'container_' + webrtc.getDomId(peer);
      d.appendChild(video);
      if (remoteVideosCount === 0) {
        remoteVideosEl.html(d);
      } else {
        remoteVideosEl.append(d);
      }
      remoteVideosCount += 1;
    });
  webrtc.joinRoom(roomName);

}

// Join existing Chat Room
const joinRoom = (data) => {
  console.log(`Joining Room: ${data.from}`);

  showChatRoom(data.from);
  
  postMessage(`${username} joined chatroom`,data.from,join=false);
};
function onResponse(data) {
  switch (data.response) {
    case "accepted":
      incallwith = data.responsefrom;
      console.log('pembuat room', data.callername);
      console.log("Call accepted by :" + data.responsefrom);
      break;
    case "rejected":
      console.log("Call rejected by :" + data.responsefrom);
      busy = false;
      incallwith = ""
      break;
    case "busy":
      console.log(data.responsefrom + " call busy");
      busy = false;
      incallwith = ""
      break;
    default:
      console.log(data.responsefrom + " is offline");
      busy = false;
      incallwith = ""
  }

}

const chat = (data) => {
  if(data.type == 'chat_message'){
  
  updateChatMessages(data,data.from);
  }
}

socket.on('connect', function (data) {
  console.log('connect');
});

//when a user logs in
function onLogin(data) {

  if (data.success === false) {
    alert("oops...try a different username");
  } else {
    var loginContainer = document.getElementById('loginContainer');
    loginContainer.parentElement.removeChild(loginContainer);
    username = data.username;
    console.log("Login Successfull");
    console.log("logged in as :" + username);
    console.log(data.userlist);

    chatlistcomponent(data.userlist);

    console.log('total user :',user_count);

    user_count = 0;
    
  }
}

socket.on('roommessage', function (message) {
  var data = message;

  switch (data.type) {
    case "login":
      console.log("New user : " + data.username);
      console.log(data.userlist);

      chatlistcomponent(data.userlist);

      console.log('total user :',user_count);

      user_count = 0;
      break;
    case "disconnect":
      console.log("User disconnected : " + data.username);
      chatlistcomponent(data.userlist);
      console.log('total user :',user_count);
      user_count = 0;
      break;
      // case "chat_message":
      //   console.log(data.message)
      //   chat(data);
      // break;
    default:
      break;
  }
});

socket.on('privatechat', function(message) {
  var data = message;
  console.log(data);
  switch (data.type) {
    case "chat_message":
      console.log(data.message);
      join = true;
      chat(data);
      break;
  
    default:
      break;
  }
});

socket.on('message', function (message) {
  var data = message;

  switch (data.type) {
    case "login":
      onLogin(data);
      break;
    case "answer":
      console.log("getting called");
      onAnswer(data);
      break;
    case "call_response":
      onResponse(data);
      break;
    case "chat_message":
        console.log(data.message);
        if (data.join) {
          openchat.each(function()
          {
            if ($(this).text() == data.from) {
              $(this).removeClass('notclickyet');
            }
          });
          joinRoom(data);
        }else{
          updateChatMessages(data,data.from);
        }
        break;
    default:
      break;
  }
});

