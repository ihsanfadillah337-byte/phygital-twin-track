import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { agencyName, role } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <div className="flex items-center">
              <SidebarTrigger className="mr-4" />
              <span className="text-sm font-medium text-muted-foreground">
                Phygital Document Tracking System
              </span>
            </div>
            <div className="flex items-center gap-2">
              {role === "super_admin" && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Shield className="h-3 w-3" /> Admin
                </Badge>
              )}
              <span className="text-xs text-muted-foreground hidden sm:inline">{agencyName}</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
