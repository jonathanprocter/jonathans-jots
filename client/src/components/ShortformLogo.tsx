export function ShortformLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 5L5 15L20 25L35 15L20 5Z"
          fill="#FFD700"
          stroke="#FFD700"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M20 25L5 35L20 45L35 35L20 25Z"
          fill="#FFD700"
          stroke="#FFD700"
          strokeWidth="2"
          strokeLinejoin="round"
          transform="translate(0, -10)"
        />
      </svg>
      <span className="text-2xl font-bold tracking-tight">SHORTFORM</span>
    </div>
  );
}

