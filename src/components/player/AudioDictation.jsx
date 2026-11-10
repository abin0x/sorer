import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, AlertCircle, MicOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Real-time voice dictation.
 *
 * Primary: Web Speech API (SpeechRecognition) — real-time transcription,
 *   works in Chrome/Safari in the published app and companion app.
 * Fallback: MediaRecorder + private AI transcription — for browsers without
 *   SpeechRecognition (e.g. Firefox); records audio then transcribes on stop.
 *
 * Privacy-focused browsers (DuckDuckGo, Brave strict mode) block both the
 * SpeechRecognition and getUserMedia APIs. When neither is available, the
 * component shows a clear message instead of a broken button.
 *
 * Note: In the builder preview iframe, microphone APIs may also be blocked
 * by the iframe permissions policy. Dictation works fully in the published
 * app and native companion app.
 */
export default function AudioDictation({ onTranscript, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const isRecordingRef = useRef(false);

  const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const hasSpeechRecognition = !!SpeechRecognition;
  const hasGetUserMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function";
  const hasMediaRecorder = typeof window !== "undefined" && typeof window.MediaRecorder === "function";
  const canDictate = hasSpeechRecognition || (hasGetUserMedia && hasMediaRecorder);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleStop = React.useCallback(() => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    stopStream();
    setIsRecording(false);
    setInterimText("");
  }, []);

  useEffect(() => () => handleStop(), [handleStop]);

  const startSpeechRecognition = () => {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          onTranscript(transcript.trim() + " ");
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone blocked. Allow microphone access or try the companion app.");
        handleStop();
      } else if (event.error === "audio-capture") {
        setError("No microphone detected.");
        handleStop();
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try { recognition.start(); } catch {}
      } else {
        setInterimText("");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setError(null);
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setError("Could not start dictation.");
    }
  };

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || audioChunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        stopStream();
        if (blob.size === 0) return;
        setTranscribing(true);
        try {
          const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
          const file = new File([blob], `dictation.${extension}`, { type: mimeType });
          const transcript = await base44.integrations.Core.TranscribeAudio({ file });
          if (typeof transcript !== "string" || !transcript.trim()) throw new Error("No speech detected");
          onTranscript(transcript.trim() + " ");
          toast.success("Transcription complete");
        } catch (err) {
          toast.error(err?.message || "Transcription failed. Your written note has been kept.");
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("MediaRecorder failed:", err);
      setError("Microphone blocked by your browser. Try Chrome, Safari, or the companion app.");
    }
  };

  const handleClick = () => {
    if (isRecording) {
      handleStop();
    } else if (hasSpeechRecognition) {
      startSpeechRecognition();
    } else {
      startMediaRecorder();
    }
  };

  // Browser doesn't support any dictation API (e.g. DuckDuckGo)
  if (!canDictate) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-amber-600 max-w-[280px]">
        <MicOff className="w-3 h-3 shrink-0" />
        <span>Voice dictation needs Chrome, Safari, or the companion app.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={handleClick}
        variant={isRecording ? "destructive" : "ghost"}
        size="sm"
        disabled={disabled || transcribing}
        className={isRecording ? "animate-pulse shrink-0" : "shrink-0"}
      >
        {transcribing ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Transcribing…</>
        ) : isRecording ? (
          <><Square className="w-3.5 h-3.5 mr-1.5 fill-current" /> Stop</>
        ) : (
          <><Mic className="w-3.5 h-3.5 mr-1.5" /> Dictate</>
        )}
      </Button>
      {interimText && (
        <p className="text-[10px] text-muted-foreground italic truncate max-w-[280px]">{interimText}…</p>
      )}
      {error && (
        <p className="text-[10px] text-amber-600 flex items-start gap-1 max-w-[280px]">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}