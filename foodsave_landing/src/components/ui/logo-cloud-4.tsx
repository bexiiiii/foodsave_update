import Image from "next/image";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { cn } from "@/lib/utils";

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
  logos: Logo[];
};

export function LogoCloud({ logos, className, ...props }: LogoCloudProps) {
  return (
    <div
      className={cn(
        "relative mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-[#0a4728]/10 bg-gradient-to-r from-[#f9fff5] via-white to-[#f9fff5] py-6 md:px-4",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-[#0a4728]/10" />

      <InfiniteSlider gap={42} reverse speed={60} speedOnHover={20}>
        {logos.map((logo) => (
          <div
            key={`logo-${logo.alt}`}
            className="flex h-11 items-center justify-center rounded-2xl border border-[#0a4728]/8 bg-white/80 px-5 shadow-[0_10px_30px_rgba(10,71,40,0.05)]"
          >
            <Image
              alt={logo.alt}
              className="pointer-events-none h-5 w-auto select-none"
              height={logo.height ?? 24}
              loading="lazy"
              src={logo.src}
              unoptimized
              width={logo.width ?? 148}
            />
          </div>
        ))}
      </InfiniteSlider>

      <ProgressiveBlur
        blurIntensity={1}
        className="pointer-events-none absolute top-0 left-0 h-full w-[120px]"
        direction="left"
      />
      <ProgressiveBlur
        blurIntensity={1}
        className="pointer-events-none absolute top-0 right-0 h-full w-[120px]"
        direction="right"
      />

      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-[#0a4728]/10" />
    </div>
  );
}
