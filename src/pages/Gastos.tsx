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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker } from "react-day-picker";
import { 
  CreditCard, 
  DollarSign, 
  TrendingDown, 
  TrendingUp,
  Plus,
  Search,
  Filter,
  Calendar as CalendarIcon,
  Tag,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Settings,
  X
} from "lucide-react";

const ExpenseForm = ({ 
  isEdit = false, 
  description, setDescription,
  amount, setAmount,
  category, setCategory,
  date, setDate,
  recurrence, setRecurrence,
  dueDay, setDueDay,
  dueMonth, setDueMonth,
  categories,
  setIsCategoryModalOpen,
  handleSubmit
}) => (
  <div className="space-y-4 py-4">
    <div className="space-y-2">
      <Label htmlFor="description">Descrição</Label>
      <Input id="description" placeholder="Ex: Mercado, Gasolina..." value={description} onChange={(e) => setDescription(e.target.value)} />
    </div>
    <div className="space-y-2">
      <Label htmlFor="amount">Valor</Label>
      <Input id="amount" type="number" placeholder="0,00" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
    </div>
    <div className="space-y-2">
      <Label htmlFor="recurrence">Recorrência</Label>
      <select id="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <option value="Único">Único</option>
        <option value="Mensal">Mensal</option>
        <option value="Anual">Anual</option>
      </select>
    </div>

    {recurrence === 'Único' && (
      <div className="space-y-2">
        <Label htmlFor="date">Data do Gasto</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    )}

    {recurrence === 'Mensal' && (
      <div className="space-y-2">
        <Label htmlFor="due-day">Dia do Vencimento</Label>
        <Input id="due-day" type="number" min="1" max="31" placeholder="Ex: 15" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
      </div>
    )}

    {recurrence === 'Anual' && (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due-day">Dia</Label>
          <Input id="due-day" type="number" min="1" max="31" placeholder="Ex: 15" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due-month">Mês</Label>
          <select id="due-month" value={dueMonth} onChange={(e) => setDueMonth(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option value="">Selecione o mês</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
            ))}
          </select>
        </div>
      </div>
    )}

    <div className="space-y-2">
      <Label htmlFor="category">Categoria</Label>
      <div className="flex items-center gap-2">
        <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          <option value="">Selecione uma categoria</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
        <Button variant="outline" size="icon" onClick={() => setIsCategoryModalOpen(true)}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
    <Button className="w-full btn-hero" onClick={handleSubmit}>
      {isEdit ? <><Edit className="h-4 w-4 mr-2" /> Salvar Alterações</> : <><Plus className="h-4 w-4 mr-2" /> Adicionar Gasto</>}
    </Button>
  </div>
);

