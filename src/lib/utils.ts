import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Cross-platform helper to save a Blob directly to device storage when possible
// Tries File System Access API (best on Android PWAs), then Web Share (iOS/Android),
// and finally falls back to a normal browser download.
export async function saveBlobToDevice(
  blob: Blob,
  suggestedName: string,
  mimeType?: string
): Promise<"fs" | "share" | "download"> {
  const type = mimeType || blob.type || "application/octet-stream";
  const ext = suggestedName.includes(".")
    ? suggestedName.slice(suggestedName.lastIndexOf(".")).toLowerCase()
    : "";

  // 1) Try native file save (Chrome/Android supports this in PWAs)
  try {
    const w = window as any;
    if (typeof w.showSaveFilePicker === "function") {
      const handle = await w.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: type,
            accept: {
              [type]: ext ? [ext] : [""],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "fs";
    }
  } catch (e) {
    console.warn("showSaveFilePicker failed, will try share/download fallback", e);
  }

  // 2) Try Web Share with files (good on iOS & Android)
  try {
    const navAny = navigator as any;
    const file = new File([blob], suggestedName, { type });
    if (navAny.canShare?.({ files: [file] })) {
      await navAny.share({ files: [file], title: suggestedName, text: suggestedName });
      return "share";
    }
  } catch (e) {
    console.warn("navigator.share failed, will try download fallback", e);
  }

  // 3) Fallback to classic download (may open viewer on some mobile browsers)
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "download";
}

