import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Gastos from "./pages/Gastos";
import Cofre from "./pages/Cofre";
import Analytics from "./pages/Analytics";
import Email from "./pages/Email";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminSettings from "./pages/AdminSettings";
import VendasDashboard from "./pages/VendasDashboard";
import VendasLista from "./pages/VendasLista";
import Produtos from "./pages/Produtos";
import { AppLayout } from "@/components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PrivacyProvider>
    <TooltipProvider>
      <Toaster />
      <SonnerToaster />
      <AppLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/gastos" element={<ProtectedRoute><Gastos /></ProtectedRoute>} />
          <Route path="/cofre" element={<ProtectedRoute><Cofre /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/email" element={<ProtectedRoute><Email /></ProtectedRoute>} />
          {/* Sales System Routes */}
          <Route path="/vendas/dashboard" element={<ProtectedRoute><VendasDashboard /></ProtectedRoute>} />
          <Route path="/vendas" element={<ProtectedRoute><VendasLista /></ProtectedRoute>} />
          <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
          {/* New Admin Settings Route */}
          <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </TooltipProvider>
  </PrivacyProvider>
  </QueryClientProvider>
);

export default App;