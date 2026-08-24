import Image from 'next/image';
import Link from 'next/link';

import type { Venue } from '@/lib/loveresta-data';

const posterThemes = [
  {
    background:
      'linear-gradient(135deg, rgba(var(--loveresta-accent-rgb), 0.96) 0%, rgba(var(--loveresta-accent-rgb), 0.82) 100%)',
    glow:
      'radial-gradient(circle at top left, rgba(var(--loveresta-primary-rgb), 0.14), transparent 34%)',
    ink: 'var(--loveresta-primary-bg)',
  },
  {
    background:
      'linear-gradient(135deg, rgba(var(--loveresta-accent-rgb), 1) 0%, rgba(var(--loveresta-primary-rgb), 0.34) 100%)',
    glow:
      'radial-gradient(circle at top center, rgba(var(--loveresta-bg-rgb), 0.1), transparent 34%)',
    ink: 'var(--loveresta-primary-bg)',
  },
  {
    background:
      'linear-gradient(135deg, rgba(var(--loveresta-accent-rgb), 0.88) 0%, rgba(var(--loveresta-primary-rgb), 0.22) 100%)',
    glow:
      'radial-gradient(circle at center, rgba(var(--loveresta-primary-rgb), 0.12), transparent 42%)',
    ink: 'var(--loveresta-primary-bg)',
  },
  {
    background:
      'linear-gradient(135deg, rgba(var(--loveresta-primary-rgb), 0.84) 0%, rgba(var(--loveresta-bg-rgb), 0.98) 100%)',
    glow:
      'radial-gradient(circle at center, rgba(var(--loveresta-bg-rgb), 0.34), transparent 40%)',
    ink: 'var(--loveresta-accent)',
  },
] as const;

export function VenueCard({
  venue,
  index,
}: {
  venue: Venue;
  index: number;
}) {
  const href = venue.kind === 'shop' ? `/shop/${venue.id}` : `/restaurant/${venue.id}`;
  const theme = posterThemes[index % posterThemes.length];
  const initials = venue.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (
    <Link
      aria-label={`Открыть ${venue.name}`}
      className="loveresta-venue-poster"
      href={href}
    >
      <article
        className="loveresta-venue-poster__card"
        style={{ background: theme.background, color: theme.ink }}
      >
        <div
          aria-hidden="true"
          className="loveresta-venue-poster__glow"
          style={{ background: theme.glow }}
        />

        {venue.logo ? (
          <Image
            src={venue.logo}
            alt={venue.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 900px) 286px, 340px"
            className="loveresta-venue-poster__bg-logo"
          />
        ) : (
          <div className="loveresta-venue-poster__initials" style={{ color: theme.ink }}>
            {initials}
          </div>
        )}
      </article>
    </Link>
  );
}
