import { useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, SwitchCamera, X, AlertCircle } from "lucide-react";

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment"); // back camera by default for documents/questions
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Stop camera tracks cleanly
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start camera
  const startCamera = async (mode) => {
    stopStream();
    setError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported by your browser.");
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // Enumerate fallback
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission was denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No camera device found on this computer/device.");
      } else {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();
            return;
          }
        } catch {
          setError(err.message || "Could not start camera feed.");
        }
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopStream();
      },
      "image/jpeg",
      0.92
    );
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedBlob(null);
    setPreviewUrl(null);
    startCamera(facingMode);
  };

  const confirmPhoto = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `camera-question-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onCapture(file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-navy-950 shadow-2xl max-h-[88vh]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-400/20 p-1.5 text-sky-400">
              <Camera className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white">Capture Question</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close camera"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="relative flex-1 min-h-[220px] max-h-[50vh] w-full overflow-hidden bg-black flex items-center justify-center">
          {error ? (
            <div className="flex flex-col items-center px-6 py-8 text-center text-slate-300">
              <AlertCircle className="mb-2 h-9 w-9 text-rose-400" />
              <p className="text-xs sm:text-sm font-semibold text-rose-200">{error}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="mt-3 flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <RefreshCw className="h-3 w-3" />
                Retry Camera
              </button>
            </div>
          ) : previewUrl ? (
            <img src={previewUrl} alt="Captured preview" className="h-full w-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-cover"
              />
              {/* Document framing guide */}
              <div className="pointer-events-none absolute inset-4 sm:inset-6 rounded-xl sm:rounded-2xl border-2 border-dashed border-white/30" />
              <div className="pointer-events-none absolute bottom-2.5 left-0 right-0 text-center">
                <span className="rounded-full bg-black/60 px-3 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                  Align question inside the frame
                </span>
              </div>
            </>
          )}

          {/* Switch camera button */}
          {!previewUrl && !error && hasMultipleCameras && (
            <button
              onClick={toggleFacingMode}
              aria-label="Switch camera"
              className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
            >
              <SwitchCamera className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Actions Bar */}
        <div className="shrink-0 flex items-center justify-between border-t border-white/10 bg-black/40 px-5 py-3">
          {previewUrl ? (
            <div className="flex w-full items-center justify-between gap-3">
              <button
                onClick={retake}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-lg shadow-sky-900/40 transition hover:brightness-110"
              >
                <Check className="h-4 w-4" />
                Use Photo
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center">
              <button
                onClick={capturePhoto}
                disabled={Boolean(error)}
                aria-label="Capture photo"
                className="group relative flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-transparent transition active:scale-95 disabled:opacity-40"
              >
                <div className="h-9 w-9 rounded-full bg-white transition group-hover:scale-90 group-active:scale-75" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
