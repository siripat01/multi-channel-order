import { useState, useEffect } from "react";
import { Plug, CheckCircle2, RefreshCw, Store, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { API_BASE_URL } from "../../config";

interface IntegrationRecord {
  id: string;
  shop_id: string;
  channel: string;
  external_shop_id: string;
  last_sync_at: string;
  shop_name?: string;
}

export function IntegrationsPage() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllIntegrations();
  }, []);

  const fetchAllIntegrations = async () => {
    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) return;
    const { session } = JSON.parse(sessionStr);
    const accessToken = session?.access_token;
    if (!accessToken) return;

    try {
      // 1. Fetch all shops for this user - call new /shops endpoint
      const shopsResponse = await fetch(`${API_BASE_URL}/shops`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      const shopsResult = await shopsResponse.json();
      const userShops = shopsResult.data || [];

      // 2. Fetch integrations for each shop
      const allIntegrations: IntegrationRecord[] = [];
      for (const shop of userShops) {
        const intResponse = await fetch(`${API_BASE_URL}/integrations/shop/${shop.id}`, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const intResult = await intResponse.json();
        if (intResult.data) {
          intResult.data.forEach((int: any) => {
            allIntegrations.push({
              ...int,
              shop_name: shop.shop_name
            });
          });
        }
      }
      setIntegrations(allIntegrations);
    } catch (error) {
      toast.error("An error occurred while fetching integrations overview");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Integrations Overview</h1>
        <p className="text-muted-foreground">
          Monitor all active connections across your shops
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
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
          <CardDescription className="mb-6">
            Go to your shops to connect them with Shopee, Lazada, or other channels.
          </CardDescription>
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
                      {integration.last_sync_at
                        ? new Date(integration.last_sync_at).toLocaleDateString()
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
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
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
