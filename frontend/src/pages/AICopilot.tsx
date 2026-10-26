import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { investigationsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Bot, Send, Loader2, AlertTriangle, CheckCircle2, Copy, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

interface AIInvestigateResponse {
  summary: string;
  issue_type: string;
  facts: Array<{ statement: string; evidence: string; verified: boolean }>;
  uncertainties: Array<{ statement: string; reason: string; evidence: string }>;
  recommendation: string;
  proposed_action_id: string | null;
  confidence: string | null;
  needs_human_review: boolean;
}

export function AICopilot() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(searchParams.get('question') || '');
  const [orderId, setOrderId] = useState(searchParams.get('order_id') || '');
  const [paymentId, setPaymentId] = useState(searchParams.get('payment_attempt_id') || '');
  const [investigationId, setInvestigationId] = useState(searchParams.get('investigation_id') || '');
  const [result, setResult] = useState<AIInvestigateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ question: string; result: AIInvestigateResponse }>>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    facts: true,
    uncertainties: true,
    recommendation: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    try {
      const response = await investigationsApi.aiInvestigate({
        question,
        investigation_id: investigationId || undefined,
        order_id: orderId || undefined,
        payment_attempt_id: paymentId || undefined,
      });
      const aiResult = response.data;
      setResult(aiResult);
      setHistory(prev => [{ question, result: aiResult }, ...prev].slice(0, 10));
    } catch (error) {
      console.error('AI investigation failed:', error);
      setResult({
        summary: 'Investigation failed',
        issue_type: 'error',
        facts: [],
        uncertainties: [{ statement: 'Failed to complete investigation', reason: 'API error', evidence: 'system' }],
        recommendation: 'Please try again or check your connection',
        proposed_action_id: null,
        confidence: 'low',
        needs_human_review: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600" />
            AI Copilot
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Ask questions about payments, orders, and investigations</p>
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>New Investigation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="e.g., Why does order ORD-123 show a different amount than payment CAP-456? What is verified and what should I do next?"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order ID (optional)
                </label>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter order UUID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment ID (optional)
                </label>
                <input
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  placeholder="Enter payment UUID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Investigation ID (optional)
                </label>
                <input
                  value={investigationId}
                  onChange={(e) => setInvestigationId(e.target.value)}
                  placeholder="Enter investigation UUID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Investigating...
                </>
              ) : (
                <>
                  <Bot className="w-5 h-5" />
                  Investigate
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Investigation Result
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  result.confidence === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  result.confidence === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                )}>
                  Confidence: {result.confidence?.toUpperCase() || 'N/A'}
                </span>
                {result.needs_human_review && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    Human Review Required
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Facts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Verified Facts ({result.facts.length})
              </CardTitle>
              <button
                onClick={() => toggleSection('facts')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                {expandedSections.facts ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </CardHeader>
            {expandedSections.facts && (
              <CardContent>
                {result.facts.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No verified facts</p>
                ) : (
                  <div className="space-y-3">
                    {result.facts.map((fact, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white">{fact.statement}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Evidence: {fact.evidence} • Verified: {fact.verified ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(fact.statement)}
                          className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-gray-500"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Uncertainties */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Uncertainties ({result.uncertainties.length})
              </CardTitle>
              <button
                onClick={() => toggleSection('uncertainties')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                {expandedSections.uncertainties ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </CardHeader>
            {expandedSections.uncertainties && (
              <CardContent>
                {result.uncertainties.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No uncertainties</p>
                ) : (
                  <div className="space-y-3">
                    {result.uncertainties.map((uncertainty, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                      >
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white">{uncertainty.statement}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Reason: {uncertainty.reason} • Evidence: {uncertainty.evidence}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(uncertainty.statement)}
                          className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded text-gray-500"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Recommendation */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                Recommendation
              </CardTitle>
              <button
                onClick={() => toggleSection('recommendation')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                {expandedSections.recommendation ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </CardHeader>
            {expandedSections.recommendation && (
              <CardContent>
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{result.recommendation}</p>
                </div>
                {result.proposed_action_id && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Proposed Action Created</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-mono">{result.proposed_action_id}</p>
                    <button
                      onClick={() => navigate(`/approvals/${result.proposed_action_id}`)}
                      className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      Review in Approvals →
                    </button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setResult(item.result)}
                  className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.question}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.result.issue_type} • {item.result.confidence} confidence
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Example Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Why does order ORD-123 show a different amount than payment CAP-456?',
              'What is the status of payment CAP-789 and is it captured?',
              'Are there any duplicate events for capture ID CAP-111?',
              'Investigate order ORD-456 and payment CAP-789 for discrepancies',
              'What does the timeline show for payment CAP-999?',
              'Is refund possible for capture CAP-222 and what would be the amount?',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => setQuestion(q)}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}