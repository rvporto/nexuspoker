import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Partidas from "@/pages/Partidas";
import Ranking from "@/pages/Ranking";
import Perfil from "@/pages/Perfil";
import Estatisticas from "@/pages/Estatisticas";
import Auth from "@/pages/Auth";
import CompleteProfile from "@/pages/CompleteProfile";
import LinkRequests from "@/pages/LinkRequests";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/partidas" element={<Partidas />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/estatisticas" element={<Estatisticas />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/admin/vinculos" element={<LinkRequests />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
