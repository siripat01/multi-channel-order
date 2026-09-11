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
import { apiRequest } from "../../lib/api";
import {
  type KnownOrderStatus,
  type OrderFilter,
  type OrderListResponse,
  type OrderViewModel,
  toOrderViewModel,
} from "../../features/orders/types";

const statusColors: Record<KnownOrderStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  packed: "bg-orange-100 text-orange-800",
  shipped: "bg-green-100 text-green-800",
};

function statusClassName(status: string): string {
  if (status === "new" || status === "packed" || status === "shipped") {
    return statusColors[status];
  }
  return "bg-gray-100 text-gray-800";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export function DashboardPage() {
  const [orders, setOrders] = useState<OrderViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<OrderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  const fetchOrders = async () => {
    const result = await apiRequest<OrderListResponse>("/orders");
    setOrders((result.data ?? []).map(toOrderViewModel));
    setIsLoading(false);
  };

  useEffect(() => {
    void fetchOrders().catch((error: unknown) => {
      setIsLoading(false);
      toast.error(`Failed to fetch orders: ${errorMessage(error)}`);
    });
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      order.id.toLowerCase().includes(normalizedSearch) ||
      order.customer.toLowerCase().includes(normalizedSearch);
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
      setSelectedOrders(new Set(filteredOrders.map((order) => order.id)));
    }
  };

  const handleSync = async () => {
    await toast.promise(fetchOrders(), {
      loading: "Refreshing orders...",
      success: "Orders refreshed successfully",
      error: (error: unknown) => `Failed to refresh orders: ${errorMessage(error)}`,
    });
  };

  const handleStatusActionUnavailable = (targetStatus: KnownOrderStatus) => {
    if (selectedOrders.size === 0) {
      toast.error("Please select orders first");
      return;
    }

    toast.info(
      `Mark ${targetStatus} is not wired to the API yet. The backend source must be restored before this action can be implemented safely.`,
    );
  };

  const handleGenerateLabels = () => {
    if (selectedOrders.size === 0) {
      toast.error("Please select orders first");
      return;
    }
    toast.info("Label generation is still a planned feature and does not download a real label yet.");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-8 py-6">
        <h1 className="mb-6">Order Inbox</h1>

        <div className="flex flex-wrap items-center gap-4">
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

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderFilter)}>
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

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9 bg-input-background"
            />
          </div>

          <div className="flex gap-2 ml-auto">
            <Button onClick={() => void handleSync()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Orders
            </Button>
          </div>
        </div>

        {selectedOrders.size > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-accent p-4">
            <span className="text-sm">{selectedOrders.size} order(s) selected</span>
            <div className="ml-auto flex gap-2">
              <Button onClick={() => handleStatusActionUnavailable("packed")} size="sm" variant="outline">
                <PackageIcon className="mr-2 h-4 w-4" />
                Mark Packed
              </Button>
              <Button onClick={() => handleStatusActionUnavailable("shipped")} size="sm" variant="outline">
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
                : "Connect a supported marketplace and synchronize orders"}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <div className="p-4 border-b border-border">
              <p className="text-sm text-muted-foreground">Total: {filteredOrders.length} order(s)</p>
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
                  <TableRow key={order.databaseId}>
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
                      <Badge className={statusClassName(order.status)}>
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
