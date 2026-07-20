import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ActiveConversationProvider } from "@/contexts/ActiveConversationContext";
import { SelectedCongregationProvider } from "@/contexts/SelectedCongregationContext";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leaders from "./pages/Leaders";
import Members from "./pages/Members";
import Congregados from "./pages/Congregados";
import Chat from "./pages/Chat";
import Statistics from "./pages/Statistics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import Patrimonio from "./pages/Patrimonio";
import PatrimonioMateriais from "./pages/PatrimonioMateriais";
import PatrimonioSolicitacoes from "./pages/PatrimonioSolicitacoes";
import Tesouraria from "./pages/Tesouraria";
import FinancialReports from "./pages/FinancialReports";
import AssetRequests from "./pages/AssetRequests";
import Inventory from "./pages/Inventory";
import NotFound from "./pages/NotFound";
import ReunioesObreiros from "./pages/ReunioesObreiros";
import Letters from "./pages/Letters";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ActiveConversationProvider>
          <SelectedCongregationProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/leaders" element={<ProtectedRoute><Leaders /></ProtectedRoute>} />
            <Route path="/dashboard/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
            <Route path="/dashboard/congregados" element={<ProtectedRoute><Congregados /></ProtectedRoute>} />
            <Route path="/dashboard/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/dashboard/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
            <Route path="/dashboard/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/dashboard/patrimonio" element={<ProtectedRoute><Patrimonio /></ProtectedRoute>} />
            <Route path="/dashboard/patrimonio/materiais" element={<ProtectedRoute><PatrimonioMateriais /></ProtectedRoute>} />
            <Route path="/dashboard/patrimonio/solicitacoes" element={<ProtectedRoute><PatrimonioSolicitacoes /></ProtectedRoute>} />
            <Route path="/dashboard/tesouraria" element={<ProtectedRoute><Tesouraria /></ProtectedRoute>} />
            <Route path="/dashboard/tesouraria/relatorios" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
            <Route path="/dashboard/tesouraria/solicitacoes" element={<ProtectedRoute><AssetRequests /></ProtectedRoute>} />
            <Route path="/dashboard/tesouraria/inventario" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/dashboard/reunioes-obreiros" element={<ProtectedRoute><ReunioesObreiros /></ProtectedRoute>} />
            <Route path="/dashboard/letters" element={<ProtectedRoute><Letters /></ProtectedRoute>} />

            {/* Role-based Protected Route */}
            <Route path="/super-admin" element={
              <ProtectedRoute allowedRoles={['super_admin', 'secretary']}>
                <SuperAdmin />
              </ProtectedRoute>
            } />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
          </SelectedCongregationProvider>
        </ActiveConversationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
