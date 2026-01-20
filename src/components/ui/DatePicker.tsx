'use client';

import { ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

type DatePickerProps = {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  buttonClassName,
}: DatePickerProps) {
  const formattedValue =
    value instanceof Date && !Number.isNaN(value.getTime())
      ? value.toISOString().slice(0, 10)
      : '';

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.value) {
      onChange(null);
      return;
    }
    onChange(new Date(event.target.value));
  };

  return (
    <div className={cn('relative', className)}>
      <input
        type="date"
        value={formattedValue}
        onChange={handleChange}
        aria-label={placeholder}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          buttonClassName
        )}
      />
    </div>
  );
}
