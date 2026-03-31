import { useState, useRef, useEffect, useCallback } from "react";
import "./LiveMediaRecorder.css";

interface LiveMediaRecorderProps {
  onCapture: (file: File, transcript?: string) => void;
  onCancel: () => void;
}

type Mode = "photo" | "video" | "audio";
type Status = "idle" | "requesting" | "ready" | "recording" | "done" | "error";

export default function LiveMediaRecorder({ onCapture, onCancel }: LiveMediaRecorderProps) {
  const [mode, setMode] = useState<Mode>("photo");
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>("");
  const recognitionRef = useRef<any>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const requestPermissions = useCallback(
    async (currentMode: Mode) => {
      setStatus("requesting");
      stopStream();
      setErrorText("");

      try {
        const constraints = {
          audio: currentMode === "video" || currentMode === "audio",
          video:
            currentMode === "video" || currentMode === "photo"
              ? { facingMode: "environment" }
              : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setStatus("ready");

        if (currentMode !== "audio" && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setStatus("error");
        setErrorText(
          "Permissions caméra/micro refusées. Autorisez-les dans le navigateur pour capturer une preuve en direct."
        );
      }
    },
    [stopStream],
  );

  useEffect(() => {
    void requestPermissions(mode);
    return stopStream;
  }, [mode, requestPermissions, stopStream]);

  const handleCapturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `proof_${Date.now()}.jpg`, { type: "image/jpeg" });
            stopStream();
            setStatus("done");
            onCapture(file);
          }
        },
        "image/jpeg",
        0.85,
      );
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    audioChunksRef.current = [];
    transcriptRef.current = "";

    // Speech Recognition setup (Fallback pour Chrome/Safari)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && (mode === "audio" || mode === "video")) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "fr-FR";
      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        transcriptRef.current = currentTranscript;
      };
      recognition.start();
      recognitionRef.current = recognition;
    }

    const options = { mimeType: mode === "video" ? "video/webm" : "audio/webm" };
    let recorder;
    try {
      recorder = new MediaRecorder(streamRef.current, options);
    } catch {
      recorder = new MediaRecorder(streamRef.current);
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      const blobMime = recorder.mimeType || (mode === "video" ? "video/mp4" : "audio/mp3");
      const blob = new Blob(audioChunksRef.current, { type: blobMime });

      const ext = mode === "video" ? "webm" : "webm";
      const file = new File([blob], `proof_${Date.now()}.${ext}`, { type: blobMime });
      stopStream();
      setStatus("done");
      onCapture(file, transcriptRef.current.trim() || undefined);
    };

    recorder.start();
    setStatus("recording");
    setTimeLeft(30);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (status === "recording") {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  if (status === "done") return null;

  return (
    <div className="live-recorder-container">
      <div className="live-recorder-header">
        <label>Preuve "Live" On-site</label>
        <button type="button" className="close-recorder" onClick={onCancel}>
          ✕
        </button>
      </div>

      <div className="live-recorder-tabs">
        <button type="button" className={mode === "photo" ? "active" : ""} onClick={() => setMode("photo")}>
          📷 Photo
        </button>
        <button type="button" className={mode === "video" ? "active" : ""} onClick={() => setMode("video")}>
          🎥 Vidéo
        </button>
        <button type="button" className={mode === "audio" ? "active" : ""} onClick={() => setMode("audio")}>
          🎙️ Audio
        </button>
      </div>

      <div className="live-recorder-body">
        {status === "requesting" && <p className="status-text">Autorisation en cours...</p>}
        {status === "error" && <p className="status-text error">{errorText}</p>}

        {status !== "error" && mode !== "audio" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`live-video ${status === "recording" ? "recording" : ""}`}
            style={{ display: status === "requesting" ? "none" : "block" }}
          />
        )}

        {status !== "error" && mode === "audio" && (
          <div className="live-audio-waveform">
            <span className={`audio-dot ${status === "recording" ? "recording" : ""}`}></span>
            {status === "recording" ? "Enregistrement en cours..." : "Prêt pour vocale"}
          </div>
        )}

        {status === "recording" && <div className="live-timer">⏳ {timeLeft} s max</div>}
      </div>

      <div className="live-recorder-footer">
        {status === "ready" && mode === "photo" && (
          <button type="button" className="action-btn shutter" onClick={handleCapturePhoto}>
            📸 Capturer
          </button>
        )}

        {status === "ready" && (mode === "video" || mode === "audio") && (
          <button type="button" className="action-btn record" onClick={startRecording}>
            🔴 Enregistrer (30s max)
          </button>
        )}

        {status === "recording" && (
          <button type="button" className="action-btn stop" onClick={stopRecording}>
            ⏹️ Arrêter
          </button>
        )}
      </div>
    </div>
  );
}
