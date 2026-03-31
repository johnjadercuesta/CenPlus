import React from "react";

interface KPICardProps {
  icon: React.ReactNode;
  iconExtra?: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
  change?: string;
  changeUp?: boolean;
}

export default function KPICard({ icon, iconExtra, value, label, color, bgColor, change, changeUp }: KPICardProps) {
  return (
    <div className="metric-card">
      <div className="metric-icon" style={{ background: bgColor }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
          {iconExtra}
        </svg>
      </div>
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-label">{label}</div>
      {change && (
        <div className={`metric-change ${changeUp ? "up" : "down"}`}>{change}</div>
      )}
    </div>
  );
}
