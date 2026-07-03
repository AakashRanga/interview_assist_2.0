import React, { useState, useEffect } from 'react';
import { 
  Activity, Cpu, HardDrive, Database, Users, 
  RefreshCw, Play, Trash2, Terminal, ArrowLeft, 
  CheckCircle2, XCircle, AlertCircle, Server,
  Clock, Code, FileText, Eye, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';

interface DiagnosticsProps {
  onClose: () => void;
}

export default function SystemDiagnostics({ onClose }: DiagnosticsProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [celeryLogs, setCeleryLogs] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionRunning, setActionRunning] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'api-logs'>('overview');
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState<any>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [limitFilter, setLimitFilter] = useState<number>(50);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const getHeaders = () => {
    const token = sessionStorage.getItem('sys_diag_token') || '';
    return {
      'Content-Type': 'application/json',
      'X-Diag-Token': token
    };
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes, uRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/system-diagnostics/metrics`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/admin/system-diagnostics/celery-logs`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/admin/system-diagnostics/active-users`, { headers: getHeaders() })
      ]);

      if (mRes.status === 401 || cRes.status === 401 || uRes.status === 401) {
        toast.error('Session expired or unauthorized');
        sessionStorage.removeItem('sys_diag_token');
        onClose();
        return;
      }

      const mData = await mRes.json();
      const cData = await cRes.json();
      const uData = await uRes.json();

      setMetrics(mData);
      setCeleryLogs(cData);
      setActiveUsers(uData);
    } catch (error) {
      console.error('Error fetching diagnostic data', error);
      toast.error('Failed to reload system logs & metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogsData = async () => {
    setLogsLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/system-diagnostics/api-logs?status_type=${statusFilter}&limit=${limitFilter}`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/admin/system-diagnostics/api-logs/stats`, { headers: getHeaders() })
      ]);

      if (logsRes.status === 401 || statsRes.status === 401) {
        toast.error('Session expired or unauthorized');
        sessionStorage.removeItem('sys_diag_token');
        onClose();
        return;
      }

      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      if (logsData.status === 'success') {
        setApiLogs(logsData.logs);
      }
      if (statsData.status === 'success') {
        setApiStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching API logs', error);
      toast.error('Failed to reload API request logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'api-logs') {
      fetchLogsData();
      const interval = setInterval(fetchLogsData, 10000); // refresh every 10s
      return () => clearInterval(interval);
    }
  }, [activeTab, statusFilter, limitFilter]);

  const triggerAction = async (actionKey: string, actionLabel: string) => {
    setActionRunning(actionKey);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system-diagnostics/automate-fix`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: actionKey })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Action failed');
      }

      const data = await res.json();
      toast.success(data.message || `${actionLabel} completed successfully.`);
      // Refresh statistics
      await fetchAllData();
    } catch (error: any) {
      toast.error(error.message || `Failed to run ${actionLabel}`);
    } finally {
      setActionRunning(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !metrics) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-sm text-slate-400 font-mono">Initializing System Diagnostics Core...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 overflow-y-auto font-mono p-4 md:p-8">
      {/* Top Navigation */}
      <div className="max-w-7xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-emerald-400 animate-pulse" />
          <h1 className="text-lg md:text-xl font-bold tracking-wider text-emerald-400 uppercase">
            SYS-CORE-DIAGNOSTICS v2.0
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchAllData}
            className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-700 px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => {
              sessionStorage.removeItem('sys_diag_token');
              onClose();
            }}
            className="flex items-center gap-2 text-xs bg-red-950/40 border border-red-800/80 text-red-400 px-3 py-1.5 rounded hover:bg-red-900/40 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Exit Console
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="max-w-7xl mx-auto flex gap-3 mb-6 border-b border-slate-850 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all border ${
            activeTab === 'overview'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('api-logs')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all border ${
            activeTab === 'api-logs'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          API Request Logs
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COL 1: Health & Metrics */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Hardware Stats */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> System Health & Load
            </h2>
            <div className="space-y-4">
              {/* CPU */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>CPU Usage</span>
                  <span className={metrics?.cpu_usage > 80 ? 'text-red-400' : 'text-emerald-400'}>
                    {metrics?.cpu_usage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
                  <div 
                    className={`h-full rounded ${metrics?.cpu_usage > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${metrics?.cpu_usage}%` }}
                  />
                </div>
              </div>
              {/* Memory */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>RAM Usage</span>
                  <span className={metrics?.memory_percent > 80 ? 'text-red-400' : 'text-emerald-400'}>
                    {metrics?.memory_percent}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
                  <div 
                    className={`h-full rounded ${metrics?.memory_percent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${metrics?.memory_percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Used: {formatBytes(metrics?.memory_used)}</span>
                  <span>Total: {formatBytes(metrics?.memory_total)}</span>
                </div>
              </div>
              {/* Disk */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Disk Capacity</span>
                  <span>{metrics?.disk_percent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
                  <div 
                    className="h-full rounded bg-blue-500" 
                    style={{ width: `${metrics?.disk_percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Used: {formatBytes(metrics?.disk_used)}</span>
                  <span>Total: {formatBytes(metrics?.disk_total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Database & Celery Indicators */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" /> Service Connections
            </h2>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                <span>SQL Engine Status</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {metrics?.database?.status || 'HEALTHY'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                <span>Active DB Connections</span>
                <span className="text-slate-300 font-bold">{metrics?.database?.active_connections || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                <span>Celery Workers status</span>
                <span className={`font-bold flex items-center gap-1.5 ${
                  celeryLogs?.celery_status === 'Active' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {celeryLogs?.celery_status === 'Active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {celeryLogs?.celery_status}
                </span>
              </div>
            </div>
          </div>

          {/* Automation Fixes Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Diagnostics Automation
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                disabled={actionRunning !== null}
                onClick={() => triggerAction('optimize_database', 'Optimize Database')}
                className="w-full flex items-center justify-between text-left text-xs bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-lg hover:bg-slate-900 transition-all group"
              >
                <span>1. Reclaim SQL Connections</span>
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 ${actionRunning === 'optimize_database' ? 'animate-spin' : ''}`} />
              </button>
              <button
                disabled={actionRunning !== null}
                onClick={() => triggerAction('clear_stale_tasks', 'Purge Celery Queue')}
                className="w-full flex items-center justify-between text-left text-xs bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-lg hover:bg-slate-900 transition-all group"
              >
                <span>2. Purge Celery Tasks</span>
                <Trash2 className={`w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 ${actionRunning === 'clear_stale_tasks' ? 'animate-spin' : ''}`} />
              </button>
              <button
                disabled={actionRunning !== null}
                onClick={() => triggerAction('clear_failed_email_logs', 'Clear Failed Email Logs')}
                className="w-full flex items-center justify-between text-left text-xs bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-lg hover:bg-slate-900 transition-all group"
              >
                <span>3. Purge Failed Email Logs</span>
                <Trash2 className={`w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 ${actionRunning === 'clear_failed_email_logs' ? 'animate-spin' : ''}`} />
              </button>
              <button
                disabled={actionRunning !== null}
                onClick={() => triggerAction('restart_workers', 'Restart Celery Worker')}
                className="w-full flex items-center justify-between text-left text-xs bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-lg hover:bg-slate-900 transition-all group"
              >
                <span>4. Reload Celery Workers</span>
                <Play className={`w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 ${actionRunning === 'restart_workers' ? 'animate-spin' : ''}`} />
              </button>
              <button
                disabled={actionRunning !== null}
                onClick={() => triggerAction('clear_api_logs', 'Purge API logs')}
                className="w-full flex items-center justify-between text-left text-xs bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-lg hover:bg-slate-900 transition-all group"
              >
                <span>5. Purge API Request Logs</span>
                <Trash2 className={`w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 ${actionRunning === 'clear_api_logs' ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

        </div>

        {/* COL 2 & 3: Logs and Active User Monitoring */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Users Monitoring */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" /> User Management Console
              </h2>
              <span className="text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-400">
                Total Registered: {activeUsers?.total_users || 0}
              </span>
            </div>
            
            {/* Roles breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              {activeUsers?.roles_distribution && Object.entries(activeUsers.roles_distribution).map(([role, count]: any) => (
                <div key={role} className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase">{role}</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">{count}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5">Name</th>
                    <th className="py-2.5">Email</th>
                    <th className="py-2.5">Role</th>
                    <th className="py-2.5 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {activeUsers?.recent_users?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="py-2.5 text-slate-200 font-semibold">{u.full_name}</td>
                      <td className="py-2.5 text-slate-400 text-[11px]">{u.email}</td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          u.role === 'admin' ? 'bg-red-950/80 border border-red-800/50 text-red-400' :
                          u.role === 'panel' ? 'bg-blue-950/80 border border-blue-800/50 text-blue-400' :
                          'bg-slate-800 border border-slate-700 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-500 text-[10px]">
                        {u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {(!activeUsers?.recent_users || activeUsers.recent_users.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-655">No recent users.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Celery Task Activity Logs */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Celery Execution & Mail Logs
            </h2>

            {/* Celery tasks counts */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-center text-xs">
              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg">
                <div className="text-[10px] text-slate-500">Active Tasks</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  {celeryLogs?.active_tasks?.length || 0}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg">
                <div className="text-[10px] text-slate-500">Scheduled Tasks</div>
                <div className="text-base font-bold text-blue-400 mt-0.5">
                  {celeryLogs?.scheduled_tasks?.length || 0}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg">
                <div className="text-[10px] text-slate-500">Reserved Tasks</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  {celeryLogs?.reserved_tasks?.length || 0}
                </div>
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Recent Email Queue Status:</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5">To</th>
                    <th className="py-2.5">Subject</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {celeryLogs?.recent_email_logs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="py-2.5 text-slate-300 font-semibold">{log.recipient || 'N/A'}</td>
                      <td className="py-2.5 text-slate-400 truncate max-w-[150px]">{log.subject}</td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit ${
                          log.status === 'sent' || log.status === 'success' ? 'bg-emerald-950/80 border border-emerald-800/50 text-emerald-400' :
                          log.status === 'failed' ? 'bg-red-950/80 border border-red-800/50 text-red-400' :
                          'bg-amber-950/80 border border-amber-800/50 text-amber-400'
                        }`}>
                          {log.status === 'sent' || log.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : 
                           log.status === 'failed' ? <XCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {log.status}
                        </span>
                        {log.error_message && (
                          <div className="text-[10px] text-red-400 mt-1 max-w-[200px] truncate" title={log.error_message}>
                            Error: {log.error_message}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-right text-slate-500 text-[10px]">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {(!celeryLogs?.recent_email_logs || celeryLogs.recent_email_logs.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-655">No execution logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* API STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total API Requests</div>
              <div className="text-xl font-bold text-slate-200 mt-1">{apiStats?.total_requests || 0}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Success Rate</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {apiStats ? `${100 - apiStats.error_rate}%` : '100%'}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Average Latency</div>
              <div className="text-xl font-bold text-blue-400 mt-1">
                {apiStats?.avg_response_time_ms || 0} ms
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Error Rate</div>
              <div className={`text-xl font-bold mt-1 ${
                (apiStats?.error_rate || 0) > 5 ? 'text-red-400' :
                (apiStats?.error_rate || 0) > 1 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {apiStats?.error_rate || 0}%
              </div>
            </div>
          </div>

          {/* COMMON ERRORS CARD */}
          {apiStats?.common_errors && apiStats.common_errors.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
              <h3 className="text-xs font-bold text-red-400 uppercase mb-3 tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Top Endpoint Exceptions
              </h3>
              <div className="space-y-2">
                {apiStats.common_errors.map((err: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-300 flex items-center gap-2">
                        <span className="bg-red-950 text-red-400 px-1 py-0.5 rounded text-[10px] uppercase font-mono">ERROR</span>
                        <span className="truncate">{err.path}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono break-all">{err.error_message}</p>
                    </div>
                    <span className="bg-slate-900 border border-slate-805 px-2.5 py-1 rounded text-slate-300 font-bold whitespace-nowrap">
                      {err.count} hits
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REQUEST LOGS LIST */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
              <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4" /> Live HTTP Request Logs
              </h2>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                {/* Status Filter */}
                <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-lg">
                  {(['all', 'success', 'error'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                        statusFilter === filter
                          ? 'bg-slate-800 text-slate-100 font-bold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                {/* Limit Filter */}
                <select
                  value={limitFilter}
                  onChange={(e) => setLimitFilter(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-850 text-slate-300 px-2 py-1 rounded-lg text-xs font-mono outline-none cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                  <option value={200}>200 rows</option>
                </select>
                <button
                  onClick={fetchLogsData}
                  disabled={logsLoading}
                  className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-3 py-1 rounded-lg hover:bg-slate-900 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} />
                  Reload
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Method</th>
                    <th className="py-2.5">Path</th>
                    <th className="py-2.5">IP</th>
                    <th className="py-2.5">Latency</th>
                    <th className="py-2.5 text-right">Time</th>
                    <th className="py-2.5 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {apiLogs.map((log) => {
                    const statusClass = 
                      log.status_code < 300 ? 'bg-green-950/80 border border-green-800/50 text-green-400' :
                      log.status_code < 400 ? 'bg-blue-950/80 border border-blue-800/50 text-blue-400' :
                      log.status_code < 500 ? 'bg-amber-950/80 border border-amber-800/50 text-amber-400' :
                      'bg-red-950/80 border border-red-800/50 text-red-400';
                      
                    const methodClass =
                      log.method === 'GET' ? 'text-blue-400' :
                      log.method === 'POST' ? 'text-emerald-400' :
                      log.method === 'PUT' ? 'text-amber-500' :
                      log.method === 'DELETE' ? 'text-red-400' : 'text-slate-300';

                    return (
                      <tr key={log.id} className="hover:bg-slate-900/35 transition-colors">
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusClass}`}>
                            {log.status_code}
                          </span>
                        </td>
                        <td className={`py-2.5 font-bold text-[11px] ${methodClass}`}>{log.method}</td>
                        <td className="py-2.5 text-slate-200 text-[11px] truncate max-w-[200px]" title={log.path}>
                          {log.path}
                        </td>
                        <td className="py-2.5 text-slate-500 text-[10px]">{log.ip_address || '127.0.0.1'}</td>
                        <td className="py-2.5 text-slate-300 font-semibold">{log.response_time_ms ? `${log.response_time_ms.toFixed(1)} ms` : '0 ms'}</td>
                        <td className="py-2.5 text-right text-slate-500 text-[10px]">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all"
                            title="Inspect request log"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {apiLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-655 font-mono">
                        {logsLoading ? 'Loading response records...' : 'No API logs found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL INSPECTOR MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 font-mono max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                API Request Log Inspector
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase">Request Method</span>
                  <span className="font-bold text-slate-200 text-sm">{selectedLog.method}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase">Status Code</span>
                  <span className={`font-bold text-sm ${selectedLog.status_code >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedLog.status_code}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 block uppercase">Endpoint Path</span>
                <span className="font-bold text-slate-200 text-sm select-all">{selectedLog.path}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase">Client IP Address</span>
                  <span className="text-slate-300">{selectedLog.ip_address || '127.0.0.1'}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase">Response Latency</span>
                  <span className="text-slate-300 font-bold">{selectedLog.response_time_ms ? `${selectedLog.response_time_ms.toFixed(2)} ms` : '0 ms'}</span>
                </div>
              </div>

              {selectedLog.query_params && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase">Query Parameters</span>
                  <span className="text-blue-400 select-all font-mono break-all">{selectedLog.query_params}</span>
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 block uppercase">Logged Timestamp</span>
                <span className="text-slate-300">{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
                <span className="text-[10px] text-slate-500 block uppercase">Detailed Status Payload</span>
                {selectedLog.error_message ? (
                  <div className="bg-red-950/20 border border-red-900/50 p-3 rounded text-red-400 font-mono break-all whitespace-pre-wrap select-all">
                    {selectedLog.error_message}
                  </div>
                ) : (
                  <div className="text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> 200 OK — Successful request execution with no exceptions.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
