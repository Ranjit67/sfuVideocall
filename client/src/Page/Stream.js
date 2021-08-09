import {
  // useEffect,
  // useState,
  useRef,
} from "react";
import { io } from "socket.io-client";

export default function Stream() {
  const myVideo = useRef();
  const socketRef = useRef();
  const pc = useRef();
  const socketFn = () => {
    // socketRef.current = io.connect("http://localhost:9000/stream");
    socketRef.current = io.connect("/stream");
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then(async (stream) => {
        myVideo.current.srcObject = stream;
        pc.current = await createPeer();
        stream
          .getTracks()
          .forEach((track) => pc.current.addTrack(track, stream));
        const offer = await pc.current.createOffer();
        pc.current.setLocalDescription(offer).then((stag) => {
          sendMessage("offer", { offer: pc.current.localDescription });
        });
        socketRef.current.on("answer", async (payload) => {
          const { answer } = payload;
          const desc = new RTCSessionDescription(answer);
          pc.current
            .setRemoteDescription(desc)
            .catch((error) => console.log(error));
        });

        if (pc.current) {
          console.log(pc.current);

          pc.current.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit("ice_stream", { ice: event.candidate });
            }
          };
          // events
          pc.current.onconnectionstatechange = (event) => {
            console.log("===0***===");
            console.log("onconnectionstatechange", event);
            console.log(
              "pc.current.connectionState",
              pc.current?.connectionState
            );
            console.log("===0***===");
          };
          pc.current.oniceconnectionstatechange = async (event) => {
            if (pc.current?.iceConnectionState === "failed") {
              await pc.current.restartIce();
              console.log("hit restart");
            }

            console.log("===1***===");
            console.log("oniceconnectionstatechange ", event);
            console.log(
              "pc.current.iceConnectionState ",
              pc.current?.iceConnectionState
            );
            console.log("===1***===");
          };
          pc.current.onicegatheringstatechange = (event) => {
            console.log("===2***===");
            console.log("onicegatheringstatechange ", event);
            console.log(
              "pc.current.iceGatheringState",
              pc.current?.iceGatheringState
            );
            console.log("===2***===");
          };
          // events end
        }
        // backend event
        socketRef.current.on("event", (payload) => {
          console.log(payload);
        });

        // backend event end
        socketRef.current.on("ice", async (payload) => {
          const { ice } = payload;
          // console.log("other", payload);
          if (ice) {
            await pc.current.addIceCandidate(ice);
          }
        });

        //then end
      });

    //function end
  };

  const sendMessage = (message, value) => {
    socketRef.current.emit(message, value);
  };

  const createPeer = async () => {
    const peer = new RTCPeerConnection({
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
        // {
        //   urls: "turn:numb.viagenie.ca",
        //   credential: "muazkh",
        //   username: "webrtc@live.com",
        // },
      ],
    });
    // peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);
    return peer;
  };

  return (
    <div>
      {/* <p>Stream</p> */}
      <button onClick={socketFn}>Stream</button>
      <video ref={myVideo} muted autoPlay />
    </div>
  );
}
