import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ShieldCheck, Database, Globe, Cpu, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { configApi } from '../services/api';

interface ConfigStatus {
  paypalConfigured: boolean;
  aiConfigured: boolean;
  databaseConnected: boolean;
}

export function Settings() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfigStatus = async () => {
      try {
        const response = await configApi.status();
        setConfigStatus({
          paypalConfigured: response.data.paypalConfigured,
          aiConfigured: response.data.aiConfigured,
          databaseConnected: response.data.databaseConnected,
        });
      } catch (error) {
        console.error('Failed to fetch config status:', error);
        setConfigStatus({ paypalConfigured: false, aiConfigured: false, databaseConnected: false });
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfigStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary-600" />
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400">System configuration and status</p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConfigItem
            icon={Globe}
            label="PayPal Sandbox"
            status={configStatus?.paypalConfigured ? 'configured' : 'missing'}
            description="PayPal Client ID and Secret are configured"
          />
          <ConfigItem
            icon={Cpu}
            label="AI Provider (Gemini)"
            status={configStatus?.aiConfigured ? 'configured' : 'missing'}
            description="Gemini API key is configured"
          />
          <ConfigItem
            icon={Database}
            label="Database Connection"
            status={configStatus?.databaseConnected ? 'connected' : 'disconnected'}
            description="PostgreSQL/SQLite connection status"
          />
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400">Mode</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {import.meta.env.DEV ? 'Development' : 'Production'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400">Frontend Origin</span>
            <span className="font-mono text-sm text-gray-900 dark:text-white">
              {import.meta.env.VITE_API_URL || 'http://localhost:8001'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Security Notice</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Never commit .env files or expose secrets in the browser. Configure sensitive values server-side only.
                For production deployment, set all environment variables in your hosting platform's dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigItem({
  icon: Icon,
  label,
  status,
  description,
  warning,
}: {
  icon: React.ElementType;
  label: string;
  status: 'configured' | 'missing' | 'connected' | 'disconnected';
  description: string;
  warning?: string;
}) {
  const isOk = status === 'configured' || status === 'connected';
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
      <Icon className={`w-5 h-5 mt-0.5 ${isOk ? 'text-green-600' : 'text-gray-400'}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{label}</span>
          <StatusBadge status={isOk ? 'success' : 'warning'} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        {warning && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {warning}
          </p>
        )}
      </div>
      {isOk ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <XCircle className="w-5 h-5 text-gray-400" />
      )}
    </div>
  );
}
