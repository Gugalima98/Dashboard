import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

import { PageHeader } from "@/components/ui/page-header";
import { StatsCard } from "@/components/ui/stats-card";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, Ticket, CheckCircle, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  type ChartConfig 
} from "@/components/ui/chart";

const VendasDashboard = () => {
  const [stats, setStats] = useState({
    netRevenue: 0,
    grossRevenuePeriod: 0,
    avgTicket: 0,
    refundRate: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [productsList, setProductsList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch products for filter dropdown
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .order('name', { ascending: true });

      if (productsError) {
        console.error("Error fetching products:", productsError);
      } else {
        setProductsList(productsData || []);
      }

      // Fetch Subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subscriptionsError) {
        console.error("Error fetching subscriptions:", subscriptionsError);
      } else {
        setSubscriptions(subscriptionsData || []);
      }

      let query = supabase
        .from('sales')
        .select('*, products(name)');

      // Apply date filter
      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', addDays(dateRange.to, 1).toISOString());
      }

      // Apply product filter
      if (selectedProductId) {
        query = query.eq('product_id', selectedProductId);
      }

      const { data: sales, error } = await query
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching sales:", error);
        return;
      }

      // --- Calculate Stats ---
      const completedSales = sales.filter(s => s.status === 'completed');
      const refundedSales = sales.filter(s => s.status === 'refunded');

      const totalRevenue = completedSales.reduce((sum, s) => sum + s.amount, 0);
      const totalRefunds = refundedSales.reduce((sum, s) => sum + s.amount, 0);
      const netRevenue = totalRevenue - totalRefunds;
      
      // Gross Revenue for the selected period
      const grossRevenuePeriod = totalRevenue;

      const avgTicket = completedSales.length > 0 ? totalRevenue / completedSales.length : 0;

      const refundRate = sales.length > 0 ? (refundedSales.length / sales.length) * 100 : 0;

      setStats({ netRevenue, grossRevenuePeriod, avgTicket, refundRate });

      // Prepare Chart Data (for the selected period)
      const monthlyRevenueMap = new Map();
      completedSales.forEach(s => {
        const saleDate = new Date(s.created_at);
        const yearMonth = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyRevenueMap.set(yearMonth, (monthlyRevenueMap.get(yearMonth) || 0) + s.amount);
      });

      const chartDataFormatted = Array.from(monthlyRevenueMap.entries())
        .sort(([ym1], [ym2]) => ym1.localeCompare(ym2))
        .map(([yearMonth, revenue]) => {
          const [year, month] = yearMonth.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return {
            month: date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
            total: revenue,
          };
        });
      setChartData(chartDataFormatted);

      // Set Recent Sales
      setRecentSales(sales.slice(0, 5));
    };

    fetchData();
  }, [dateRange, selectedProductId]); // Refetch when filters change

  const chartConfig = {
    total: {
      label: "Receita",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'refunded':
        return 'destructive';
      case 'active':
        return 'success';
      case 'canceled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-8 space-y-8">
        <PageHeader
          title="Dashboard de Vendas"
          description="Visão geral das suas vendas e receitas."
        />

        {/* Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Select onValueChange={setSelectedProductId} value={selectedProductId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Filtrar por Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Produtos</SelectItem>
              {productsList.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Receita Líquida"
            value={`R$ ${stats.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description="Receita de vendas menos reembolsos"
            icon={DollarSign}
          />
          <StatsCard
            title="Receita Bruta do Período"
            value={`R$ ${stats.grossRevenuePeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description="Receita total de vendas concluídas no período selecionado"
            icon={DollarSign}
          />
          <StatsCard
            title="Ticket Médio"
            value={`R$ ${stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description="Valor médio por venda concluída"
            icon={Ticket}
          />
          <StatsCard
            title="Taxa de Reembolso"
            value={`${stats.refundRate.toFixed(1)}%`}
            description="Percentual de transações reembolsadas"
            icon={TrendingDown}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sales Chart */}
          <Card className="card-elevated col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Vendas Mensais (Período Selecionado)</CardTitle>
              <CardDescription>Receita bruta de vendas concluídas por mês no período selecionado.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    stroke="#888888"
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Side Cards Column */}
          <div className="col-span-1 space-y-8">
            {/* Recent Sales */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
                <CardDescription>As últimas 5 transações registradas.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div className="font-medium">{sale.products?.name || sale.product_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{sale.customer_email}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getStatusVariant(sale.status)}>{sale.status}</Badge>
                          <div className="font-medium">{`${sale.status === 'refunded' ? '-' : ''} R$ ${sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Status das Assinaturas</CardTitle>
                <CardDescription>Status mais recente das 5 últimas assinaturas.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.slice(0, 5).map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div className="font-medium">{sub.customer_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{sub.customer_email}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getStatusVariant(sub.status)}>{sub.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
};

export default VendasDashboard;
