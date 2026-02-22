import { Download, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";

// Mock label history data
const mockLabels = [
  {
    id: "1",
    date: new Date(2026, 1, 10, 14, 30),
    orderCount: 5,
    filename: "labels_2026-02-10_1430.pdf",
  },
  {
    id: "2",
    date: new Date(2026, 1, 9, 10, 15),
    orderCount: 12,
    filename: "labels_2026-02-09_1015.pdf",
  },
  {
    id: "3",
    date: new Date(2026, 1, 8, 16, 45),
    orderCount: 8,
    filename: "labels_2026-02-08_1645.pdf",
  },
  {
    id: "4",
    date: new Date(2026, 1, 7, 11, 20),
    orderCount: 15,
    filename: "labels_2026-02-07_1120.pdf",
  },
  {
    id: "5",
    date: new Date(2026, 1, 6, 13, 0),
    orderCount: 6,
    filename: "labels_2026-02-06_1300.pdf",
  },
];

export function LabelsPage() {
  const handleDownload = (filename: string) => {
    toast.success(`Downloading ${filename}`);
    // In a real app, this would trigger PDF download
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2">Shipping Labels</h1>
        <p className="text-muted-foreground">
          View and download previously generated shipping labels
        </p>
      </div>

      {mockLabels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4">No labels generated yet</h3>
            <p className="mt-2 text-muted-foreground">
              Generate your first shipping labels from the Dashboard
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Label History</CardTitle>
            <CardDescription>
              All your previously generated shipping labels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Generated Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Orders Count</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLabels.map((label) => (
                  <TableRow key={label.id}>
                    <TableCell>
                      {label.date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {label.date.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {label.orderCount} orders
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {label.filename}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(label.filename)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
