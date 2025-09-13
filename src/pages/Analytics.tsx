import { useState, useEffect } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Users, Globe, Eye, MousePointerClick, RefreshCw, Link, Loader2, Percent, Signal, Settings, Trash2, PlusCircle, Smartphone, Laptop } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

const Analytics = () => {
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [overviewData, setOverviewData] = useState({ pageviews: 0, visitors: 0, clicks: 0, impressions: 0, ctr: 0, position: 0, mostVisitedPages: [], devices: [] });
  const [previousOverviewData, setPreviousOverviewData] = useState(null);
  const [hasGoogleAccountConnected, setHasGoogleAccountConnected] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // State for the mapping dialog
  const [isManageSitesOpen, setIsManageSitesOpen] = useState(false);
  const [availableGa4, setAvailableGa4] = useState<any[]>([]);
  const [availableGsc, setAvailableGsc] = useState<any[]>([]);
  const [newMappingName, setNewMappingName] = useState("");
  const [selectedGa4, setSelectedGa4] = useState<any | null>(null);
  const [selectedGsc, setSelectedGsc] = useState<any | null>(null);

  // Google Credentials states
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('googleClientId') || '');
  const [googleClientSecret, setGoogleClientSecret] = useState(() => localStorage.getItem('googleClientSecret') || '');
  const [googleRedirectUri, setGoogleRedirectUri] = useState(() => localStorage.getItem('googleRedirectUri') || '/auth/google/callback');
  const [isGoogleCredentialsOpen, setIsGoogleCredentialsOpen] = useState(false);

  // Date Range State
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }

  const checkGoogleConnection = async () => {
    const userId = await getUserId();
    if (!userId) return;
    try {
      const response = await fetch(`/api/google/connection-status?user_id=${userId}`);
      const data = await response.json();
      setHasGoogleAccountConnected(data.connected);
      if (data.connected) {
        fetchMappedSites();
      }
    } catch (e) {
      setHasGoogleAccountConnected(false);
    }
  }

  const fetchMappedSites = async () => {
    const userId = await getUserId();
    if (!userId) return;
    try {
      const response = await fetch(`/api/sites?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch mapped sites');
      const data = await response.json();
      setSites(data);
      if (data.length > 0 && !selectedMappingId) {
        setSelectedMappingId(data[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao buscar sites mapeados:", error);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedMappingId || !dateRange?.from || !dateRange?.to) return;
    const userId = await getUserId();
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/analytics/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          mapping_id: selectedMappingId,
          startDate: dateRange.from.toISOString().split('T')[0],
          endDate: dateRange.to.toISOString().split('T')[0],
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      const data = await response.json();
      setOverviewData(data);
    } catch (error: any) {
      toast({ title: "Erro ao buscar dados de analytics", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkGoogleConnection();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('re-auth') === 'true') {
        toast({ title: "Conta Google Conectada", description: "Sua conta foi conectada com sucesso. Agora crie um mapeamento de site." });
        setIsManageSitesOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (selectedMappingId && dateRange?.from && dateRange?.to) {
      fetchAnalytics();
    }
  }, [selectedMappingId, dateRange]);

  const handleConnectGoogle = async () => {
    const userId = await getUserId();
    if (!userId) return;
    if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
      setIsGoogleCredentialsOpen(true);
      return;
    }
    localStorage.setItem('googleClientId', googleClientId);
    localStorage.setItem('googleClientSecret', googleClientSecret);
    localStorage.setItem('googleRedirectUri', googleRedirectUri);

    try {
      const response = await fetch('/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: googleRedirectUri,
        }),
      });
      if (!response.ok) throw new Error('Failed to initiate Google Auth');
      const data = await response.json();
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      toast({ title: "Erro ao conectar com Google", description: error.message, variant: "destructive" });
    }
  };

  const openManageSites = async () => {
    const userId = await getUserId();
    if (!userId) return;
    try {
      const [ga4Res, gscRes] = await Promise.all([
        fetch(`/api/google/ga4-properties?user_id=${userId}`),
        fetch(`/api/google/gsc-sites?user_id=${userId}`)
      ]);
      if (!ga4Res.ok || !gscRes.ok) throw new Error('Failed to fetch Google properties');
      const ga4Data = await ga4Res.json();
      const gscData = await gscRes.json();
      setAvailableGa4(ga4Data);
      setAvailableGsc(gscData);
      setIsManageSitesOpen(true);
    } catch (error: any) {
        toast({ title: "Erro ao buscar propriedades", description: "Falha ao buscar propriedades do Google. Verifique se a conta está conectada.", variant: "destructive" });
    }
  }

  const handleSaveMapping = async () => {
    const userId = await getUserId();
    if (!userId || !newMappingName || !selectedGa4 || !selectedGsc) {
        toast({ title: "Campos faltando", description: "Por favor, preencha todos os campos para criar o mapeamento.", variant: "destructive" });
        return;
    }
    try {
        const response = await fetch('/api/sites/mappings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                name: newMappingName,
                ga4_property_id: selectedGa4.id,
                ga4_property_name: selectedGa4.name,
                gsc_site_url: selectedGsc.siteUrl,
            }),
        });
        if (!response.ok) throw new Error('Failed to save mapping');
        toast({ title: "Sucesso!", description: "Mapeamento de site salvo." });
        setNewMappingName('');
        setSelectedGa4(null);
        setSelectedGsc(null);
        fetchMappedSites(); // Refresh list
    } catch (error: any) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  }

  const handleDeleteMapping = async (mappingId: string) => {
    const userId = await getUserId();
    if (!userId) return;
    try {
        const response = await fetch(`/api/sites/mappings/${mappingId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        if (!response.ok) throw new Error('Failed to delete mapping');
        toast({ title: "Mapeamento deletado" });
        if (selectedMappingId === mappingId) setSelectedMappingId(null);
        fetchMappedSites(); // Refresh list
    } catch (error: any) {
        toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    }
  }

  const calculateTrend = (current, previous, lowerIsBetter = false) => {
    if (previous === null || previous === undefined || current === null || current === undefined) return undefined;
    if (previous === 0 && current > 0) return { value: 100, isPositive: !lowerIsBetter };
    if (previous === 0 && current === 0) return { value: 0, isPositive: true };
    if (current === previous) return { value: 0, isPositive: true };
    
    const percentageChange = ((current - previous) / previous) * 100;
    
    return {
        value: Math.abs(percentageChange).toFixed(1),
        isPositive: lowerIsBetter ? percentageChange < 0 : percentageChange > 0,
    };
  };

  return (
    <div className="p-8 space-y-8">
        <PageHeader title="Painel de Analytics" description="Métricas unificadas de GA4 e Google Search Console.">
          <div className="flex flex-col md:flex-row gap-2 flex-wrap">
            {hasGoogleAccountConnected ? 
              <Button onClick={openManageSites}><Settings className="h-4 w-4 mr-2" />Gerenciar Sites</Button> : 
              <Button onClick={() => setIsGoogleCredentialsOpen(true)}><Link className="h-4 w-4 mr-2" />Configurar Credenciais</Button>}
            <DateRangePicker date={dateRange} setDate={setDateRange} />
            <Button variant="outline" onClick={fetchAnalytics} disabled={isLoading || !selectedMappingId}> {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />} Atualizar</Button>
          </div>
        </PageHeader>

        <Card className="card-elevated"><CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />Selecionar Site Mapeado</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedMappingId || ''} onValueChange={setSelectedMappingId}>
              <SelectTrigger><SelectValue placeholder="Nenhum site mapeado. Crie um em 'Gerenciar Sites'." /></SelectTrigger>
              <SelectContent>{sites.map((site) => (<SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>))}</SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatsCard 
            title="Visitantes (GA)" 
            value={overviewData.visitors.toLocaleString()} 
            icon={Users}
            trend={calculateTrend(overviewData.visitors, previousOverviewData?.visitors)}
            description={previousOverviewData ? "em relação ao período anterior" : ""}
          />
          <StatsCard 
            title="Views (GA)" 
            value={overviewData.pageviews.toLocaleString()} 
            icon={Eye}
            trend={calculateTrend(overviewData.pageviews, previousOverviewData?.pageviews)}
            description={previousOverviewData ? "em relação ao período anterior" : ""}
          />
          <StatsCard 
            title="Cliques (GSC)" 
            value={overviewData.clicks.toLocaleString()} 
            icon={MousePointerClick}
            trend={calculateTrend(overviewData.clicks, previousOverviewData?.clicks)}
            description={previousOverviewData ? "em relação ao período anterior" : ""}
          />
          <StatsCard 
            title="Impressões (GSC)" 
            value={overviewData.impressions.toLocaleString()} 
            icon={BarChart3}
            trend={calculateTrend(overviewData.impressions, previousOverviewData?.impressions)}
            description={previousOverviewData ? "em relação ao período anterior" : ""}
          />
          <StatsCard 
            title="CTR (GSC)" 
            value={`${(overviewData.ctr * 100).toFixed(2)}%`} 
            icon={Percent}
            trend={calculateTrend(overviewData.ctr, previousOverviewData?.ctr)}
            description={previousOverviewData ? "em relação ao período anterior" : ""}
          />
          <StatsCard 
            title="Posição (GSC)" 
            value={overviewData.position.toFixed(1)} 
            icon={Signal}
            trend={calculateTrend(overviewData.position, previousOverviewData?.position, true)}
            description={previousOverviewData ? "em relação ao período anterior" : ""}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Páginas Mais Visitadas</CardTitle>
            </CardHeader>
            <CardContent>
              {overviewData && overviewData.mostVisitedPages && overviewData.mostVisitedPages.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Página</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overviewData.mostVisitedPages.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium truncate max-w-[200px]">{item.page}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{item.views.toLocaleString()}</span>
                            <Progress value={(item.views / overviewData.mostVisitedPages[0].views) * 100} className="w-24 h-2" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">Nenhum dado disponível.</p>
              )}
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Dispositivos</CardTitle>
            </CardHeader>
            <CardContent>
              {overviewData && overviewData.devices && overviewData.devices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overviewData.devices.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.device.toLowerCase() === 'desktop' ? <Laptop className="h-4 w-4 text-muted-foreground" /> : <Smartphone className="h-4 w-4 text-muted-foreground" />}
                            <span>{item.device}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{item.views.toLocaleString()}</span>
                            <Progress value={(item.views / overviewData.devices.reduce((acc, dev) => acc + dev.views, 0)) * 100} className="w-24 h-2" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">Nenhum dado disponível.</p>
              )}
            </CardContent>
          </Card>
        </div>
      <Dialog open={isManageSitesOpen} onOpenChange={setIsManageSitesOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Gerenciar Sites Mapeados</DialogTitle><DialogDescription>Associe uma propriedade do Google Analytics a um site do Search Console para unificar os dados.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-8 py-4">
            <div className="space-y-4">
              <h3 className="font-medium">Mapeamentos Salvos</h3>
              <div className="space-y-2">
                {sites.map(site => (
                  <div key={site.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex flex-col">
                      <span className="font-bold">{site.name}</span>
                      <span className="text-xs text-muted-foreground">GA4: {site.ga4_property_name}</span>
                      <span className="text-xs text-muted-foreground">GSC: {site.gsc_site_url}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMapping(site.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
                {sites.length === 0 && <p className="text-sm text-muted-foreground">Nenhum mapeamento criado.</p>}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium">Criar Novo Mapeamento</h3>
              <div className="space-y-2">
                <div><Label>Nome do Mapeamento</Label><Input placeholder="Ex: Meu Blog Principal" value={newMappingName} onChange={e => setNewMappingName(e.target.value)} /></div>
                <div>
                  <Label>Propriedade Google Analytics (GA4)</Label>
                  <Select onValueChange={val => setSelectedGa4(availableGa4.find(p => p.id === val))}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma propriedade GA4..." /></SelectTrigger>
                    <SelectContent>{availableGa4.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Site do Google Search Console (GSC)</Label>
                  <Select onValueChange={val => setSelectedGsc(availableGsc.find(s => s.siteUrl === val))}>
                    <SelectTrigger><SelectValue placeholder="Selecione um site GSC..." /></SelectTrigger>
                    <SelectContent>{availableGsc.map(s => <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveMapping} className="w-full"><PlusCircle className="h-4 w-4 mr-2"/>Salvar Novo Mapeamento</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Credentials Dialog */}
      <Dialog open={isGoogleCredentialsOpen} onOpenChange={setIsGoogleCredentialsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configurar Credenciais Google</DialogTitle><DialogDescription>Insira suas credenciais de API do Google Cloud.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>Client ID</Label><Input value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} /></div>
            <div><Label>Client Secret</Label><Input value={googleClientSecret} onChange={(e) => setGoogleClientSecret(e.target.value)} /></div>
            <div><Label>Redirect URI</Label><Input value={googleRedirectUri} readOnly disabled /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsGoogleCredentialsOpen(false)}>Cancelar</Button><Button onClick={handleConnectGoogle}>Salvar e Conectar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analytics;
