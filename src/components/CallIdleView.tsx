// Landing screen — shown before a call starts. Displays the business info,
// Sarah's avatar, and the big green call button. This is the first thing
// users see when they open the app.
"use client";

import Image from "next/image";
import { Button, Chip, Card, CardBody } from "@heroui/react";
import { motion } from "framer-motion";

type CallIdleViewProps = {
  onStartCall: () => void;
};

// Quick-glance business details shown as colored pills
const features = [
  { icon: "clock", label: "Mon–Fri 8AM–6PM" },
  { icon: "tool", label: "AC & Heating" },
  { icon: "shield", label: "24/7 Emergency" },
  { icon: "dollar", label: "$89 Service Call" },
];

// Maps icon names to inline SVG paths — avoids importing an icon library
function FeatureIcon({ icon }: { icon: string }) {
  const paths: Record<string, React.ReactNode> = {
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    tool: (
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    dollar: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  };

  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[icon]}
    </svg>
  );
}

export function CallIdleView({ onStartCall }: CallIdleViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen flex-col items-center justify-center bg-panel p-4"
    >
      {/* CallDraft Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center">
          <svg
            className="w-4 h-4 text-brand"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-fg">CallDraft</h1>
      </div>

      <Card className="w-full max-w-xl border border-border shadow-md rounded-lg">
        <CardBody className="flex flex-col items-center gap-8 py-10 px-6 md:px-10">
          {/* Company branding */}
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-lg font-semibold text-fg">
              Anderson Heating & Cooling
            </h2>
            <p className="text-xs text-muted-fg">Dallas, TX</p>
          </div>

          {/* Feature chips row */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {features.map((f) => (
              <Chip
                key={f.label}
                size="sm"
                variant="flat"
                color="primary"
                startContent={<FeatureIcon icon={f.icon} />}
                classNames={{ content: "text-xs" }}
              >
                {f.label}
              </Chip>
            ))}
          </div>

          {/* Sarah avatar with shimmer */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative avatar-shimmer rounded-full">
              <Image
                src="/sarah.png"
                alt="Sarah"
                width={96}
                height={96}
                className="rounded-full"
                priority
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-success rounded-full border-2 border-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-fg">Sarah</p>
              <p className="text-xs text-muted-fg">Virtual Receptionist</p>
            </div>
            <Chip
              size="sm"
              color="success"
              variant="flat"
              startContent={
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-success"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              }
            >
              Available now
            </Chip>
          </div>

          {/* Call button */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Button
                isIconOnly
                color="success"
                className="w-16 h-16 min-w-0 rounded-full shadow-lg"
                onPress={onStartCall}
              >
                <svg
                  className="w-7 h-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </Button>
            </motion.div>
            <p className="text-xs text-muted-fg">
              Tap to start a voice call with Sarah
            </p>
          </div>

          {/* Bottom info */}
          <div className="flex items-center gap-4 text-[10px] text-muted-fg">
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Secure connection
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="1" width="6" height="11" rx="3" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Voice powered by AI
            </span>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
