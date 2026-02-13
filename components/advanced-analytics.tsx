'use client';

import { useMemo } from 'react';
import { useTrades } from '@/lib/trade-context';
import { useSettings } from '@/lib/settings-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trade } from '@/lib/types';
import { getTradeBasePnL, CURRENCY_SYMBOLS, BASE_CURRENCY, formatCurrency } from '@/lib/trade-utils';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

interface Analytics {
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestDay: { date: string; pnl: number };
  worstDay: { date: string; pnl: number };
  emotionCorrelation: { emotion: string; wins: number; losses: number; winRate: number }[];
  sessionPerformance: { session: string; winRate: number; pnl: number }[];
}

export default function AdvancedAnalytics() {
  const { trades } = useTrades();
  const { baseCurrency } = useSettings();
  const baseCurrencySymbol = CURRENCY_SYMBOLS[baseCurrency];

  const analytics = useMemo<Analytics>(() => {
    if (!trades || trades.length === 0) {
      return {
        winRate: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        bestDay: { date: 'N/A', pnl: 0 },
        worstDay: { date: 'N/A', pnl: 0 },
        emotionCorrelation: [],
        sessionPerformance: [],
      };
    }

    // Basic statistics
    const wins = trades.filter(t => getTradeBasePnL(t) > 0);
    const losses = trades.filter(t => getTradeBasePnL(t) < 0);
    const winRate = (wins.length / trades.length) * 100;

    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + getTradeBasePnL(t), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + getTradeBasePnL(t), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Best/Worst days (by net P&L)
    const dailyPnL = new Map<string, number>();
    trades.forEach(trade => {
      const date = new Date(trade.date).toLocaleDateString();
      const current = dailyPnL.get(date) || 0;
      dailyPnL.set(date, current + getTradeBasePnL(trade));
    });

    const days = Array.from(dailyPnL.entries()).sort(([, a], [, b]) => b - a);
    const bestDay = days.length > 0 ? { date: days[0][0], pnl: days[0][1] } : { date: 'N/A', pnl: 0 };
    const worstDay = days.length > 0 ? { date: days[days.length - 1][0], pnl: days[days.length - 1][1] } : { date: 'N/A', pnl: 0 };

    // Emotion correlation
    const emotionStats = new Map<string, { wins: number; losses: number }>();
    trades.forEach(trade => {
      const emotions = [];
      if (trade.emotionEntry) emotions.push(trade.emotionEntry);
      if (trade.emotionExit) emotions.push(trade.emotionExit);

      emotions.forEach(emotion => {
        const current = emotionStats.get(emotion) || { wins: 0, losses: 0 };
        if (getTradeBasePnL(trade) > 0) {
          current.wins++;
        } else if (getTradeBasePnL(trade) < 0) {
          current.losses++;
        }
        emotionStats.set(emotion, current);
      });
    });

    const emotionCorrelation = Array.from(emotionStats.entries())
      .map(([emotion, stats]) => ({
        emotion,
        ...stats,
        winRate: (stats.wins / (stats.wins + stats.losses)) * 100,
      }))
      .sort((a, b) => b.winRate - a.winRate);

    // Session performance (if data available)
    const sessionStats = new Map<string, { wins: number; total: number; pnl: number }>();
    trades.forEach(trade => {
      if (trade.session) {
        const current = sessionStats.get(trade.session) || { wins: 0, total: 0, pnl: 0 };
        current.total++;
        current.pnl += getTradeBasePnL(trade);
        if (getTradeBasePnL(trade) > 0) current.wins++;
        sessionStats.set(trade.session, current);
      }
    });

    const sessionPerformance = Array.from(sessionStats.entries()).map(([session, stats]) => ({
      session,
      winRate: (stats.wins / stats.total) * 100,
      pnl: stats.pnl,
    }));

    return {
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      bestDay,
      worstDay,
      emotionCorrelation,
      sessionPerformance,
    };
  }, [trades]);

  if (!trades || trades.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-3xl font-bold">Advanced Analytics</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No trades yet. Start trading and track your performance here!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Advanced Analytics</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.winRate.toFixed(1)}%</div>
            <div className="mt-2">
              <Progress value={analytics.winRate} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{trades.filter(t => getTradeBasePnL(t) > 0).length} wins / {trades.length} trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.profitFactor.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">Avg Win: {baseCurrencySymbol}{analytics.avgWin.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Avg Loss: {baseCurrencySymbol}{analytics.avgLoss.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.bestDay.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {baseCurrencySymbol}{analytics.bestDay.pnl.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{analytics.bestDay.date}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Worst Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.worstDay.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {baseCurrencySymbol}{analytics.worstDay.pnl.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{analytics.worstDay.date}</p>
          </CardContent>
        </Card>
      </div>

      {/* Emotion Correlation */}
      {analytics.emotionCorrelation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Emotion vs Performance</CardTitle>
            <CardDescription>Win rate by emotional state during trading</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.emotionCorrelation.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.emotion}</span>
                      <Badge variant={item.winRate >= 50 ? 'default' : 'destructive'}>
                        {item.winRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.wins}W / {item.losses}L</span>
                  </div>
                  <Progress value={item.winRate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Performance */}
      {analytics.sessionPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Performance</CardTitle>
            <CardDescription>Performance by trading session</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.sessionPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="session" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="winRate" fill="#8b5cf6" name="Win Rate %" />
                <Bar yAxisId="right" dataKey="pnl" fill="#10b981" name={`P&L (${BASE_CURRENCY})`} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Radar Chart for Multi-Metric Analysis */}
      {analytics.emotionCorrelation.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Radar</CardTitle>
            <CardDescription>Multi-dimensional performance view</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={analytics.emotionCorrelation}>
                <PolarGrid />
                <PolarAngleAxis dataKey="emotion" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Win Rate %" dataKey="winRate" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
