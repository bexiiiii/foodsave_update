import Link from 'next/link';

export function ActionLink({
  children,
  className,
  href,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
  onClick?: () => void;
}) {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a
        className={className}
        href={href}
        onClick={onClick}
        rel="noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href} onClick={onClick}>
      {children}
    </Link>
  );
}
