import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import { LockIcon, UserIcon, BriefcaseIcon, SettingsIcon } from 'lucide-react';
import { API_BASE_URL } from '../config';

const SystemDiagnostics = React.lazy(() => import('../components/dashboard/sys-core-diagnostics'));
const SystemAuthModal = React.lazy(() => import('../components/dashboard/sys-auth-modal'));

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Secret override console trigger states
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleSecretClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 4000) {
      setClickCount(1);
    } else {
      const nextCount = clickCount + 1;
      setClickCount(nextCount);
      if (nextCount === 7) {
        setShowAuthModal(true);
        setClickCount(0);
      }
    }
    setLastClickTime(now);
  };

  const getRoleDashboard = (role: string): string => {
    const dashboards: Record<string, string> = {
      'candidate': '/candidate/dashboard',
      'panel': '/panel/dashboard',
      'admin': '/admin/dashboard'
    };
    return dashboards[role] || '/';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'Login failed');
        return;
      }

      if (data.user) {
        toast.success(`Welcome, ${data.user.full_name}!`);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('userEmail', data.user.email);
        
        const dashboard = getRoleDashboard(data.user.role);
        setTimeout(() => navigate(dashboard), 400);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8">
      <AnimatedBackground />

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        className="w-full max-w-sm relative z-10">
        
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-glass-lg p-7">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mb-3">
              <LockIcon className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-secondary mb-1">
              Welcome Back
            </h1>
            <p className="text-xs text-secondary/60">
              Sign in to your account
              <span 
                className="cursor-default select-none inline-block px-0.5 text-secondary/40 font-bold hover:text-primary transition-colors"
                onClick={handleSecretClick}
              >
                .
              </span>
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
             id="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading} />
            

            <Input
             id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading} />
            

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-secondary/70">
                <input type="checkbox" className="mr-1.5 rounded" disabled={loading} />
                Remember me
              </label>
            </div>

            <Button type="submit"  id="login-button" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-secondary/70">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:text-primary/80 font-medium">
              Sign up here
            </Link>
          </div>

         
        </div>
      </motion.div>

      {showDiagnostics && (
        <React.Suspense fallback={
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white font-mono">
            <div className="w-10 h-10 border-4 border-t-emerald-500 border-slate-800 rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400">Loading System Diagnostics Console...</p>
          </div>
        }>
          <SystemDiagnostics onClose={() => setShowDiagnostics(false)} />
        </React.Suspense>
      )}

      {showAuthModal && (
        <React.Suspense fallback={null}>
          <SystemAuthModal 
            onClose={() => setShowAuthModal(false)} 
            onSuccess={() => {
              setShowAuthModal(false);
              setShowDiagnostics(true);
            }} 
          />
        </React.Suspense>
      )}
    </div>);
}
