"use client";

import React from "react";
import { useSubscriptionModal } from "@/utils/SubscriptionModalContext";

type Props = {
  label?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function SubscribeButton({
  label = "Subscribe",
  className = "",
  children,
}: Props) {
  const { open } = useSubscriptionModal();

  return (
    <button type="button" onClick={open} className={className}>
      {children || label}
    </button>
  );
}