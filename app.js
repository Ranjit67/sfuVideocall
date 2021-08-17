//
const express = require("express");
const socket = require("socket.io");
const createError = require("http-errors");
const webrtc = require("wrtc");
const app = express();
app.use(express.json());
const http = require("http");
const server = http.createServer(app);
const path = require("path");

const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");

  res.header(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers,X-Access-Token,XKey,Authorization"
  );

  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    return res.status(200).json({});
  }
  next();
});
//cors end
app.use(express.static(`./client/build`));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
});

//update one stream var
let peerStage={}
let room={}
let streamer = {};
let viewStreamSide = {};
io.of("/stream").on("connection", (socket) => {
  socket.on("offer", async (payload) => {
    const { offer,roomId } = payload;
    if(room[room]){
      delete room[roomId]
    }else{
      room[roomId]=[{
        soId:socket.id
      }];
    }
    peerStage[socket.id] = createPeer(socket, socket.id);
    const desc = new webrtc.RTCSessionDescription(offer);
    peerStage[socket.id]
      .setRemoteDescription(desc)

      .then((sd) => {
        peerStage[socket.id].createAnswer().then((answer) => {
          peerStage[socket.id].setLocalDescription(answer).then((stl) => {
            socket.emit("answer", { answer: peerStage[socket.id].localDescription });
          });
        });
      });
  });

  // user
  socket.on("offer_user", (payload) => {
    const { offer,roomId } = payload;
    room[roomId].push({
      soId:socket.id
    })
    viewStreamSide[socket.id] = userCreatePeer(socket, roomId);
    const desc = new webrtc.RTCSessionDescription(offer);
    viewStreamSide[socket.id].setRemoteDescription(desc).then((remo) => {
      const findData = room?.[roomId]?.find(id=>id.soId !==socket.id)
   
      if (streamer?.[findData?.soId]) {
        streamer?.[findData?.soId]
          .getTracks()
          .forEach((track) =>
            viewStreamSide[socket.id].addTrack(track, streamer[findData?.soId])
          );
      }

      viewStreamSide[socket.id].createAnswer().then((answer) => {
        viewStreamSide[socket.id].setLocalDescription(answer).then((stl) => {
          socket.emit("answer_to_user", {
            answer: viewStreamSide[socket.id].localDescription,
          });
        });
      });
    });
  });
  // user end
});

const userCreatePeer = (socket, roomId) => {
  const userPeer = new webrtc.RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org",
      },
      { urls: "stun:stun.ekiga.net" },
      { urls: "stun:stun.schlund.de" },
      { urls: "stun:stun.l.google.com:19302" },

      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun.softjoys.com" },
      { urls: "stun:stun.voipbuster.com" },
      { urls: "stun:stun.voipstunt.com" },
      { urls: "stun:stun.xten.com" },
      {
        urls: "turn:numb.viagenie.ca",
        credential: "muazkh",
        username: "webrtc@live.com",
      },
      {
        urls: "turn:192.158.29.39:3478?transport=udp",
        credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        username: "28224511:1379330808",
      },
      {
        urls: "turn:192.158.29.39:3478?transport=tcp",
        credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        username: "28224511:1379330808",
      },
    ],
  });
  userPeer.ontrack = (e) => {
    
    handleTrackEvent(e, userPeer, socket.id)
  }
  userPeer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice_user", { ice: event.candidate });
    }
  };
  socket.on("ice_commes_from_user", async (payload) => {
    const { ice } = payload;

    if (ice) {
      userPeer.addIceCandidate(ice).catch((error) => console.log(error));
    }
  });
  // events
  userPeer.onconnectionstatechange = (event) => {
    if (userPeer?.connectionState === "connected") {
      const findOtherUser = room[roomId].find(id=>id.soId !== socket.id)
  
      streamer[socket.id].getTracks().forEach((track) => {
        peerStage[findOtherUser.soId].addTrack(track, streamer[socket.id]);
      });
      // socket.emit("event", {
      //   peerStag: peerStage,
      //   userPeer,
      // });
    } else {
      socket.emit("event", {
        "pc.current.connectionState": userPeer?.connectionState,
        onconnectionstatechange: event,
      });
    }
  };
  userPeer.oniceconnectionstatechange = async (event) => {
    if (userPeer?.iceConnectionState === "failed") {
      await userPeer.restartIce();
    }

    socket.emit("event", {
      "pc.current.iceConnectionState": userPeer?.iceConnectionState,
      oniceconnectionstatechange: event,
    });
  };
  userPeer.onicegatheringstatechange = (event) => {
    socket.emit("event", {
      "pc.current.iceGatheringState": userPeer?.iceGatheringState,
      onicegatheringstatechange: event,
    });
  };
  // event end
  return userPeer;
};
// socket function
const createPeer = (socket, sendBy) => {
  const peer = new webrtc.RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org",
      },
      { urls: "stun:stun.ekiga.net" },
      { urls: "stun:stun.schlund.de" },
      { urls: "stun:stun.l.google.com:19302" },

      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun.softjoys.com" },
      { urls: "stun:stun.voipbuster.com" },
      { urls: "stun:stun.voipstunt.com" },
      { urls: "stun:stun.xten.com" },
      {
        urls: "turn:numb.viagenie.ca",
        credential: "muazkh",
        username: "webrtc@live.com",
      },
      {
        urls: "turn:192.158.29.39:3478?transport=udp",
        credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        username: "28224511:1379330808",
      },
      {
        urls: "turn:192.158.29.39:3478?transport=tcp",
        credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        username: "28224511:1379330808",
      },
    ],
  });
  peer.ontrack = (e) => handleTrackEvent(e, peer, sendBy);
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice", { ice: event.candidate });
    }
  };
  socket.on("ice_stream", async (payload) => {
    const { ice } = payload;

    if (ice) {
      await peer.addIceCandidate(ice);
    }
  });
  // events
  peer.onconnectionstatechange = (event) => {
    socket.emit("event", {
      "pc.current.connectionState": peer?.connectionState,
      onconnectionstatechange: event,
    });
  };
  peer.oniceconnectionstatechange = async (event) => {
    if (peer?.iceConnectionState === "failed") {
      await peer.restartIce();
    }

    socket.emit("event", {
      "pc.current.iceConnectionState": peer?.iceConnectionState,
      oniceconnectionstatechange: event,
    });
  };
  peer.onicegatheringstatechange = (event) => {
    socket.emit("event", {
      "pc.current.iceGatheringState": peer?.iceGatheringState,
      onicegatheringstatechange: event,
    });
  };
  // event end
  return peer;
};
const handleTrackEvent = (event, peer, sendBy) => {
  streamer[sendBy] = event.streams[0];
};

//for mail route
app.get("/data", async (req, res, next) => {
  try {
    res.json({ data: "data save suc" });
  } catch (error) {
    next(error);
  }
});

//mail route

//register route
// app.post("/register");

//register rote end
//error handel
// if (process.env.NODE_ENV === "production") {

// }
app.use(async (req, res, next) => {
  next(createError.NotFound());
});

app.use((err, req, res, next) => {
  res.status(err.status || 400);
  res.send({
    error: {
      status: err.status || 400,
      message: err.message,
    },
  });
});

server.listen(process.env.PORT || 9000, () => {
  console.log("The port 9000 is ready to start....");
});
