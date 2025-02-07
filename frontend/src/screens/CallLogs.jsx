import  { useEffect, useState } from "react";

export default function CallLogs() {
  const [callLogs, setCallLogs] = useState([]);

  useEffect(() => {
    // Fetch logs from backend (Assuming an API exists)
    fetch("http://localhost:5000/call-logs")
      .then((res) => res.json())
      .then((data) => setCallLogs(data))
      .catch((err) => console.error("Error fetching call logs:", err));
  }, []);

  return (
    <div className="p-4 text-white">
      <h2 className="text-xl font-bold mb-4">Call Logs</h2>
      {callLogs.length > 0 ? (
        <ul>
          {callLogs.map((log, index) => (
            <li key={index} className="p-2 bg-gray-700 mb-2 rounded">
              {log.caller} → {log.receiver} at {new Date(log.timestamp).toLocaleString()}
            </li>
          ))}
        </ul>
      ) : (
        <p>No call logs found.</p>
      )}
    </div>
  );
}
