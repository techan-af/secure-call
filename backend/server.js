// Replace with your MongoDB connection string (e.g., from MongoDB Atlas)
// index.js
// index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const axios = require("axios");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

// Import Gemini AI package
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Gemini AI Function ---
async function processWithGeminiAI(transcription) {
    try {
        // Ensure you have GEMINI_API_KEY in your environment variables.
        const GEMINI_API_KEY = "AIzaSyCOSX_kqyRGqdjaCzA4gc_2LzxIigPAkC0";
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not defined in the environment.");
        }
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        // Create a prompt that instructs Gemini AI to merge or refine the transcription.
        const prompt = `
        Try creating a meaningful sentence using both of these transcriptions that are en-US and en-IN:
        
        Transcription:
        ${transcription}
        `;
        
        console.log("Generating refined text with Gemini AI...");
        const result = await model.generateContent(prompt);
        const refinedText = await result.response.text();
        console.log("Refined Text from Gemini AI:\n", refinedText);
        return refinedText;
    } catch (error) {
        console.error("Error processing with Gemini AI:", error);
        return "Error processing text.";
    }
}

// --- MongoDB Setup ---

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://chetan95497:Chetan@rtc.5rtod.mongodb.net/?retryWrites=true&w=majority&appName=rtc";

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const recordingSchema = new mongoose.Schema({
  url: String,
  transcription: String,
  refinedTranscription: String, // New field for Gemini AI refined text
  createdAt: { type: Date, default: Date.now },
});
const Recording = mongoose.model("Recording", recordingSchema);

// --- Express and Socket.io Setup ---
const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ----- Existing RTC Signaling Code -----
const rooms = {};

io.on("connection", (socket) => {
  socket.on("join-room", (roomId) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    const otherUsers = rooms[roomId].filter((id) => id !== socket.id);
    socket.emit("all-users", otherUsers);

    socket.join(roomId);
  });

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
    }
  });
});

// ----- Endpoint for Saving and Processing Recordings -----
app.post("/saveRecording", async (req, res) => {
  try {
    const { cloudinaryUrl } = req.body;
    if (!cloudinaryUrl) {
      return res.status(400).json({ error: "cloudinaryUrl is required" });
    }

    // Create a new Recording document with the Cloudinary URL.
    let newRecording = new Recording({ url: cloudinaryUrl });
    await newRecording.save();

    // Download the WebM file from Cloudinary.
    const localWebmPath = path.join(__dirname, "temp_input.webm");
    const localWavPath = path.join(__dirname, "output.wav");

    const writer = fs.createWriteStream(localWebmPath);
    const response = await axios({
      url: cloudinaryUrl,
      method: "GET",
      responseType: "stream",
    });
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Convert the WebM file to WAV using FFmpeg.
    await new Promise((resolve, reject) => {
      ffmpeg(localWebmPath)
        .toFormat("wav")
        .audioChannels(1)
        .audioFrequency(48000)
        .on("end", () => {
          console.log("Conversion to WAV completed.");
          resolve();
        })
        .on("error", (err) => {
          console.error("Error during conversion:", err);
          reject(err);
        })
        .save(localWavPath);
    });

    // Transcribe the WAV file using Google Speech API.
    // Replace 'your_google_api_key_here' with your actual Google API key or set it as an env variable.
    const API_KEY = process.env.GOOGLE_API_KEY || "AIzaSyBiIUJiunnW34aF5VLIIpEx1J_iKZRCvn0";
    const audioData = fs.readFileSync(localWavPath);
    const audioBase64 = audioData.toString("base64");
    const googleUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`;

    const languages = ["en-US", "en-IN"];
    let fullTranscription = "";

    for (const lang of languages) {
      console.log(`Transcribing with language: ${lang}`);

      const requestBody = {
        config: {
          encoding: "LINEAR16",
          sampleRateHertz: 48000,
          languageCode: lang,
        },
        audio: { content: audioBase64 },
      };

      try {
        const googleResponse = await axios.post(googleUrl, requestBody);
        const transcription = googleResponse.data.results
          ? googleResponse.data.results
              .map((result) => result.alternatives[0].transcript)
              .join(" ")
          : "";
        if (transcription) {
          fullTranscription += `[${lang}] ${transcription}\n`;
        }
      } catch (error) {
        console.error(
          `Error transcribing with ${lang}:`,
          error.response?.data || error.message
        );
      }
    }

    console.log("Final Transcription:\n", fullTranscription.trim());

    // Update the recording document with the transcription.
    newRecording.transcription = fullTranscription.trim();
    await newRecording.save();

    // Use Gemini AI to refine the transcription.
    const refinedText = await processWithGeminiAI(newRecording.transcription);
    newRecording.refinedTranscription = refinedText;
    await newRecording.save();

    // Optionally, remove temporary files.
    fs.unlinkSync(localWebmPath);
    fs.unlinkSync(localWavPath);

    res.json({ success: true, recording: newRecording });
  } catch (error) {
    console.error("Error in /saveRecording:", error);
    res.status(500).json({ error: error.message });
  }
});

server.listen(5000, () => console.log("Server running on port 5000"));
