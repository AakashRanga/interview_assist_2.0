import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon } from 'lucide-react';

interface ClockTimePickerProps {
  label?: string;
  error?: string;
  value: string; // "HH:MM" in 24-hour format
  onChange: (value: string) => void;
  className?: string;
}

export function ClockTimePicker({
  label,
  error,
  value,
  onChange,
  className = ''
}: ClockTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'hours' | 'minutes'>('hours');
  
  // Internal selection state
  const [tempHour, setTempHour] = useState(12);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>('AM');
  const [isDragging, setIsDragging] = useState(false);

  const dialRef = useRef<HTMLDivElement>(null);

  // Parse value on open
  useEffect(() => {
    if (isOpen) {
      setViewMode('hours');
      if (value) {
        const [hStr, mStr] = value.split(':');
        const h = parseInt(hStr, 10) || 0;
        const m = parseInt(mStr, 10) || 0;
        setTempHour(h === 0 ? 12 : h > 12 ? h - 12 : h);
        setTempMinute(m);
        setTempPeriod(h >= 12 ? 'PM' : 'AM');
      } else {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        setTempHour(h === 0 ? 12 : h > 12 ? h - 12 : h);
        // Round minutes to nearest multiple of 5 for nicer default
        setTempMinute(Math.round(m / 5) * 5 % 60);
        setTempPeriod(h >= 12 ? 'PM' : 'AM');
      }
    }
  }, [isOpen, value]);

  // Display value for the read-only input
  const displayValue = useMemo(() => {
    if (!value) return '';
    const [hStr, mStr] = value.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }, [value]);

  // Coordinates and math constant
  const cx = 120;
  const cy = 120;
  const R = 84;

  const getLabelAngle = (val: number) => {
    if (viewMode === 'hours') {
      return (val * 30 - 90) * (Math.PI / 180);
    } else {
      return (val * 6 - 90) * (Math.PI / 180);
    }
  };

  const activeValue = viewMode === 'hours' ? tempHour : tempMinute;
  const activeAngle = getLabelAngle(activeValue);
  const handX = cx + R * Math.cos(activeAngle);
  const handY = cy + R * Math.sin(activeAngle);

  const handlePointerEvent = (
    clientX: number,
    clientY: number
  ) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const x = clientX - rect.left - cx;
    const y = clientY - rect.top - cy;

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (viewMode === 'hours') {
      let hour = Math.round(angle / 30);
      if (hour === 0) hour = 12;
      setTempHour(hour);
    } else {
      let minute = Math.round(angle / 6);
      if (minute === 60) minute = 0;
      setTempMinute(minute);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handlePointerEvent(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handlePointerEvent(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (viewMode === 'hours') {
        // Auto-switch to minutes
        setTimeout(() => {
          setViewMode('minutes');
        }, 300);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handlePointerEvent(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handlePointerEvent(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleSetTime = () => {
    let finalHour = tempHour;
    if (tempPeriod === 'PM' && finalHour < 12) finalHour += 12;
    if (tempPeriod === 'AM' && finalHour === 12) finalHour = 0;
    const formatted = `${String(finalHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClearTime = () => {
    onChange('');
    setIsOpen(false);
  };

  // Click handler to prevent text focus and open our picker
  const handleInputClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-[10px] font-medium text-secondary/70 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          readOnly
          placeholder="hh:mm AM/PM"
          value={displayValue}
          onClick={handleInputClick}
          className={`w-full pl-3.5 pr-10 py-2.5 bg-white/70 backdrop-blur-xl border border-white/60 rounded-xl text-xs text-secondary placeholder:text-neutral/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all cursor-pointer ${className}`}
        />
        <ClockIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40 pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}

      {/* Clock Dialog Portal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-secondary/30 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-[280px] bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center p-5 select-none"
          >
            {/* Header: Large Time Display */}
            <div className="flex items-center space-x-2 text-white mb-6 w-full justify-center">
              <div className="flex items-baseline space-x-1 font-bold text-4xl">
                <button
                  type="button"
                  onClick={() => setViewMode('hours')}
                  className={`transition-colors py-1 ${
                    viewMode === 'hours' ? 'text-primary' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tempHour}
                </button>
                <span className="text-white/60">:</span>
                <button
                  type="button"
                  onClick={() => setViewMode('minutes')}
                  className={`transition-colors py-1 ${
                    viewMode === 'minutes' ? 'text-primary' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {String(tempMinute).padStart(2, '0')}
                </button>
              </div>

              {/* AM/PM toggle */}
              <div className="flex flex-col ml-3 text-xs font-semibold overflow-hidden border border-white/10 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTempPeriod('AM')}
                  className={`px-2 py-1 transition-all ${
                    tempPeriod === 'AM'
                      ? 'bg-primary text-secondary shadow-md font-bold'
                      : 'text-white/60 hover:bg-white/5'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setTempPeriod('PM')}
                  className={`px-2 py-1 transition-all border-t border-white/5 ${
                    tempPeriod === 'PM'
                      ? 'bg-primary text-secondary shadow-md font-bold'
                      : 'text-white/60 hover:bg-white/5'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Circular Dial Selector */}
            <div
              ref={dialRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              className="relative w-[240px] h-[240px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer mb-6"
            >
              {/* Center Dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-primary z-20" />

              {/* Drawing of selection hand */}
              <svg className="absolute inset-0 pointer-events-none z-10" width="240" height="240">
                <line
                  x1={cx}
                  y1={cy}
                  x2={handX}
                  y2={handY}
                  stroke="#02f576"
                  strokeWidth="2"
                />
                <circle
                  cx={handX}
                  cy={handY}
                  r="14"
                  fill="#02f576"
                  opacity="0.3"
                />
                <circle
                  cx={handX}
                  cy={handY}
                  r="3.5"
                  fill="#02f576"
                />
              </svg>

              {/* Dial Numbers */}
              {viewMode === 'hours' ? (
                // Hours 1 to 12
                [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                  const angle = getLabelAngle(h);
                  const x = cx + R * Math.cos(angle) - 16;
                  const y = cy + R * Math.sin(angle) - 16;
                  const isSelected = tempHour === h;
                  return (
                    <div
                      key={`hour-${h}`}
                      style={{
                        position: 'absolute',
                        left: `${x}px`,
                        top: `${y}px`,
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-all ${
                        isSelected ? 'text-secondary font-bold scale-110' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      {h}
                    </div>
                  );
                })
              ) : (
                // Minutes multiples of 5
                [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                  const angle = getLabelAngle(m);
                  const x = cx + R * Math.cos(angle) - 16;
                  const y = cy + R * Math.sin(angle) - 16;
                  // Highlight if nearest multiple of 5 matches
                  const isSelected = Math.round(tempMinute / 5) * 5 % 60 === m;
                  return (
                    <div
                      key={`minute-${m}`}
                      style={{
                        position: 'absolute',
                        left: `${x}px`,
                        top: `${y}px`,
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
                        isSelected ? 'text-secondary font-bold scale-110' : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {String(m).padStart(2, '0')}
                    </div>
                  );
                })
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex w-full justify-between px-2 text-xs font-semibold mt-2">
              <button
                type="button"
                onClick={handleClearTime}
                className="text-red-400 hover:text-red-300 py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all"
              >
                CLEAR
              </button>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSetTime}
                  className="text-primary hover:text-primary-light py-1.5 px-3 rounded-lg hover:bg-primary/10 transition-all"
                >
                  SET
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
