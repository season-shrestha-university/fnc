import type { HTMLAttributes } from "react";

export default function RollCallLogo({
  className = "",
  compact = false,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center bg-[#17171a] ${
        compact ? "size-[27px] rounded-[9px]" : "size-12 rounded-[14px]"
      } ${className}`}
      {...props}
    >
      <svg
        className={compact ? "size-[18px]" : "size-8"}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 8.5V23.5M13 8.5V23.5M19 8.5V19"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M18 21L21.5 24.5L27 17"
          stroke="#7C7DF0"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
