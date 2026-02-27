import { useState } from "react";
import UploadForm from "./components/UploadForm.jsx";
import ChatInterface from "./components/ChatInterface.jsx";

export default function App() {
  const [sessionId, setSessionId] = useState(null);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight m-0">
          Mock Interviewer
        </h1>
        <p className="text-slate-400 mt-1.5 text-base">
          Upload your resume and job description to start a practice interview
        </p>
      </header>

      {sessionId ? (
        <ChatInterface sessionId={sessionId} onReset={() => setSessionId(null)} />
      ) : (
        <UploadForm onStart={setSessionId} />
      )}
    </div>
  );
}
