import React, { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, UserPlus, ClipboardList, Users, Shield } from "lucide-react";
import { queryClientInstance } from "@/lib/query-client";
import { usePullToRefresh } from "@/lib/PullToRefreshContext";
import ClubOverview from "@/components/registration/ClubOverview";
import RegistrationForm from "@/components/registration/RegistrationForm";
import RegistrationsList from "@/components/registration/RegistrationsList";
import PlayersList from "@/components/registration/PlayersList";
import TeamsList from "@/components/registration/TeamsList";

const DIVISIONS = [
  { value: "all", label: "All" },
  { value: "Boys", label: "Boys" },
  { value: "Girls", label: "Girls" },
];

export default function Registration() {
  // Pull-to-refresh: re-fetch all active queries on this page.
  const handleRefresh = useCallback(() => queryClientInstance.refetchQueries({ type: "active" }), []);
  usePullToRefresh(handleRefresh);

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [division, setDivision] = useState("all");

  const setTab = (t) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    setSearchParams(next);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1.5">Club Nexus</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Club Management & Registration
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Central registration system — divided into Boys and Girls divisions. Every registration creates a review task in the project management board.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {DIVISIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDivision(d.value)}
                className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase rounded-md transition-colors ${
                  division === d.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setTab("register")}>
            <UserPlus className="w-4 h-4 mr-2" /> New Registration
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="register"><UserPlus className="w-4 h-4 mr-1" />Register</TabsTrigger>
          <TabsTrigger value="registrations"><ClipboardList className="w-4 h-4 mr-1" />Registrations</TabsTrigger>
          <TabsTrigger value="players"><Users className="w-4 h-4 mr-1" />Players</TabsTrigger>
          <TabsTrigger value="teams"><Shield className="w-4 h-4 mr-1" />Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><ClubOverview onRegister={() => setTab("register")} /></TabsContent>
        <TabsContent value="register" className="mt-4"><RegistrationForm onSubmitted={() => setTab("registrations")} /></TabsContent>
        <TabsContent value="registrations" className="mt-4"><RegistrationsList genderFilter={division} /></TabsContent>
        <TabsContent value="players" className="mt-4"><PlayersList genderFilter={division} /></TabsContent>
        <TabsContent value="teams" className="mt-4"><TeamsList genderFilter={division} /></TabsContent>
      </Tabs>
    </div>
  );
}