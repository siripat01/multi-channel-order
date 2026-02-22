import { useEffect, useState } from "react";
import { Search, RefreshCw, Package as PackageIcon, Printer } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";
import { API_BASE_URL } from "../../config";

// Mock data
type OrderStatus = "all" | "new" | "packed" | "shipped";

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  packed: "bg-orange-100 text-orange-800",
  shipped: "bg-green-100 text-green-800",
};

export function DashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const sessionStr = localStorage.getItem("auth_session");
    if (!sessionStr) return;
    const { session } = JSON.parse(sessionStr);
    const accessToken = session?.access_token;
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      const result = await response.json();
      if (response.ok) {
        // Map database fields to UI fields
        const formattedOrders = (result.data || []).map((o: any) => ({
          id: o.external_order_id,
          date: new Date(o.external_created_at || Date.now()), // Just in case external_created_at is missing
          customer: o.customer_name,
          amount: o.total_price,
          status: o.status.toLowerCase() || "new",
          db_id: o.id
        }));
        setOrders(formattedOrders);
      } else {
        toast.error(result.message || "Failed to fetch orders");
      }
    } catch (error) {
      toast.error("An error occurred while fetching orders");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !dateFilter || format(order.date, "yyyy-MM-dd") === format(dateFilter, "yyyy-MM-dd");

    return matchesStatus && matchesSearch && matchesDate;
  });

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const handleSync = async () => {
    toast.promise(fetchOrders(), {
      loading: 'Syncing orders...',
      success: 'Orders synced successfully!',
      error: 'Failed to sync orders'
    });
  };

  const handleMarkPacked = () => {
    if (selectedOrders.size === 0) {
      toast.error("Please select orders first");
      return;
    }
    toast.success(`${selectedOrders.size} order(s) marked as packed`);
  };

  const handleMarkShipped = () => {
    if (selectedOrders.size === 0) {
      toast.error("Please select orders first");
      return;
    }
    toast.success(`${selectedOrders.size} order(s) marked as shipped`);
  };

  const handleGenerateLabels = () => {
    if (selectedOrders.size === 0) {
      toast.error("Please select orders first");
      return;
    }
    toast.success(`Generating labels for ${selectedOrders.size} order(s)`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <h1 className="mb-6">Order Inbox</h1>

        {/* Filters and Actions Bar */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start">
                {dateFilter ? format(dateFilter, "PP") : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="packed">Packed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-input-background"
            />
          </div>

          <div className="flex gap-2 ml-auto">
            <Button onClick={handleSync} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Orders
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-accent p-4">
            <span className="text-sm">
              {selectedOrders.size} order(s) selected
            </span>
            <div className="ml-auto flex gap-2">
              <Button onClick={handleMarkPacked} size="sm" variant="outline">
                <PackageIcon className="mr-2 h-4 w-4" />
                Mark Packed
              </Button>
              <Button onClick={handleMarkShipped} size="sm" variant="outline">
                <PackageIcon className="mr-2 h-4 w-4" />
                Mark Shipped
              </Button>
              <Button onClick={handleGenerateLabels} size="sm">
                <Printer className="mr-2 h-4 w-4" />
                Generate Labels
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-8">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <RefreshCw className="h-16 w-16 animate-spin text-muted-foreground" />
            <h3 className="mt-4">Loading orders...</h3>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <PackageIcon className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4">No orders found</h3>
            <p className="mt-2 text-muted-foreground">
              {searchQuery || dateFilter || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Sync your Shopee account to import orders"}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <div className="p-4 border-b border-border">
              <p className="text-sm text-muted-foreground">
                Total: {filteredOrders.length} order(s)
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.has(order.id)}
                        onCheckedChange={() => toggleOrderSelection(order.id)}
                      />
                    </TableCell>
                    <TableCell>{format(order.date, "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-mono">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>฿{order.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
