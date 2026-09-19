import React from 'react';
import { JobStatus } from '../types';
import { Stethoscope, Clock, Wrench, CheckCircle2 } from 'lucide-react';

interface StatusChipProps {
  status: JobStatus;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
  id?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'md',
  interactive = false,
  onClick,
  id,
}) => {
  const getStyles = () => {
    switch (status as string) {
      case 'Diagnosis':
        return {
          classes: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
          icon: <Stethoscope className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />,
        };
      case 'Awaiting Approval':
        return {
          classes: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
          icon: <Clock className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />,
        };
      case 'In Repair':
        return {
          classes: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]',
          icon: <Wrench className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />,
        };
      case 'Ready/Released':
        return {
          classes: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
          icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />,
        };
      case 'completed':
      case 'Work Done':
        return {
          classes: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />,
        };
      default:
        return {
          classes: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />,
        };
    }
  };

  const { classes, icon } = getStyles();

  const sizeClasses = {
    sm: 'text-[10px] sm:text-xs px-2 py-0.5 min-h-[26px]',
    md: 'text-[11px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 min-h-[32px] sm:min-h-[36px]',
    lg: 'text-xs sm:text-sm font-black px-3.5 sm:px-4 py-1.5 sm:py-2 min-h-[40px] sm:min-h-[44px]',
  };

  return (
    <span
      id={id}
      onClick={interactive ? onClick : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider whitespace-nowrap shadow-xs select-none transition-transform ${classes} ${sizeClasses[size]} ${
        interactive ? 'cursor-pointer active:scale-95' : ''
      }`}
    >
      {icon}
      <span>{status}</span>
    </span>
  );
};
