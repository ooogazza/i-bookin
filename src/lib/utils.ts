import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to detect mobile devices
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

// Cross-platform helper to save a Blob directly to device storage when possible
// Always triggers a direct download without opening new tabs or share sheets
export async function saveBlobToDevice(
  blob: Blob,
  suggestedName: string,
  mimeType?: string
): Promise<"fs" | "share" | "download"> {
  const type = mimeType || blob.type || "application/octet-stream";

  try {
    // Force classic download path (works on Android Chrome and most browsers)
    const fileBlob = blob.type ? blob : new Blob([blob], { type });
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = suggestedName;
    a.rel = "noopener";
    a.target = "_self";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return "download";
  } catch (e) {
    console.error("Direct download failed, attempting fallback", e);
    // Last resort fallback: navigate to the blob URL (browser handles saving)
    const fallbackUrl = URL.createObjectURL(blob);
    window.location.href = fallbackUrl;
    setTimeout(() => URL.revokeObjectURL(fallbackUrl), 30000);
    return "download";
  }
}

