// Brief loading screen shown while we fetch the ephemeral token and
// establish the WebRTC connection. Shows Sarah's avatar with pulsing rings.
"use client";

import Image from "next/image";
import { Spinner } from "@heroui/react";
import { motion } from "framer-motion";

type CallConnectingViewProps = {};

export function CallConnectingView({}: CallConnectingViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen items-center justify-center bg-surface-dark p-4"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative avatar-shimmer rounded-full">
          <Image
            src="/sarah.png"
            alt="Sarah"
            width={96}
            height={96}
            className="rounded-full"
            priority
          />
          {/* Pulsing rings */}
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-brand"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-brand"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5,
            }}
          />
        </div>
        <div className="text-center flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-white">
            Connecting to Sarah...
          </p>
          <Spinner size="sm" color="primary" />
        </div>
      </div>
    </motion.div>
  );
}
