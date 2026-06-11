import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { StatCard } from '../components/dashboard/StatCard';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { API_BASE_URL } from '../config';
import {
  UsersIcon,
  CalendarIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  MoreVerticalIcon,
  ClockIcon,
  UserCheckIcon,
  VideoIcon,
  CopyIcon } from
'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer } from
'recharts';
import { toast } from 'sonner';

export function AdminDashboard() {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [managePanelOpen, setManagePanelOpen] = useState(false);
  const [managedPanel, setManagedPanel] = useState<any | null>(null);
  
  const [candidates, setCandidates] = useState<any[]>([]);
  const [panelGroups, setPanelGroups] = useState<any[]>([]);
  const [dbPanels, setDbPanels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [candRes, groupsRes, panelsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/candidates`),
          fetch(`${API_BASE_URL}/admin/panel-groups`),
          fetch(`${API_BASE_URL}/admin/panels`)
        ]);
        
        if (candRes.ok) {
          const candData = await candRes.json();
          setCandidates(candData);
        }
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setPanelGroups(groupsData);
        }
        if (panelsRes.ok) {
          const panelsData = await panelsRes.json();
          setDbPanels(panelsData);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const counts = useMemo(() => {
    const total = candidates.length;
    const scheduled = candidates.filter(c => c.status === 'Scheduled').length;
    const selected = candidates.filter(c => c.status === 'Selected').length;
    const completed = candidates.filter(c => c.status === 'Completed').length;
    const rejected = candidates.filter(c => c.status === 'Rejected').length;
    const successRate = total > 0 
      ? Math.round(((selected + completed) / (selected + completed + rejected || 1)) * 100) 
      : 0;
    const hired = selected + completed;
    
    return { total, scheduled, successRate, hired };
  }, [candidates]);

  const pipelineData = useMemo(() => {
    return [
      { stage: 'Applied', count: candidates.filter(c => c.status === 'Applied').length },
      { stage: 'Scheduled', count: candidates.filter(c => c.status === 'Scheduled').length },
      { stage: 'Completed', count: candidates.filter(c => c.status === 'Completed').length },
      { stage: 'Selected', count: candidates.filter(c => c.status === 'Selected').length },
      { stage: 'Rejected', count: candidates.filter(c => c.status === 'Rejected').length }
    ];
  }, [candidates]);

  const interviewsOverTime = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const countsArray = Array(12).fill(0);
    
    candidates.forEach(c => {
      if (c.interviewDate) {
        const date = new Date(c.interviewDate);
        if (!isNaN(date.getTime())) {
          countsArray[date.getMonth()] += 1;
        }
      }
    });
    
    return months.map((m, i) => ({
      date: m,
      count: countsArray[i]
    }));
  }, [candidates]);

  const statusBreakdown = useMemo(() => {
    return [
      { name: 'Scheduled', value: candidates.filter(c => c.status === 'Scheduled').length, color: '#7C3AED' },
      { name: 'Completed', value: candidates.filter(c => c.status === 'Completed').length, color: '#06B6D4' },
      { name: 'Selected', value: candidates.filter(c => c.status === 'Selected').length, color: '#10B981' },
      { name: 'Applied', value: candidates.filter(c => c.status === 'Applied').length, color: '#F59E0B' },
      { name: 'Rejected', value: candidates.filter(c => c.status === 'Rejected').length, color: '#EF4444' }
    ];
  }, [candidates]);

  const recentCandidates = useMemo(() => {
    return [...candidates]
      .sort((a, b) => new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime())
      .slice(0, 6);
  }, [candidates]);

  const panelGroupsToDisplay = useMemo(() => {
    return panelGroups.slice(0, 4).map(group => {
      const groupPanelIds = dbPanels
        .filter(p => p.panel_group_id === group.id)
        .map(p => String(p.id));
        
      const currentLoad = candidates.filter(c =>
        (String(c.panelGroupId) === String(group.id) || groupPanelIds.includes(String(c.panelId))) &&
        c.status !== 'Completed' && c.status !== 'Rejected'
      ).length;
      
      const loadPct = Math.min((currentLoad / 10) * 100, 100);
      
      return {
        id: group.id,
        name: group.name,
        type: group.description || 'General',
        members: (group.members || []).map((m: any) => ({
          name: m.name,
          role: m.interview_type || 'Panelist'
        })),
        currentLoad,
        capacity: 10,
        loadPct,
        meetLink: group.meet_link || '',
        zoomLink: 'https://zoom.us/j/2220000002' // mock zoom link
      };
    });
  }, [panelGroups, dbPanels, candidates]);

  const recentActivities = useMemo(() => {
    const list: any[] = [];
    const sorted = [...candidates]
      .sort((a, b) => new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime());
      
    sorted.forEach((c) => {
      list.push({
        id: `act-apply-${c.id}`,
        type: 'candidate_applied',
        message: `New candidate applied: ${c.name} for ${c.role}`,
        timestamp: c.appliedDate,
        user: 'System'
      });
      
      if (c.status === 'Scheduled' && c.interviewDate) {
        list.push({
          id: `act-sched-${c.id}`,
          type: 'interview_scheduled',
          message: `Interview scheduled for ${c.name} (${c.role})`,
          timestamp: c.interviewDate,
          user: 'Admin'
        });
      }
      
      if (c.status === 'Selected') {
        list.push({
          id: `act-select-${c.id}`,
          type: 'panel_assigned',
          message: `Candidate ${c.name} status updated to Selected`,
          timestamp: c.interviewDate || c.appliedDate,
          user: 'Admin'
        });
      }
      
      if (c.status === 'Completed') {
        list.push({
          id: `act-complete-${c.id}`,
          type: 'feedback_submitted',
          message: `Feedback submitted & interview completed for ${c.name}`,
          timestamp: c.interviewDate || c.appliedDate,
          user: 'System'
        });
      }
    });
    
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [candidates]);

  const handleManage = (panel: any) => {
    setManagedPanel(panel);
    setManagePanelOpen(true);
  };

  const panelCandidates = managedPanel ?
    candidates.filter((c) => String(c.panelGroupId) === String(managedPanel.id)) :
    [];

  const panelGroup = managedPanel; // since managedPanel is the panel group object now
  return (
    <DashboardLayout role="admin" title="Admin Dashboard" userName="Admin User">
      <motion.div
        initial={{
          opacity: 0,
          y: 16
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="mb-6">
        
        <h1 className="text-xl font-semibold text-secondary mb-1">
          Admin Control Center
        </h1>
        {/* <p className="text-xs text-secondary/70">
          Manage your entire recruitment pipeline
        </p> */}
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 mb-6">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-secondary/60 mt-2">Loading live metrics...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <StatCard
              icon={UsersIcon}
              label="Total Candidates"
              value={counts.total}
              trend="Live"
              color="primary" />
            
            <StatCard
              icon={CalendarIcon}
              label="Scheduled"
              value={counts.scheduled}
              trend="Live"
              color="cyan" />
            
            <StatCard
              icon={TrendingUpIcon}
              label="Success Rate"
              value={`${counts.successRate}%`}
              trend="Live"
              color="green" />
            
            <StatCard
              icon={CheckCircleIcon}
              label="Hired (Total)"
              value={counts.hired}
              trend="Live"
              color="green" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5 mb-5">
            <motion.div
              initial={{
                opacity: 0,
                y: 10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.1
              }}>
              
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold text-secondary mb-4">
                  Recruitment Pipeline
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(100, 116, 139, 0.2)" />
                    
                    <XAxis
                      dataKey="stage"
                      tick={{
                        fill: '#64748B',
                        fontSize: 10
                      }}
                      axisLine={false}
                      tickLine={false} />
                    
                    <YAxis
                      tick={{
                        fill: '#64748B',
                        fontSize: 10
                      }}
                      axisLine={false}
                      tickLine={false} />
                    
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                        borderRadius: '12px',
                        fontSize: '11px'
                      }} />
                    
                    <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{
                opacity: 0,
                y: 10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.15
              }}>
              
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold text-secondary mb-4">
                  Interviews Over Time
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={interviewsOverTime}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(100, 116, 139, 0.2)" />
                    
                    <XAxis
                      dataKey="date"
                      tick={{
                        fill: '#64748B',
                        fontSize: 10
                      }}
                      axisLine={false}
                      tickLine={false} />
                    
                    <YAxis
                      tick={{
                        fill: '#64748B',
                        fontSize: 10
                      }}
                      axisLine={false}
                      tickLine={false} />
                    
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                        borderRadius: '12px',
                        fontSize: '11px'
                      }} />
                    
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#7C3AED"
                      strokeWidth={2.5}
                      dot={{
                        fill: '#7C3AED',
                        r: 3
                      }} />
                    
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
            <div className="lg:col-span-2 space-y-4 sm:space-y-5">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  delay: 0.2
                }}>
                
                <GlassCard className="p-5">
                  <h3 className="text-sm font-semibold text-secondary mb-4">
                    Recent Candidates
                  </h3>
                  <div className="space-y-2">
                    {recentCandidates.map((candidate, index) =>
                    <motion.div
                      key={candidate.id}
                      initial={{
                        opacity: 0,
                        x: -10
                      }}
                      animate={{
                        opacity: 1,
                        x: 0
                      }}
                      transition={{
                        delay: 0.04 * index
                      }}
                      className="flex items-center justify-between p-3 bg-white/60 rounded-xl hover:bg-white/80 transition-colors gap-3">
                      
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                          src={candidate.avatar}
                          alt={candidate.name}
                          className="w-9 h-9 rounded-full flex-shrink-0" />
                        
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-secondary truncate">
                              {candidate.name}
                            </div>
                            <div className="text-[10px] text-secondary/60 truncate">
                              {candidate.role}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <div className="text-[10px] text-secondary/60">
                              Interview
                            </div>
                            <div className="text-[10px] font-medium text-secondary">
                              {candidate.interviewDate ? new Date(
                              candidate.interviewDate
                            ).toLocaleDateString() : 'TBD'}
                            </div>
                          </div>
                          <Badge
                          variant={
                          candidate.status === 'Selected' ?
                          'success' :
                          candidate.status === 'Rejected' ?
                          'danger' :
                          candidate.status === 'Completed' ?
                          'info' :
                          candidate.status === 'Scheduled' ?
                          'primary' :
                          'neutral'
                          }
                          size="sm">
                          
                            {candidate.status}
                          </Badge>
                          <button
                          className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                          onClick={() => setRescheduleOpen(true)}>
                          
                            <MoreVerticalIcon className="w-3.5 h-3.5 text-secondary" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                    {recentCandidates.length === 0 && (
                      <p className="text-xs text-secondary/50 text-center py-4">No recent candidates found</p>
                    )}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Panel Management */}
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  delay: 0.25
                }}>
                
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-secondary">
                      Panel Management
                    </h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {panelGroupsToDisplay.map((panel, index) => {
                      const loadPct = panel.loadPct;
                      return (
                        <motion.div
                          key={panel.id}
                          initial={{
                            opacity: 0,
                            scale: 0.95
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1
                          }}
                          transition={{
                            delay: 0.08 * index
                          }}
                          className="bg-white/60 rounded-xl p-3.5">
                          
                          <div className="flex items-center justify-between mb-2.5">
                            <h4 className="text-xs font-semibold text-secondary">
                              {panel.name}
                            </h4>
                            <Badge variant="primary" size="sm">
                              {panel.type}
                            </Badge>
                          </div>

                          <div className="text-[10px] text-secondary/60 mb-1 truncate">
                            Members:{' '}
                            {panel.members.length > 0 ? panel.members.
                            map((m: any) => `${m.name} (${m.role})`).
                            join(', ') : 'No panelists assigned'}
                          </div>
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-secondary/60 uppercase tracking-wider">
                              Load
                            </span>
                            <span className="font-medium text-secondary">
                              {panel.currentLoad}/{panel.capacity}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-white/60 rounded-full overflow-hidden mb-3">
                            <motion.div
                              initial={{
                                width: 0
                              }}
                              animate={{
                                width: `${loadPct}%`
                              }}
                              className={`h-full ${loadPct === 100 ? 'bg-red-500' : loadPct > 80 ? 'bg-yellow-500' : 'bg-primary'}`} />
                            
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleManage(panel)}>
                            
                            Manage Panel
                          </Button>
                        </motion.div>);

                    })}
                    {panelGroupsToDisplay.length === 0 && (
                      <p className="text-xs text-secondary/50 text-center py-4 col-span-2">No panel groups found</p>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            </div>

        <div className="space-y-4 sm:space-y-5">
          <motion.div
            initial={{
              opacity: 0,
              y: 10
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.3
            }}>
            
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-secondary mb-4">
                Status Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value">
                    
                    {statusBreakdown.map((entry, index) =>
                    <Cell key={`cell-${index}`} fill={entry.color} />
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.6)',
                      borderRadius: '12px',
                      fontSize: '11px'
                    }} />
                  
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {statusBreakdown.map((item, index) =>
                <div
                  key={index}
                  className="flex items-center justify-between text-[10px]">
                  
                    <div className="flex items-center gap-1.5">
                      <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: item.color
                      }} />
                    
                      <span className="text-secondary/70">{item.name}</span>
                    </div>
                    <span className="font-medium text-secondary">
                      {item.value}
                    </span>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 10
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.35
            }}>
            
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-secondary mb-3">
                Recent Activity
              </h3>
              <div className="space-y-2.5">
                {recentActivities.map((activity) =>
                <div key={activity.id} className="flex items-start gap-2.5">
                    <div
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${activity.type === 'interview_scheduled' ? 'bg-primary/10 border-primary/20' : activity.type === 'feedback_submitted' ? 'bg-cyan/10 border-cyan/20' : activity.type === 'candidate_applied' ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                    
                      {activity.type === 'interview_scheduled' ?
                    <CalendarIcon className="w-3 h-3 text-primary" /> :
                    activity.type === 'feedback_submitted' ?
                    <CheckCircleIcon className="w-3 h-3 text-cyan" /> :
                    activity.type === 'candidate_applied' ?
                    <UserCheckIcon className="w-3 h-3 text-green-600" /> :

                    <ClockIcon className="w-3 h-3 text-yellow-600" />
                    }
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="text-[11px] text-secondary mb-0.5">
                        {activity.message}
                      </div>
                      <div className="text-[10px] text-secondary/60">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
                {recentActivities.length === 0 && (
                  <p className="text-xs text-secondary/50 text-center py-4">No recent activity logs</p>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
      </>
      )}

      {/* Reschedule modal */}
      <Modal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Reschedule Interview"
        size="md">
        
        <div className="space-y-4">
          <Input type="date" label="New Date" />
          <Input type="time" label="New Time" />
          <div className="flex gap-2.5">
            <Button
              onClick={() => {
                toast.success('Interview rescheduled');
                setRescheduleOpen(false);
              }}
              className="flex-grow">
              
              Confirm
            </Button>
            <Button
              onClick={() => setRescheduleOpen(false)}
              variant="outline"
              className="flex-grow">
              
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Panel modal */}
      <Modal
        isOpen={managePanelOpen}
        onClose={() => setManagePanelOpen(false)}
        title={`Manage ${managedPanel?.name ?? ''}`}
        size="lg">
        
        {managedPanel &&
        <div className="space-y-5">
            {/* Overview */}
            <div>
              <div className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider mb-2">
                Overview
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 rounded-xl p-3">
                  <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-0.5">
                    Panel Group
                  </div>
                  <div className="text-xs font-semibold text-secondary">
                    {panelGroup?.name}
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-0.5">
                    Capacity
                  </div>
                  <div className="text-xs font-semibold text-secondary">
                    {managedPanel.currentLoad}/{managedPanel.capacity}
                  </div>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-0.5">
                    Type
                  </div>
                  <div className="text-xs font-semibold text-secondary">
                    {managedPanel.type}
                  </div>
                </div>
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider mb-2">
                Members
              </div>
              <div className="space-y-1.5">
                {managedPanel.members.map((m: any) =>
              <div
                key={m.name}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-primary/10 text-primary text-[11px] rounded-lg border border-primary/20">
                
                    <span className="font-medium truncate">{m.name}</span>
                    <span className="text-[10px] text-primary/80 whitespace-nowrap">
                      {m.role}
                    </span>
                  </div>
              )}
              </div>
            </div>

            {/* Meeting links */}
            <div>
              <div className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider mb-2">
                Meeting Links
              </div>
              <div className="space-y-2">
                {[
              {
                label: 'Google Meet',
                link: managedPanel.meetLink,
                color: 'primary'
              },
              {
                label: 'Zoom',
                link: managedPanel.zoomLink,
                color: 'cyan'
              }].
              map((m) =>
              <div
                key={m.label}
                className="flex items-center justify-between gap-2 bg-white/60 rounded-xl p-2.5">
                
                    <div className="flex items-center gap-2 min-w-0">
                      <VideoIcon
                    className={`w-3 h-3 flex-shrink-0 ${m.color === 'primary' ? 'text-primary' : 'text-cyan'}`} />
                  
                      <div className="min-w-0">
                        <div className="text-[10px] text-secondary/60 uppercase tracking-wider">
                          {m.label}
                        </div>
                        <code className="text-[11px] text-secondary font-mono truncate block">
                          {m.link.replace('https://', '')}
                        </code>
                      </div>
                    </div>
                    <button
                  onClick={() => {
                    navigator.clipboard.writeText(m.link);
                    toast.success('Link copied');
                  }}
                  className="p-1.5 hover:bg-white/80 rounded-lg transition-colors flex-shrink-0">
                  
                      <CopyIcon className="w-3 h-3 text-secondary" />
                    </button>
                  </div>
              )}
              </div>
            </div>

            {/* Candidates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">
                  Assigned Candidates ({panelCandidates.length})
                </div>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {panelCandidates.map((c) =>
              <div
                key={c.id}
                className="flex items-center justify-between p-2 bg-white/60 rounded-lg gap-2">
                
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-7 h-7 rounded-full flex-shrink-0" />
                  
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-secondary truncate">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-secondary/60 truncate">
                          {c.role}
                        </div>
                      </div>
                    </div>
                    <Badge
                  variant={
                  c.status === 'Selected' ?
                  'success' :
                  c.status === 'Rejected' ?
                  'danger' :
                  c.status === 'Completed' ?
                  'info' :
                  c.status === 'Scheduled' ?
                  'primary' :
                  'neutral'
                  }
                  size="sm">
                  
                      {c.status}
                    </Badge>
                  </div>
              )}
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-white/60">
              <Button
              onClick={() => {
                toast.success('Settings saved');
                setManagePanelOpen(false);
              }}
              className="flex-grow">
              
                Save Changes
              </Button>
              <Button
              variant="outline"
              onClick={() => setManagePanelOpen(false)}
              className="flex-grow">
              
                Close
              </Button>
            </div>
          </div>
        }
      </Modal>
    </DashboardLayout>);

}