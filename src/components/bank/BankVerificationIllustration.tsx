import { useId } from "react";
/** Lightweight vector asset, crisp at every screen density. */
export function BankVerificationIllustration() {
  const id = useId().replace(/:/g, "");
  return <svg viewBox="0 0 240 200" fill="none" aria-hidden="true" className="h-auto w-full">
    <defs><linearGradient id={`${id}-paper`} x1="72" y1="30" x2="170" y2="160" gradientUnits="userSpaceOnUse"><stop stopColor="white" /><stop offset="1" stopColor="#E0E7FF" /></linearGradient></defs>
    <circle cx="122" cy="102" r="85" fill="white" fillOpacity=".08" />
    <circle cx="122" cy="102" r="69" stroke="white" strokeOpacity=".16" strokeDasharray="4 8" />
    <ellipse cx="126" cy="176" rx="73" ry="9" fill="#1E1B4B" fillOpacity=".16" />
    <rect x="78" y="29" width="112" height="137" rx="17" transform="rotate(9 78 29)" fill="#A5B4FC" fillOpacity=".6" />
    <rect x="60" y="31" width="112" height="137" rx="16" fill={`url(#${id}-paper)`} />
    <path d="m82 76 34-21 34 21H82Z" fill="#6366F1" /><path d="M84 82h64M84 124h64" stroke="#818CF8" strokeWidth="6" strokeLinecap="round" />
    <path d="M92 91v24m24-24v24m24-24v24" stroke="#818CF8" strokeWidth="8" strokeLinecap="round" />
    <path d="M82 140h40m-40 9h29" stroke="#A5B4FC" strokeWidth="4" strokeLinecap="round" />
    <circle cx="174" cy="143" r="30" fill="#FEF3C7" stroke="white" strokeWidth="5" />
    <circle cx="174" cy="143" r="16" stroke="#D97706" strokeWidth="3" /><path d="M174 133v11l7 4" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
    <rect x="30" y="93" width="21" height="21" rx="7" transform="rotate(-12 30 93)" fill="white" fillOpacity=".22" />
    <path d="m193 45 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#FDE68A" />
    <circle cx="47" cy="56" r="4" fill="white" fillOpacity=".6" />
  </svg>;
}
