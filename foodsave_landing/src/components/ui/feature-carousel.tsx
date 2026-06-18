"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import {
  Leaf01FreeIcons,
  UserGroup02FreeIcons,
  SmartPhone01FreeIcons,
  ChartIncreaseFreeIcons,
  MapPinFreeIcons,
  ZapFreeIcons,
  Award01FreeIcons,
  Clock01FreeIcons,
  HeartCheckFreeIcons,
  Store01FreeIcons,
} from "@hugeicons/core-free-icons";

const FEATURES = [
  {
    id: "rescue",
    label: "Спасение еды",
    icon: Leaf01FreeIcons,
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200",
    description: "Спасаем свежую еду от свалки — один заказ за раз.",
  },
  {
    id: "savings",
    label: "Экономия",
    icon: ChartIncreaseFreeIcons,
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200",
    description: "Скидки до 50% в любимых местах Астаны.",
  },
  {
    id: "community",
    label: "Сообщество",
    icon: UserGroup02FreeIcons,
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200",
    description: "Присоединяйтесь к тысячам казахстанцев, которые выбирают осознанное потребление.",
  },
  {
    id: "mobile",
    label: "Мини-приложение Telegram",
    icon: SmartPhone01FreeIcons,
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200",
    description: "Просматривайте, бронируйте и забирайте всё прямо в Telegram.",
  },
  {
    id: "partners",
    label: "Сеть партнёров",
    icon: Store01FreeIcons,
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200",
    description: "Более 1 000 ресторанов и кафе уже подключены.",
  },
  {
    id: "pickup",
    label: "Удобный самовывоз",
    icon: MapPinFreeIcons,
    image: "https://images.unsplash.com/photo-1526367790999-0150786686a2?q=80&w=1200",
    description: "Забирайте заказ за 30 минут в ближайшей точке.",
  },
  {
    id: "realtime",
    label: "Новые предложения",
    icon: ZapFreeIcons,
    image: "https://images.unsplash.com/photo-1551288049-bbda38a10ad5?q=80&w=1200",
    description: "Новые предложения появляются каждый час. Обновляйте, чтобы увидеть свежие варианты.",
  },
  {
    id: "impact",
    label: "Реальный эффект",
    icon: Award01FreeIcons,
    image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=1200",
    description: "Каждый заказ сокращает выбросы CO₂ и помогает семьям, которым нужна поддержка.",
  },
  {
    id: "daily",
    label: "Ежедневная привычка",
    icon: Clock01FreeIcons,
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200",
    description: "Сделайте осознанный выбор частью своей повседневной рутины.",
  },
  {
    id: "love",
    label: "Сделано в Казахстане",
    icon: HeartCheckFreeIcons,
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200",
    description: "Создано с любовью к Казахстану и его яркой гастрономии.",
  },
];

