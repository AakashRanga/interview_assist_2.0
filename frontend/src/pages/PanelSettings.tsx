import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { API_BASE_URL } from '../config';
import { UserIcon, ShieldIcon, KeyIcon } from 'lucide-react';

type Section = 'profile' | 'security';

export function PanelSettings() {
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [panelData, setPanelData] = useState<any>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u && u.id) {
          setUserId(u.id);
          setUserName(u.full_name || 'Panelist');
          setUserEmail(u.email || '');
          
          // Fetch panel details
          fetch(`${API_BASE_URL}/user/${u.id}/panel-dashboard`)
            .then(res => {
              if (res.ok) return res.json();
              throw new Error('Failed to fetch dashboard');
            })
            .then(data => {
              setPanelData(data?.panel || null);
              setLoading(false);
            })
            .catch(err => {
              console.error(err);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    } else {
      toast.error('Session not found. Please log in.');
      setLoading(false);
    }
  }, []);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (!userId) {
      toast.error('Session not found. Please log in.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.detail || 'Failed to update password');
      }
    } catch (err) {
      toast.error('Failed to connect to server');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const sections = [
    {
      id: 'profile' as Section,
      label: 'Profile',
      icon: UserIcon
    },
    {
      id: 'security' as Section,
      label: 'Security',
      icon: ShieldIcon
    }
  ];

  if (loading) {
    return (
      <DashboardLayout role="panel" title="Settings" userName={userName || "Panelist"}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="panel" title="Settings" userName={userName || "Panelist"}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 className="text-xl font-semibold text-secondary mb-1">Settings</h1>
        <p className="text-xs text-secondary/70">
          Manage your account settings and preferences
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-4 sm:gap-5">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <GlassCard className="p-2.5">
            <div className="space-y-0.5">
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-secondary/70 hover:bg-white/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        <div className="lg:col-span-3 space-y-4 sm:space-y-5">
          {activeSection === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-5">
                <h2 className="text-sm font-semibold text-secondary mb-4">
                  Panelist Profile Details
                </h2>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-base font-bold text-primary">
                      {userName ? userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'PL'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-secondary/60 block">Logged in as</span>
                    <span className="text-xs font-semibold text-primary">Panelist Member</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Full Name" value={userName} disabled />
                  <Input label="Email Address" type="email" value={userEmail} disabled />
                  <Input label="Assigned Panel" value={panelData?.name || 'Not Assigned'} disabled />
                  <Input label="Interview Type / Committee" value={panelData?.type || 'Not Assigned'} disabled />
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeSection === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-5">
                <h2 className="text-sm font-semibold text-secondary mb-4">
                  Security Settings
                </h2>
                <div className="space-y-3">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={updatingPassword}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={updatingPassword}
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={updatingPassword}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleUpdatePassword}
                      disabled={updatingPassword}
                    >
                      <KeyIcon className="w-3.5 h-3.5 mr-2" />
                      {updatingPassword ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
