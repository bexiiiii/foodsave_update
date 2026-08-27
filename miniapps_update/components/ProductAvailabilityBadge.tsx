import { Product, getProductAvailabilityPresentation } from "../lib/api";

export default function ProductAvailabilityBadge({ product }: { product: Product }) {
  const presentation = getProductAvailabilityPresentation(product);
  if (presentation.state === "AVAILABLE") return null;

  const reserved = presentation.state === "RESERVED";
  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
      <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold text-white shadow-lg ${
        reserved ? "bg-[#D97706]" : "bg-black/70"
      }`}>
        {presentation.label}
      </span>
    </div>
  );
}
