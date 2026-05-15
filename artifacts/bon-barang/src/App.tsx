import { AppLayout } from "./components/layout";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NewRequest from "@/pages/requests/new";
import RequestsList from "@/pages/requests/index";
import RequestDetail from "@/pages/requests/[id]";
import Approvals from "@/pages/approvals";
import Items from "@/pages/items";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/requests/new">
        <ProtectedRoute>
          <AppLayout>
            <NewRequest />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/requests">
        <ProtectedRoute>
          <AppLayout>
            <RequestsList />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/requests/:id">
        <ProtectedRoute>
          <AppLayout>
            <RequestDetail />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/approvals">
        <ProtectedRoute allowedRoles={["admin", "kalapas"]}>
          <AppLayout>
            <Approvals />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/items">
        <ProtectedRoute allowedRoles={["admin", "kalapas"]}>
          <AppLayout>
            <Items />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <AppLayout>
            <Settings />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route>
        <AppLayout>
          <NotFound />
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
