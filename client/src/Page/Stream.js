import {
  // useEffect,
  useRef,
} from "react";
import { io } from "socket.io-client";

export default function Stream() {
  const myVideo = useRef();
  const socketRef = useRef();
  const peerVideo = useRef();
  const pc = useRef();
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
        // console.log(stream.id);
        myVideo.current.srcObject = stream;

        pc.current = await createPeer();

        stream
          .getTracks()
          .forEach((track) => pc.current.addTrack(track, stream));
        //
        // pc.current.addTransceiver("video", { direction: "recvonly" });
        // pc.current.addTransceiver("audio", { direction: "recvonly" });
        //
        const offer = await pc.current.createOffer();
        pc.current.setLocalDescription(offer).then((stag) => {
          sendMessage("offer", {
            offer: pc.current.localDescription,
            sendBy: "a",
            roomId: room,
          });
        });
        socketRef.current.on("answer", (payload) => {
          const { answer } = payload;
          const desc = new RTCSessionDescription(answer);
          pc.current
            .setRemoteDescription(desc)
            .then((su) => {
              console.log(su);
            })
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
        socketRef.current.on("ice", (payload) => {
          const { ice } = payload;
          // console.log("other", payload);
          if (ice) {
            pc.current
              .addIceCandidate(ice)
              .then((su) => {
                // console.log(su);
              })
              .catch((error) => console.log(error));
          }
        });
        // forther set up
        socketRef.current.on("offer_send_fortherSetUp", (payload) => {
          const { offer } = payload;
          const desc = new RTCSessionDescription(offer);
          pc.current.setRemoteDescription(desc).then((sld) => {
            // may be stream add fother
            pc.current.createAnswer().then((answer) => {
              pc.current.setLocalDescription(answer).then((west) => {
                console.log(pc.current.localDescription);
                socketRef.current.emit("answer_send_after_setup", {
                  answer: pc.current.localDescription,
                });
              });
            });
          });
          // console.log(offer);
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
    peer.ontrack = (e) => {
      handelTrackEventCapture(e);
      // console.log("track on");
    };
    // peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);
    return peer;
  };
  const handelTrackEventCapture = (event) => {
    // console.log(event.streams[0]);
    peerVideo.current.srcObject = event.streams[0];
  };
  return (
    <div>
      {/* <p>Stream</p> */}
      <button onClick={socketFn}>Stream</button>
      <video ref={myVideo} muted autoPlay />
      <video ref={peerVideo} muted autoPlay />
    </div>
  );
}
