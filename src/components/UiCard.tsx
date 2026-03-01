import React from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface UiCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  status?: "default" | "success" | "warning" | "danger";
  children?: ReactNode;
  className?: string;
}

const UiCard: React.FC<UiCardProps> = ({
  title,
  subtitle,
  icon,
  status = "default",
  children,
  className,
}) => {
  const statusColors = {
    default: "from-slate-900/80 to-slate-800/60 border-slate-700",
    success: "from-green-900/60 to-green-800/40 border-green-600/40",
    warning: "from-yellow-900/60 to-yellow-800/40 border-yellow-600/40",
    danger: "from-red-900/60 to-red-800/40 border-red-600/40",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={clsx(
        "relative p-5 rounded-2xl shadow-lg backdrop-blur-sm border transition overflow-hidden",
        `bg-gradient-to-br ${statusColors[status]}`,
        className
      )}
    >
      {/* Glow border animasi */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none border border-transparent bg-gradient-to-r from-orange-500/20 via-red-500/20 to-yellow-500/20 animate-pulse"></div>

      {/* Header */}
      <div className="flex items-center gap-3 relative z-10">
        {icon && <div className="text-3xl text-orange-400">{icon}</div>}
        <div>
          <h4 className="font-semibold text-white">{title}</h4>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>

      {/* Isi (angka / chart / konten lain) */}
      <div className="mt-4 text-3xl font-bold text-white relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export default UiCard;
