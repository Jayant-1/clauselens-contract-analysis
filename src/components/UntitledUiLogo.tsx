import React from "react";
import Image from "next/image";

interface UntitledUiLogoProps {
  className?: string;
  size?: number;
}

export function UntitledUiLogo({ className = "w-7 h-7", size = 28 }: UntitledUiLogoProps) {
  return (
    <Image
      src="/untitled-ui-icon.png"
      alt="Untitled UI Icon"
      width={size}
      height={size}
      unoptimized
      className={`rounded-lg object-contain shadow-2xs ${className}`}
    />
  );
}
