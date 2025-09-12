import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";

const SaleForm = ({ sale, products, onSubmit, closeDialog }) => {
  const [productId, setProductId] = useState(sale?.product_id || '');
  const [customerName, setCustomerName] = useState(sale?.customer_name || '');
  const [customerEmail, setCustomerEmail] = useState(sale?.customer_email || '');
  const [amount, setAmount] = useState(sale?.amount || '');
  const [status, setStatus] = useState(sale?.status || 'completed');
  
  // New state for subscription fields
  const [saleType, setSaleType] = useState(() => {
    // When editing, determine saleType based on whether a corresponding subscription exists
    if (sale && sale.source === 'Manual' && sale.external_id && sale.external_id.startsWith('manual_sub_')) {
      return 'Assinatura';
    }
    return 'Venda Única';
  });
  const [recurrence, setRecurrence] = useState(() => {
    // When editing, try to get recurrence from the associated subscription
    if (sale && sale.source === 'Manual' && sale.external_id && sale.external_id.startsWith('manual_sub_')) {
      // This will require fetching the subscription data separately or passing it down
      // For now, we'll default to Mensal if not explicitly passed.
      return 'Mensal'; // Placeholder, will be fixed with proper data fetching
    }
    return 'Mensal';
  });
  const [saleDate, setSaleDate] = useState(() => {
    // Initialize date to YYYY-MM-DD format for input type="date"
    if (sale?.created_at) {
      const date = new Date(sale.created_at);
      return date.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (!sale) {
      const selectedProduct = products.find(p => p.id === productId);
      if (selectedProduct) {
        setAmount(selectedProduct.price);
      }
    }
  }, [productId, products, sale]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Adjust date to avoid timezone issues for saving
    const dateToSave = new Date(saleDate);
    dateToSave.setHours(12); // Set to noon to avoid timezone shifts across midnight

    onSubmit({
      // Sale data
      product_id: productId,
      customer_name: customerName,
      customer_email: customerEmail,
      amount: parseFloat(amount),
      status,
      created_at: dateToSave.toISOString(), // Use adjusted date
      source: 'Manual',
      // Subscription-specific data (only if creating, not editing)
      saleType: sale ? undefined : saleType, // Pass only if creating new
      recurrence: sale ? undefined : recurrence, // Pass only if creating new
    });
  };

  const isEditing = !!sale;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="saleType">Tipo de Venda</Label>
        <select id="saleType" value={saleType} onChange={(e) => setSaleType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={isEditing}>
          <option value="Venda Única">Venda Única</option>
          <option value="Assinatura">Assinatura</option>
        </select>
      </div>

      {saleType === 'Assinatura' && (
        <div className="space-y-2">
          <Label htmlFor="recurrence">Recorrência</Label>
          <select id="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={isEditing}>
            <option value="Mensal">Mensal</option>
            <option value="Anual">Anual</option>
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="product">Produto</Label>
        <select id="product" value={productId} onChange={(e) => setProductId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
          <option value="">Selecione um produto</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="saleDate">Data da Venda</Label>
        <Input id="saleDate" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerName">Nome do Cliente</Label>
        <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex: João da Silva" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerEmail">Email do Cliente</Label>
        <Input id="customerEmail" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="joao.silva@email.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Valor (R$)</Label>
        <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="99.90" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="completed">Concluída</option>
          <option value="refunded">Reembolsada</option>
          <option value="pending">Pendente</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={closeDialog}>Cancelar</Button>
        <Button type="submit">{sale ? "Salvar Alterações" : "Criar"}</Button>
      </div>
    </form>
  );
};

const VendasLista = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        products (name)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching sales:", error); else setSales(data);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (error) console.error("Error fetching products:", error); else setProducts(data);
  };

  useEffect(() => {
    fetchSales();
    fetchProducts();
  }, []);

  const handleFormSubmit = async (formData) => {
    const { saleType, recurrence, ...saleData } = formData;

    // Editing is simple, just update the sale. We don't allow changing type after creation.
    if (editingSale) {
      const { error } = await supabase.from('sales').update(saleData).eq('id', editingSale.id);
      if (error) console.error('Error updating sale:', error);
      fetchSales();
      closeDialog();
      return;
    }

    // --- Logic for creating a new entry ---
    if (saleType === 'Assinatura') {
      // 1. Create Subscription
      const subscriptionData = {
        customer_email: saleData.customer_email,
        customer_name: saleData.customer_name,
        product_id: saleData.product_id,
        status: 'active',
        source: 'Manual',
        recurrence: recurrence,
        external_id: `manual_sub_${crypto.randomUUID()}` // Create a unique ID
      };
      const { data: newSubscription, error: subError } = await supabase.from('subscriptions').insert(subscriptionData).select().single();
      if (subError) {
        console.error('Error creating subscription:', subError);
        return; // Stop if subscription creation fails
      }
      console.log('Manual subscription created:', newSubscription);

      // Link the sale to the newly created subscription's external_id
      saleData.external_id = newSubscription.external_id;
    }

    // 2. Create Sale (for both Venda Única and the first payment of Assinatura)
    const { error: saleError } = await supabase.from('sales').insert([saleData]);
    if (saleError) {
      console.error('Error creating sale:', saleError);
    }

    fetchSales();
    closeDialog();
  };

  const handleDelete = async (saleId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta venda? Apenas vendas manuais devem ser excluídas.")) {
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) console.error('Error deleting sale:', error); else fetchSales();
    }
  };

  const openDialog = (sale = null) => {
    setEditingSale(sale);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingSale(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="p-8 space-y-8">
        <PageHeader
          title="Lista de Vendas"
          description="Todas as suas vendas, incluindo as manuais e as de webhooks."
        >
          <Button className="btn-hero" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Venda Manual
          </Button>
        </PageHeader>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSale ? "Editar Venda" : "Adicionar Venda Manual"}</DialogTitle>
              <DialogDescription>
                Preencha as informações da venda abaixo.
              </DialogDescription>
            </DialogHeader>
            <SaleForm sale={editingSale} products={products} onSubmit={handleFormSubmit} closeDialog={closeDialog} />
          </DialogContent>
        </Dialog>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Histórico de Vendas</CardTitle>
            <CardDescription>Seu histórico completo de vendas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.products?.name || 'Produto não encontrado'}</TableCell>
                    <TableCell>{sale.customer_email}</TableCell>
                    <TableCell>{`R$ ${sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</TableCell>
                    <TableCell>{sale.status}</TableCell>
                    <TableCell>{sale.source}</TableCell>
                    <TableCell>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(sale)} disabled={sale.source !== 'Manual'}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(sale.id)} disabled={sale.source !== 'Manual'}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );
};

export default VendasLista;
