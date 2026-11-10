import React from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Building2, Trophy, Layers, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import SimpleListManager from "@/components/settings/SimpleListManager";

export default function PlatformSettings() {
  return (
    <div className="min-h-screen bg-white p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase text-[#399F7D] mb-1">Admin</div>
          <h1 className="text-2xl font-extrabold text-[#0B162B]">Platform Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage facilities, branches, and competitive platforms (leagues) used across the club.</p>
        </div>

        <Tabs defaultValue="facilities">
          <TabsList>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
          </TabsList>

          <TabsContent value="facilities" className="mt-4">
            <Card className="border-border rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#0B162B]">
                  <MapPin className="w-4 h-4 text-[#399F7D]" /> Facilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Facilities now have a dedicated page for tracking site availability, capacity, surface types, and space utilization. Link programs to facilities to manage bookings.</p>
                <Button asChild className="bg-[#399F7D] hover:bg-[#399F7D]/90 text-white">
                  <Link to={createPageUrl("Facilities")}>Open Facilities <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="mt-4">
            <Card className="border-border rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#0B162B]">
                  <Building2 className="w-4 h-4 text-[#399F7D]" /> Branches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Branches are managed on the dedicated Club Branches page, including leadership assignment and facilities.</p>
                <Button asChild className="bg-[#399F7D] hover:bg-[#399F7D]/90 text-white">
                  <Link to={createPageUrl("Locations")}>Manage Branches <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platforms" className="mt-4">
            <SimpleListManager entityName="Platform" title="Platforms" icon={Layers} selectField="gender" selectOptions={[{ value: "Boys", label: "Boys" }, { value: "Girls", label: "Girls" }, { value: "Boys and Girls", label: "Boys and Girls" }]} selectLabel="Gender" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}