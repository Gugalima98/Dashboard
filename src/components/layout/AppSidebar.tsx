import { useState } from "react";
import { 
  LayoutDashboard, 
  CreditCard, 
  Shield, 
  BarChart3, 
  Mail, 
  Settings,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  ClipboardList,
  Package,
  LogOut // Added LogOut icon
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom"; // Added useNavigate
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient"; // Added supabase import
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Added Tooltip imports

const mainNavItems = [
  { 
    title: "Dashboard", 
    url: "/", 
    icon: LayoutDashboard,
    description: "Visão geral da plataforma"
  },
  { 
    title: "Gestão de Gastos", 
    url: "/gastos", 
    icon: CreditCard,
    description: "Controle financeiro pessoal"
  },
  { 
    title: "Cofre de Segredos", 
    url: "/cofre", 
    icon: Shield,
    description: "Armazenamento seguro de credenciais"
  },
  { 
    title: "Analytics", 
    url: "/analytics", 
    icon: BarChart3,
    description: "Painel de métricas e relatórios"
  },
  { 
    title: "E-mail", 
    url: "/email", 
    icon: Mail,
    description: "Sistema de comunicação (em breve)"
  },
];

const salesNavItems = [
    { 
        title: "Dashboard Vendas", 
        url: "/vendas/dashboard", 
        icon: ShoppingBag,
        description: "Dashboard de receita e vendas"
    },
    { 
        title: "Vendas", 
        url: "/vendas", 
        icon: ClipboardList,
        description: "Lista de todas as vendas"
    },
    { 
        title: "Produtos", 
        url: "/produtos", 
        icon: Package,
        description: "Seus cursos e ferramentas"
    },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NavSection = ({ title, items, collapsed, isActive }) => (
    <div>
        {!collapsed && <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-2">{title}</h2>}
        {items.map((item) => (
          <Tooltip key={item.title}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.url}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group",
                  isActive(item.url) 
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" 
                    : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive(item.url) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-sm truncate",
                      isActive(item.url) ? "text-primary-foreground" : "text-foreground"
                    )}>
                      {item.title}
                    </div>
                    <div className={cn(
                      "text-xs truncate",
                      isActive(item.url) ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </div>
                  </div>
                )}
              </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
          </Tooltip>
        ))}
    </div>
);

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath === path;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className={cn(
      "min-h-screen bg-sidebar-background border-r border-border flex flex-col transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-72",
      "md:min-h-screen md:flex"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Plataforma
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestão Empresarial
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="hover:bg-muted hidden md:block" // Hide on mobile, only for desktop toggle
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        <NavSection title="Principal" items={mainNavItems} collapsed={collapsed} isActive={isActive} />
        <NavSection title="Vendas" items={salesNavItems} collapsed={collapsed} isActive={isActive} />
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border flex items-center justify-center space-x-1">
        <NavLink
          to="/admin/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
            "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
            collapsed && "justify-center"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <span className="font-medium text-sm">Configurações</span>
          )}
        </NavLink>
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
              "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium text-sm">Sair</span>
          </Button>
        )}
      </div>
    </div>
  );
}
