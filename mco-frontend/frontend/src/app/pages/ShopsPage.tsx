import { useState, useEffect } from "react";
import { Store, Plus, Pencil, Trash2, MapPin, Phone, User, Plug } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { API_BASE_URL } from "../../config";

interface Shop {
  id: string;
  shop_name: string;
  sender_name: string;
  sender_address: string;
  sender_phone: string;
}

export function ShopsPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) return;

    const { session } = JSON.parse(sessionStr);
    const accessToken = session?.access_token;

    if (!accessToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/shops`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      const result = await response.json();
      if (response.ok) {
        setShops(result.data || []);
      } else {
        toast.error(result.message || "Failed to fetch shops");
      }
    } catch (error) {
      toast.error("An error occurred while fetching shops");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shop?")) return;

    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) return;
    const { session } = JSON.parse(sessionStr);
    const accessToken = session?.access_token;

    try {
      const response = await fetch(`${API_BASE_URL}/shops/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      const result = await response.json();
      if (response.ok) {
        toast.success("Shop deleted successfully");
        setShops(shops.filter((shop) => shop.id !== id));
      } else {
        toast.error(result.message || "Failed to delete shop");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the shop");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">My Shops</h1>
          <p className="text-muted-foreground">
            Manage your shop profiles before connecting them to integrations
          </p>
        </div>
        <Button onClick={() => navigate("/shops/create")} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Shop
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted" />
            </Card>
          ))}
        </div>
      ) : shops.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="mb-2">No shops found</CardTitle>
          <CardDescription className="mb-6">
            You haven't added any shops yet. Create one to get started.
          </CardDescription>
          <Button onClick={() => navigate("/shops/create")} variant="outline">
            Create your first shop
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Card key={shop.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{shop.shop_name}</CardTitle>
                      <CardDescription>Shop Profile</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-medium text-foreground">{shop.sender_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{shop.sender_phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-1 shrink-0" />
                    <span className="line-clamp-2">{shop.sender_address}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t mt-4 flex-wrap">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 min-w-[140px]"
                    onClick={() => navigate(`/shops/${shop.id}/integrations`)}
                  >
                    <Plug className="mr-2 h-4 w-4" />
                    Manage Integrations
                  </Button>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/shops/edit/${shop.id}`)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(shop.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
