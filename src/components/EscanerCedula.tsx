"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CedulaData,
  hasCedulaData,
  parseCedulaPdf417,
  parseCedulaText,
} from "@/lib/cedula";
import { decodePdf417 } from "@/lib/pdf417";

type StatusKind = "info" | "success" | "error";

type OcrWorker = any;
let ocrWorkerPromise: Promise<OcrWorker> | null = null;
let ocrLogger: ((message: any) => void) | null = null;

async function getOcrWorker(): Promise<OcrWorker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const imported: any = await import("tesseract.js");
      const TesseractLib = imported.default ?? imported;
      const worker = await TesseractLib.createWorker("spa", undefined, {
        logger: (message: any) => {
          if (ocrLogger) ocrLogger(message);
        },
      });
      await worker.setParameters({
        tessedit_pageseg_mode: "6",
        preserve_interword_spaces: "1",
      });
      return worker;
    })().catch((error) => {
      ocrWorkerPromise = null;
      throw error;
    });
  }
  return ocrWorkerPromise;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function resizeCanvas(source: HTMLCanvasElement, maxWidth: number): HTMLCanvasElement {
  const scale = Math.min(1, maxWidth / source.width);
  if (scale === 1) return source;

  const canvas = createCanvas(
    Math.max(1, Math.round(source.width * scale)),
    Math.max(1, Math.round(source.height * scale))
  );
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return source;

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function videoToCanvas(video: HTMLVideoElement): Promise<HTMLCanvasElement | null> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(video);
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
    } else {
      context.drawImage(video, 0, 0, width, height);
    }
  } catch {
    context.drawImage(video, 0, 0, width, height);
  }

  return canvas;
}

function loadImageElement(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar la imagen"));
    };
    image.src = url;
  });
}

