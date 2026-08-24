"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { communicationsApi } from "@/services/api";
import { ProductService } from "@/services/productService";
import { CommunicationsOverviewDTO, NotificationScheduleSettingDTO } from "@/types/api";
import { ProductDTO } from "@/types/product";

const metricLabel: Record<string, string> = {
  sentToday: "Отправлено сегодня",
  openedToday: "Открыто",
  miniAppOpenedToday: "Mini App opens",
  boxViewedToday: "Просмотры боксов",
  reservationsCreatedToday: "Брони",
  completedOrdersToday: "Завершено",
  suppressedUsers: "Suppressed users",
};

const formatPercent = (value?: number) => `${(value || 0).toFixed(1)}%`;
const formatMoney = (value?: number) => `${Math.round(value || 0).toLocaleString("ru-KZ")} ₸`;

export default function CommunicationsPage() {
  const [overview, setOverview] = useState<CommunicationsOverviewDTO | null>(null);
  const [settings, setSettings] = useState<NotificationScheduleSettingDTO[]>([]);
  const [boxes, setBoxes] = useState<ProductDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deeplinkType, setDeeplinkType] = useState<"box" | "notification" | "partner" | "branch" | "campaign" | "telegram_post">("box");
  const [startParam, setStartParam] = useState("notification_1");
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [deeplink, setDeeplink] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const [overviewData, settingsData, productsData] = await Promise.all([
        communicationsApi.getOverview(),
        communicationsApi.getScheduleSettings(),
        ProductService.getAllProducts(0, 200),
      ]);
      setOverview(overviewData);
      setSettings(settingsData);
      setBoxes(productsData.content || []);
      if (!selectedBoxId && productsData.content?.[0]?.id) {
        setSelectedBoxId(String(productsData.content[0].id));
      }
    } catch (error) {
      console.error(error);
      toast.error("Не удалось загрузить коммуникации");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const metrics = useMemo(() => {
    if (!overview) return [];
    return [
      ["sentToday", overview.sentToday],
      ["openedToday", overview.openedToday],
      ["miniAppOpenedToday", overview.miniAppOpenedToday],
      ["boxViewedToday", overview.boxViewedToday],
      ["reservationsCreatedToday", overview.reservationsCreatedToday],
      ["completedOrdersToday", overview.completedOrdersToday],
      ["suppressedUsers", overview.suppressedUsers],
    ];
  }, [overview]);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Скопировано");
  };

  const buildDeeplink = async () => {
    try {
      const effectiveStartParam = deeplinkType === "box" ? `box_${selectedBoxId}` : startParam.trim();

      if (!effectiveStartParam || effectiveStartParam === "box_") {
        toast.error("Выберите бокс");
        return;
      }

      const url = await communicationsApi.getDeeplink(effectiveStartParam);
      setDeeplink(url);
      await copy(url);
    } catch (error) {
      console.error(error);
      toast.error("Не удалось создать deeplink");
    }
  };

  const updateSetting = async (setting: NotificationScheduleSettingDTO) => {
    try {
      const saved = await communicationsApi.updateScheduleSetting(setting);
      setSettings((items) => items.map((item) => (item.id === saved.id ? saved : item)));
      toast.success("Настройки сохранены");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось сохранить настройки");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Уведомления и коммуникации</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Продуктовая воронка, Telegram digest и schedule windows
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        >
          <RefreshCw className="h-4 w-4" />
          Обновить
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([key, value]) => (
          <div key={key} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">{metricLabel[String(key)]}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{Number(value).toLocaleString("ru-KZ")}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">CTR</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{formatPercent(overview?.ctr)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Notification → Reservation</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{formatPercent(overview?.notificationToReservationConversion)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Attributed revenue</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{formatMoney(overview?.attributedRevenue)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Deeplink generator</h2>
          <button
            onClick={buildDeeplink}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Copy className="h-4 w-4" />
            Скопировать
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <select
              value={deeplinkType}
              onChange={(event) => setDeeplinkType(event.target.value as typeof deeplinkType)}
              className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            >
              <option value="box">Бокс</option>
              <option value="notification">Notification</option>
              <option value="partner">Partner</option>
              <option value="branch">Branch</option>
              <option value="campaign">Campaign</option>
              <option value="telegram_post">Telegram post</option>
            </select>

            {deeplinkType === "box" ? (
              <select
                value={selectedBoxId}
                onChange={(event) => setSelectedBoxId(event.target.value)}
                className="h-11 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">Выберите бокс</option>
                {boxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    #{box.id} · {box.name} {box.storeName ? `· ${box.storeName}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={startParam}
                onChange={(event) => setStartParam(event.target.value)}
                className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                placeholder={`${deeplinkType}_123`}
              />
            )}
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
            <span className="truncate">{deeplink || "https://t.me/FoodSave_bot?startapp=box_123"}</span>
            <button onClick={() => copy(deeplink)} disabled={!deeplink} className="text-brand-500 disabled:text-gray-300">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-5 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule settings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr>
                {["Окно", "Вкл", "Сбор", "Отправка", "Конец", "Мин. боксов", "Мин. партнёров", "Лимит/день", "Пауза, ч", ""].map((head) => (
                  <th key={head} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {settings.map((setting, index) => (
                <tr key={setting.id || setting.notificationWindowType}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{setting.notificationWindowType}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={setting.enabled}
                      onChange={(event) => setSettings((items) => items.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item))}
                    />
                  </td>
                  {(["startTime", "sendTime", "endTime", "minimumTotalBoxes", "minimumPartners", "maximumMessagesPerUserPerDay", "minimumHoursBetweenMessages"] as const).map((field) => (
                    <td key={field} className="px-4 py-3">
                      <input
                        type={field.includes("Time") ? "time" : "number"}
                        value={setting[field] as string | number}
                        onChange={(event) => setSettings((items) => items.map((item, i) => i === index ? { ...item, [field]: field.includes("Time") ? event.target.value : Number(event.target.value) } : item))}
                        className="h-9 w-24 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <button onClick={() => updateSetting(setting)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-900 px-3 text-white dark:bg-white dark:text-gray-900">
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && settings.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">Нет настроек</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
