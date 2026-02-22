import { useState } from "react";
import { Save, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";

export function SettingsPage() {
  const [senderName, setSenderName] = useState("บริษัท ตัวอย่าง จำกัด");
  const [senderPhone, setSenderPhone] = useState("02-123-4567");
  const [senderAddress, setSenderAddress] = useState(
    "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110"
  );

  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and sender information
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-8 w-8" />
              </div>
              <div>
                <p className="font-medium">John Doe</p>
                <p className="text-sm text-muted-foreground">john.doe@example.com</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sender Information */}
        <Card>
          <CardHeader>
            <CardTitle>Sender Information</CardTitle>
            <CardDescription>
              This information will be used on shipping labels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senderName">Sender Name / Company Name</Label>
              <Input
                id="senderName"
                placeholder="Enter sender name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="bg-input-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderPhone">Phone Number</Label>
              <Input
                id="senderPhone"
                placeholder="Enter phone number"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="bg-input-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderAddress">Address</Label>
              <Textarea
                id="senderAddress"
                placeholder="Enter complete address"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                className="min-h-[100px] bg-input-background"
              />
            </div>

            <Separator />

            <Button onClick={handleSave} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Notifications (placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure how you receive updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Notification preferences coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
