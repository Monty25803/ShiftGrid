"use client";

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

export function BrandLogo({ size = 36, showWordmark = true, className = "" }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt="ShiftGrid"
        width={size}
        height={size}
        className="rounded-[22%] shadow-sm"
        style={{ width: size, height: size }}
      />
      {showWordmark ? (
        <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)]">
          ShiftGrid
        </span>
      ) : null}
    </span>
  );
}
