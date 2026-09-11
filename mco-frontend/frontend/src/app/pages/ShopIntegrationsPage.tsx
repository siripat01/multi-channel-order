import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AlertCircle, ArrowLeft, CheckCircle2, Plug, RefreshCw, Store, XCircle } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { SHOPEE_MOCK_BASE_URL } from "../../config";
import { apiRequest, type ApiResponse } from "../../lib/api";

type IntegrationRecord = {
  id: string;
  channel: string;
  external_shop_id: string;
  last_synced_at?: string | null;
  last_sync_at?: string | null;
};

type Shop = {
  id: string;
  shop_name: string;
};

type ShopeeMockAuthResponse = {
  code: string;
};

type ShopeeMockTokenResponse = {
  data: {
    shop_id: string | number;
    access_token: string;
    refresh_token: string;
  };
};

const channels = [
  { name: "Shopee", implemented: true, color: "bg-orange-100 text-orange-600" },
  { name: "Lazada", implemented: false, color: "bg-blue-100 text-blue-600" },
  { name: "LINE Shopping", implemented: false, color: "bg-green-100 text-green-600" },
] as const;

function getLastSyncAt(integration: IntegrationRecord): string | null {
  return integration.last_synced_at ?? integration.last_sync_at ?? null;
}

export function ShopIntegrationsPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    void fetchData();
  }, [shopId]);

  const fetchData = async () => {
    if (!shopId) {
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    try {
      const [shopsResult, integrationResult] = await Promise.all([
        apiRequest<ApiResponse<Shop[]>>("/shops"),
        apiRequest<ApiResponse<IntegrationRecord[]>>(`/integrations/shop/${shopId}`),
      ]);

      const currentShop = (shopsResult.data ?? []).find((candidate) => candidate.id === shopId) ?? null;
      setShop(currentShop);
      setIntegrations(integrationResult.data ?? []);
    } catch {
      toast.error("Failed to fetch integration data");
    } finally {
      setIsFetching(false);
    }
  };

  const handleConnect = async (channel: string) => {
    if (!shopId) {
      return;
    }

    if (channel !== "Shopee") {
      toast.info(`${channel} integration is not implemented yet`);
      return;
    }

    setIsFetching(true);
    try {
      const providerResponse = await fetch(
        `${SHOPEE_MOCK_BASE_URL}/api/v2/shop/auth_partner?partner_id=1000001&redirect=http://localhost:5173`,
        { headers: { "Content-Type": "application/json" } },
      );
      if (!providerResponse.ok) {
        throw new Error(`Shopee mock auth failed with HTTP ${providerResponse.status}`);
      }

      const providerResult = (await providerResponse.json()) as ShopeeMockAuthResponse;
      const tokenResponse = await fetch(`${SHOPEE_MOCK_BASE_URL}/api/v2/auth/token/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: providerResult.code,
          partner_id: "1000001",
          shop_id: "123456",
        }),
      });
      if (!tokenResponse.ok) {
        throw new Error(`Shopee mock token exchange failed with HTTP ${tokenResponse.status}`);
      }

      const tokenResult = (await tokenResponse.json()) as ShopeeMockTokenResponse;
      await apiRequest<ApiResponse<IntegrationRecord>>("/integrations", {
        method: "POST",
        body: JSON.stringify({
          shop_id: shopId,
          channel,
          external_shop_id: String(tokenResult.data.shop_id),
          access_token: tokenResult.data.access_token,
          refresh_token: tokenResult.data.refresh_token,
        }),
      });

      toast.success(`Successfully connected to ${channel}`);
      await fetchData();
    } catch {
      toast.error("An error occurred while connecting the provider");
    } finally {
      setIsFetching(false);
    }
  };

  const handleDisconnect = async (id: string, channel: string) => {
    try {
      await apiRequest<unknown>(`/integrations/${id}`, { method: "DELETE" });
      toast.success(`${channel} disconnected successfully`);
      await fetchData();
    } catch {
      toast.error("An error occurred during disconnection");
    }
  };

  if (isFetching && !shop) {
    return <div className="p-8 text-center">Loading shop data...</div>;
  }

  if (!shop) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Shop Not Found</h1>
        <Button onClick={() => navigate("/shops")}>Back to Shops</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate("/shops")} className="mb-4 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Shops
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{shop.shop_name}</h1>
              <p className="text-muted-foreground">Manage order sync for this shop profile</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {channels.map((channel) => {
          const integration = integrations.find(
            (item) => item.channel.toLowerCase() === channel.name.toLowerCase(),
          );
          const isConnected = Boolean(integration);

          return (
            <Card key={channel.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${channel.color}`}>
                      <Plug className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>{channel.name}</CardTitle>
                      <CardDescription>Order Sync Provider</CardDescription>
                    </div>
                  </div>
                  {isConnected ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <XCircle className="mr-1 h-3 w-3" />
                      {channel.implemented ? "Not connected" : "Not implemented"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {integration ? (
                  <>
                    <div className="space-y-2 rounded-lg bg-accent p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">External ID:</span>
                        <span className="font-medium">{integration.external_shop_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Sync:</span>
                        <span className="font-medium">
                          {getLastSyncAt(integration)
                            ? new Date(getLastSyncAt(integration) as string).toLocaleString()
                            : "Awaiting sync..."}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" disabled title="Sync endpoint not wired yet">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Re-sync
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => void handleDisconnect(integration.id, channel.name)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {channel.implemented
                        ? `Connect your ${channel.name} account to sync orders for ${shop.shop_name}.`
                        : `${channel.name} support has not been implemented yet.`}
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => void handleConnect(channel.name)}
                      disabled={isFetching || !channel.implemented}
                    >
                      <Plug className="mr-2 h-4 w-4" />
                      {channel.implemented ? `Connect ${channel.name}` : "Not implemented"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
