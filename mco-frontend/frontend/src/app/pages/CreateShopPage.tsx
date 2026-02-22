import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Store, Save } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { API_BASE_URL } from "../../config";

export function CreateShopPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    shop_name: "",
    sender_name: "",
    sender_address: "",
    sender_phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.shop_name || !formData.sender_name || !formData.sender_address || !formData.sender_phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }
    const { session } = JSON.parse(sessionStr);
    const accessToken = session?.access_token;

    if (!accessToken) {
      toast.error("Session expired. Please login again.");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/shops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Shop created successfully!");
        navigate("/shops");
      } else {
        toast.error(result.message || "Failed to create shop");
      }
    } catch (error) {
      toast.error("An error occurred while creating the shop");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        className="mb-6 gap-2"
        onClick={() => navigate("/shops")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shops
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl">Create New Shop</CardTitle>
          </div>
          <CardDescription>
            Enter your shop details for order fulfillment and shipping labels.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop_name">Shop Name</Label>
              <Input
                id="shop_name"
                placeholder="e.g. My Awesome Store"
                value={formData.shop_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender_name">Sender Name</Label>
                <Input
                  id="sender_name"
                  placeholder="e.g. John Doe"
                  value={formData.sender_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender_phone">Sender Phone</Label>
                <Input
                  id="sender_phone"
                  placeholder="e.g. 0812345678"
                  value={formData.sender_phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender_address">Sender Address</Label>
              <Textarea
                id="sender_address"
                placeholder="Full address for shipping labels"
                className="min-h-[100px]"
                value={formData.sender_address}
                onChange={handleChange}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 justify-end pt-6 border-t pb-6 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/shops")}
            >
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={isLoading}>
              {isLoading ? (
                "Creating..."
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Shop Profile
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
