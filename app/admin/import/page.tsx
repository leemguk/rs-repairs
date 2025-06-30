// app/admin/import/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Upload, Loader2, FileText, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Stats component that can be reused
function StatCard({ title, value, description, icon: Icon }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    processed?: number;
    errors?: number;
    total?: number;
    message?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a CSV file');
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-spare-parts', {
        method: 'POST',
        headers: {
          'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_KEY || ''
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          ...data
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Import failed'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const progress = result?.total ? ((result.processed || 0) / result.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Import Data</h1>
        <p className="text-muted-foreground">
          Import spare parts data and manage your database
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Parts"
          value="1,234,567"
          description="Active spare parts in database"
          icon={Database}
        />
        <StatCard
          title="Last Import"
          value="2 days ago"
          description="Previous import completed"
          icon={Upload}
        />
        <StatCard
          title="Import Status"
          value="Ready"
          description="System ready for import"
          icon={CheckCircle}
        />
      </div>

      {/* Import Interface */}
      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Import CSV</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Spare Parts Data</CardTitle>
              <CardDescription>
                Upload a CSV file to add or update spare parts in the database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isImporting}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={!file || isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </>
                )}
              </Button>

              {isImporting && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Processing... Please don't close this page.
                  </p>
                </div>
              )}

              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {result.success ? (
                      <div className="space-y-1">
                        <p>Import completed successfully!</p>
                        <p className="text-sm">
                          • Processed: {result.processed} records<br />
                          • Errors: {result.errors} records<br />
                          • Total: {result.total} records
                        </p>
                      </div>
                    ) : (
                      <p>{result.message}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
              <CardDescription>
                Recent import operations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Example history items */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">bosch-dishwashers.csv</p>
                    <p className="text-sm text-muted-foreground">
                      45,230 records • 2 days ago
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50">
                    Completed
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">samsung-washers.csv</p>
                    <p className="text-sm text-muted-foreground">
                      32,150 records • 5 days ago
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50">
                    Completed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions">
          <Card>
            <CardHeader>
              <CardTitle>Import Instructions</CardTitle>
              <CardDescription>
                Guidelines for preparing and importing CSV files
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4 className="text-base font-semibold">CSV Format Requirements:</h4>
              <ul className="space-y-1 text-sm">
                <li>Headers must be: Category, Brand, ModelNumber, Url</li>
                <li>Use UTF-8 encoding</li>
                <li>Wrap values containing commas in quotes</li>
                <li>Maximum 100,000 rows per file recommended</li>
              </ul>
              
              <h4 className="text-base font-semibold mt-4">For Large Datasets:</h4>
              <ul className="space-y-1 text-sm">
                <li>Split files into 50,000-100,000 row chunks</li>
                <li>Import during off-peak hours</li>
                <li>Allow each import to complete before starting the next</li>
              </ul>

              <Alert className="mt-4">
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tip:</strong> Use Excel or Google Sheets to split large files. 
                  Save each chunk as CSV with UTF-8 encoding.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
