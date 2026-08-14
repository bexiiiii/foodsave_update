import { Clock } from "lucide-react";

export function formatMinutesUntilClose(minutes: number): string {
  const mod10 = minutes % 10;
  const mod100 = minutes % 100;
  let unit = "минут";
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) unit = "минуту";
    else if (mod10 >= 2 && mod10 <= 4) unit = "минуты";
  }
  return `${minutes} ${unit}`;
}

export function closingSoonLabel(minutes?: number): string {
  return minutes != null
    ? `Закрывается через ${formatMinutesUntilClose(minutes)}`
    : "Закрывается через час";
}

export default function ClosingSoonBadge({ minutes, className }: { minutes?: number; className?: string }) {
  return (
    <span
      className={
        className ??
        "inline-flex items-center gap-1 text-[11px] font-medium text-[#FF9500] bg-[#FF9500]/10 rounded-full px-2 py-0.5 font-inter"
      }
    >
      <Clock className="w-3 h-3" />
      {closingSoonLabel(minutes)}
    </span>
  );
}
