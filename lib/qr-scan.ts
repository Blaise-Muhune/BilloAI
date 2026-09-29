type Detected = { rawValue?: string };
type Detector = { detect: (source: ImageBitmapSource) => Promise<Detected[]> };

function barcodeDetector(): Detector | null {
  const Ctor = (window as Window & { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

export async function startQrScan(host: HTMLElement, onCode: (text: string) => void): Promise<() => Promise<void>> {
  const detector = barcodeDetector();
  if (detector) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
    });
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.autoplay = true;
    video.muted = true;
    video.className = "h-56 w-full rounded-2xl bg-black object-cover";
    video.srcObject = stream;
    host.replaceChildren(video);
    await video.play();
    let alive = true;
    let raf = 0;
    const tick = async () => {
      if (!alive) return;
      try {
        const value = (await detector.detect(video))[0]?.rawValue;
        if (value) {
          alive = false;
          onCode(value);
          return;
        }
      } catch {
        /* keep scanning */
      }
      raf = requestAnimationFrame(() => void tick());
    };
    void tick();
    return async () => {
      alive = false;
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((track) => track.stop());
      host.replaceChildren();
    };
  }

  const { Html5Qrcode } = await import("html5-qrcode");
  const node = document.createElement("div");
  node.id = `qr-reader-${crypto.randomUUID()}`;
  host.replaceChildren(node);
  const scanner = new Html5Qrcode(node.id);
  await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, onCode, () => undefined);
  return async () => {
    if (scanner.isScanning) await scanner.stop();
    host.replaceChildren();
  };
}

export async function scanQrFile(file: File): Promise<string> {
  const detector = barcodeDetector();
  if (detector) {
    const bitmap = await createImageBitmap(file);
    try {
      const value = (await detector.detect(bitmap))[0]?.rawValue?.trim() ?? "";
      if (value) return value;
    } finally {
      bitmap.close();
    }
  }
  const { Html5Qrcode } = await import("html5-qrcode");
  const node = document.createElement("div");
  node.id = `qr-file-${crypto.randomUUID()}`;
  node.className = "sr-only";
  document.body.appendChild(node);
  const scanner = new Html5Qrcode(node.id);
  try {
    return String(await scanner.scanFile(file, false)).trim();
  } finally {
    node.remove();
  }
}
