"use client";

import React from "react";
import { useRouter } from "next/navigation";

type Props = {
  label?: string;
  className?: string;
  children?: React.ReactNode;
  onAfterClick?: () => void;
};

export default function SubscribeButton({
  label = "Subscribe",
  className = "",
  children,
  onAfterClick,
}: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        onAfterClick?.();
        router.push("/subscription");
      }}
      className={className}
    >
      {children || label}
    </button>
  );
}
