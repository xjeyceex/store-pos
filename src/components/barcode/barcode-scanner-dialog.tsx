"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ScanLine, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  attachAndPlayVideo,
  cameraErrorMessage,
  getCameraStream,
  startBarcodeScanLoop,
  type BarcodeScanSession,
} from "@/lib/barcode-scanner-engine";

type ScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  /** Keep camera open after each successful scan. */
  continuous?: boolean;
};

function stopStream(
  stream: MediaStream | null,
  video: HTMLVideoElement | null,
  session: BarcodeScanSession | null
) {
  session?.stop();
  stream?.getTracks().forEach((track) => track.stop());
  if (video) {
    video.srcObject = null;
  }
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
  continuous = false,
}: ScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const sessionRef = React.useRef<BarcodeScanSession | null>(null);
  const onScanRef = React.useRef(onScan);
  const onOpenChangeRef = React.useRef(onOpenChange);
  const continuousRef = React.useRef(continuous);
  const lastScanRef = React.useRef({ code: "", at: 0 });
  const [mounted, setMounted] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [manualCode, setManualCode] = React.useState("");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  React.useEffect(() => {
    continuousRef.current = continuous;
  }, [continuous]);

  const handleCode = React.useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (
      lastScanRef.current.code === trimmed &&
      now - lastScanRef.current.at < 1500
    ) {
      return;
    }
    lastScanRef.current = { code: trimmed, at: now };

    toast.message(`Scanned ${trimmed}`);
    onScanRef.current(trimmed);

    if (!continuousRef.current) {
      onOpenChangeRef.current(false);
    }
  }, []);

  React.useLayoutEffect(() => {
    if (!open) {
      stopStream(streamRef.current, videoRef.current, sessionRef.current);
      streamRef.current = null;
      sessionRef.current = null;
      lastScanRef.current = { code: "", at: 0 };
      setStarting(false);
      setActive(false);
      setCameraError(null);
      setManualCode("");
      return;
    }

    let disposed = false;

    async function startScanner() {
      setStarting(true);
      setCameraError(null);
      setActive(false);

      const video = videoRef.current;
      if (!video) return;

      try {
        const stream = await getCameraStream();
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        await attachAndPlayVideo(video, stream);
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const session = await startBarcodeScanLoop(video, (code) => {
          if (!disposed) handleCode(code);
        });

        if (disposed) {
          session.stop();
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        sessionRef.current = session;
        setActive(true);
      } catch (err) {
        if (disposed) return;
        const message = cameraErrorMessage(err);
        setCameraError(message);
        toast.error(message);
      } finally {
        if (!disposed) setStarting(false);
      }
    }

    void startScanner();

    return () => {
      disposed = true;
      stopStream(streamRef.current, videoRef.current, sessionRef.current);
      streamRef.current = null;
      sessionRef.current = null;
      setActive(false);
    };
  }, [open, handleCode]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        autoPlay
      />

      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 bg-black/50 p-4 text-white backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ScanLine className="size-5" />
          <div>
            <p className="font-medium">Scan Barcode</p>
            <p className="text-xs text-white/80">
              Hold steady, good light, barcode horizontal in the box
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-white hover:bg-white/20"
          onClick={() => onOpenChange(false)}
          aria-label="Close scanner"
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div
          className="h-28 w-full max-w-md rounded-md border-2 border-dashed border-white/90"
          aria-hidden
        />
      </div>

      <div className="relative z-10 shrink-0 space-y-3 bg-black/50 p-4 backdrop-blur-sm">
        {starting && !active ? (
          <p className="text-center text-sm text-white/90">Starting camera…</p>
        ) : null}
        {active ? (
          <p className="text-center text-sm text-white/90">
            Scanning… move closer or farther until lines look sharp.
          </p>
        ) : null}
        {cameraError ? (
          <p className="text-center text-sm text-red-300">{cameraError}</p>
        ) : null}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleCode(manualCode);
          }}
        >
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Or type barcode manually"
            className="bg-white/10 text-white placeholder:text-white/50"
            inputMode="numeric"
            autoComplete="off"
          />
          <Button type="submit" variant="secondary" disabled={!manualCode.trim()}>
            Go
          </Button>
        </form>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </div>
    </div>,
    document.body
  );
}

export function ScanBarcodeButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className={className}>
      <ScanLine className="size-4" />
      Scan
    </Button>
  );
}