async function blobToCanvas(source: Blob): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(source);
      const canvas = createCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas no disponible");
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      return canvas;
    } catch {
      // Se intenta con <img> como respaldo.
    }
  }

  const image = await loadImageElement(source);
  const canvas = createCanvas(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas no disponible");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function preprocessForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const targetWidth = Math.min(2200, Math.max(1400, source.width));
  const scale = targetWidth / source.width;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return source;

  context.drawImage(source, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const contrast = 1.45;
  const intercept = 128 * (1 - contrast);

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    const value = Math.max(0, Math.min(255, contrast * gray + intercept));
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function describe(data: CedulaData): string {
  const parts: string[] = [];
  if (data.cedula) parts.push(`cédula ${data.cedula}`);
  if (data.nombre) parts.push(`nombre ${data.nombre}`);
  if (data.sexo) parts.push(`sexo ${data.sexo}`);
  if (data.edad) parts.push(`edad ${data.edad}`);
  const via = data.source === "pdf417" ? "código PDF417" : "texto (OCR)";
  return `Datos leídos por ${via}: ${parts.join(", ")}. Verifica y completa los campos.`;
}

export default function EscanerCedula({
  onData,
  disabled = false,
}: {
  onData: (data: CedulaData) => void;
  disabled?: boolean;
}) {
  const [status, setStatusText] = useState("");
  const [statusKind, setStatusKind] = useState<StatusKind>("info");
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const setStatus = useCallback((text: string, kind: StatusKind = "info") => {
    setStatusText(text);
    setStatusKind(kind);
  }, []);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
    setCameraActive(false);
    setVideoReady(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
    };
  }, []);

  // Conecta el stream al <video> después del render. No se detiene el stream
  // en este efecto para evitar que la cámara quede en negro.
  useEffect(() => {
    if (!cameraActive) return;

    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    let cancelled = false;
    video.srcObject = stream;

    const markReady = () => {
      if (cancelled) return;
      if (video.readyState >= 2) setVideoReady(true);
    };

    video.addEventListener("loadedmetadata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("playing", markReady);

    if (video.readyState >= 2) markReady();

    video.play().catch(() => {
      if (!cancelled) {
        setStatus("No se pudo iniciar la cámara. Vuelve a intentarlo.", "error");
      }
    });

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", markReady);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("playing", markReady);
    };
  }, [cameraActive, setStatus]);

  const startCamera = async () => {
    if (disabled || loading) return;

    const secure =
      typeof window !== "undefined" &&
      (window.isSecureContext ||
        ["localhost", "127.0.0.1"].includes(window.location.hostname));

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus(
        secure
          ? "Este navegador no soporta acceso a la cámara."
          : "La cámara requiere HTTPS. Usa 'Subir foto' o accede por HTTPS.",
        "error"
      );
      return;
    }

    stopCamera();
    setStatus("Solicitando permiso de cámara...", "info");

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setVideoReady(false);
      setCameraActive(true);
      setStatus(
        "Encuadra el reverso de la cédula (código de barras) y pulsa Capturar.",
        "info"
      );
    } catch {
      setStatus(
        "No se pudo acceder a la cámara. Revisa los permisos o usa 'Subir foto'.",
        "error"
      );
    }
  };

  const processImageSource = async (source: Blob | HTMLCanvasElement) => {
    setLoading(true);
    setStatus("Procesando imagen...", "info");

    try {
      let payload = null;

      if (source instanceof Blob) {
        setStatus("Buscando el código PDF417 del reverso...", "info");
        payload = await decodePdf417(source);
      }

      const canvas = source instanceof Blob ? await blobToCanvas(source) : source;

      if (!payload) {
        const scanCanvas = resizeCanvas(canvas, 2400);
        const context = scanCanvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          setStatus("Buscando el código PDF417 del reverso...", "info");
          payload = await decodePdf417(
            context.getImageData(0, 0, scanCanvas.width, scanCanvas.height)
          );
        }
      }

      let data = payload ? parseCedulaPdf417(payload) : null;

      if (!hasCedulaData(data)) {
        setStatus("No se detectó el código. Leyendo el texto del frente...", "info");

        ocrLogger = (message: any) => {
          if (message.status === "recognizing text") {
            const progress = Math.round((message.progress || 0) * 100);
            setStatus(`Leyendo texto de la cédula... ${progress}%`, "info");
          }
        };

        const worker = await getOcrWorker();
        const prepared = preprocessForOcr(canvas);
        const result = await worker.recognize(prepared);
        data = parseCedulaText(result.data.text);
      }

      if (data && hasCedulaData(data)) {
        onData(data);
        setStatus(describe(data), "success");
        stopCamera();
      } else {
        setStatus(
          "No se pudieron leer los datos. Acerca la cédula, evita reflejos y vuelve a intentar.",
          "error"
        );
      }
    } catch {
      setStatus("No fue posible leer la cédula. Intenta de nuevo.", "error");
    } finally {
      ocrLogger = null;
      if (mountedRef.current) setLoading(false);
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) {
      setStatus("La cámara aún no está lista. Espera un momento e intenta de nuevo.", "error");
      return;
    }

    setStatus("Capturando imagen...", "info");
    const canvas = await videoToCanvas(video);
    if (!canvas) {
      setStatus("No se pudo capturar la imagen de la cámara.", "error");
      return;
    }

    await processImageSource(canvas);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    stopCamera();
    await processImageSource(file);
  };

  const statusColor =
    statusKind === "error"
      ? { color: "#b91c1c", background: "#fef2f2", border: "#fecaca" }
      : statusKind === "success"
        ? { color: "#166534", background: "#f0fdf4", border: "#bbf7d0" }
        : { color: "#1d4ed8", background: "#eff6ff", border: "#bfdbfe" };

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "16px 18px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>
          📷 Escanear cédula
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#0369a1",
            background: "#e0f2fe",
            padding: "3px 8px",
            borderRadius: 999,
          }}
        >
          Reverso · PDF417
        </span>
      </div>

      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px" }}>
        El reverso de la cédula tiene un código PDF417 con los datos exactos. Si no se
        detecta, se leerá el frente por OCR.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <button
          type="button"
          disabled={disabled || loading || cameraActive}
          onClick={startCamera}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            background: disabled || loading || cameraActive ? "#94a3b8" : "#2563eb",
            color: "white",
            cursor: disabled || loading || cameraActive ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >
          {loading ? "Procesando..." : "📹 Abrir cámara"}
        </button>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            padding: "10px 14px",
            background: "#e2e8f0",
            color: "#0f172a",
            fontWeight: 700,
            cursor: disabled || loading ? "not-allowed" : "pointer",
            opacity: disabled || loading ? 0.6 : 1,
          }}
        >
          📁 Subir foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            disabled={disabled || loading}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {cameraActive && (
        <div
          style={{
            marginBottom: 12,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid #cbd5e1",
          }}
        >
          <div style={{ position: "relative", background: "#0f172a" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxHeight: 300,
                display: "block",
                objectFit: "cover",
                background: "#0f172a",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "14% 10%",
                border: "2px solid rgba(255,255,255,0.85)",
                borderRadius: 10,
                boxShadow: "0 0 0 9999px rgba(15,23,42,0.28)",
                pointerEvents: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, padding: 12, background: "#fff" }}>
            <button
              type="button"
              onClick={capture}
              disabled={!videoReady || loading}
              style={{
                flex: 1,
                border: "none",
                background: videoReady && !loading ? "#16a34a" : "#94a3b8",
                color: "white",
                borderRadius: 8,
                padding: "10px 12px",
                fontWeight: 700,
                cursor: videoReady && !loading ? "pointer" : "not-allowed",
              }}
            >
              {videoReady ? "Capturar" : "Preparando cámara..."}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              style={{
                flex: 1,
                border: "1px solid #dbeafe",
                background: "#f8fafc",
                color: "#1e293b",
                borderRadius: 8,
                padding: "10px 12px",
                fontWeight: 700,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {status && (
        <div
          style={{
            fontSize: 12,
            color: statusColor.color,
            background: statusColor.background,
            borderRadius: 8,
            padding: "8px 10px",
            border: `1px solid ${statusColor.border}`,
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}
