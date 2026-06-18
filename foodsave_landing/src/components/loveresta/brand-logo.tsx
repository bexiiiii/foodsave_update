import Image from 'next/image';

import { cn } from '@/lib/utils';

export function BrandLogo({
  alt = 'FoodSave',
  className,
  priority = false,
}: {
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      alt={alt}
      className={cn('loveresta-brand-logo', className)}
      height={133}
      priority={priority}
      src="/loveresta/logo/logo.svg"
      width={642}
    />
  );
}
