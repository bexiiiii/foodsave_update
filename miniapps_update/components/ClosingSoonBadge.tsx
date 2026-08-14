import { Clock } from "lucide-react";

export default function ClosingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "inline-flex items-center gap-1 text-[11px] font-medium text-[#FF9500] bg-[#FF9500]/10 rounded-full px-2 py-0.5 font-inter"
      }
    >
      <Clock className="w-3 h-3" />
      Закрывается через час
    </span>
  );
}
