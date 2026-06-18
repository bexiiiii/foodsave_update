"use client";

import { motion } from "motion/react";
import { LogoCloud } from "@/components/ui/logo-cloud-4";
import {
  TestimonialsColumn,
  type TestimonialItem,
} from "@/components/ui/testimonials-columns-1";

const testimonials: TestimonialItem[] = [
  {
    label: "Партнёр",
    text: "Интеграция с нашей POS-системой заняла 15 минут. Команда FoodSave очень помогла. Теперь у нас почти не остается хлебных остатков в конце дня, и это действительно приводит новых клиентов в нашу пекарню.",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    name: "Айзат Б.",
    role: "Менеджер пекарни Bread & Co · Астана",
    detail: "Ноль отходов по вторникам и пятницам · Партнёр с I квартала 2024",
  },
  {
    label: "Партнёр",
    text: "Через FoodSave мы начали распродавать готовые салаты в последние два часа смены. Вечерние списания сократились почти вдвое, а новые гости потом возвращаются уже за полным меню.",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=80",
    name: "Мадина Т.",
    role: "Операционный менеджер Green Bowl · Астана",
    detail: "-48% вечерних списаний · Партнёр с августа 2024",
  },
  {
    label: "Партнёр",
    text: "Запуск занял один вечер. Команда подключила нас без сложной доработки кассы, а остатки теперь уходят в тот же день вместо того, чтобы лежать до закрытия.",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    name: "Тимур Н.",
    role: "Совладелец Kaganat Street Food · Астана",
    detail: "+14% к выручке в непиковые часы · Партнёр с мая 2024",
  },
  {
    label: "Партнёр",
    text: "FoodSave хорошо работает именно для кондитерки: наборы продаются быстро, а мы заранее понимаем, сколько изделий реально спасём до конца дня.",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80",
    name: "Алина Ж.",
    role: "Руководитель кондитерской La Patisserie · Астана",
    detail: "До 36 коробок спасаем в день · Партнёр с ноября 2024",
  },
  {
    label: "Партнёр",
    text: "Гости сначала приходят за выгодным набором, а потом знакомятся с брендом. Для нас это оказался не просто канал распродажи, а понятный маркетинг без лишних расходов.",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
    name: "Ерлан С.",
    role: "Управляющий Nomad Eats · Астана",
    detail: "1 из 4 гостей возвращается повторно · Партнёр с июня 2024",
  },
  {
    label: "Партнёр",
    text: "Мы переживали, что команде будет сложно привыкнуть, но всё оказалось очень просто. От публикации набора до получения заказа уходит несколько минут.",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=160&q=80",
    name: "Диана К.",
    role: "Менеджер Vita Juice Bar · Астана",
    detail: "15 минут на обучение смены · Партнёр с сентября 2024",
  },
  {
    label: "Партнёр",
    text: "До подключения к FoodSave мы просто списывали оставшийся хлеб и горячие блюда. Сейчас эти позиции приносят дополнительную выручку и помогают нам лучше планировать производство.",
    image:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=160&q=80",
    name: "Руслан М.",
    role: "Владелец Astana Grill Market · Астана",
    detail: "+12–18% в тихие часы · Партнёр с I квартала 2024",
  },
  {
    label: "Партнёр",
    text: "Нам было важно показать, что устойчивость может быть удобной для бизнеса. FoodSave дал понятный инструмент, который одновременно поддерживает продажи и репутацию.",
    image:
      "https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?auto=format&fit=crop&w=160&q=80",
    name: "Сауле А.",
    role: "Маркетинг-директор Daily Bowl · Астана",
    detail: "ESG-коммуникация без лишних затрат · Партнёр с декабря 2024",
  },
  {
    label: "Партнёр",
    text: "Платформа даёт нам живой спрос на остатки без отдельного приложения и долгой настройки. Для небольшого кафе это именно тот формат, который реально работает каждый день.",
    image:
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=160&q=80",
    name: "Арман К.",
    role: "Основатель Coffee Dock · Астана",
    detail: "Мини-приложение внутри Telegram · Партнёр с января 2025",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const createWordmark = (name: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="44" viewBox="0 0 220 44" fill="none">
      <rect width="220" height="44" rx="22" fill="white"/>
      <circle cx="22" cy="22" r="8" fill="${accent}"/>
      <text x="40" y="27" fill="#0A4728" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700">${name}</text>
    </svg>
  `)}`;

const logos = [
  { src: createWordmark("Bread & Co", "#a5d932"), alt: "Bread & Co", width: 220, height: 44 },
  { src: createWordmark("Green Bowl", "#3a9b6a"), alt: "Green Bowl", width: 220, height: 44 },
  { src: createWordmark("Kaganat", "#0a4728"), alt: "Kaganat", width: 190, height: 44 },
  { src: createWordmark("La Patisserie", "#c97a48"), alt: "La Patisserie", width: 230, height: 44 },
  { src: createWordmark("Nomad Eats", "#5f8f2c"), alt: "Nomad Eats", width: 220, height: 44 },
  { src: createWordmark("Vita Juice", "#2aab75"), alt: "Vita Juice", width: 210, height: 44 },
  { src: createWordmark("Coffee Dock", "#4a6b58"), alt: "Coffee Dock", width: 220, height: 44 },
];

export default function TestimonialsColumnsDemo() {
  return (
    <section className="relative overflow-hidden py-24" style={{ background: "#f9fff5" }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(165,217,50,0.1) 0%, transparent 30%), radial-gradient(circle at 82% 42%, rgba(10,71,40,0.05) 0%, transparent 34%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto max-w-2xl text-center"
        >
          

          <h2
            className="mt-6 leading-tight"
            style={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "#1A1A1A",
              letterSpacing: "-0.03em",
            }}
          >
           Наши партнёры о FoodSave: <span style={{ color: "#0a4728" }}>реальные результаты</span>
          </h2>

          
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10"
        >
          <LogoCloud logos={logos} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, amount: 0.2 }}
          className="mt-14 flex max-h-[760px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
        >
          <TestimonialsColumn testimonials={firstColumn} duration={18} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={21}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden xl:block"
            duration={19}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, amount: 0.3 }}
          className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-[#4f5c53]"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          
        </motion.div>
      </div>
    </section>
  );
}
