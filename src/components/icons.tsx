// Small hand-written inline-SVG icon set — avoids pulling in an icon library
// dependency we can't verify installs cleanly in this environment. Stroke
// icons, 24x24 viewBox, currentColor, consistent 1.8 stroke width.
import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>) {
  return { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...props };
}

// The "T + return arrow" mark — a T (for Tenvio) inside a mostly-closed
// circular arrow (customers coming back). The gradient uses userSpaceOnUse
// with absolute coordinates rather than the objectBoundingBox default:
// perfectly horizontal/vertical strokes (the T's bar and stem) have a
// zero-height or zero-width bounding box, and objectBoundingBox gradients
// silently render as invisible on those — a real, easy-to-hit SVG gotcha.
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={22} height={22} viewBox="0 0 48 48" {...props}>
      <defs>
        <linearGradient id="tenvioGrad" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          {/* brand-400 -> brand-600 — keep in sync with tailwind.config.ts theme.extend.colors.brand */}
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {/* Return-arrow ring, open near the top */}
      <path
        d="M 40.5 27 A 16.5 16.5 0 1 1 29 10"
        fill="none"
        stroke="url(#tenvioGrad)"
        strokeWidth={4}
        strokeLinecap="round"
      />
      {/* Arrowhead at the ring's open end */}
      <path d="M 25 6.5 L 32.5 8.8 L 27 14 Z" fill="url(#tenvioGrad)" />
      {/* T — bar and stem */}
      <path d="M15 21 H33" fill="none" stroke="url(#tenvioGrad)" strokeWidth={5.5} strokeLinecap="round" />
      <path d="M24 21 V37" fill="none" stroke="url(#tenvioGrad)" strokeWidth={5.5} strokeLinecap="round" />
    </svg>
  );
}

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </svg>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M16 14.6c2.6.5 4.5 2.5 4.5 5.4" />
    </svg>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </svg>
  );
}

export function LoyaltyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z" />
      <path d="M16 10h1.5a2 2 0 0 1 0 4H16" />
      <path d="M8 3.5c0 1-1 1-1 2s1 1 1 2M12 3.5c0 1-1 1-1 2s1 1 1 2" />
    </svg>
  );
}

export function MegaphoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3 10.5v3a1 1 0 0 0 1 1h1.8l4.2 3.8V5.7L5.8 9.5H4a1 1 0 0 0-1 1Z" />
      <path d="M14.5 8.2a3.8 3.8 0 0 1 0 7.6" />
      <path d="M17.3 5.5a7.5 7.5 0 0 1 0 13" />
    </svg>
  );
}

export function MessageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5h16v10H8.5L4 19V5.5Z" />
    </svg>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="11" cy="18" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3 5.1 1.5 1.5 0 0 1 4.5 3.5Z" />
    </svg>
  );
}

export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3L16 10" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.5c.6 3.6 2 5.9 5.5 6.5-3.5.6-4.9 2.9-5.5 6.5-.6-3.6-2-5.9-5.5-6.5 3.5-.6 4.9-2.9 5.5-6.5Z" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
