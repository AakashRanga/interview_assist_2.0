import React, { useState } from 'react';
import { Terminal, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SystemAuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system-diagnostics/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode }),
      });

      if (!res.ok) {
        throw new Error('Verification failed. Incorrect passcode.');
      }

      const data = await res.json();
      if (data.token) {
        sessionStorage.setItem('sys_diag_token', data.token);
        toast.success('Core Diagnostics access granted.');
        onSuccess();
      } else {
        throw new Error('Access token not returned by host.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed.');
      setPasscode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center font-mono p-4">
      <div className="bg-slate-950 border border-emerald-500/50 rounded-xl max-w-md w-full overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.15)]">
        
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <Terminal className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-bold">System Override Alert</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start gap-3 bg-red-950/20 border border-red-900/30 p-3 rounded-lg text-[11px] text-red-400/90 leading-relaxed">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              WARNING: You are requesting root-level diagnostics. Unauthorized operations can cause application failure. Enter authorization key to proceed.
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block">
              Authorization Key
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading}
              autoFocus
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 hover:text-slate-200 transition-all"
            >
              Abort
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all"
            >
              {loading ? 'Authorizing...' : 'Authorize Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