const MonthYearPicker = ({ date, setDate }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className="w-[280px] justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) : <span>Selecione o período</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <DayPicker
          mode="single"
          selected={date}
          onSelect={(day) => setDate(day || new Date())}
          captionLayout="dropdown-buttons"
          fromYear={2020}
          toYear={new Date().getFullYear() + 5}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

const Gastos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategoryStatModalOpen, setIsCategoryStatModalOpen] = useState(false);
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [recurrence, setRecurrence] = useState('Único');
  const [dueDay, setDueDay] = useState('');
  const [dueMonth, setDueMonth] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [showAmount, setShowAmount] = useState<{[key: string]: boolean}>({});

  const [stats, setStats] = useState({
    monthlyTotal: 0,
    monthlyPreviousTotal: 0,
    dailyAverage: 0,
    topCategory: { name: 'N/A', amount: 0, percentage: 0 },
    grandTotal: 0
  });

  const [displayedCategories, setDisplayedCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('gastosDisplayedCategories');
    return saved ? JSON.parse(saved) : [];
  });
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [modalCat1, setModalCat1] = useState('');
  const [modalCat2, setModalCat2] = useState('');
  const [modalCat3, setModalCat3] = useState('');
  const [modalCat4, setModalCat4] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<Date | null>(new Date());

  const clearForm = () => {
    setDescription('');
    setAmount('');
    setCategory('');
    setDate('');
    setRecurrence('Único');
    setDueDay('');
    setDueMonth('');
    setEditingExpense(null);
  }

  useEffect(() => {
    let result = expenses
        .filter(expense => 
            expense.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .filter(expense => {
            if (!period) return true; // Show all if no period is selected

            const selectedMonth = period.getMonth() + 1;
            const selectedYear = period.getFullYear();

            const createdAt = new Date(expense.created_at);
            const createdYear = createdAt.getFullYear();
            const createdMonth = createdAt.getMonth() + 1;

            const existedInPeriod = createdYear < selectedYear || (createdYear === selectedYear && createdMonth <= selectedMonth);
            if (!existedInPeriod) {
                return false;
            }

            if (expense.recurrence === 'Único') {
                if (!expense.date) return false;
                const expenseDate = new Date(expense.date);
                return expenseDate.getFullYear() === selectedYear && expenseDate.getMonth() + 1 === selectedMonth;
            }
            if (expense.recurrence === 'Mensal') {
                return true;
            }
            if (expense.recurrence === 'Anual') {
                return expense.due_month === selectedMonth;
            }
            
            return false;
        });
    setFilteredExpenses(result);
  }, [expenses, searchTerm, period]);

  useEffect(() => {
    const relevantExpenses = filteredExpenses;

    if (!period) {
        const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        setStats({ monthlyTotal: 0, monthlyPreviousTotal: 0, dailyAverage: 0, topCategory: { name: 'N/A', amount: 0, percentage: 0 }, grandTotal });
        return;
    }

    let monthlyTotal = relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const prevPeriod = new Date(period);
    prevPeriod.setMonth(prevPeriod.getMonth() - 1);
    const prevMonth = prevPeriod.getMonth();
    const prevYear = prevPeriod.getFullYear();

    const prevMonthRelevantExpenses = expenses.filter(expense => {
        const createdAt = new Date(expense.created_at);
        const createdYear = createdAt.getFullYear();
        const createdMonth = createdAt.getMonth();

        const existedInPeriod = createdYear < prevYear || (createdYear === prevYear && createdMonth <= prevMonth);
        if (!existedInPeriod) return false;

        if (expense.recurrence === 'Único') {
            if (!expense.date) return false;
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === prevYear && expenseDate.getMonth() === prevMonth;
        }
        if (expense.recurrence === 'Mensal') return true;
        if (expense.recurrence === 'Anual') return expense.due_month === (prevMonth + 1);
        return false;
    });
    let previousMonthlyTotal = prevMonthRelevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    let currentMonthCategoryMap = {} as {[key: string]: number};
    relevantExpenses.forEach(expense => {
        currentMonthCategoryMap[expense.category] = (currentMonthCategoryMap[expense.category] || 0) + expense.amount;
    });

    let topCategory = { name: 'N/A', amount: 0, percentage: 0 };
    if (monthlyTotal > 0) {
        const categoriesMapArray = Object.entries(currentMonthCategoryMap);
        if(categoriesMapArray.length > 0) {
          const topCategoryEntry = categoriesMapArray.reduce((a, b) => a[1] > b[1] ? a : b);
          const topCategoryName = topCategoryEntry[0];
          const topCategoryAmount = topCategoryEntry[1];
          const topCategoryPercentage = (topCategoryAmount / monthlyTotal) * 100;
          topCategory = {
              name: topCategoryName,
              amount: topCategoryAmount,
              percentage: topCategoryPercentage,
          };
        }
    }

    setStats({ monthlyTotal, monthlyPreviousTotal: previousMonthlyTotal, dailyAverage: 0, topCategory, grandTotal: 0 });

  }, [filteredExpenses, period]);

  useEffect(() => {
    if (displayedCategories.length === 0) {
        setCategoryStats([]);
        return;
    }

    const totalForStats = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const newCategoryStats = displayedCategories.map(catName => {
        const categoryExpenses = filteredExpenses.filter(e => e.category === catName);
        const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
        const percentage = totalForStats > 0 ? (categoryTotal / totalForStats) * 100 : 0;
        return {
            name: catName,
            amount: categoryTotal,
            percentage: percentage
        };
    });
    setCategoryStats(newCategoryStats);
  }, [filteredExpenses, displayedCategories]);


  const handleOpenCategoryStatModal = () => {
    setModalCat1(displayedCategories[0] || '');
    setModalCat2(displayedCategories[1] || '');
    setModalCat3(displayedCategories[2] || '');
    setModalCat4(displayedCategories[3] || '');
    setIsCategoryStatModalOpen(true);
  }

  const handleSaveCategoryStatSelection = () => {
    const newSelection = [modalCat1, modalCat2, modalCat3, modalCat4].filter(Boolean);
    localStorage.setItem('gastosDisplayedCategories', JSON.stringify(newSelection));
    setDisplayedCategories(newSelection);
    setIsCategoryStatModalOpen(false);
  }

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
    } else {
      setExpenses(data);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('gasto_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching expense categories:', error);
    } else {
      setCategories(data);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  const addExpense = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not logged in');
      return;
    }

    let newExpense: any = {
      user_id: user.id,
      description,
      amount: parseFloat(amount),
      category,
      recurrence,
    };

    if (recurrence === 'Único') {
      newExpense.date = date;
    } else if (recurrence === 'Mensal') {
      newExpense.due_day = parseInt(dueDay);
    } else if (recurrence === 'Anual') {
      newExpense.due_day = parseInt(dueDay);
      newExpense.due_month = parseInt(dueMonth);
    }

    const { error } = await supabase.from('gastos').insert([newExpense]);

    if (error) {
      console.error('Error adding expense:', error);
    } else {
      fetchExpenses();
      clearForm();
      setIsModalOpen(false);
    }
  };

  const handleAddCategory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("User must be logged in to add a category.");
      return;
    }
    if (!newCategoryName.trim()) return;

    const { error } = await supabase
      .from('gasto_categories')
      .insert([{ name: newCategoryName.trim(), user_id: user.id }]);
      
    if (error) {
      console.error('Error adding category:', error);
    } else {
      setNewCategoryName('');
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    const { error } = await supabase
      .from('gasto_categories')
      .delete()
      .eq('id', categoryId);
    if (error) {
      console.error('Error deleting category:', error);
    } else {
      fetchCategories();
    }
  };

  const toggleAmountVisibility = (expenseId: string) => {
    setShowAmount(prev => ({ ...prev, [expenseId]: !prev[expenseId] }));
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Tem certeza que deseja excluir este gasto?')) {
      return;
    }
    const { error } = await supabase.from('gastos').delete().eq('id', expenseId);
    if (error) {
      console.error('Error deleting expense:', error);
    } else {
      fetchExpenses();
    }
  };

  const handleEditClick = (expense: any) => {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setRecurrence(expense.recurrence || 'Único');
    setDate(expense.date || '');
    setDueDay(expense.due_day || '');
    setDueMonth(expense.due_month || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;

    let updatedExpense: any = {
      description,
      amount: parseFloat(amount),
      category,
      recurrence,
    };

    if (recurrence === 'Único') {
      updatedExpense.date = date;
      updatedExpense.due_day = null;
      updatedExpense.due_month = null;
    } else if (recurrence === 'Mensal') {
      updatedExpense.date = null;
      updatedExpense.due_day = parseInt(dueDay);
      updatedExpense.due_month = null;
    } else if (recurrence === 'Anual') {
      updatedExpense.date = null;
      updatedExpense.due_day = parseInt(dueDay);
      updatedExpense.due_month = parseInt(dueMonth);
    }

    const { error } = await supabase
      .from('gastos')
      .update(updatedExpense)
      .eq('id', editingExpense.id);

    if (error) {
      console.error('Error updating expense:', error);
    } else {
      fetchExpenses();
      clearForm();
      setIsEditModalOpen(false);
    }
  };

  const stringToHashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };

  const colorPalette = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", 
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500", 
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500", 
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500", "bg-rose-500"
  ];

  const getCategoryColor = (category: string) => {
    if (!category) return "bg-gray-500";
    const hashCode = stringToHashCode(category);
    const index = Math.abs(hashCode) % colorPalette.length;
    return colorPalette[index];
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    if (current === previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const trend = calculateTrend(stats.monthlyTotal, stats.monthlyPreviousTotal);

  const formProps = {
    description, setDescription,
    amount, setAmount,
    category, setCategory,
    date, setDate,
    recurrence, setRecurrence,
    dueDay, setDueDay,
    dueMonth, setDueMonth,
    categories,
    setIsCategoryModalOpen,
  };

  const ExpenseRow = ({ expense }) => {
    const renderDueDate = () => {
      if (expense.recurrence === 'Único') {
        return `Gasto em: ${new Date(expense.date).toLocaleDateString('pt-BR')}`;
      }

      let dueDateString = 'Data não especificada';
      if (expense.recurrence === 'Mensal') {
        dueDateString = `Vence todo dia ${expense.due_day}`;
      } else if (expense.recurrence === 'Anual') {
        dueDateString = `Vence todo dia ${expense.due_day} de ${new Date(0, expense.due_month - 1).toLocaleString('pt-BR', { month: 'long' })}`;
      }

      return (
        <div className="flex flex-col text-xs">
          <span>{`Iniciado em: ${new Date(expense.created_at).toLocaleDateString('pt-BR')}`}</span>
          <span className="font-semibold">{dueDateString}</span>
        </div>
      );
    };

    return (
      <div 
        key={expense.id}
        className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors gap-4"
      >
        <div className="flex-1 space-y-1 flex flex-col">
          <div className="flex items-center gap-2">
            <p className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">{expense.description}</p>
            <Badge className={getCategoryColor(expense.category)}>
              {expense.category}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {renderDueDate()}
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-end md:items-center gap-4 ml-auto">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <p className="font-bold text-lg">
                {showAmount[expense.id] ? `R$ ${expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ ••••••'}
              </p>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleAmountVisibility(expense.id)}>
                {showAmount[expense.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditClick(expense)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteExpense(expense.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
        <PageHeader
          title="Gestão de Gastos"
          description="Controle completo das suas finanças pessoais"
        >
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <MonthYearPicker date={period} setDate={setPeriod} />
            {period && (
                <Button variant="ghost" onClick={() => setPeriod(null)}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar Seleção
                </Button>
            )}
            <Dialog open={isModalOpen} onOpenChange={(isOpen) => { !isOpen && clearForm(); setIsModalOpen(isOpen); }}>
              <DialogTrigger asChild>
                <Button className="btn-hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Gasto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Novo Gasto
                  </DialogTitle>
                  <DialogDescription>
                    Adicione um novo gasto às suas finanças
                  </DialogDescription>
                </DialogHeader>
                <ExpenseForm {...formProps} isEdit={false} handleSubmit={addExpense} />
              </DialogContent>
            </Dialog>
          </div>
        </PageHeader>

        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => { !isOpen && clearForm(); setIsEditModalOpen(isOpen); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                Editar Gasto
              </DialogTitle>
              <DialogDescription>
                Atualize as informações do seu gasto.
              </DialogDescription>
            </DialogHeader>
            <ExpenseForm {...formProps} isEdit={true} handleSubmit={handleUpdateExpense} />
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Gerenciar Categorias de Gastos</DialogTitle>
              <DialogDescription>
                Adicione ou remova categorias para organizar seus gastos.
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
                {categories.map((cat) => (
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
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryStatModalOpen} onOpenChange={setIsCategoryStatModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Selecionar Categorias para Exibição</DialogTitle>
              <DialogDescription>
                Escolha até 4 categorias para visualizar no card.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Categoria 1</Label>
                <select value={modalCat1} onChange={(e) => setModalCat1(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">Nenhuma</option>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Categoria 2</Label>
                <select value={modalCat2} onChange={(e) => setModalCat2(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">Nenhuma</option>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Categoria 3</Label>
                <select value={modalCat3} onChange={(e) => setModalCat3(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">Nenhuma</option>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Categoria 4</Label>
                <select value={modalCat4} onChange={(e) => setModalCat4(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">Nenhuma</option>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <Button className="w-full" onClick={handleSaveCategoryStatSelection}>Salvar Seleção</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {period ? (
                <>
                    <StatsCard
                        title="Gastos do Mês"
                        value={`R$ ${stats.monthlyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        description={period.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        icon={DollarSign}
                        trend={{ value: trend, isPositive: trend < 0 }}
                    />
                    <StatsCard
                        title="Maior Categoria (Mês)"
                        value={Object.keys(stats.topCategory || {}).length > 0 ? stats.topCategory.name : 'N/A'}
                        description={Object.keys(stats.topCategory || {}).length > 0 ? `R$ ${stats.topCategory.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${stats.topCategory.percentage.toFixed(0)}%)` : ''}
                        icon={Tag}
                    />
                    <StatsCard
                        title="Comparativo Mês Anterior"
                        value={`R$ ${stats.monthlyPreviousTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        description="total do mês anterior"
                        icon={TrendingDown}
                    />
                </>
            ) : (
                <StatsCard
                    title="Total Geral"
                    value={`R$ ${stats.grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    description="soma de todos os gastos"
                    icon={DollarSign}
                />
            )}
        </div>

        {/* Expenses List */}
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Lista de Gastos
                </CardTitle>
                <CardDescription>
                  {period ? `Exibindo gastos para ${period.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}` : "Exibindo todos os gastos"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por descrição..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredExpenses.map((expense) => (
                <ExpenseRow expense={expense} key={expense.id} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Categories Overview */}
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Gastos por Categoria
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleOpenCategoryStatModal}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              {period ? `Distribuição para ${period.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}` : "Distribuição de todo o período"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {categoryStats.map((stat, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{stat.name}</span>
                    <span className="text-sm text-muted-foreground">{stat.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`${getCategoryColor(stat.name)} h-2 rounded-full`} style={{ width: `${stat.percentage}%` }}></div>
                  </div>
                  <span className="text-sm text-muted-foreground">R$ {stat.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default Gastos;
