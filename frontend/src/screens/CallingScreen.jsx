import React, { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, UserCircle } from "lucide-react";
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
  const [isCaller, setIsCaller] = useState(false);
  const [targetUser, setTargetUser] = useState(null); // For storing target user ID for caller

  const localStreamRef = useRef(null);
  const peerConnections = useRef({});
  const audioContext = useRef(null);
  const destination = useRef(null);
  const mediaRecorder = useRef(null);
  const recordedChunks = useRef([]);

  // Use a basic STUN server configuration.
  const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

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
      endCall(false); // End without triggering upload if not caller.
    });

    // Receive ICE candidates from remote peers.
    socket.on("ice-candidate", ({ candidate, from }) => {
      console.log("Received ICE candidate from:", from, candidate);
      const pc = peerConnections.current[from];
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate))
          .then(() => console.log("Added ICE candidate"))
          .catch((error) => console.error("Error adding ICE candidate:", error));
      }
    });

    // Handle call answered event (for caller).
    socket.on("call-answered", async ({ answer }) => {
      console.log("Received call answered event", answer);
      if (targetUser) {
        const pc = peerConnections.current[targetUser];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("Set remote description on caller side.");
        }
      }
    });

    return () => {
      socket.off("update-users");
      socket.off("incoming-call");
      socket.off("end-call");
      socket.off("ice-candidate");
      socket.off("call-answered");
    };
  }, [userId, targetUser]);

  // Initiate a call to a target user.
  const callUser = async (targetUserId) => {
    setIsCaller(true);
    setTargetUser(targetUserId);
    const peer = new RTCPeerConnection(rtcConfig);
    // ICE candidate handling.
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate from caller:", event.candidate);
        socket.emit("ice-candidate", {
          targetUserId,
          candidate: event.candidate,
          from: userId,
        });
      }
    };
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
    const peer = new RTCPeerConnection(rtcConfig);
    // ICE candidate handling.
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate from callee:", event.candidate);
        socket.emit("ice-candidate", {
          targetUserId: callerId,
          candidate: event.candidate,
          from: userId,
        });
      }
    };
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-5">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header with User ID */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-center space-x-2">
            <UserCircle className="h-6 w-6 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">Your ID: {userId}</h1>
          </div>
        </div>

        {/* Online Users List */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Online Users</h2>
          <div className="space-y-2">
            {Object.entries(onlineUsers)
              .filter(([id]) => id !== userId)
              .map(([id]) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-all duration-200"
                >
                  <span className="text-gray-700">{id}</span>
                  <button
                    onClick={() => callUser(id)}
                    className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Call</span>
                  </button>
                </div>
              ))}
          </div>

          {/* Incoming Call Alert */}
          {incomingCall && (
            <div className="mt-6 p-4 bg-white border-2 border-blue-500 rounded-lg">
              <h3 className="text-gray-900 font-semibold text-center mb-3">
                Incoming Call from {incomingCall.callerId}
              </h3>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={answerCall}
                  className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>Answer</span>
                </button>
                <button
                  onClick={declineCall}
                  className="flex items-center space-x-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Call Status */}
          {callActive && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-blue-700 font-semibold text-center mb-3">
                Call in progress...
              </h3>
              <div className="flex justify-center">
                <button
                  onClick={() => endCall(true)}
                  className="flex items-center space-x-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>End Call</span>
                </button>
              </div>
            </div>
          )}

          {/* Recording Data */}
          {/* Recording Data */}
{recordingData && (
  <div className="mt-6 space-y-4">
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-gray-900 font-semibold mb-2">Call Transcription:</h3>
      <pre className="bg-white p-3 rounded-md text-sm text-gray-700 overflow-auto border border-gray-200">
        {recordingData.transcription}
      </pre>
    </div>
    
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-gray-900 font-semibold mb-2">
        Refined Transcription (Gemini AI):
      </h3>
      <pre className="bg-white p-3 rounded-md text-sm text-gray-700 overflow-auto border border-gray-200">
        {recordingData.refinedTranscription}
      </pre>
    </div>

    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-gray-900 font-semibold mb-2">Scam Analysis:</h3>
      <pre className="bg-white p-3 rounded-md text-sm text-gray-700 overflow-auto border border-gray-200">
        {recordingData.scamAnalysis}
      </pre>
    </div>
  </div>
)}

        </div>
      </div>
    </div>
  );
}
