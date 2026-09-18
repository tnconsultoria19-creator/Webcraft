import React, { useState, useEffect } from 'react';
import { Globe, Clock, Sun, Moon } from 'lucide-react';

export interface WorldClockZone {
  code: string;
  country: string;
  flag: string;
  timeZone: string;
  cityLabel: string;
}

export const WORLD_ZONES: WorldClockZone[] = [
  { code: 'ZAF', country: 'South Africa', flag: '🇿🇦', timeZone: 'Africa/Johannesburg', cityLabel: 'Johannesburg (SAST)' },
  { code: 'AGO', country: 'Angola', flag: '🇦🇴', timeZone: 'Africa/Luanda', cityLabel: 'Luanda (WAT)' },
  { code: 'NAM', country: 'Namibia', flag: '🇳🇦', timeZone: 'Africa/Windhoek', cityLabel: 'Windhoek (CAT)' },
  { code: 'PRT', country: 'Portugal', flag: '🇵🇹', timeZone: 'Europe/Lisbon', cityLabel: 'Lisbon (WEST)' },
  { code: 'UK', country: 'United Kingdom', flag: '🇬🇧', timeZone: 'Europe/London', cityLabel: 'London (BST)' },
  { code: 'USA', country: 'USA', flag: '🇺🇸', timeZone: 'America/New_York', cityLabel: 'New York (EDT)' },
  { code: 'BRA', country: 'Brazil', flag: '🇧🇷', timeZone: 'America/Sao_Paulo', cityLabel: 'São Paulo (BRT)' },
];

interface WorldClockBarProps {
  variant?: 'landing' | 'dashboard' | 'compact';
  className?: string;
}

export const WorldClockBar: React.FC<WorldClockBarProps> = ({
  variant = 'landing',
  className = ''
}) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getZoneDetails = (timeZone: string) => {
    try {
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(now);

      const dateStr = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).format(now);

      const hour24 = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone,
          hour: 'numeric',
          hour12: false
        }).format(now),
        10
      );

      const isDaytime = hour24 >= 6 && hour24 < 19;

      return { timeStr, dateStr, isDaytime };
    } catch (e) {
      return { timeStr: '--:--:--', dateStr: '', isDaytime: true };
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium ${className}`}>
        {WORLD_ZONES.map((zone) => {
          const { timeStr, isDaytime } = getZoneDetails(zone.timeZone);
          return (
            <div
              key={zone.code}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F1EA] hover:bg-[#E5EEEE]/50 border border-[#DDD8CE] transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{zone.flag}</span>
                <div>
                  <div className="text-xs font-semibold text-[#292A29] leading-tight truncate max-w-[80px]">{zone.country}</div>
                  <div className="text-[10px] text-[#68645D] font-medium">{zone.code}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-right">
                <span className="text-xs font-semibold text-[#245F6B]">{timeStr.replace(/\s[AP]M/, '')}</span>
                {isDaytime ? (
                  <Sun className="w-3.5 h-3.5 text-[#D9A441] shrink-0" title="Daytime" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#969188] shrink-0" title="Nighttime" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#E5EEEE] rounded-xl text-[#245F6B]">
            <Clock className="w-4 h-4 text-[#245F6B]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#292A29] flex items-center gap-2">
              <span>Global Regional Working Hours</span>
              <span className="px-2 py-0.5 bg-[#4F765C] text-white rounded-full text-[10px] font-semibold">
                LIVE
              </span>
            </h3>
            <p className="text-[11px] text-[#68645D] mt-0.5">Real-time business timezone monitors for outreach</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {WORLD_ZONES.map((zone) => {
          const { timeStr, dateStr, isDaytime } = getZoneDetails(zone.timeZone);
          return (
            <div
              key={zone.code}
              className="bg-white border border-[#DDD8CE] p-3 rounded-xl shadow-xs transition-all hover:border-[#245F6B] group relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top Row: Flag & Country */}
              <div className="flex items-center justify-between text-[#68645D] mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">{zone.flag}</span>
                  <span className="font-semibold text-xs text-[#292A29] group-hover:text-[#245F6B] transition-colors truncate max-w-[75px]">
                    {zone.country}
                  </span>
                </div>
                {isDaytime ? (
                  <Sun className="w-3.5 h-3.5 text-[#D9A441] shrink-0" title="Daytime" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#969188] shrink-0" title="Nighttime" />
                )}
              </div>

              {/* Time Display */}
              <div className="text-base font-bold tracking-tight text-[#292A29] my-1">
                <span>{timeStr}</span>
              </div>

              {/* Date & City Info */}
              <div className="flex items-center justify-between text-[10px] text-[#68645D] font-medium pt-1.5 border-t border-[#F0EDE5]">
                <span className="text-[#292A29] font-semibold">{dateStr}</span>
                <span className="truncate max-w-[65px] text-[10px] text-[#969188]" title={zone.cityLabel}>
                  {zone.code}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

