import { useState } from "react";

export default function UploadForm({ onStart }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (file && file.type === "application/pdf") {
      setResumeFile(file);
      setError("");
    } else {
      setError("Please upload a PDF file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleSubmit = async () => {
    if (!resumeFile) return setError("Please upload your resume.");
    if (!jd.trim()) return setError("Please paste the job description.");

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("job_description", jd);

    try {
      const res = await fetch("http://localhost:8000/start", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to start session.");
      onStart(data.session_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = resumeFile && jd.trim() && !loading;

  return (
    <div className="bg-slate-800 rounded-xl p-8 w-full max-w-lg shadow-2xl">
      <label className="block text-sm font-semibold text-slate-300 mb-2">
        Resume (PDF)
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-6 transition-colors ${
          dragOver ? "border-indigo-500" : "border-slate-700 hover:border-slate-500"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("resume-input").click()}
      >
        <input
          id="resume-input"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {resumeFile ? (
          <p className="text-sm text-slate-400">{resumeFile.name}</p>
        ) : (
          <>
            <span className="text-indigo-400 font-semibold cursor-pointer">Click to upload</span>
            <span className="text-slate-500"> or drag & drop</span>
            <p className="mt-2 text-sm text-slate-500">PDF only</p>
          </>
        )}
      </div>

      <label className="block text-sm font-semibold text-slate-300 mb-2">
        Job Description
      </label>
      <textarea
        className="w-full min-h-40 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm p-3 resize-y outline-none mb-6 font-[inherit] focus:border-indigo-500 transition-colors"
        placeholder="Paste the full job description here..."
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <button
        className={`w-full py-3 rounded-lg text-base font-semibold text-white transition-colors ${
          canSubmit
            ? "bg-indigo-500 hover:bg-indigo-400 cursor-pointer"
            : "bg-indigo-900 cursor-not-allowed"
        }`}
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {loading ? "Starting interview..." : "Start Interview"}
      </button>
    </div>
  );
}
