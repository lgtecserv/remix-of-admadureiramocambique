import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leaders from "./pages/Leaders";
import Members from "./pages/Members";
import Visitors from "./pages/Visitors";
import Chat from "./pages/Chat";
import Statistics from "./pages/Statistics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import Patrimonio from "./pages/Patrimonio";
import Tesouraria from "./pages/Tesouraria";
import FinancialReports from "./pages/FinancialReports";
import AssetRequests from "./pages/AssetRequests";
import Inventory from "./pages/Inventory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/leaders" element={<Leaders />} />
          <Route path="/dashboard/members" element={<Members />} />
          <Route path="/dashboard/visitors" element={<Visitors />} />
          <Route path="/dashboard/chat" element={<Chat />} />
          <Route path="/dashboard/statistics" element={<Statistics />} />
          <Route path="/dashboard/reports" element={<Reports />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/patrimonio" element={<Patrimonio />} />
          <Route path="/dashboard/tesouraria" element={<Tesouraria />} />
          <Route path="/dashboard/tesouraria/relatorios" element={<FinancialReports />} />
          <Route path="/dashboard/tesouraria/solicitacoes" element={<AssetRequests />} />
          <Route path="/dashboard/tesouraria/inventario" element={<Inventory />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
