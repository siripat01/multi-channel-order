import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Plug, RefreshCw, Store } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { apiRequest, type ApiResponse } from "../../lib/api";

type ShopSummary = {
  id: string;
  shop_name: string;
};

type IntegrationApiRecord = {
  id: string;
  shop_id: string;
  channel: string;
  external_shop_id: string;
  last_sync_at?: string | null;
  last_synced_at?: string | null;
};

type IntegrationRecord = IntegrationApiRecord & {
  shop_name: string;
  last_synced: string | null;
};

export function IntegrationsPage() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchAllIntegrations();
  }, []);

  const fetchAllIntegrations = async () => {
    setIsLoading(true);
    try {
      const shopsResult = await apiRequest<ApiResponse<ShopSummary[]>>("/shops");
      const userShops = shopsResult.data ?? [];

      const integrationGroups = await Promise.all(
        userShops.map(async (shop) => {
          const result = await apiRequest<ApiResponse<IntegrationApiRecord[]>>(
            `/integrations/shop/${shop.id}`,
          );

          return (result.data ?? []).map((integration) => ({
            ...integration,
            shop_name: shop.shop_name,
            last_synced: integration.last_synced_at ?? integration.last_sync_at ?? null,
          }));
        }),
      );

      setIntegrations(integrationGroups.flat());
    } catch {
      toast.error("An error occurred while fetching integrations overview");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Integrations Overview</h1>
        <p className="text-muted-foreground">Monitor all active connections across your shops</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="animate-pulse">
              <div className="h-40 bg-muted" />
            </Card>
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Plug className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="mb-2">No active integrations</CardTitle>
          <CardDescription className="mb-6">Go to your shops to connect an implemented channel.</CardDescription>
          <button
            onClick={() => navigate("/shops")}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Go to Shops
          </button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Card key={integration.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Plug className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.channel}</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Store className="h-3 w-3" />
                        {integration.shop_name}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">External ID:</span>
                    <span className="font-mono text-xs">{integration.external_shop_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span>
                      {integration.last_synced
                        ? new Date(integration.last_synced).toLocaleDateString()
                        : "Pending..."}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/shops/${integration.shop_id}/integrations`)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Manage
                  </button>
                  <button
                    disabled
                    title="Sync endpoint not wired yet"
                    className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Sync
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
