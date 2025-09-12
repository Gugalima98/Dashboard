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
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

const ProductForm = ({ product, onSubmit, closeDialog }) => {
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price || '');
  const [type, setType] = useState(product?.type || 'Course');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, price: parseFloat(price), type });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Produto</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Curso de React Avançado" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Preço (R$)</Label>
        <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="99.90" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <select id="type" value={type} onChange={(e) => setType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="Course">Curso</option>
          <option value="Tool">Ferramenta</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={closeDialog}>Cancelar</Button>
        <Button type="submit">{product ? "Salvar Alterações" : "Criar Produto"}</Button>
      </div>
    </form>
  );
};

const Produtos = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFormSubmit = async (productData) => {
    if (editingProduct) {
      // Update
      const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
      if (error) {
        console.error('Error updating product:', error);
      } 
    } else {
      // Create
      const { error } = await supabase.from('products').insert([productData]);
      if (error) {
        console.error('Error creating product:', error);
      }
    }
    fetchProducts();
    closeDialog();
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este produto?")) {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) {
        console.error('Error deleting product:', error);
      } else {
        fetchProducts();
      }
    }
  };

  const openDialog = (product = null) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="p-8 space-y-8">
        <PageHeader
          title="Meus Produtos"
          description="Gestão dos seus cursos e ferramentas."
        >
          <Button className="btn-hero" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        </PageHeader>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto" : "Adicionar Novo Produto"}</DialogTitle>
              <DialogDescription>
                Preencha as informações do seu produto abaixo.
              </DialogDescription>
            </DialogHeader>
            <ProductForm product={editingProduct} onSubmit={handleFormSubmit} closeDialog={closeDialog} />
          </DialogContent>
        </Dialog>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
            <CardDescription>Seus produtos cadastrados no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.type}</TableCell>
                    <TableCell>{`R$ ${product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</TableCell>
                    <TableCell>{new Date(product.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
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

export default Produtos;