'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trade } from '@/lib/types';
import { getTradeBasePnL, getTradeCharges, convertToBaseCurrency, CURRENCY_SYMBOLS, BASE_CURRENCY } from '@/lib/trade-utils';

/** Format a local Date as YYYY-MM-DD without any UTC conversion */
function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Parse a YYYY-MM-DD string into local year/month/day numbers */
function parseLocalDate(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

interface DayStats {
  date: string;
  dayOfMonth: number;
  pnl: number;
  grossPnl: number;
  charges: number;
  tradeCount: number;
  isToday: boolean;
}

interface CalendarViewProps {
  trades: Trade[];
}

export default function CalendarView({ trades }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const baseCurrencySymbol = CURRENCY_SYMBOLS[BASE_CURRENCY];

  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);

  // Get all days in month with stats - using base currency for P&L
  const getDaysInMonth = (date: Date): DayStats[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // getDay() returns 0 = Sunday. Convert to Monday-first: Mon=0 .. Sun=6
    const startDow = (firstDay.getDay() + 6) % 7;

    const days: DayStats[] = [];

    // Helper to compute day charges in base currency
    const getDayCharges = (dayTrades: typeof trades) =>
      dayTrades.reduce((sum, t) => {
        const ch = getTradeCharges(t);
        return sum + (t.currency ? convertToBaseCurrency(ch, t.currency, t.exchangeRate) : ch);
      }, 0);

    // Add previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = toLocalDateStr(d);
      const dayTrades = trades.filter(t => t.date === dateStr);
      const pnl = dayTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
      const charges = getDayCharges(dayTrades);
      days.push({
        date: dateStr,
        dayOfMonth: d.getDate(),
        pnl,
        grossPnl: pnl + charges,
        charges,
        tradeCount: dayTrades.length,
        isToday: false,
      });
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = toLocalDateStr(d);
      const dayTrades = trades.filter(t => t.date === dateStr);
      const pnl = dayTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
      const charges = getDayCharges(dayTrades);
      days.push({
        date: dateStr,
        dayOfMonth: i,
        pnl,
        grossPnl: pnl + charges,
        charges,
        tradeCount: dayTrades.length,
        isToday: dateStr === todayStr,
      });
    }

    // Add next month's leading days to fill 6-row grid
    const totalCells = days.length;
    const remainingCells = 42 - totalCells; // 6 rows x 7 days
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = toLocalDateStr(d);
      const dayTrades = trades.filter(t => t.date === dateStr);
      const pnl = dayTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
      const charges = getDayCharges(dayTrades);
      days.push({
        date: dateStr,
        dayOfMonth: i,
        pnl,
        grossPnl: pnl + charges,
        charges,
        tradeCount: dayTrades.length,
        isToday: false,
      });
    }

    return days;
  };

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate, trades]);

  // Calculate monthly stats - using base currency
  const monthlyStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = toLocalDateStr(new Date(year, month, 1));
    const monthEnd = toLocalDateStr(new Date(year, month + 1, 0));

    const monthTrades = trades.filter(t => t.date >= monthStart && t.date <= monthEnd);
    const monthPnL = monthTrades.reduce((sum, t) => sum + getTradeBasePnL(t), 0);
    const monthCharges = monthTrades.reduce((sum, t) => {
      const ch = getTradeCharges(t);
      return sum + (t.currency ? convertToBaseCurrency(ch, t.currency, t.exchangeRate) : ch);
    }, 0);
    const monthGrossPnL = monthPnL + monthCharges;
    const tradingDays = new Set(monthTrades.map(t => t.date)).size;

    return { monthPnL, monthGrossPnL, monthCharges, tradingDays, totalTrades: monthTrades.length };
  }, [currentDate, trades]);

  const isCurrentMonth =
    currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="w-full bg-background">
      {/* Calendar Header */}
      <div className="px-3 sm:px-4 lg:px-6 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleToday}
              variant="outline"
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-transparent"
            >
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button
                onClick={handlePrevMonth}
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg sm:text-xl font-bold text-foreground min-w-max px-2">{monthName}</h2>
              <Button
                onClick={handleNextMonth}
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right Stats - All values in base currency */}
          <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm flex-wrap">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Gross P&L ({BASE_CURRENCY}):</span>
              <span className={`font-bold ${monthlyStats.monthGrossPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {baseCurrencySymbol}{monthlyStats.monthGrossPnL.toFixed(2)}
              </span>
            </div>
            {monthlyStats.monthCharges > 0 && (
              <div className="flex flex-col">
                <span className="text-muted-foreground">Brokerage:</span>
                <span className="font-bold text-orange-400">
                  -{baseCurrencySymbol}{monthlyStats.monthCharges.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-muted-foreground">Net P&L ({BASE_CURRENCY}):</span>
              <span className={`font-bold ${monthlyStats.monthPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {baseCurrencySymbol}{monthlyStats.monthPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Trading days:</span>
              <span className="font-bold text-foreground">{monthlyStats.tradingDays}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map(day => (
              <div key={day} className="border-r border-border last:border-r-0 p-2 sm:p-3 lg:p-4 bg-muted/30">
                <p className="text-xs sm:text-sm font-semibold text-muted-foreground">{day}</p>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {daysInMonth.map((day, index) => {
              const dayNum = day.dayOfMonth;
              const parsed = parseLocalDate(day.date);
              const isCurrentMonthDay =
                parsed.month === currentDate.getMonth() &&
                parsed.year === currentDate.getFullYear();

              return (
                <div
                  key={`${day.date}-${index}`}
                  className={`border-r border-b border-border last-row:border-b-0 ${index % 7 === 6 ? 'border-r-0' : ''} min-h-32 sm:min-h-40 lg:min-h-48 p-2 sm:p-3 lg:p-4 relative transition-colors ${
                    day.isToday ? 'bg-primary/10' : isCurrentMonthDay ? 'bg-background' : 'bg-muted/20'
                  }`}
                >
                  {/* Day Number */}
                  <div className="relative">
                    {day.isToday && (
                      <div className="absolute -left-2 -top-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs sm:text-sm font-bold text-primary-foreground">{dayNum}</span>
                      </div>
                    )}
                    {!day.isToday && (
                      <p className={`text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${isCurrentMonthDay ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {dayNum}
                      </p>
                    )}
                  </div>

                  {/* Trade Data - shown in base currency */}
                  {day.tradeCount > 0 && (
                    <div className={`rounded-lg p-2 sm:p-3 text-xs sm:text-sm ${
                      day.pnl >= 0
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                      {day.charges > 0 && (
                        <p className={`text-[10px] sm:text-xs mb-0.5 ${day.grossPnl >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                          G: {day.grossPnl >= 0 ? '+' : ''}{baseCurrencySymbol}{day.grossPnl.toFixed(2)}
                        </p>
                      )}
                      <p className={`font-bold ${day.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {day.charges > 0 ? 'N: ' : ''}{day.pnl >= 0 ? '+' : ''}{baseCurrencySymbol}{day.pnl.toFixed(2)}
                      </p>
                      <p className="text-muted-foreground">Trades: {day.tradeCount}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
