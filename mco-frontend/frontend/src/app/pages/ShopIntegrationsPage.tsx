import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Plug, CheckCircle2, XCircle, RefreshCw, ArrowLeft, Store, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { API_BASE_URL } from "../../config";

interface Integration {
  id: string;
  channel: string;
  external_shop_id: string;
  last_synced_at: string;
}

interface Shop {
  id: string;
  shop_name: string;
}

export function ShopIntegrationsPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetchData();
  }, [shopId]);

  const fetchData = async () => {
    if (!shopId) return;

    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) return;
    const { session } = JSON.parse(sessionStr);
    const accessToken = session?.access_token;
    if (!accessToken) return;

    try {
      // Fetch Shop details - call new /shops endpoint (GET for current user)
      const shopResponse = await fetch(`${API_BASE_URL}/shops`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      const shopsResult = await shopResponse.json();
      const currentShop = shopsResult.data?.find((s: any) => s.id === shopId);
      setShop(currentShop || null);

      console.log(currentShop);

      // Fetch Integrations
      const integrationResponse = await fetch(`${API_BASE_URL}/integrations/shop/${shopId}`);
      const integrationResult = await integrationResponse.json();
      console.log(integrationResult);

      setIntegrations(integrationResult.data || []);
    } catch (error) {
      toast.error("Failed to fetch integration data");
    } finally {
      setIsFetching(false);
    }
  };

  const handleConnect = async (channel: string) => {
    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) return;
    const { session } = JSON.parse(sessionStr);
    const accessToken = session?.access_token;
    if (!accessToken) return;

    setIsFetching(true);
    try {
      // ... (existing mock fetching logic)
      const providerResponse = await fetch("https://d14452c0-14dd-48ba-b5c0-fc4efc3147a3.mock.pstmn.io/api/v2/shop/auth_partner?partner_id=1000001&redirect=http://localhost:5173",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      )
      const providerResult = await providerResponse.json()

      const getAccessToken = await fetch("https://d14452c0-14dd-48ba-b5c0-fc4efc3147a3.mock.pstmn.io/api/v2/auth/token/get",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: providerResult.code,
            partner_id: "1000001",
            shop_id: "123456",
          }),
        }
      )

      const getAccessTokenResult = await getAccessToken.json()

      const response = await fetch(`${API_BASE_URL}/integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          shop_id: shopId,
          channel: channel,
          external_shop_id: String(getAccessTokenResult.data.shop_id),
          access_token: getAccessTokenResult.data.access_token,
          refresh_token: getAccessTokenResult.data.refresh_token
        }),
      });

      if (response.ok) {
        toast.success(`Successfully connected to ${channel}!`);
        fetchData();
      } else {
        const result = await response.json();
        toast.error(result.message || "Connection failed");
      }
    } catch (error) {
      toast.error("An error occurred during connection");
    } finally {
      setIsFetching(false);
    }
  };

  const handleDisconnect = async (id: string, channel: string) => {
    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) return;
    const { session } = JSON.parse(sessionStr);
    const accessToken = session?.access_token;

    try {
      const response = await fetch(`${API_BASE_URL}/integrations/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (response.ok) {
        toast.success(`${channel} disconnected successfully`);
        fetchData();
      } else {
        toast.error("Failed to disconnect");
      }
    } catch (error) {
      toast.error("An error occurred during disconnection");
    }
  };

  const channels = [
    { name: "Shopee", color: "bg-orange-100 text-orange-600", icon: Plug },
    { name: "Lazada", color: "bg-blue-100 text-blue-600", icon: Plug },
    { name: "LINE Shopping", color: "bg-green-100 text-green-600", icon: Plug },
  ];

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
          const integration = integrations.find(i => i.channel.toLowerCase() === channel.name.toLowerCase());
          const isConnected = !!integration;

          return (
            <Card key={channel.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${channel.color}`}>
                      <channel.icon className="h-6 w-6" />
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
                      Not connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConnected ? (
                  <>
                    <div className="space-y-2 rounded-lg bg-accent p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">External ID:</span>
                        <span className="font-medium">{integration.external_shop_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Sync:</span>
                        <span className="font-medium">
                          {integration.last_synced_at
                            ? new Date(integration.last_synced_at).toLocaleString()
                            : "Awaiting sync..."}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Re-sync
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleDisconnect(integration.id, channel.name)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Connect your {channel.name} account to sync orders for {shop.shop_name}.
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => handleConnect(channel.name)}
                      disabled={isFetching}
                    >
                      <Plug className="mr-2 h-4 w-4" />
                      Connect {channel.name}
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
