import { useState, useEffect } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, MoreHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// --- User Administration Components ---
const UserAdministrationTab = ({ isAdmin, toast }) => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // State for Add/Edit Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); // Default role


  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users-list');
      if (error) throw error;
      setUsers(data.users);
    } catch (e: any) {
      toast({ title: "Erro ao carregar usuários", description: e.message, variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  const openAddDialog = () => {
    setEditingUser(null);
    setEmail("");
    setPassword("");
    setRole("user"); // Reset to default for new user
    setIsDialogOpen(true);
  };

  const openEditDialog = async (user) => {
    setEditingUser(user);
    setEmail(user.email);
    setPassword(""); // Clear password for editing

    // Fetch current role for the user
    try {
        const { data: userRole, error } = await supabase
            .from('user_roles')
            .select('role_name')
            .eq('user_id', user.id)
            .single();
        if (error) throw error;
        setRole(userRole?.role_name || 'user');
    } catch (e) {
        toast({ title: "Erro ao buscar role do usuário", variant: "destructive" });
        setRole('user'); // Fallback
    }

    setIsDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (editingUser) {
      await handleUpdateUser();
    } else {
      await handleCreateUser();
    }
  };

  const handleCreateUser = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-users-create', {
        body: { email, password, role },
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Usuário criado com sucesso.", variant: "success" });
      setIsDialogOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Erro ao criar usuário", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setActionLoading(true);
    try {
      const updatePayload: { id: string; email: string; password?: string, role: string } = {
        id: editingUser.id,
        email: email,
        role: role,
      };
      if (password) { // Only include password if it's being changed
        updatePayload.password = password;
      }

      const { error } = await supabase.functions.invoke('admin-users-update', {
        body: updatePayload,
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Usuário atualizado com sucesso.", variant: "success" });
      setIsDialogOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar usuário", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (userEmail: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-users-reset-password', {
        body: { email: userEmail, redirectTo: '/update-password' },
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: `Email de redefinição de senha enviado para ${userEmail}.`, variant: "success" });
    } catch (e: any) {
      toast({ title: "Erro ao resetar senha", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-users-delete', {
        body: { id: userId },
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Usuário excluído com sucesso.", variant: "success" });
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Erro ao excluir usuário", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return <p className="text-muted-foreground">Você não tem permissão para acessar esta seção.</p>;
  }

  if (loadingUsers) {
    return <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Gerenciamento de Usuários</CardTitle>
                <CardDescription>Adicione, edite ou remova usuários do sistema.</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                <Button onClick={openAddDialog}>Adicionar Usuário</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingUser ? "Editar Usuário" : "Adicionar Novo Usuário"}</DialogTitle>
                    <DialogDescription>
                    {editingUser ? "Edite os detalhes do usuário abaixo." : "Crie um novo usuário com email, senha e permissão."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">Senha</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" placeholder={editingUser ? "Deixe em branco para não alterar" : ""} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Permissão</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione uma permissão" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleFormSubmit} disabled={actionLoading}>
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editingUser ? "Salvar Alterações" : "Criar Usuário"}
                    </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>ID do Usuário</TableHead>
                    <TableHead>Criado Em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {users.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">{user.id}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetPassword(user.email)}>Resetar Senha</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">Excluir</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário <span className="font-bold">{user.email}</span>.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600 hover:bg-red-700">Confirmar Exclusão</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
};

// --- My Profile Components ---
const MyProfileTab = ({ toast }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
      }
    };
    fetchUserEmail();
  }, []);

  const handleUpdateProfile = async (field: 'email' | 'password') => {
    setLoading(true);
    try {
        let updateData = {};
        if (field === 'email') {
            if (!email) throw new Error("Email não pode ser vazio.");
            updateData = { email };
        } else {
            if (!password) throw new Error("Senha não pode ser vazia.");
            updateData = { password };
        }

        const { error } = await supabase.auth.updateUser(updateData);
        if (error) throw error;

        if (field === 'email') {
            toast({ title: "Sucesso!", description: "Email atualizado. Verifique sua caixa de entrada para confirmar.", variant: "success" });
        } else {
            toast({ title: "Sucesso!", description: "Senha atualizada com sucesso.", variant: "success" });
            setPassword(""); // Clear password field after successful update
        }
    } catch (e: any) {
      toast({ title: `Erro ao atualizar ${field}`, description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
            <CardDescription>Atualize os detalhes da sua conta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex space-x-2">
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Button onClick={() => handleUpdateProfile('email')} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Email
                    </Button>
                </div>
            </div>
            <Separator />
            <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="flex space-x-2">
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Deixe em branco para não alterar" />
                    <Button onClick={() => handleUpdateProfile('password')} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Senha
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
  );
};

const AdminSettings = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAdmin = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('is-admin');
        console.log('DEBUG: Resultado da verificação is-admin:', data);
        if (error) throw error;
        setIsAdmin(data.isAdmin);
      } catch (e) {
        setIsAdmin(false); // Assume not admin if check fails
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-8 space-y-8">
      <PageHeader title="Configurações" description="Gerencie as configurações da aplicação e seu perfil." />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Administração</TabsTrigger>}
        </TabsList>
        <TabsContent value="profile">
          <MyProfileTab toast={toast} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="admin">
            <UserAdministrationTab isAdmin={isAdmin} toast={toast} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AdminSettings;
