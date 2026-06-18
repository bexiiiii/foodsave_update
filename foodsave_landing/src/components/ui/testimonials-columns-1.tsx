"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TestimonialItem {
  text: string;
  image: string;
  name: string;
  role: string;
  detail?: string;
  label?: string;
}

interface TestimonialsColumnProps {
  className?: string;
  testimonials: TestimonialItem[];
  duration?: number;
}

export function TestimonialsColumn({
  className,
  testimonials,
  duration = 16,
}: TestimonialsColumnProps) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {Array.from({ length: 2 }).map((_, index) => (
          <React.Fragment key={index}>
            {testimonials.map((testimonial) => (
              <article
                key={`${testimonial.name}-${index}`}
                className="relative max-w-[21rem] rounded-[28px] border border-[#0a4728]/10 bg-white p-6 shadow-[0_18px_50px_rgba(10,71,40,0.08)]"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <span className="inline-flex items-center rounded-full bg-[#f1f9df] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a4728]">
                    {testimonial.label ?? "Партнёр"}
                  </span>
                  <Quote className="h-5 w-5 text-[#a5d932]" strokeWidth={1.75} />
                </div>

                <p className="text-[15px] leading-7 text-[#1a1a1a]">
                  {testimonial.text}
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <Image
                    width={48}
                    height={48}
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full object-cover"
                    sizes="48px"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#0a4728]">
                      {testimonial.name}
                    </div>
                    <div className="text-sm leading-5 text-[#4f5c53]">
                      {testimonial.role}
                    </div>
                    {testimonial.detail ? (
                      <div className="mt-1 text-xs leading-5 text-[#7b847f]">
                        {testimonial.detail}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
