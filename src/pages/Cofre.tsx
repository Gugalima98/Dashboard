import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

import { PageHeader } from "@/components/ui/page-header";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Shield, 
  Key, 
  Eye, 
  EyeOff,
  Plus,
  Search,
  Lock,
  Unlock,
  Copy,
  Edit,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

const Cofre = () => {
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const [decryptedValues, setDecryptedValues] = useState<{[key: string]: string}>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<any>(null);

  const [secrets, setSecrets] = useState<any[]>([]);
  const [secretName, setSecretName] = useState('');
  const [secretType, setSecretType] = useState('');
  const [secretValue, setSecretValue] = useState('');
  const [secretLogin, setSecretLogin] = useState(''); // Novo estado para login
  const [secretCategory, setSecretCategory] = useState(''); // Reintroduzido
  const [secretLoginLabel, setSecretLoginLabel] = useState('Login');
  const [secretValueLabel, setSecretValueLabel] = useState('Valor');
  const [isEditingLoginLabelInput, setIsEditingLoginLabelInput] = useState(false);
  const [isEditingValueLabelInput, setIsEditingValueLabelInput] = useState(false);
  const [secretLogin2, setSecretLogin2] = useState('');
  const [secretValue2, setSecretValue2] = useState('');
  const [secretLoginLabel2, setSecretLoginLabel2] = useState('Login 2');
  const [secretValueLabel2, setSecretValueLabel2] = useState('Valor 2');
  const [showSecondPair, setShowSecondPair] = useState(false);
  const [isEditingLoginLabel2Input, setIsEditingLoginLabel2Input] = useState(false);
  const [isEditingValueLabel2Input, setIsEditingValueLabel2Input] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(''); // Novo estado para filtro de categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSecrets = async () => {
    let query = supabase
      .from('segredos')
      .select('*')
      .order('created_at', { ascending: false });

    if (selectedCategory) {
      query = query.eq('category', selectedCategory);
    }

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching secrets:', error);
    } else {
      console.log('Secrets fetched:', data); // Adicionado para depuração
      setSecrets(data);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data);
    }
  };

  useEffect(() => {
    fetchSecrets();
    fetchCategories(); // Chamar fetchCategories ao montar o componente
  }, [selectedCategory, searchTerm]);

  const addSecret = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not logged in');
      return;
    }

    // Call encrypt-secret Edge Function
    const { data: encryptedData, error: encryptError } = await supabase.functions.invoke('encrypt-secret', {
      body: { secret: secretValue, encryptionKey: user.id }, // Pass user.id as encryptionKey
    });

    if (encryptError) {
      console.error('Error encrypting secret:', encryptError);
      return;
    }

    let encryptedData2 = null;
    let encryptError2 = null;
    if (showSecondPair && secretValue2) {
      ({ data: encryptedData2, error: encryptError2 } = await supabase.functions.invoke('encrypt-secret', {
        body: { secret: secretValue2, encryptionKey: user.id },
      }));
      if (encryptError2) {
        console.error('Error encrypting second secret value:', encryptError2);
        return;
      }
    }

    const newSecret = {
      user_id: user.id,
      name: secretName,
      type: secretType,
      encrypted_value: encryptedData.encryptedValue,
      login: secretType === 'API_KEY' ? null : secretLogin, // Condicionalmente define login
      category: secretCategory, // Adicionado
      login_label: secretLoginLabel,
      value_label: secretValueLabel,
      login2: showSecondPair ? secretLogin2 : null,
      encrypted_value2: showSecondPair && secretValue2 ? encryptedData2.encryptedValue : null,
      login_label2: showSecondPair ? secretLoginLabel2 : null,
      value_label2: showSecondPair ? secretValueLabel2 : null,
    };

    const { error } = await supabase.from('segredos').insert([newSecret]);

    if (error) {
      console.error('Error adding secret:', error);
    } else {
      fetchSecrets(); // Refresh secrets after adding
      // Clear form fields and close modal
      setSecretName('');
      setSecretType('');
      setSecretValue('');
      setSecretLogin(''); // Limpar
      setSecretCategory(''); // Limpar
      setSecretLogin2('');
      setSecretValue2('');
      setShowSecondPair(false);
      setIsModalOpen(false); // Close modal
    }
  };

  const revealSecret = async (encryptedValue: string, secretId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not logged in');
      return 'Erro: Usuário não logado';
    }

    // Call decrypt-secret Edge Function
    const { data: decryptedData, error: decryptError } = await supabase.functions.invoke('decrypt-secret', {
      body: { encryptedValue, encryptionKey: user.id }, // Pass user.id as encryptionKey
    });

    if (decryptError) {
      console.error('Error decrypting secret:', decryptError);
      return 'Erro ao revelar';
    }

    return decryptedData.decryptedValue; // Corrected from decryptedSecret
  };

  const toggleSecretVisibility = async (secretId: string, encryptedValue: string, encryptedValue2?: string) => {
    if (showSecrets[secretId]) {
      // If currently visible, hide it
      setShowSecrets(prev => ({
        ...prev,
        [secretId]: false
      }));
      setDecryptedValues(prev => {
        const newState = { ...prev };
        delete newState[secretId];
        if (encryptedValue2) delete newState[secretId + '_2']; // Limpar o segundo valor
        return newState;
      });
    } else {
      // If currently hidden, reveal it
      const decrypted = await revealSecret(encryptedValue, secretId);
      setShowSecrets(prev => ({
        ...prev,
        [secretId]: true
      }));
      setDecryptedValues(prev => ({
        ...prev,
        [secretId]: decrypted
      }));

      if (encryptedValue2) {
        const decrypted2 = await revealSecret(encryptedValue2, secretId); // Reutilizar secretId como encryptionKey
        setDecryptedValues(prev => ({
          ...prev,
          [secretId + '_2']: decrypted2
        }));
      }
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    if (!confirm('Tem certeza que deseja excluir este segredo?')) {
      return;
    }

    const { error } = await supabase
      .from('segredos')
      .delete()
      .eq('id', secretId);

    if (error) {
      console.error('Error deleting secret:', error);
      toast.error("Erro ao excluir segredo", { description: error.message });
    } else {
      fetchSecrets(); // Atualiza a lista de segredos
      toast.success("Segredo excluído com sucesso!");
    }
  };

  const handleEditClick = async (secret: any) => {
    setEditingSecret(secret);
    setSecretName(secret.name);
    setSecretType(secret.type);
    setSecretLogin(secret.login || '');
    setSecretCategory(secret.category || '');
    setSecretLoginLabel(secret.login_label || 'Login'); // Carregar e definir padrão
    setSecretValueLabel(secret.value_label || 'Valor'); // Carregar e definir padrão

    setSecretLogin2(secret.login2 || '');
    setSecretValue2(secret.encrypted_value2 ? await revealSecret(secret.encrypted_value2, secret.id) : '');
    setSecretLoginLabel2(secret.login_label2 || 'Login 2');
    setSecretValueLabel2(secret.value_label2 || 'Valor 2');
    setShowSecondPair(!!secret.login2 || !!secret.encrypted_value2); // Mostrar o segundo par se houver dados

    // Descriptografar o valor para preencher o campo no modal de edição
    const decrypted = await revealSecret(secret.encrypted_value, secret.id);
    setSecretValue(decrypted);

    setIsEditModalOpen(true);
  };

  const handleUpdateSecret = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !editingSecret) {
      console.error('User not logged in or no secret being edited');
      return;
    }

    let updatedEncryptedValue = editingSecret.encrypted_value;

    // Se o valor do segredo foi alterado, criptografar novamente
    if (secretValue !== (await revealSecret(editingSecret.encrypted_value, editingSecret.id))) {
      const { data: encryptedData, error: encryptError } = await supabase.functions.invoke('encrypt-secret', {
        body: { secret: secretValue, encryptionKey: user.id },
      });

      if (encryptError) {
        console.error('Error encrypting secret for update:', encryptError);
        return;
      }
      updatedEncryptedValue = encryptedData.encryptedValue;
    }

    let updatedEncryptedValue2 = editingSecret.encrypted_value2;
    if (showSecondPair && secretValue2 !== (await revealSecret(editingSecret.encrypted_value2, editingSecret.id))) {
      const { data: encryptedData2, error: encryptError2 } = await supabase.functions.invoke('encrypt-secret', {
        body: { secret: secretValue2, encryptionKey: user.id },
      });
      if (encryptError2) {
        console.error('Error encrypting second secret value for update:', encryptError2);
        return;
      }
      updatedEncryptedValue2 = encryptedData2.encryptedValue;
    }

    const updatedSecret = {
      name: secretName,
      type: secretType,
      encrypted_value: updatedEncryptedValue,
      login: secretType === 'API_KEY' ? null : secretLogin,
      category: secretCategory,
      login_label: secretLoginLabel,
      value_label: secretValueLabel,
      login2: showSecondPair ? secretLogin2 : null,
      encrypted_value2: showSecondPair && secretValue2 ? updatedEncryptedValue2 : null,
      login_label2: showSecondPair ? secretLoginLabel2 : null,
      value_label2: showSecondPair ? secretValueLabel2 : null,
    };

    const { error } = await supabase
      .from('segredos')
      .update(updatedSecret)
      .eq('id', editingSecret.id);

    if (error) {
      console.error('Error updating secret:', error);
      // TODO: Adicionar feedback de erro para o usuário
    } else {
      fetchSecrets(); // Atualiza a lista de segredos
      setIsEditModalOpen(false); // Fecha o modal
      setEditingSecret(null); // Limpa o segredo em edição
      // TODO: Adicionar feedback de sucesso para o usuário
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      console.error('Category name cannot be empty');
      return;
    }

    const { error } = await supabase
      .from('categories')
      .insert([{ name: newCategoryName.trim() }]);

    if (error) {
      console.error('Error adding category:', error);
      // TODO: Adicionar feedback de erro para o usuário
    } else {
      setNewCategoryName('');
      fetchCategories(); // Atualiza a lista de categorias
      // TODO: Adicionar feedback de sucesso para o usuário
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) {
      return;
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      // TODO: Adicionar feedback de erro para o usuário
    } else {
      fetchCategories(); // Atualiza a lista de categorias
      // TODO: Adicionar feedback de sucesso para o usuário
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      "API_KEY": "bg-blue-100 text-blue-800",
      "ACESSO": "bg-red-100 text-red-800",
      "TOKEN": "bg-green-100 text-green-800",
      "SSH_KEY": "bg-purple-100 text-purple-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      "Analytics": "bg-orange-100 text-orange-800",
      "Financeiro": "bg-emerald-100 text-emerald-800",
      "Desenvolvimento": "bg-indigo-100 text-indigo-800",
      "Infraestrutura": "bg-slate-100 text-slate-800"
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const maskSecret = (value: string) => {
    return "•".repeat(32);
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copiado para a área de transferência!");
    }, (err) => {
      console.error('Could not copy text: ', err);
      toast.error("Falha ao copiar!");
    });
  };

  return (
    <div className="p-8 space-y-8">
        <PageHeader
          title="Cofre de Segredos"
          description="Armazenamento seguro de credenciais, chaves API e senhas"
        >
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="btn-hero">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Segredo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Novo Segredo
                </DialogTitle>
                <DialogDescription>
                  Adicione uma nova credencial ao cofre
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="secret-name">Nome/Identificação</Label>
                  <Input 
                    id="secret-name" 
                    placeholder="Ex: API Key - Google..."
                    value={secretName}
                    onChange={(e) => setSecretName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secret-type">Tipo</Label>
                  <select 
                    id="secret-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={secretType}
                    onChange={(e) => setSecretType(e.target.value)}
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="PASSWORD">Acesso</option>
                    <option value="API_KEY">Chave API</option>
                    <option value="TOKEN">Token</option>
                    <option value="SSH_KEY">Chave SSH</option>
                    <option value="AUTH">Autenticação</option>
                  </select>
                </div>
                {secretType === 'PASSWORD' || secretType === 'ACESSO' || secretType === 'AUTH' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {isEditingLoginLabelInput ? (
                        <Input
                          id="secret-login-label-input"
                          value={secretLoginLabel}
                          onChange={(e) => setSecretLoginLabel(e.target.value)}
                          onBlur={() => setIsEditingLoginLabelInput(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setIsEditingLoginLabelInput(false);
                            }
                          }}
                          className="w-auto text-sm"
                          autoFocus
                        />
                      ) : (
                        <Label htmlFor="secret-login">{secretLoginLabel}</Label>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={() => setIsEditingLoginLabelInput(true)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input 
                      id="secret-login" 
                      placeholder="Ex: usuario@email.com"
                      value={secretLogin}
                      onChange={(e) => setSecretLogin(e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {isEditingValueLabelInput ? (
                      <Input
                        id="secret-value-label-input"
                        value={secretValueLabel}
                        onChange={(e) => setSecretValueLabel(e.target.value)}
                        onBlur={() => setIsEditingValueLabelInput(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingValueLabelInput(false);
                          }
                        }}
                        className="w-auto text-sm"
                        autoFocus
                      />
                    ) : (
                      <Label htmlFor="secret-value">{secretValueLabel}</Label>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => setIsEditingValueLabelInput(true)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input 
                    id="secret-value" 
                    type="password"
                    placeholder="Insira o valor secreto..."
                    value={secretValue}
                    onChange={(e) => setSecretValue(e.target.value)}
                  />
                </div>

                {!showSecondPair && (
                  <div className="py-2">
                    <Button variant="outline" onClick={() => setShowSecondPair(true)}>
                      Adicionar Segundo Campo
                    </Button>
                  </div>
                )}
                {showSecondPair && (
                  <>
                    {secretType === 'PASSWORD' || secretType === 'ACESSO' || secretType === 'AUTH' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {isEditingLoginLabel2Input ? (
                            <Input
                              id="secret-login-label-2-input"
                              value={secretLoginLabel2}
                              onChange={(e) => setSecretLoginLabel2(e.target.value)}
                              onBlur={() => setIsEditingLoginLabel2Input(false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setIsEditingLoginLabel2Input(false);
                                }
                              }}
                              className="w-auto text-sm"
                              autoFocus
                            />
                          ) : (
                            <Label htmlFor="secret-login-2">{secretLoginLabel2}</Label>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0"
                            onClick={() => setIsEditingLoginLabel2Input(true)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          id="secret-login-2"
                          placeholder="Ex: segundo_usuario@email.com"
                          value={secretLogin2}
                          onChange={(e) => setSecretLogin2(e.target.value)}
                        />
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {isEditingValueLabel2Input ? (
                          <Input
                            id="secret-value-label-2-input"
                            value={secretValueLabel2}
                            onChange={(e) => setSecretValueLabel2(e.target.value)}
                            onBlur={() => setIsEditingValueLabel2Input(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setIsEditingValueLabel2Input(false);
                              }
                            }}
                            className="w-auto text-sm"
                            autoFocus
                          />
                        ) : (
                          <Label htmlFor="secret-value-2">{secretValueLabel2}</Label>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={() => setIsEditingValueLabel2Input(true)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        id="secret-value-2"
                        type="password"
                        placeholder="Insira o segundo valor secreto..."
                        value={secretValue2}
                        onChange={(e) => setSecretValue2(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="secret-category">Categoria</Label>
                  <div className="flex items-center gap-2"> {/* Adicionar um flex container */}
                    <select
                      id="secret-category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={secretCategory}
                      onChange={(e) => setSecretCategory(e.target.value)}
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <Button variant="outline" size="icon" onClick={() => setIsCategoryModalOpen(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              <Button className="w-full btn-hero" onClick={addSecret}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Modal de Edição de Segredo */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                Editar Segredo
              </DialogTitle>
              <DialogDescription>
                Edite as informações da sua credencial.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-secret-name">Nome/Identificação</Label>
                <Input
                  id="edit-secret-name"
                  placeholder="Ex: API Key - Google..."
                  value={secretName}
                  onChange={(e) => setSecretName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-secret-type">Tipo</Label>
                <select
                  id="edit-secret-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={secretType}
                  onChange={(e) => setSecretType(e.target.value)}
                >
                  <option value="">Selecione o tipo</option>
                  <option value="PASSWORD">Acesso</option>
                  <option value="API_KEY">Chave API</option>
                  <option value="TOKEN">Token</option>
                  <option value="SSH_KEY">Chave SSH</option>
                  <option value="AUTH">Autenticação</option>
                </select>
              </div>
              {secretType === 'PASSWORD' || secretType === 'ACESSO' || secretType === 'AUTH' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit-secret-login">{secretLoginLabel}</Label>
                    <Input
                      id="edit-secret-login-label"
                      placeholder="Nome do campo de login"
                      value={secretLoginLabel}
                      onChange={(e) => setSecretLoginLabel(e.target.value)}
                      className="w-auto text-xs"
                    />
                  </div>
                  <Input
                    id="edit-secret-login"
                    placeholder="Ex: usuario@email.com"
                    value={secretLogin}
                    onChange={(e) => setSecretLogin(e.target.value)}
                  />
                </div>
              ) : null}
              {secretType === 'PASSWORD' || secretType === 'ACESSO' || secretType === 'AUTH' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {isEditingLoginLabelInput ? (
                      <Input
                        id="edit-secret-login-label-input"
                        value={secretLoginLabel}
                        onChange={(e) => setSecretLoginLabel(e.target.value)}
                        onBlur={() => setIsEditingLoginLabelInput(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingLoginLabelInput(false);
                          }
                        }}
                        className="w-auto text-sm"
                        autoFocus
                      />
                    ) : (
                      <Label htmlFor="edit-secret-login">{secretLoginLabel}</Label>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => setIsEditingLoginLabelInput(true)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    id="edit-secret-login"
                    placeholder="Ex: usuario@email.com"
                    value={secretLogin}
                    onChange={(e) => setSecretLogin(e.target.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isEditingValueLabelInput ? (
                    <Input
                      id="edit-secret-value-label-input"
                      value={secretValueLabel}
                      onChange={(e) => setSecretValueLabel(e.target.value)}
                      onBlur={() => setIsEditingValueLabelInput(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingValueLabelInput(false);
                        }
                      }}
                      className="w-auto text-sm"
                      autoFocus
                    />
                  ) : (
                    <Label htmlFor="edit-secret-value">{secretValueLabel}</Label>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => setIsEditingValueLabelInput(true)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  id="edit-secret-value"
                  type="password"
                  placeholder="Insira o novo valor secreto..."
                  value={secretValue}
                  onChange={(e) => setSecretValue(e.target.value)}
                />
              </div>

              {!showSecondPair && (
                <div className="py-2">
                  <Button variant="outline" onClick={() => setShowSecondPair(true)}>
                    Adicionar Segundo Campo
                  </Button>
                </div>
              )}
              {showSecondPair && (
                <>
                  {secretType === 'PASSWORD' || secretType === 'ACESSO' || secretType === 'AUTH' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {isEditingLoginLabel2Input ? (
                          <Input
                            id="edit-secret-login-label-2-input"
                            value={secretLoginLabel2}
                            onChange={(e) => setSecretLoginLabel2(e.target.value)}
                            onBlur={() => setIsEditingLoginLabel2Input(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setIsEditingLoginLabel2Input(false);
                              }
                            }}
                            className="w-auto text-sm"
                            autoFocus
                          />
                        ) : (
                          <Label htmlFor="edit-secret-login-2">{secretLoginLabel2}</Label>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={() => setIsEditingLoginLabel2Input(true)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        id="edit-secret-login-2"
                        placeholder="Ex: segundo_usuario@email.com"
                        value={secretLogin2}
                        onChange={(e) => setSecretLogin2(e.target.value)}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {isEditingValueLabel2Input ? (
                        <Input
                          id="edit-secret-value-label-2-input"
                          value={secretValueLabel2}
                          onChange={(e) => setSecretValueLabel2(e.target.value)}
                          onBlur={() => setIsEditingValueLabel2Input(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setIsEditingValueLabel2Input(false);
                            }
                          }}
                            className="w-auto text-sm"
                            autoFocus
                          />
                        ) : (
                          <Label htmlFor="edit-secret-value-2">{secretValueLabel2}</Label>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={() => setIsEditingValueLabel2Input(true)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        id="edit-secret-value-2"
                        type="password"
                        placeholder="Insira o segundo valor secreto..."
                        value={secretValue2}
                        onChange={(e) => setSecretValue2(e.target.value)}
                      />
                    </div>
                  </>
                )}

              <div className="space-y-2">
                <Label htmlFor="edit-secret-category">Categoria</Label>
                <div className="flex items-center gap-2"> {/* Adicionar um flex container */}
                  <select
                    id="edit-secret-category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={secretCategory}
                    onChange={(e) => setSecretCategory(e.target.value)}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <Button variant="outline" size="icon" onClick={() => setIsCategoryModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full btn-hero" onClick={handleUpdateSecret}>
                <Edit className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Gerenciamento de Categorias */}
        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" /> {/* Ícone temporário, pode ser ajustado */}
                Gerenciar Categorias
              </DialogTitle>
              <DialogDescription>
                Adicione ou remova categorias para organizar seus segredos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Nova categoria..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <Button onClick={handleAddCategory}>Adicionar</Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma categoria cadastrada.</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between border p-2 rounded-md">
                      <span>{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats Grid */}
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Segredos"
            value={secrets.length.toString()}
            description="credenciais armazenadas"
            icon={Shield}
          />
          <StatsCard
            title="APIs Ativas"
            value={secrets.filter(s => s.type === 'API_KEY').length.toString()}
            description="chaves em uso"
            icon={Key}
            trend={{ value: 25, isPositive: true }} // Placeholder, pode ser ajustado depois
          />
          <StatsCard
            title="Último Acesso"
            value="Hoje"
            description="às 14:30"
            icon={Lock}
          />
          <StatsCard
            title="Nível de Segurança"
            value="Alto"
            description="criptografia AES-256"
            icon={Shield}
          />
        </div>

        {/* Secrets List */}
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Segredos Armazenados
                </CardTitle>
                <CardDescription>
                  Suas credenciais protegidas por criptografia
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                <select
                  id="category-filter"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Todas as Categorias</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {secrets.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhum segredo encontrado. Adicione um novo!</p>
              ) : (
                secrets.map((secret) => (
                  <div 
                    key={secret.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{secret.name}</p>
                        <Badge className={getTypeColor(secret.type)}>
                          {secret.type}
                        </Badge>
                        {/* <Badge variant="outline" className={getCategoryColor(secret.category)}>
                          {secret.category}
                        </Badge> */}
                      </div>
                      {showSecrets[secret.id] && secret.login && (
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono break-all overflow-x-auto max-w-full">
                            {secret.login}
                          </code>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(secret.login)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded font-mono break-all">
                          {showSecrets[secret.id] ? decryptedValues[secret.id] : maskSecret(secret.encrypted_value || secret.value_encrypted)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSecretVisibility(secret.id, secret.encrypted_value || secret.value_encrypted, secret.encrypted_value2)}
                          className="h-6 w-6 p-0"
                        >
                          {showSecrets[secret.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(decryptedValues[secret.id])}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {showSecrets[secret.id] && secret.login2 && (
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono break-all overflow-x-auto max-w-full">
                            {secret.login2}
                          </code>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(secret.login2)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {showSecrets[secret.id] && secret.encrypted_value2 && (
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono break-all overflow-x-auto max-w-full">
                            {decryptedValues[secret.id + '_2']}
                          </code>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(decryptedValues[secret.id + '_2'])}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {/* <p className="text-xs text-muted-foreground">
                        Último uso: {new Date(secret.lastUsed).toLocaleDateString('pt-BR')}
                      </p> */}
                    </div>
                    <div className="flex flex-col md:flex-row gap-1 items-end">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditClick(secret)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteSecret(secret.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Informações de Segurança
            </CardTitle>
            <CardDescription>
              Como seus dados são protegidos no cofre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold">Criptografia AES-256</h3>
                <p className="text-sm text-muted-foreground">
                  Todos os segredos são criptografados usando o padrão militar AES-256
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Key className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Chaves Únicas</h3>
                <p className="text-sm text-muted-foreground">
                  Cada usuário possui chaves de criptografia únicas e isoladas
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold">Zero-Knowledge</h3>
                <p className="text-sm text-muted-foreground">
                  Nem mesmo os administradores podem acessar seus segredos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default Cofre;
