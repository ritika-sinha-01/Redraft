export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup-inner">
      <img src="/redraft-mark-v2.png" alt="" width={36} height={36} className="brand-mark-img" />
      {compact ? null : <span className="brand-word">Redraft</span>}
    </span>
  );
}
