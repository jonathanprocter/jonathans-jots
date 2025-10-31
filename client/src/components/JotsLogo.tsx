interface JotsLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "horizontal";
  className?: string;
}

export function JotsLogo({
  size = "md",
  variant = "horizontal",
  className = "",
}: JotsLogoProps) {
  const sizes = {
    xs: { container: "h-6", text: "text-sm" },
    sm: { container: "h-8", text: "text-base" },
    md: { container: "h-12", text: "text-xl" },
    lg: { container: "h-16", text: "text-2xl" },
    xl: { container: "h-24", text: "text-4xl" },
  };

  if (variant === "icon") {
    return (
      <img
        src="/jots-icon.svg"
        alt="Jonathan's Jots"
        className={`${sizes[size].container} ${className}`}
      />
    );
  }

  if (variant === "full") {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <img
          src="/jots-logo.svg"
          alt="Jonathan's Jots"
          className={sizes[size].container}
        />
      </div>
    );
  }

  // horizontal variant (default)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/jots-logo.svg"
        alt="Jonathan's Jots"
        className={sizes[size].container}
      />
      <span
        className={`font-bold text-[#2E4057] tracking-wide ${sizes[size].text}`}
      >
        Jonathan's Jots
      </span>
    </div>
  );
}
