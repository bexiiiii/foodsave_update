"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const TextHoverEffect = ({
  text,
  duration,
  className,
}: {
  text: string;
  duration?: number;
  automatic?: boolean;
  className?: string;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({ cx: `${cxPercentage}%`, cy: `${cyPercentage}%` });
    }
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={cn("select-none uppercase cursor-pointer", className)}
    >
      <defs>
        <linearGradient id="textGradientFS" gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="25%">
          {hovered && (
            <>
              <stop offset="0%" stopColor="#a5d932" />
              <stop offset="25%" stopColor="#c8f050" />
              <stop offset="50%" stopColor="#a5d932" />
              <stop offset="75%" stopColor="#8ab82a" />
              <stop offset="100%" stopColor="#a5d932" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="revealMaskFS"
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="textMaskFS">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#revealMaskFS)" />
        </mask>
      </defs>

      <text
        x="50%" y="50%"
        textAnchor="middle" dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent font-[helvetica] text-7xl font-bold"
        style={{ stroke: 'rgba(165,217,50,0.15)', opacity: hovered ? 0.7 : 0 }}
      >
        {text}
      </text>

      <motion.text
        x="50%" y="50%"
        textAnchor="middle" dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent font-[helvetica] text-7xl font-bold"
        style={{ stroke: 'rgba(165,217,50,0.35)' }}
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{ strokeDashoffset: 0, strokeDasharray: 1000 }}
        transition={{ duration: 4, ease: "easeInOut" }}
      >
        {text}
      </motion.text>

      <text
        x="50%" y="50%"
        textAnchor="middle" dominantBaseline="middle"
        stroke="url(#textGradientFS)"
        strokeWidth="0.3"
        mask="url(#textMaskFS)"
        className="fill-transparent font-[helvetica] text-7xl font-bold"
      >
        {text}
      </text>
    </svg>
  );
};

export const FooterBackgroundGradient = () => {
  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        background: "radial-gradient(125% 125% at 50% 10%, rgba(10,71,40,0.4) 50%, rgba(165,217,50,0.15) 100%)",
      }}
    />
  );
};
