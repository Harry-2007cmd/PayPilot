import { useEffect, useState } from 'react';
import { importsApi, webhooksApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Upload, FileText, AlertCircle, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function Imports() {
  const [imports, setImports] = useState<any[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<any>(null);
  const [uploading, setUploadLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [importsRes, webhookRes] = await Promise.all([
        importsApi.list(),
        webhooksApi.status(),
      ]);
      setImports(importsRes.data.items);
      setWebhookStatus(webhookRes.data);
    } catch (error) {
      console.error('Failed to fetch imports data:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      handlePreview(e.target.files[0]);
    }
  };

  const handlePreview = async (selectedFile: File) => {
    setUploadLoading(true);
    try {
      const response = await importsApi.preview(selectedFile, 'custom_csv');
      setPreview(response.data);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to parse CSV file. Please check columns.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setUploadLoading(true);
    try {
      await importsApi.confirm(preview.import_id);
      setPreview(null);
      setFile(null);
      fetchData();
    } catch (error) {
      console.error('Confirm failed:', error);
      alert('Failed to confirm import.');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary-600" />
            Integrations & Imports
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Manage connections and external records</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connections */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PayPal Sandbox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-200">Connected</span>
                </div>
                <StatusBadge status="completed" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Credentials</p>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">Client ID: *********...****</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <button className="text-sm text-primary-600 hover:underline">View Settings</button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Health</CardTitle>
            </CardHeader>
            <CardContent>
              {webhookStatus ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Verified Events</span>
                    <span className="font-medium text-green-600">{webhookStatus.verified}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Failed Verification</span>
                    <span className="font-medium text-red-600">{webhookStatus.failed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Duplicate Events</span>
                    <span className="font-medium text-gray-600">{webhookStatus.duplicate}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between text-sm font-semibold">
                    <span>Total Processed</span>
                    <span>{webhookStatus.total_events}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Status unavailable</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Imports */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import External Records</CardTitle>
            </CardHeader>
            <CardContent>
              {!preview ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-900 dark:text-white font-medium mb-1">Upload CSV file</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Amazon, Shopify, or custom marketplace records</p>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    <span>Choose File</span>
                    <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                  </label>
                  <p className="mt-4 text-xs text-gray-400">Supported columns: source_type, currency, amount, status, external_order_id, external_payment_id</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-primary-600" />
                      <div>
                        <p className="font-medium text-primary-900 dark:text-primary-200">{file?.name}</p>
                        <p className="text-xs text-primary-700 dark:text-primary-300">
                          {preview.total_rows} rows • {preview.valid_rows} valid • {preview.invalid_rows} invalid
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreview(null)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={uploading || preview.valid_rows === 0}
                        className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 disabled:opacity-50"
                      >
                        {uploading ? 'Processing...' : 'Confirm Import'}
                      </button>
                    </div>
                  </div>

                  {preview.invalid_rows > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm font-medium mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Validation Errors ({preview.invalid_rows})</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {preview.errors.map((err: any, i: number) => (
                          <p key={i} className="text-xs text-red-600 dark:text-red-400">
                            Row {err.row}: {err.errors.join(', ')}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Source</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">External ID</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Amount</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {preview.preview.map((row: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{row.source_type}</td>
                            <td className="px-3 py-2 font-mono text-xs">{row.external_payment_id || row.external_order_id}</td>
                            <td className="px-3 py-2">{row.amount} {row.currency}</td>
                            <td className="px-3 py-2">
                              <StatusBadge status={row.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Imports</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                      <th className="px-6 py-3 text-left font-medium text-gray-500">File</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Rows</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {imports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No imports yet</td>
                      </tr>
                    ) : (
                      imports.map((imp) => (
                        <tr key={imp.id}>
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{imp.filename}</td>
                          <td className="px-6 py-4">{imp.valid_count} / {imp.row_count}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={imp.status} />
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {formatDistanceToNow(new Date(imp.uploaded_at), { addSuffix: true })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}