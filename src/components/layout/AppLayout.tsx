import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { ModeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Pages that shouldn't show the sidebar
  const authPages = ['/login', '/forgot-password', '/update-password'];
  const isAuthPage = authPages.includes(location.pathname);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Don't show sidebar on auth pages or when not authenticated
  const shouldShowSidebar = !isAuthPage && isAuthenticated && !loading;

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!shouldShowSidebar) {
    // Simple layout for auth pages
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="absolute top-4 right-4 z-50">
          <ModeToggle />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 h-full">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <AppSidebar 
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Header and Sidebar (Sheet) */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <div className="fixed top-0 left-0 right-0 z-40 md:hidden flex items-center justify-between p-4 border-b border-border bg-background">
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <ModeToggle />
        </div>

        <SheetContent side="left" className="p-0 w-72">
          <AppSidebar 
            collapsed={false} // Always expanded in mobile sheet
            onToggle={() => setMobileSidebarOpen(false)} // Close sheet on toggle
          />
        </SheetContent>
      </Sheet>
      
      <main className="flex-1 overflow-y-auto"> {/* Adjust padding for mobile header */}
        {/* Desktop Toggle Button */}
        <div className="absolute top-4 right-4 z-50 hidden md:block"> {/* Only visible on desktop */}
          <ModeToggle />
        </div>

        <div className="p-4 md:p-8 h-full pt-16 md:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
