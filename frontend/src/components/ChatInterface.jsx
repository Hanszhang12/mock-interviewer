import { useState, useEffect, useRef } from "react";

export default function ChatInterface({ sessionId, onReset }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const initializedRef = useRef(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Kick off first interviewer message
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      sendMessage("Hello, I'm ready to begin.");
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text ?? input.trim();
    if (!userText || streaming) return;

    // Show user message (skip the hidden kickoff)
    const isKickoff = text !== undefined;
    if (!isKickoff) {
      setMessages((prev) => [...prev, { role: "user", content: userText }]);
    }
    setInput("");
    setStreaming(true);

    // Placeholder for streaming assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: userText }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { text } = JSON.parse(payload);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: updated[updated.length - 1].content + text,
              };
              return updated;
            });
          } catch {}
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Filter out the hidden kickoff user message
  const displayMessages = messages.filter(
    (m, i) => !(i === 0 && m.role === "user" && m.content === "Hello, I'm ready to begin.")
  );

  const canSend = input.trim() && !streaming;

  return (
    <div className="w-full max-w-2xl flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
      {/* Top bar */}
      <div className="flex justify-between items-center mb-4">
        <span className="flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />
          <span className="text-slate-400 text-sm">Interview in progress</span>
        </span>
        <button
          className="bg-transparent border border-slate-700 rounded-md text-slate-400 cursor-pointer px-3 py-1 text-xs hover:border-slate-500 transition-colors"
          onClick={onReset}
        >
          Start over
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}
      >
        {displayMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "assistant" ? "items-start" : "items-end"}`}
          >
            <span
              className={`text-xs text-slate-500 mb-1 ${
                msg.role === "assistant" ? "pl-1" : "pr-1"
              }`}
            >
              {msg.role === "assistant" ? "Interviewer" : "You"}
            </span>
            <div
              className={`max-w-[78%] px-4 py-3 text-slate-100 text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === "assistant"
                  ? "bg-slate-800 rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl"
                  : "bg-indigo-500 rounded-tl-2xl rounded-tr-sm rounded-br-2xl rounded-bl-2xl"
              }`}
            >
              {msg.content || (streaming && i === displayMessages.length - 1 ? "▍" : "")}
            </div>
          </div>
        ))}
        {streaming && displayMessages[displayMessages.length - 1]?.content === "" && (
          <span className="text-slate-500 text-sm pl-1 self-start">Interviewer is typing...</span>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex gap-3 mt-4">
        <textarea
          ref={textareaRef}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-[0.95rem] px-4 py-3 outline-none resize-none min-h-12 max-h-36 overflow-y-auto font-[inherit] focus:border-indigo-500 transition-colors disabled:opacity-50"
          placeholder="Type your answer... (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={streaming}
          rows={1}
        />
        <button
          className={`px-5 rounded-lg text-white text-xl font-bold transition-colors shrink-0 ${
            canSend
              ? "bg-indigo-500 hover:bg-indigo-400 cursor-pointer"
              : "bg-indigo-900 cursor-not-allowed"
          }`}
          onClick={() => sendMessage()}
          disabled={!canSend}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
