"use client";

import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { ReservationCancellationReason } from "../lib/api";

type CancelReasonOption = {
  value: ReservationCancellationReason;
  label: string;
  description: string;
};

const CANCEL_REASONS: CancelReasonOption[] = [
  {
    value: "USER_CHANGED_MIND",
    label: "Передумал",
    description: "Заказ больше не нужен",
  },
  {
    value: "USER_TOO_FAR",
    label: "Слишком далеко",
    description: "Не успеваю добраться",
  },
  {
    value: "USER_WRONG_TIME",
    label: "Не подходит время",
    description: "Не получается забрать в окно выдачи",
  },
  {
    value: "USER_ORDERED_BY_MISTAKE",
    label: "Заказал случайно",
    description: "Нажал бронирование по ошибке",
  },
  {
    value: "OTHER",
    label: "Другое",
    description: "Укажу причину вручную",
  },
];

interface CancelOrderSheetProps {
  isOpen: boolean;
  orderLabel?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: ReservationCancellationReason, comment?: string) => Promise<void> | void;
}

export default function CancelOrderSheet({
  isOpen,
  orderLabel,
  isSubmitting = false,
  onClose,
  onConfirm,
}: CancelOrderSheetProps) {
  const [selectedReason, setSelectedReason] = useState<ReservationCancellationReason | null>(null);
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const isOtherReason = selectedReason === "OTHER";
  const canSubmit = useMemo(() => {
    if (!selectedReason) return false;
    if (isOtherReason && comment.trim().length < 3) return false;
    return !isSubmitting;
  }, [comment, isOtherReason, isSubmitting, selectedReason]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedReason) {
      setValidationError("Выберите причину отмены.");
      return;
    }

    if (selectedReason === "OTHER" && comment.trim().length < 3) {
      setValidationError("Напишите коротко причину отмены.");
      return;
    }

    setValidationError(null);
    await onConfirm(selectedReason, comment.trim() || undefined);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedReason(null);
    setComment("");
    setValidationError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 px-3 pb-3">
      <div className="w-full rounded-[28px] bg-white p-4 shadow-2xl" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-500">Отмена заказа</p>
            <h2 className="mt-1 text-xl font-extrabold text-black">
              {orderLabel ? `Заказ #${orderLabel}` : "Укажите причину"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="fs-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black/70 transition active:scale-95 disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {CANCEL_REASONS.map((reason) => {
            const isSelected = selectedReason === reason.value;
            return (
              <button
                key={reason.value}
                type="button"
                onClick={() => {
                  setSelectedReason(reason.value);
                  setValidationError(null);
                }}
                disabled={isSubmitting}
                className={`w-full rounded-2xl border p-3 text-left transition-colors disabled:opacity-60 ${
                  isSelected ? "border-red-500 bg-red-50" : "border-black/[0.07] bg-white shadow-[0_3px_12px_rgba(20,45,24,0.04)]"
                }`}
              >
                <span className="block text-sm font-bold text-black">{reason.label}</span>
                <span className="mt-0.5 block text-xs font-medium text-black/50">{reason.description}</span>
              </button>
            );
          })}
        </div>

        {isOtherReason && (
          <textarea
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setValidationError(null);
            }}
            disabled={isSubmitting}
            className="mt-3 min-h-[84px] w-full resize-none rounded-2xl border border-gray-200 bg-white p-3 text-sm font-medium text-black outline-none focus:border-red-400 disabled:opacity-60"
            placeholder="Например: не успеваю забрать сегодня"
            maxLength={240}
          />
        )}

        {validationError && (
          <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{validationError}</p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#E5484D] text-sm font-extrabold text-white transition-colors active:scale-[0.99] disabled:bg-gray-300 disabled:text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Отменяем...
            </>
          ) : (
            "Подтвердить отмену"
          )}
        </button>
      </div>
    </div>
  );
}
