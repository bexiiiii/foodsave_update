import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

type Logo = {
  name: string;
  badge: string;
  type: string;
  accent?: string;
};

type LogoCloudProps = {
  logos: Logo[];
};

export function LogoCloud({ logos }: LogoCloudProps) {
  return (
    <div className="relative mx-auto max-w-4xl py-4">
      <InfiniteSlider gap={16} speed={40} speedOnHover={15}>
        {logos.map((logo) => (
          <div
            key={logo.name}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl flex-shrink-0 transition-all duration-300 hover:shadow-md"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(10,71,40,0.1)',
            }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: logo.accent
                  ? `linear-gradient(135deg, ${logo.accent}, rgba(10,71,40,0.9))`
                  : 'linear-gradient(135deg, #0a4728, #134f30)',
                boxShadow: '0 10px 24px rgba(10,71,40,0.12)',
              }}
            >
              <span
                className="text-white text-[11px] font-bold tracking-[0.18em]"
                style={{ fontFamily: 'Poppins, sans-serif', lineHeight: 1 }}
              >
                {logo.badge}
              </span>
            </div>
            <div>
              <div
                className="text-sm font-semibold whitespace-nowrap"
                style={{ fontFamily: 'Poppins, sans-serif', color: '#1A1A1A' }}
              >
                {logo.name}
              </div>
              <div
                className="text-xs whitespace-nowrap"
                style={{ color: '#6B6B6B', fontFamily: 'DM Sans, sans-serif' }}
              >
                {logo.type}
              </div>
            </div>
          </div>
        ))}
      </InfiniteSlider>

      <ProgressiveBlur
        blurIntensity={0.8}
        className="pointer-events-none absolute top-0 left-0 h-full w-[120px]"
        direction="left"
      />
      <ProgressiveBlur
        blurIntensity={0.8}
        className="pointer-events-none absolute top-0 right-0 h-full w-[120px]"
        direction="right"
      />
    </div>
  );
}
