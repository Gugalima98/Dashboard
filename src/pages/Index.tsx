import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";


import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, ComposedChart, Area } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  ShoppingCart,
  CircleArrowLeft,
  UserPlus,
  XCircle,
  FileText
} from "lucide-react";

const Index = () => {
  const [salesStats, setSalesStats] = useState({
    netRevenueMonth: 0,
    activeSubscriptions: 0,
    mrr: 0,
  });
  const [profitabilityData, setProfitabilityData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1).toISOString();

      // 1. Fetch Sales and Subscriptions Data
      const { data: sales, error: salesError } = await supabase.from('sales').select('*, products(name)');
      const { data: subscriptions, error: subscriptionsError } = await supabase.from('subscriptions').select('*, products(name, price)');
      const { data: gastos, error: gastosError } = await supabase.from('gastos').select('amount, date, recurrence, due_day, due_month');

      if (salesError || subscriptionsError || gastosError) {
        console.error("Error fetching data", { salesError, subscriptionsError, gastosError });
        return;
      }

      // 2. Calculate Sales KPIs
      const monthlyCompletedSales = sales.filter(s => s.status === 'completed' && new Date(s.created_at) >= new Date(firstDayOfMonth));
      const monthlyRefundedSales = sales.filter(s => s.status === 'refunded' && new Date(s.created_at) >= new Date(firstDayOfMonth));
      const netRevenueMonth = monthlyCompletedSales.reduce((sum, s) => sum + s.amount, 0) - monthlyRefundedSales.reduce((sum, s) => sum + s.amount, 0);

      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
      const mrr = subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + ((s.products?.price || 0) / 12), 0);

      setSalesStats({ netRevenueMonth, activeSubscriptions, mrr });

      // 3. Prepare Profitability Chart Data (Receita vs Gastos)
      const revenueByMonth = Array(6).fill(0);
      const expensesByMonth = Array(6).fill(0);
      const monthLabels = Array(6).fill(0).map((_, i) => {
          const date = new Date(currentYear, currentMonth - (5 - i), 1);
          return date.toLocaleString('pt-BR', { month: 'short' }).replace('.','').toUpperCase();
      });

      sales.forEach(s => {
        const saleDate = new Date(s.created_at);
        const monthDiff = (currentYear - saleDate.getFullYear()) * 12 + (currentMonth - saleDate.getMonth());
        if (monthDiff >= 0 && monthDiff < 6) {
          const index = 5 - monthDiff;
          if (s.status === 'completed') revenueByMonth[index] += s.amount;
          if (s.status === 'refunded') revenueByMonth[index] -= s.amount;
        }
      });

      gastos.forEach(gasto => {
        for (let i = 0; i < 6; i++) {
            const date = new Date(currentYear, currentMonth - (5 - i), 1);
            const monthData = { month: date.getMonth(), year: date.getFullYear() };
            let shouldCount = false;
            if (gasto.recurrence === 'Único' && gasto.date) {
                const expenseDate = new Date(gasto.date);
                if (expenseDate.getMonth() === monthData.month && expenseDate.getFullYear() === monthData.year) shouldCount = true;
            } else if (gasto.recurrence === 'Mensal' && gasto.due_day) {
                shouldCount = true;
            } else if (gasto.recurrence === 'Anual' && gasto.due_day && gasto.due_month && gasto.due_month - 1 === monthData.month) {
                shouldCount = true;
            }
            if (shouldCount) expensesByMonth[i] += gasto.amount;
        }
      });

      const profitabilityData = monthLabels.map((month, index) => ({
        name: month,
        Receita: revenueByMonth[index],
        Gastos: expensesByMonth[index],
      }));
      setProfitabilityData(profitabilityData);

      // 4. Prepare Recent Activity Feed
      const recentSaleEvents = sales
        .slice(0, 10)
        .map(s => ({ ...s, event_type: s.status === 'refunded' ? 'Reembolso' : 'Venda', timestamp: new Date(s.created_at) }));
      
      const recentSubscriptionEvents = subscriptions
        .slice(0, 10)
        .map(s => ({ ...s, event_type: s.status === 'canceled' ? 'Cancelamento' : 'Nova Assinatura', timestamp: new Date(s.updated_at) }));

      const combinedActivity = [...recentSaleEvents, ...recentSubscriptionEvents]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);

      setRecentActivity(combinedActivity);
    };

    fetchDashboardData();
  }, []);

  const activityConfig = {
    'Venda': { icon: ShoppingCart, color: 'text-success' },
    'Reembolso': { icon: CircleArrowLeft, color: 'text-destructive' },
    'Nova Assinatura': { icon: UserPlus, color: 'text-success' },
    'Cancelamento': { icon: XCircle, color: 'text-muted-foreground' },
    default: { icon: FileText, color: 'text-muted-foreground' },
  };

  const renderActivityItem = (activity, key) => {
    const config = activityConfig[activity.event_type] || activityConfig.default;
    const Icon = config.icon;
    const productName = activity.products?.name || activity.product_name || 'um produto';
    let text = "Atividade desconhecida";

    switch (activity.event_type) {
      case 'Venda':
        text = <>Nova venda de <span className="font-semibold text-foreground">{productName}</span> (R$ {activity.amount.toFixed(2)})</>;
        break;
      case 'Reembolso':
        text = <>Reembolso de <span className="font-semibold text-foreground">{productName}</span> (R$ {activity.amount.toFixed(2)})</>;
        break;
      case 'Nova Assinatura':
        text = <>Nova assinatura de <span className="font-semibold text-foreground">{productName}</span></>;
        break;
      case 'Cancelamento':
        text = <>Assinatura de <span className="font-semibold text-foreground">{productName}</span> cancelada</>;
        break;
    }

    return (
        <div key={key} className="flex items-start gap-4">
            <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${config.color}/10`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-sm text-muted-foreground break-words">{text}</p>
                <p className="text-xs text-muted-foreground/80">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}
                </p>
            </div>
        </div>
    );
  };

  return (
    <div className="p-8 space-y-8">
        <PageHeader
          title="Dashboard Principal"
          description="Visão geral da saúde financeira do seu negócio."
        />

        {/* Sales KPIs Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="card-elevated">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Receita Líquida (Mês)</CardTitle>
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">R$ {salesStats.netRevenueMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </CardContent>
            </Card>
            <Card className="card-elevated">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{salesStats.activeSubscriptions}</div>
                </CardContent>
            </Card>
            <Card className="card-elevated">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">MRR</CardTitle>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">R$ {salesStats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground">Receita Recorrente Mensal</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profitability Chart */}
          <Card className="card-elevated lg:col-span-2">
            <CardHeader>
              <CardTitle>Receita vs. Gastos</CardTitle>
              <CardDescription>Comparativo de performance financeira dos últimos 6 meses.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <ChartContainer 
                    config={{
                        Receita: { label: 'Receita', color: 'hsl(var(--chart-1))' }, 
                        Gastos: { label: 'Gastos', color: 'hsl(var(--chart-2))' } 
                    }}
                    className="h-[300px] w-[600px] min-w-full md:w-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={profitabilityData}>
                            <defs>
                                <linearGradient id="fillReceita" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-Receita)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-Receita)" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted) / 0.5)" />
                            <XAxis 
                                dataKey="name" 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <YAxis 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(value) => `R$${value / 1000}k`} 
                            />
                            <ChartTooltip 
                                cursor={false}
                                content={
                                    <ChartTooltipContent 
                                        indicator="dot"
                                        labelClassName="font-semibold"
                                        formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                                    />
                                }
                            />
                            <Legend />
                            <Bar dataKey="Gastos" fill="hsl(var(--chart-2) / 0.4)" name="Gastos" radius={[4, 4, 0, 0]} />
                            <Area dataKey="Receita" type="monotone" fill="url(#fillReceita)" strokeWidth={2} stroke="var(--color-Receita)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="card-elevated lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                  renderActivityItem(activity, `${activity.id}-${index}`)
                )) : (
                  <div className="flex flex-col items-center justify-center text-center h-48">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm font-medium text-muted-foreground">Nenhuma atividade recente.</p>
                    <p className="text-xs text-muted-foreground/80">Novas vendas e assinaturas aparecerão aqui.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
  );
};

export default Index;
