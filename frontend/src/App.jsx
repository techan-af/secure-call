import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

// Replace these with your Cloudinary details.
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dazgjfmbe/upload";
const CLOUDINARY_UPLOAD_PRESET = "rtccall";

export default function Home() {
  const [userId, setUserId] = useState("user_" + Math.floor(Math.random() * 1000));
  const [onlineUsers, setOnlineUsers] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [recordingData, setRecordingData] = useState(null);
  // isCaller indicates if this user initiated the call.
  const [isCaller, setIsCaller] = useState(false);

  const localStreamRef = useRef(null);
  const peerConnections = useRef({});
  const audioContext = useRef(null);
  const destination = useRef(null);
  const mediaRecorder = useRef(null);
  const recordedChunks = useRef([]);

  useEffect(() => {
    socket.emit("register-user", userId);

    socket.on("update-users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("incoming-call", async ({ callerId, offer }) => {
      console.log("Incoming call from:", callerId);
      setIncomingCall({ callerId, offer });
    });

    socket.on("end-call", () => {
      console.log("Received end-call event from remote.");
      endCall(false); // end without triggering upload if not caller
    });

    return () => {
      socket.off("update-users");
      socket.off("incoming-call");
      socket.off("end-call");
    };
  }, [userId]);

  // Initiate a call to a target user.
  const callUser = async (targetUserId) => {
    setIsCaller(true);
    const peer = new RTCPeerConnection();
    peerConnections.current[targetUserId] = peer;

    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = localStream;
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

    // Set up audio mixing.
    audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    destination.current = audioContext.current.createMediaStreamDestination();
    const localAudioSource = audioContext.current.createMediaStreamSource(localStream);
    localAudioSource.connect(destination.current);

    // When remote tracks arrive, play them and mix.
    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const audio = document.createElement("audio");
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      document.body.appendChild(audio);
      const remoteAudioSource = audioContext.current.createMediaStreamSource(remoteStream);
      remoteAudioSource.connect(destination.current);
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("call-user", { targetUserId, callerId: userId, offer });
    setCallActive(true);
    startRecording();
  };

  // Answer an incoming call.
  const answerCall = async () => {
    if (!incomingCall) return;
    setIsCaller(false);
    const { callerId, offer } = incomingCall;
    const peer = new RTCPeerConnection();
    peerConnections.current[callerId] = peer;

    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = localStream;
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

    audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    destination.current = audioContext.current.createMediaStreamDestination();
    const localAudioSource = audioContext.current.createMediaStreamSource(localStream);
    localAudioSource.connect(destination.current);

    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const audio = document.createElement("audio");
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      document.body.appendChild(audio);
      const remoteAudioSource = audioContext.current.createMediaStreamSource(remoteStream);
      remoteAudioSource.connect(destination.current);
    };

    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("call-answer", { callerId, answer });
    setIncomingCall(null);
    setCallActive(true);
    startRecording();
  };

  // Decline an incoming call.
  const declineCall = () => {
    if (incomingCall) {
      socket.emit("call-declined", { callerId: incomingCall.callerId });
      setIncomingCall(null);
    }
  };

  // Start recording the mixed audio.
  const startRecording = () => {
    if (destination.current) {
      mediaRecorder.current = new MediaRecorder(destination.current.stream);
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };
      mediaRecorder.current.start();
      console.log("Recording started...");
    }
  };

  // End the call. If triggerUpload is true and if this user is the caller, upload recording.
  const endCall = (triggerUpload = true) => {
    // Send an end-call signal so the other side ends too.
    const otherUserId = Object.keys(peerConnections.current)[0];
    socket.emit("end-call", { otherUserId });
    setCallActive(false);
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      // Set the onstop handler before stopping.
      mediaRecorder.current.onstop = () => {
        console.log("MediaRecorder stopped. Recorded chunks:", recordedChunks.current);
        if (triggerUpload && isCaller) {
          uploadRecording();
        } else {
          console.log("Not triggering upload because user is not caller.");
        }
      };
      mediaRecorder.current.stop();
    }
  };

  // Upload the recording blob to Cloudinary and call the backend.
  const uploadRecording = async () => {
    console.log("Uploading recording...");
    const blob = new Blob(recordedChunks.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", blob, `recording-${userId}.webm`);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      console.log("Cloudinary response:", data);

      if (data.secure_url) {
        console.log("Recording uploaded to Cloudinary:", data.secure_url);
        const backendResponse = await fetch("http://localhost:5000/saveRecording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cloudinaryUrl: data.secure_url }),
        });
        const backendData = await backendResponse.json();
        if (backendData.success) {
          console.log("Recording processed:", backendData.recording);
          setRecordingData(backendData.recording);
          alert("Recording processed successfully!");
        } else {
          console.error("Backend processing failed", backendData);
          alert("Backend processing failed");
        }
      } else {
        console.error("Upload failed", data);
        alert("Recording upload failed. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading recording:", error);
      alert("Error uploading recording");
    }
    recordedChunks.current = [];
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Your ID: {userId}</h2>

      <h3>Online Users:</h3>
      <ul>
        {Object.entries(onlineUsers)
          .filter(([id]) => id !== userId)
          .map(([id]) => (
            <li key={id}>
              {id} <button onClick={() => callUser(id)}>Call</button>
            </li>
          ))}
      </ul>

      {incomingCall && (
        <div style={{ border: "1px solid black", padding: 10, margin: 10 }}>
          <h3>Incoming Call from {incomingCall.callerId}</h3>
          <button onClick={answerCall}>Answer</button>
          <button onClick={declineCall}>Decline</button>
        </div>
      )}

      {callActive && (
        <div>
          <h3>Call in progress...</h3>
          <button onClick={() => endCall(true)}>End Call</button>
        </div>
      )}

      {recordingData && (
        <div>
          <h3>Call Transcription:</h3>
          <pre>{recordingData.transcription}</pre>
          <h3>Refined Transcription (Gemini AI):</h3>
          <pre>{recordingData.refinedTranscription}</pre>
        </div>
      )}
    </div>
  );
}