const AUTO_PLAY_INTERVAL = 3000;
const ITEM_HEIGHT = 65;

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export function FeatureCarousel() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentIndex = ((step % FEATURES.length) + FEATURES.length) % FEATURES.length;

  const nextStep = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  const handleChipClick = (index: number) => {
    const diff = (index - currentIndex + FEATURES.length) % FEATURES.length;
    if (diff > 0) setStep((s) => s + diff);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [nextStep, isPaused]);

  const getCardStatus = (index: number) => {
    const diff = index - currentIndex;
    const len = FEATURES.length;
    let normalizedDiff = diff;
    if (diff > len / 2) normalizedDiff -= len;
    if (diff < -len / 2) normalizedDiff += len;
    if (normalizedDiff === 0) return "active";
    if (normalizedDiff === -1) return "prev";
    if (normalizedDiff === 1) return "next";
    return "hidden";
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
      <div
        className="relative overflow-hidden rounded-[2.5rem] lg:rounded-[3rem] flex flex-col lg:flex-row min-h-[600px] lg:aspect-video"
        style={{ border: '1px solid rgba(10,71,40,0.15)' }}
      >
        {/* Left panel */}
        <div
          className="w-full lg:w-[40%] min-h-[350px] md:min-h-[450px] lg:h-full relative z-30 flex flex-col items-start justify-center overflow-hidden px-8 md:px-16 lg:pl-16"
          style={{ background: '#0a4728' }}
        >
          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 h-16 lg:h-20 z-40"
            style={{ background: 'linear-gradient(to bottom, #0a4728, transparent)' }} />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-16 lg:h-20 z-40"
            style={{ background: 'linear-gradient(to top, #0a4728, transparent)' }} />

          <div className="relative w-full h-full flex items-center justify-center lg:justify-start z-20">
            {FEATURES.map((feature, index) => {
              const isActive = index === currentIndex;
              const distance = index - currentIndex;
              const wrappedDistance = wrap(-(FEATURES.length / 2), FEATURES.length / 2, distance);

              return (
                <motion.div
                  key={feature.id}
                  style={{ height: ITEM_HEIGHT, width: "fit-content" }}
                  animate={{
                    y: wrappedDistance * ITEM_HEIGHT,
                    opacity: 1 - Math.abs(wrappedDistance) * 0.25,
                  }}
                  transition={{ type: "spring", stiffness: 90, damping: 22, mass: 1 }}
                  className="absolute flex items-center justify-start"
                >
                  <button
                    onClick={() => handleChipClick(index)}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className={cn(
                      "relative flex items-center gap-4 px-6 md:px-8 py-3.5 rounded-full transition-all duration-700 text-left group border",
                      isActive
                        ? "border-transparent z-10"
                        : "bg-transparent border-white/15 hover:border-white/30"
                    )}
                    style={isActive ? { background: '#a5d932', color: '#0a4728' } : { color: 'rgba(255,255,255,0.55)' }}
                  >
                    <HugeiconsIcon icon={feature.icon} size={18} primaryColor={isActive ? '#0a4728' : 'rgba(255,255,255,0.4)'} strokeWidth={2} />
                    <span
                      className="font-semibold text-sm tracking-tight whitespace-nowrap uppercase"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {feature.label}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right panel — image carousel */}
        <div
          className="flex-1 min-h-[500px] md:min-h-[600px] lg:h-full relative flex items-center justify-center py-16 md:py-24 lg:py-16 px-6 md:px-12 lg:px-10 overflow-hidden"
          style={{ background: '#f9fff5', borderLeft: '1px solid rgba(10,71,40,0.08)' }}
        >
          <div className="relative w-full max-w-[420px] aspect-[4/5] flex items-center justify-center">
            {FEATURES.map((feature, index) => {
              const status = getCardStatus(index);
              const isActive = status === "active";
              const isPrev = status === "prev";
              const isNext = status === "next";

              return (
                <motion.div
                  key={feature.id}
                  initial={false}
                  animate={{
                    x: isActive ? 0 : isPrev ? -100 : isNext ? 100 : 0,
                    scale: isActive ? 1 : isPrev || isNext ? 0.85 : 0.7,
                    opacity: isActive ? 1 : isPrev || isNext ? 0.35 : 0,
                    rotate: isPrev ? -3 : isNext ? 3 : 0,
                    zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 25, mass: 0.8 }}
                  className="absolute inset-0 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden origin-center"
                  style={{ border: '6px solid #ffffff', boxShadow: '0 20px 60px rgba(10,71,40,0.15)' }}
                >
                  <Image
                    src={feature.image}
                    alt={feature.label}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 420px"
                    className={cn(
                      "w-full h-full object-cover transition-all duration-700",
                      isActive ? "grayscale-0 blur-0" : "grayscale blur-[2px] brightness-75"
                    )}
                  />

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute inset-x-0 bottom-0 p-8 pt-32 flex flex-col justify-end pointer-events-none"
                        style={{ background: 'linear-gradient(to top, rgba(10,71,40,0.92), rgba(10,71,40,0.4), transparent)' }}
                      >
                        <div
                          className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest w-fit mb-3"
                          style={{ background: '#a5d932', color: '#0a4728', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {index + 1} · {feature.label}
                        </div>
                        <p
                          className="text-white font-normal text-xl md:text-2xl leading-tight drop-shadow-md tracking-tight"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                          {feature.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isActive && (
                    <div className="absolute top-6 left-6 flex items-center gap-2.5">
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: '#a5d932', boxShadow: '0 0 10px #a5d932' }}
                      />
                      <span
                        className="text-white/80 text-[10px] font-medium uppercase tracking-widest"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        FoodSave
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel;
