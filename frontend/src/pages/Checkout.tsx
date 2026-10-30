import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { paypalApi, configApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { DollarSign, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function Checkout() {
  const navigate = useNavigate();
  const params = useParams<{ orderId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'approved' | 'captured' | 'failed'>('idle');
  // internalOrderId is the internal UUID from our database
  const [internalOrderId, setInternalOrderId] = useState<string | null>(null);
  // PayPal client ID from config
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  // PayPal SDK loading state
  const [sdkStatus, setSdkStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  // Extract order ID from URL params
  useEffect(() => {
    if (params.orderId) {
      setInternalOrderId(params.orderId);
    }
  }, [params.orderId]);

  // Fetch PayPal config on mount (includes client ID)
  useEffect(() => {
    configApi.status().then(
      (response: any) => {
        // Backend now exposes paypal_client_id for the SDK
        if (response.data.paypal_client_id) {
          setPaypalClientId(response.data.paypal_client_id);
        } else {
          // PayPal not configured on the backend
          setError('PayPal is not configured. Please check the Settings page.');
          setStatus('failed');
        }
      },
      (err: any) => {
        console.error('Failed to fetch config:', err);
        setError('Could not load PayPal configuration. Please check your connection and try again.');
        setStatus('failed');
      }
    );
  }, []);

  // Once we have the order ID, the page is ready to show buttons
  useEffect(() => {
    if (internalOrderId) {
      setIsLoading(false);
    }
  }, [internalOrderId]);

  // SDK status monitoring component
  const SdkStatusMonitor = () => {
    const [{ isResolved, isRejected }] = usePayPalScriptReducer();

    useEffect(() => {
      if (isResolved) {
        setSdkStatus('ready');
        console.log('[PayPilot] PayPal SDK loaded successfully');
      } else if (isRejected) {
        setSdkStatus('error');
        console.error('[PayPilot] PayPal SDK failed to load');
        setError('PayPal SDK failed to load. Please check your network connection and try again.');
      } else {
        setSdkStatus('loading');
      }
    }, [isResolved, isRejected]);

    return null;
  };

  // createOrder function for PayPalButtons - called when buyer clicks the button
  // This implements the server-side order creation pattern
  const createOrder = async () => {
    if (!internalOrderId) {
      throw new Error('No order ID available');
    }
    setIsProcessing(true);
    setError(null);
    setStatus('loading');

    try {
      const response = await paypalApi.createOrder(internalOrderId);
      const createdPaypalOrderId = response.data.paypal_order_id;

      if (!createdPaypalOrderId) {
        throw new Error('Failed to create PayPal order - no order ID returned');
      }

      return createdPaypalOrderId;
    } catch (err: any) {
      console.error('Failed to create PayPal order:', err);
      const message = err.response?.data?.detail || 'Failed to initialize PayPal order';
      setError(message);
      setStatus('failed');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle PayPal button approval
  const handleApprove = async (_details: any) => {
    setIsProcessing(true);
    setStatus('loading');

    try {
      // Capture using the internal order ID (the backend looks up PayPal order ID from metadata)
      const capturedPayment = await paypalApi.captureOrder(internalOrderId!);
      // success → captured 상태
      setStatus('captured');
      // 상세 페이지로 이동하거나 알림 표시
      navigate(`/payments/${capturedPayment.data.id}`);
    } catch (err) {
      console.error('PayPal capture failed:', err);
      setError('Payment capture failed');
      setStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  
  if (isLoading && !internalOrderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 dark:text-red-400">
        <XCircle className="w-12 h-12 mx-auto mb-2" />
        <h2 className="text-2xl font-bold">Payment Failed</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{error}</p>
        <div className="mt-4 flex gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Go Back Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* PayPal Script Provider - loads the JS SDK */}
      <PayPalScriptProvider
        options={{
          // Sandbox client ID - in production, use production client ID
          clientId: paypalClientId || 'AYCzKH8QrmavaJ2Utdjf4EZFFfSvzBvVv5FyDcNMvmkdc_Zd-SzL8bDor7FHbSb8fD19awlAO1a34u89',
          components: ['buttons'],
          // Load PayPal SDK from sandbox environment
          sdkBaseUrl: 'https://www.sandbox.paypal.com/sdk/js',
        }}
      >
        {/* SDK status monitor - tracks script loading state */}
        <SdkStatusMonitor />

        {/* Checkout content */}
        <div className="p-8 max-w-md mx-auto">
          {status === 'loading' ? (
            <div className="animate-pulse space-y-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                PayPal Payment
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Setting up payment for order {internalOrderId || ''}...
              </p>
            </div>
          ) : status === 'captured' ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <CheckCircle2 className="w-6 h-6 text-primary-600" />
                    Payment Captured
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-gray-500 dark:text-gray-400">
                    Your payment has been successfully captured via PayPal.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Order ID: {internalOrderId || 'N/A'}
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    Return Home
                  </button>
                </CardContent>
              </Card>
            </div>
          ) : sdkStatus === 'error' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  PayPal SDK Error
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  The PayPal JavaScript SDK failed to load. Please check your network connection and try again.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Retry
                </button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  <DollarSign className="w-6 h-6 text-primary-600" />
                  PayPal Checkout
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  PayPal payment setup for order {internalOrderId || ''}
                </p>
                {/* PayPal Buttons component - renders the PayPal payment UI */}
                <PayPalButtons
                  // createOrder: Called when buyer clicks the PayPal button
                  // Returns the PayPal order ID created by our backend
                  createOrder={createOrder}
                  onApprove={handleApprove}
                  onError={(err: any) => {
                    console.error('PayPal error:', err);
                    setError(err.message || 'PayPal checkout error');
                    setStatus('failed');
                  }}
                  // Disable only during active operations
                  disabled={isProcessing}
                >
                  {/* Button text and styling */}
                  <div className="flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400">
                      Pay {internalOrderId ? `for Order ${internalOrderId}` : ''}
                    </span>
                  </div>
                </PayPalButtons>
              </CardContent>
            </Card>
          )}
        </div>
      </PayPalScriptProvider>
    </div>
  );
}