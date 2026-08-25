"use client";

import { CheckCircle, Loader2, X } from "lucide-react";

interface PickedUpOrderSheetProps {
  isOpen: boolean;
  orderLabel?: string;
  storeName?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function PickedUpOrderSheet({
  isOpen,
  orderLabel,
  storeName,
  isSubmitting = false,
  onClose,
  onConfirm,
}: PickedUpOrderSheetProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 px-3 pb-3">
      <div className="w-full rounded-[28px] bg-white p-4 shadow-2xl" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4CAD73]">Получение заказа</p>
            <h2 className="mt-1 text-xl font-extrabold text-black">
              {orderLabel ? `Заказ #${orderLabel}` : "Заказ забран?"}
            </h2>
            {storeName && <p className="mt-1 text-sm font-medium text-black/50">{storeName}</p>}
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-black/70 disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-[#4CAD73]/10 p-4">
          <div className="flex gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#15551F]" />
            <div>
              <p className="text-sm font-bold text-black">Подтвердите, что заказ уже у вас.</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-black/55">
                После подтверждения заказ уйдет в историю, а напоминания о выдаче больше не придут.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex h-12 items-center justify-center rounded-2xl bg-gray-100 text-sm font-extrabold text-black transition-colors active:scale-[0.99] disabled:opacity-60"
          >
            Нет
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#4CAD73] text-sm font-extrabold text-white transition-colors active:scale-[0.99] disabled:bg-[#4CAD73]/50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Сохраняем...
              </>
            ) : (
              "Да, забрал(а)"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
