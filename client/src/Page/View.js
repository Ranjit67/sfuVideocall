import {
  // useEffect,
  // useState,
  useRef,
} from "react";
import { io } from "socket.io-client";

export default function View() {
  const peerRef = useRef();
  const pc = useRef();
  const socketRef = useRef();
  const myVideoRef = useRef();
  const socketFn = () => {
    socketRef.current = io.connect("http://localhost:9000/stream");
    // socketRef.current = io.connect("/stream");
    const room = "ev";
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then(async (stream) => {
        myVideoRef.current.srcObject = stream;
        pc.current = await createPeer();
        stream
          .getTracks()
          .forEach((track) => pc.current.addTrack(track, stream));
        // console.log(pc.current);
        // pc.current.addTransceiver("video", { direction: "recvonly" });
        // pc.current.addTransceiver("audio", { direction: "recvonly" });

        pc.current.createOffer().then((offer) => {
          pc.current.setLocalDescription(offer).then((desc) => {
            socketRef.current.emit("offer_user", {
              offer: pc.current.localDescription,
              sendBy: "b",
              roomId: room,
            });
          });
        });

        socketRef.current.on("answer_to_user", (payload) => {
          const { answer } = payload;
          const desc = new RTCSessionDescription(answer);
          pc.current.setRemoteDescription(desc).catch((error) => {
            console.log(error);
          });
        });
        if (pc.current) {
          pc.current.onicecandidate = (event) => {
            if (event.candidate) {
              // console.log(event.candidate);
              socketRef.current.emit("ice_commes_from_user", {
                ice: event.candidate,
              });
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
        // come ice
        socketRef.current.on("ice_user", (payload) => {
          const { ice } = payload;
          if (ice) {
            pc.current
              .addIceCandidate(ice)
              .catch((error) => console.log(error));
          }
        });
        socketRef.current.on("event", (payload) => {
          console.log(payload);
        });
      });
  };

  const createPeer = () => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:bn-turn1.xirsys.com"] },
        {
          urls: ["turns:bn-turn1.xirsys.com:5349?transport=tcp"],
          username:
            "MMl3LEyRyvC1NM2u2nGwsSXc1SVyYkLR6vbHpAbg7PKZ0qGB3i_JUQYqoBAHeRH4AAAAAGEoxHFzYWhvb3JhbmppdDc=",
          credential: "2e165fe2-0725-11ec-b202-0242ac140004",
        },
        {
          urls: ["turn:bn-turn1.xirsys.com:3478?transport=udp"],
          username:
            "MMl3LEyRyvC1NM2u2nGwsSXc1SVyYkLR6vbHpAbg7PKZ0qGB3i_JUQYqoBAHeRH4AAAAAGEoxHFzYWhvb3JhbmppdDc=",
          credential: "2e165fe2-0725-11ec-b202-0242ac140004",
        },
      ],
    });
    peer.ontrack = handleTrackEvent;
    // peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

    return peer;
  };
  function handleTrackEvent(e) {
    peerRef.current.srcObject = e.streams[0];
    // console.log(e.streams[0]);
  }

  return (
    <div>
      <button onClick={socketFn}>view</button>
      <video playsInline autoPlay ref={peerRef} />
      <video playsInline autoPlay ref={myVideoRef} />
    </div>
  );
}
