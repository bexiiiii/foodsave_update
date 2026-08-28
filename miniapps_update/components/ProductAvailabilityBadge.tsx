import { Product, getProductAvailabilityPresentation } from "../lib/api";
import { CircleX, LockKeyhole } from "lucide-react";

export default function ProductAvailabilityBadge({ product }: { product: Product }) {
  const presentation = getProductAvailabilityPresentation(product);
  if (presentation.state === "AVAILABLE") return null;

  const reserved = presentation.state === "RESERVED";
  const soldOut = presentation.state === "SOLD_OUT";
  const StatusIcon = reserved ? LockKeyhole : CircleX;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-black/45 via-black/5 to-transparent">
      <span className={`absolute bottom-2 left-2 inline-flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-[0_6px_18px_rgba(0,0,0,0.18)] font-inter ${
        reserved
          ? "bg-[#F28C00] text-white"
          : soldOut
            ? "bg-white/95 text-black/75"
            : "bg-black/70 text-white"
      }`}>
        <StatusIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
        <span className="truncate">{presentation.label}</span>
      </span>
    </div>
  );
}
