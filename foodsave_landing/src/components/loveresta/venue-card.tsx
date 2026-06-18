import { Heart, Star } from 'lucide-react';
import Link from 'next/link';

import type { Venue } from '@/lib/loveresta-data';

const posterThemes = [
  {
    background:
      'linear-gradient(135deg, rgba(var(--loveresta-accent-rgb), 0.96) 0%, rgba(var(--loveresta-accent-rgb), 0.82) 100%)',
    glow:
      'radial-gradient(circle at top left, rgba(var(--loveresta-primary-rgb), 0.14), transparent 34%)',
    ink: 'var(--loveresta-primary-bg)',
    chrome: 'rgba(var(--loveresta-bg-rgb), 0.12)',
    mark: 'rgba(var(--loveresta-bg-rgb), 0.48)',
  },
  {
    background:
      'linear-gradient(135deg, rgba(var(--loveresta-accent-rgb), 1) 0%, rgba(var(--loveresta-primary-rgb), 0.34) 100%)',
    glow:
      'radial-gradient(circle at top center, rgba(var(--loveresta-bg-rgb), 0.1), transparent 34%)',
    ink: 'var(--loveresta-primary-bg)',
    chrome: 'rgba(var(--loveresta-accent-rgb), 0.24)',
    mark: 'rgba(var(--loveresta-bg-rgb), 0.44)',
  },
  {
    background:
      'linear-gradient(135deg, rgba(var(--loveresta-accent-rgb), 0.88) 0%, rgba(var(--loveresta-primary-rgb), 0.22) 100%)',
    glow:
      'radial-gradient(circle at center, rgba(var(--loveresta-primary-rgb), 0.12), transparent 42%)',
    ink: 'var(--loveresta-primary-bg)',
    chrome: 'rgba(var(--loveresta-accent-rgb), 0.24)',
    mark: 'rgba(var(--loveresta-bg-rgb), 0.48)',
  },
  {
    background:
      'linear-gradient(135deg, rgba(var(--loveresta-primary-rgb), 0.84) 0%, rgba(var(--loveresta-bg-rgb), 0.98) 100%)',
    glow:
      'radial-gradient(circle at center, rgba(var(--loveresta-bg-rgb), 0.34), transparent 40%)',
    ink: 'var(--loveresta-accent)',
    chrome: 'rgba(var(--loveresta-bg-rgb), 0.34)',
    mark: 'rgba(var(--loveresta-accent-rgb), 0.28)',
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
  const wordmark = venue.posterWordmark ?? venue.name.toUpperCase();
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
        <div className="loveresta-venue-poster__top">
          <span className="loveresta-venue-poster__heart" aria-hidden="true">
            <Heart
              size={22}
              strokeWidth={2}
              style={{ backgroundColor: theme.chrome, color: 'var(--loveresta-primary)' }}
            />
          </span>
        </div>

        <div className="loveresta-venue-poster__center">
          <div
            className="loveresta-venue-poster__mark"
            aria-hidden="true"
            style={{ borderColor: theme.mark, color: theme.ink }}
          >
            <span>{initials}</span>
          </div>
          <strong className="loveresta-venue-poster__brand">{wordmark}</strong>
        </div>

        <div className="loveresta-venue-poster__bottom">
          <span className="loveresta-venue-poster__rating">
            <Star size={18} fill="currentColor" strokeWidth={1.8} />
            {venue.rating}
          </span>
        </div>
      </article>
    </Link>
  );
}
