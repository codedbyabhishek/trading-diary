/**
 * Performance Analytics Engine
 * Computes advanced trading metrics and performance analysis
 */

import { Trade } from '@/lib/types';
import { calculatePnL, calculateRFactor } from '@/lib/trade-utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';

export interface PerformanceMetrics {
  weeklyPnL: Record<string, number>;
  monthlyPnL: Record<string, number>;
  equityCurve: Array<{ date: string; equity: number }>;
  bestTradingHours: Record<string, number>;
  bestTradingDays: Record<string, number>;
  monthlyReturnTargets: Array<{ month: string; target: number; actual: number; percentage: number }>;
  monthlyWinRate: Record<string, number>;
  averageTradeSize: Record<string, number>;
}

/**
 * Calculate weekly profit/loss
 */
export function calculateWeeklyPnL(trades: Trade[]): Record<string, number> {
  const weeklyPnL: Record<string, number> = {};
  
  trades.forEach((trade) => {
    const date = new Date(trade.entryDate);
    const weekStart = startOfWeek(date);
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    weeklyPnL[weekKey] = (weeklyPnL[weekKey] || 0) + calculatePnL(trade);
  });
  
  return Object.fromEntries(
    Object.entries(weeklyPnL)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-12) // Last 12 weeks
  );
}

/**
 * Calculate monthly profit/loss
 */
export function calculateMonthlyPnL(trades: Trade[]): Record<string, number> {
  const monthlyPnL: Record<string, number> = {};
  
  trades.forEach((trade) => {
    const date = new Date(trade.entryDate);
    const monthKey = format(date, 'yyyy-MM');
    
    monthlyPnL[monthKey] = (monthlyPnL[monthKey] || 0) + calculatePnL(trade);
  });
  
  return Object.fromEntries(
    Object.entries(monthlyPnL)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
  );
}

/**
 * Build equity curve (cum P&L over time)
 */
export function calculateEquityCurve(trades: Trade[]): Array<{ date: string; equity: number }> {
  const sorted = [...trades].sort((a, b) => 
    new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );
  
  const curve: Array<{ date: string; equity: number }> = [];
  let cumulativePnL = 0;
  
  sorted.forEach((trade) => {
    cumulativePnL += calculatePnL(trade);
    curve.push({
      date: format(new Date(trade.entryDate), 'yyyy-MM-dd'),
      equity: cumulativePnL
    });
  });
  
  return curve;
}

/**
 * Find best trading hours
 */
export function calculateBestTradingHours(trades: Trade[]): Record<string, number> {
  const hourPnL: Record<string, number> = {};
  const hourCounts: Record<string, number> = {};
  
  trades.forEach((trade) => {
    const date = new Date(trade.entryDate);
    const hour = date.getHours();
    const hourKey = `${hour}:00`;
    
    hourPnL[hourKey] = (hourPnL[hourKey] || 0) + calculatePnL(trade);
    hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
  });
  
  // Return average P&L per hour
  return Object.fromEntries(
    Object.entries(hourPnL).map(([hour, pnl]) => [
      hour,
      pnl / (hourCounts[hour] || 1)
    ])
  );
}

/**
 * Find best trading days
 */
export function calculateBestTradingDays(trades: Trade[]): Record<string, number> {
  const dayPnL: Record<string, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  trades.forEach((trade) => {
    const date = new Date(trade.entryDate);
    const dayName = dayNames[date.getDay()];
    
    dayPnL[dayName] = (dayPnL[dayName] || 0) + calculatePnL(trade);
  });
  
  return dayPnL;
}

/**
 * Calculate monthly return targets progress
 */
export function calculateMonthlyReturnTargets(
  trades: Trade[],
  monthlyTargets: Record<string, number> = {}
): Array<{ month: string; target: number; actual: number; percentage: number }> {
  const monthlyPnL = calculateMonthlyPnL(trades);
  
  return Object.entries(monthlyPnL).map(([month, actual]) => {
    const target = monthlyTargets[month] || 1000;
    return {
      month,
      target,
      actual,
      percentage: (actual / target) * 100
    };
  });
}

/**
 * Calculate win rate by month
 */
export function calculateMonthlyWinRate(trades: Trade[]): Record<string, number> {
  const monthStats: Record<string, { wins: number; total: number }> = {};
  
  trades.forEach((trade) => {
    const date = new Date(trade.entryDate);
    const monthKey = format(date, 'yyyy-MM');
    
    if (!monthStats[monthKey]) {
      monthStats[monthKey] = { wins: 0, total: 0 };
    }
    
    monthStats[monthKey].total++;
    if (calculatePnL(trade) > 0) {
      monthStats[monthKey].wins++;
    }
  });
  
  return Object.fromEntries(
    Object.entries(monthStats).map(([month, stats]) => [
      month,
      (stats.wins / stats.total) * 100
    ])
  );
}

/**
 * Calculate average trade size by month
 */
export function calculateAverageTradeSize(trades: Trade[]): Record<string, number> {
  const monthStats: Record<string, { total: number; count: number }> = {};
  
  trades.forEach((trade) => {
    const date = new Date(trade.entryDate);
    const monthKey = format(date, 'yyyy-MM');
    
    if (!monthStats[monthKey]) {
      monthStats[monthKey] = { total: 0, count: 0 };
    }
    
    monthStats[monthKey].total += Math.abs(calculatePnL(trade));
    monthStats[monthKey].count++;
  });
  
  return Object.fromEntries(
    Object.entries(monthStats).map(([month, stats]) => [
      month,
      stats.total / stats.count
    ])
  );
}

/**
 * Generate all performance metrics
 */
export function generatePerformanceMetrics(trades: Trade[]): PerformanceMetrics {
  return {
    weeklyPnL: calculateWeeklyPnL(trades),
    monthlyPnL: calculateMonthlyPnL(trades),
    equityCurve: calculateEquityCurve(trades),
    bestTradingHours: calculateBestTradingHours(trades),
    bestTradingDays: calculateBestTradingDays(trades),
    monthlyReturnTargets: calculateMonthlyReturnTargets(trades),
    monthlyWinRate: calculateMonthlyWinRate(trades),
    averageTradeSize: calculateAverageTradeSize(trades),
  };
}
