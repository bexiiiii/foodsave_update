import { Product, getProductAvailabilityPresentation } from "../lib/api";
import { LockKeyhole } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

export default function ProductAvailabilityBadge({ product }: { product: Product }) {
  const { t } = useTranslation();
  const presentation = getProductAvailabilityPresentation(product);
  if (presentation.state === "AVAILABLE") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] bg-slate-900/20 backdrop-blur-[1.5px]">
      <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-bold text-[#26312B] shadow-[0_8px_24px_rgba(25,35,29,0.16)] backdrop-blur-md font-inter">
        <LockKeyhole className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
        <span className="truncate">{t("boxReserved")}</span>
      </span>
    </div>
  );
}
