"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Chip, Divider } from "@heroui/react";
import { motion } from "framer-motion";
import type { ExtractedEntities } from "@/lib/conversationAnalyzer";

type ToolCallCardProps = {
  entities: ExtractedEntities;
};

export function ToolCallCard({ entities }: ToolCallCardProps) {
  const [status, setStatus] = useState<"pending" | "confirmed">("pending");

  useEffect(() => {
    const timer = setTimeout(() => setStatus("confirmed"), 3000);
    return () => clearTimeout(timer);
  }, []);

  const details = [
    { label: "Name", value: entities.name },
    { label: "Phone", value: entities.phone },
    { label: "Address", value: entities.address },
    { label: "Time", value: entities.time },
    { label: "Issue", value: entities.issue },
  ].filter((d) => d.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border border-border shadow-sm rounded-md bg-white">
        <CardBody className="p-4 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-brand-light flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-brand"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-fg">Book Appointment</p>
            </div>
            <Chip
              size="sm"
              variant="flat"
              color={status === "confirmed" ? "success" : "warning"}
              classNames={{ content: "text-[10px] font-semibold" }}
            >
              {status === "confirmed" ? "Confirmed" : "Pending..."}
            </Chip>
          </div>

          {details.length > 0 && (
            <>
              <Divider className="bg-border" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {details.map((d) => (
                  <div key={d.label}>
                    <p className="text-[10px] text-muted-fg uppercase tracking-wide">
                      {d.label}
                    </p>
                    <p className="text-xs font-medium text-fg mt-0.5">
                      {d.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}
