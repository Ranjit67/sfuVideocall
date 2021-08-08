const express = require("express");
const router = express.Router();
const createError = require("http-errors");
const webrtc = require("wrtc");
//stream vrb
router.get("/", (req, res, next) => {
  try {
    res.json({ data: "success" });
  } catch (error) {
    next(error);
  }
});
let senderStream;
let externalPeer;
let senderSidePeer;
let streamSideIce = [];
let StreamDisplay;
let streamDisplayIce = [];
router.post("/broadcast", async (req, res, next) => {
  try {
    const { sdp } = req.body;
    senderStream = null;
    senderSidePeer = null;
    senderSidePeer = await new webrtc.RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.stunprotocol.org",
        },
        // ,
        // {
        //   urls: "turn:numb.viagenie.ca",
        //   credential: "muazkh",
        //   username: "webrtc@live.com",
        // },
      ],
    });
    senderSidePeer.ontrack = (e) => handleTrackEvent(e, senderSidePeer);
    const desc = new webrtc.RTCSessionDescription(sdp);
    await senderSidePeer.setRemoteDescription(desc);
    const answer = await senderSidePeer.createAnswer();
    await senderSidePeer.setLocalDescription(answer);
    
    senderSidePeer.onicecandidate = (event) => {
      if (event.candidate) {
        // console.log(event.candidate);
        streamSideIce.push(event.candidate);
      } else {
        console.log("end");
      }
    };
    res.json({ sdp: senderSidePeer.localDescription });
  } catch (error) {
    next(error);
  }
});
router.post("/addIce", async (req, res, next) => {
  try {
    const { ice } = req.body;
    await senderSidePeer.addIceCandidate(ice);
    res.json({ ice: streamSideIce });
  } catch (error) {
    next(error);
  }
});

function handleTrackEvent(e, peer) {
  senderStream = e.streams[0];
}
router.post("/consumer", async (req, res, next) => {
  try {
    const { sdp } = req.body;
    // console.log(ice);
    StreamDisplay = null;
    StreamDisplay = await new webrtc.RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.stunprotocol.org",
        },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
      ],
    });
    const desc = new webrtc.RTCSessionDescription(sdp);
    await StreamDisplay.setRemoteDescription(desc);
    if (!senderStream) throw createError.NotFound("stream is not found...");
    senderStream
      .getTracks()
      .forEach((track) => StreamDisplay.addTrack(track, senderStream));
    const answer = await StreamDisplay.createAnswer();
    await StreamDisplay.setLocalDescription(answer);
    streamDisplayIce = [];
    StreamDisplay.onicecandidate = (event) => {
      if (event.candidate) {
        // console.log(event.candidate);
        streamDisplayIce.push(event.candidate);
        // sendCandidateToRemotePeer(event.candidate);
      } else {
        /* there are no more candidates coming during this negotiation */
      }
    };
    // console.log("hit");
    res.json({ answer: StreamDisplay.localDescription });
  } catch (error) {
    console.log(error);
    next(error);
  }
});
router.post("/streamDisplayIce", async (req, res, next) => {
  try {
    const { ice } = req.body;
    console.log(ice);
    await StreamDisplay.addIceCandidate(ice);
    res.json({ ice: streamDisplayIce });
  } catch (error) {
    next(error);
  }
});
module.exports = router;
