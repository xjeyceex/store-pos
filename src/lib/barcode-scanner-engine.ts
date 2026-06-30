import {
  BrowserMultiFormatOneDReader,
  BarcodeFormat,
} from "@zxing/browser";
import { DecodeHintType, NotFoundException } from "@zxing/library";

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
] as const;

type NativeBarcodeDetector = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

function createZxingReader() {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
  ]);
  return new BrowserMultiFormatOneDReader(hints);
}

async function createNativeDetector(): Promise<NativeBarcodeDetector | null> {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return null;
  }

  try {
    const Detector = (
      window as Window & {
        BarcodeDetector: new (opts: { formats: string[] }) => NativeBarcodeDetector;
      }
    ).BarcodeDetector;

    const supported: string[] = await (
      Detector as unknown as {
        getSupportedFormats?: () => Promise<string[]>;
      }
    ).getSupportedFormats?.() ?? [...BARCODE_FORMATS];

    const formats = BARCODE_FORMATS.filter((f) => supported.includes(f));
    if (formats.length === 0) return null;

    return new Detector({ formats });
  } catch {
    return null;
  }
}

function decodeWithZxing(
  reader: BrowserMultiFormatOneDReader,
  canvas: HTMLCanvasElement
): string | null {
  try {
    return reader.decodeFromCanvas(canvas).getText();
  } catch (err) {
    if (err instanceof NotFoundException) return null;
    return null;
  }
}

async function decodeWithNative(
  detector: NativeBarcodeDetector,
  source: ImageBitmapSource
): Promise<string | null> {
  try {
    const results = await detector.detect(source);
    const value = results[0]?.rawValue?.trim();
    return value || null;
  } catch {
    return null;
  }
}

function drawVideoRegion(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  region?: { x: number; y: number; w: number; h: number }
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return false;

  if (!region) {
    ctx.canvas.width = vw;
    ctx.canvas.height = vh;
    ctx.drawImage(video, 0, 0, vw, vh);
    return true;
  }

  const x = Math.floor(region.x * vw);
  const y = Math.floor(region.y * vh);
  const w = Math.floor(region.w * vw);
  const h = Math.floor(region.h * vh);

  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.drawImage(video, x, y, w, h, 0, 0, w, h);
  return true;
}

/** Scan one video frame using native API + ZXing on full frame and center strip. */
export async function decodeBarcodeFromVideo(
  video: HTMLVideoElement,
  reader: BrowserMultiFormatOneDReader,
  nativeDetector: NativeBarcodeDetector | null
): Promise<string | null> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const regions = [
    undefined,
    { x: 0.05, y: 0.38, w: 0.9, h: 0.24 },
    { x: 0.05, y: 0.3, w: 0.9, h: 0.4 },
  ];

  for (const region of regions) {
    if (!drawVideoRegion(ctx, video, region)) continue;

    if (nativeDetector) {
      const native = await decodeWithNative(nativeDetector, canvas);
      if (native) return native;
    }

    const zxing = decodeWithZxing(reader, canvas);
    if (zxing) return zxing;
  }

  return null;
}

export type BarcodeScanSession = {
  stop: () => void;
};

export async function startBarcodeScanLoop(
  video: HTMLVideoElement,
  onCode: (code: string) => void
): Promise<BarcodeScanSession> {
  const reader = createZxingReader();
  const nativeDetector = await createNativeDetector();

  let running = true;
  let busy = false;

  const tick = async () => {
    if (!running || busy) return;
    busy = true;
    try {
      const code = await decodeBarcodeFromVideo(video, reader, nativeDetector);
      if (code && running) onCode(code);
    } finally {
      busy = false;
      if (running) {
        window.setTimeout(tick, 80);
      }
    }
  };

  tick();

  return {
    stop: () => {
      running = false;
    },
  };
}

export async function getCameraStream(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1080, min: 480 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
      },
      audio: false,
    },
    { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("No camera available.");
}

export async function attachAndPlayVideo(
  video: HTMLVideoElement,
  stream: MediaStream
): Promise<void> {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");

  await video.play();

  if (video.videoWidth > 0) return;

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera preview did not start."));
    }, 8000);

    const onReady = () => {
      if (video.videoWidth > 0) {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("playing", onReady);
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("playing", onReady);
    onReady();
  });
}

export function cameraErrorMessage(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Camera needs a secure page. Open https:// (not http://), including on your phone.";
  }

  const message =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : "Unknown camera error";

  if (/Permission|NotAllowed|not allowed/i.test(message)) {
    return "Camera permission denied. Allow camera access in your browser or Windows privacy settings.";
  }
  if (/NotFound|no device|DevicesNotFound/i.test(message)) {
    return "No camera found on this device.";
  }
  if (/NotReadable|in use|TrackStart/i.test(message)) {
    return "Camera is in use by another app. Close it and try again.";
  }

  return `Could not open the camera: ${message}`;
}
