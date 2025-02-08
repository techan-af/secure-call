#  🚀 Secure Call

Secure Call is a real-time, secure voice calling application designed to facilitate peer-to-peer audio communication with enhanced security and scam detection features. This project integrates modern web technologies to record and process calls, transcribe audio in multiple languages, and utilize advanced AI (Gemini AI) to analyze call content for potential scam indicators.

## Architecture Diagram

![image](https://github.com/user-attachments/assets/cc3c76f3-1b1d-4658-8e16-f7ccc70769f5)




---

## Table of Contents

- [🔍 Overview](#overview)
- [✨ Features](#features)
- [🛠️ Tech Stack](#tech-stack)
- [🔄 Architecture & Workflow](#architecture--workflow)
- [📂 Project Structure](#project-structure)
- [⚙️ Installation & Setup](#installation--setup)
- [💡 Usage](#usage)
- [📡 API Endpoints](#api-endpoints)
- [🔑 Environment Variables](#environment-variables)

---

## 🔍  Overview

Secure Call provides a secure platform for real-time voice communication. With an emphasis on user security and call integrity, the application:

- Uses *WebRTC* for establishing peer-to-peer audio calls
- Implements *Socket.IO* for real-time signaling, user presence, and call control
- Records calls in 15-second segments and uploads them to *Cloudinary*
- Converts audio recordings using *FFmpeg* and transcribes them using the *Google Speech-to-Text API* in multiple languages
- Leverages *Google Generative AI (Gemini AI)* to refine transcriptions and perform an in-depth scam analysis based on a set of predefined scam detection flags
- Persists call recordings and analysis results in *MongoDB*

## ✨ Features

### Real-Time Communication
Secure voice calls between users are established using WebRTC with seamless signaling via Socket.IO.

### Call Recording & Chunking
Calls are automatically recorded in 15-second chunks to enable incremental processing and transcription.

### Audio Upload & Processing
Each audio chunk is uploaded to Cloudinary, then downloaded and converted to WAV format using FFmpeg. The WAV file is then transcribed using the Google Speech-to-Text API.

### Refined Transcription & Scam Analysis
Raw transcriptions are refined using Gemini AI. The refined text is analyzed for common scam indicators such as fake authority claims, urgent or fear tactics, and requests for sensitive information.

### User Presence & Signaling
Real-time updates on online users are maintained using heartbeat pings, ensuring active user status for call initiation.

### Comprehensive UI
The frontend, built with React, provides an intuitive interface featuring a bottom navigation for switching between screens (Call, Call Logs, Fraud News, Scam Awareness).

## 🛠️  Tech Stack

### Frontend
- *React:* Library for building the user interface
- *React Router:* For navigation between different screens
- *Material-UI (MUI):* UI component library for the bottom navigation and other elements
- *Lucide-React:* Icon library for sleek and modern icons
- *Socket.IO Client:* For establishing real-time communication with the backend
- *WebRTC:* For peer-to-peer audio call capabilities

### Backend
- *Node.js & Express:* Server-side runtime and framework for REST API development
- *Socket.IO:* Real-time bidirectional communication between the server and clients
- *MongoDB & Mongoose:* NoSQL database for storing call recordings and analysis data
- *Axios:* HTTP client for making requests to external APIs
- *FFmpeg (via fluent-ffmpeg):* Audio conversion tool for processing call recordings
- *Cloudinary:* Cloud service for uploading and storing audio files
- *Google Speech-to-Text API:* Service for transcribing audio recordings
- *Google Generative AI (Gemini AI):* AI service for refining transcriptions and analyzing call content for scam indicators

## 🔄  Architecture & Workflow

1. *User Registration & Presence*
   - Each user is assigned a unique ID upon connection
   - The client sends periodic heartbeat messages to the backend using Socket.IO
   - The backend maintains a list of active users and cleans up stale entries

2. *Call Initiation & Signaling*
   - Users can initiate calls by selecting an online user from the list
   - WebRTC handles peer-to-peer audio streams while Socket.IO exchanges signaling data (offers, answers, and ICE candidates)

3. *Call Recording & Chunking*
   - Active calls are recorded in 15-second chunks using the MediaRecorder API
   - Each chunk is uploaded to Cloudinary for storage and subsequent processing

4. *Audio Processing & Transcription*
   - The backend downloads the recorded audio from Cloudinary
   - FFmpeg converts the audio from WebM to WAV format
   - The Google Speech-to-Text API transcribes the audio in multiple languages (e.g., en-US and en-IN)

5. *Refinement & Scam Analysis*
   - Raw transcriptions are sent to Gemini AI for refinement
   - An analysis is performed against predefined scam flags (e.g., fake authority, urgency, sensitive information requests)
   - A comprehensive analysis report, including scam likelihood and detailed flag violations, is generated

6. *Data Persistence*
   - Call recordings, transcriptions, refined transcriptions, and scam analysis reports are saved in MongoDB


---

## 📂  Project Structure
```

secure-call/
├── backend/
│   ├── server.js             # Main Express server & Socket.IO integration
│   ├── suspicionAnalysis.js  # Module for scam analysis using Gemini AI
│   ├── package.json          # Backend dependencies and scripts
│   └── .env                  # Environment variables (not committed)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx          # Main application and routing setup
│   │   ├── screens/
│   │   │   ├── CallingScreen.jsx    # WebRTC-based calling interface
│   │   │   ├── CallLogs.jsx         # Call logs display
│   │   │   ├── FraudNews.jsx        # Fraud-related news and updates
│   │   │   └── ScamAwareness.jsx    # Scam detection and safety tips
│   │   └── index.js         # Application entry point
│   ├── package.json         # Frontend dependencies and scripts
│   └── .env                 # Frontend environment configuration (if needed)
└── README.md               # Project documentation

```

---

## ⚙️ Installation & Setup

### Prerequisites

Before setting up the project, ensure you have the following installed:
- *Node.js* (v14 or later)
- *MongoDB* (local instance or MongoDB Atlas)
- *FFmpeg* installed on your system ([Download FFmpeg](https://ffmpeg.org/download.html))
- *Cloudinary Account* (with API credentials)
- *Google Cloud API Keys* for Speech-to-Text and Gemini AI

### Backend Setup

1. *Clone the Repository:*

```
   git clone https://github.com/yourusername/secure-call.git
   cd secure-call/backend
 ```  

2. *Install Dependencies:*

```
   bash
   npm install
  ``` 

3. *Configure Environment Variables:*
   Create a .env file in the backend directory and add:
   
```
   PORT=5000
   MONGO_URI=your_mongodb_uri
   CLOUDINARY_UPLOAD_URL=https://api.cloudinary.com/v1_1/your_cloud_name/upload
   CLOUDINARY_UPLOAD_PRESET=your_cloudinary_preset
   GOOGLE_API_KEY=your_google_speech_api_key
   GEMINI_API_KEY=your_gemini_ai_api_key
 ```  

4. *Start the Backend Server:*

```
  
  node server.js
```



### Frontend Setup

1. *Navigate to the Frontend Directory:*
   
```
   cd ../frontend
  ``` 

2. *Install Dependencies:*
   

```
   npm install
```   

3. *Start the Frontend Application:*

```
   npm start
  ``` 

4. *Access the Application:*
   Open your browser and navigate to http://localhost:3000

## 💡  Usage

### Initiating a Call
Upon launching the app, you will see your unique user ID along with a list of online users. Click on the Call button next to a user's name to initiate a call.

### Receiving a Call
If another user calls you, an incoming call notification appears with options to Answer or Decline.

### Call In-Progress
During a call, audio is recorded in 15-second intervals. Each chunk is processed to provide real-time transcription and refined analysis. The transcript and refined transcript (including scam analysis) are displayed within the application.

### Ending a Call
To end a call, click the End Call button. The call termination signal is sent, and all media streams are closed. The final chunk (if any) is processed and added to the cumulative transcript.

## 📡 API Endpoints

### POST /saveRecording
Description: Processes and saves the full call recording.

Request Body:

```
json
{
  "cloudinaryUrl": "url_of_uploaded_recording"
}
```

Response Example:

```
json
{
  "success": true,
  "recording": {
    "_id": "recording_id",
    "url": "cloudinary_url",
    "transcription": "raw transcription text",
    "refinedTranscription": "refined transcription text",
    "scamAnalysis": "analysis report",
    "createdAt": "timestamp"
  }
}
```

### POST /processChunk
Description: Processes a 15-second audio chunk.

Request Body:

```
json
{
  "cloudinaryUrl": "url_of_uploaded_chunk"
}

```
Response Example:

```
json
{
  "success": true,
  "transcript": "raw chunk transcription text",
  "refinedTranscript": "refined chunk transcription text"
}

```
## 🔑 Environment Variables

Ensure the following environment variables are configured in your backend .env file:

```
- PORT: The port on which the server runs (e.g., 5000)
- MONGO_URI: MongoDB connection string
- CLOUDINARY_UPLOAD_URL: URL for Cloudinary uploads
- CLOUDINARY_UPLOAD_PRESET: Cloudinary preset for uploading
- GOOGLE_API_KEY: API key for Google Speech-to-Text
- GEMINI_API_KEY: API key for Google Generative AI (Gemini AI)

```



Secure Call is intended for educational and development purposes. Users must ensure compliance with applicable laws and regulations when deploying applications that handle real-time communication and personal data.

Enjoy using Secure Call!
