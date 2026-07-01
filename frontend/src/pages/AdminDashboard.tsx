import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { StatCard } from '../components/dashboard/StatCard';
import { GlassCard } from '../components/ui/GlassCard';
import { API_BASE_URL } from '../config';
import {
  UsersIcon,
  CalendarIcon,
  TrendingUpIcon,
  CheckCircleIcon } from
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

export function AdminDashboard() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const candRes = await fetch(`${API_BASE_URL}/admin/candidates`);
        
        if (candRes.ok) {
          const candData = await candRes.json();
          setCandidates(candData);
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
    const rejected = candidates.filter(c => c.status === 'Rejected').length;
    const hired = candidates.filter(c => c.status === 'Hired').length;
    const successRate = (hired + rejected) > 0 
      ? Math.round((hired / (hired + rejected)) * 100) 
      : 0;
    
    return { total, scheduled, successRate, hired };
  }, [candidates]);

  const pipelineData = useMemo(() => {
    return [
      { stage: 'Applied', count: candidates.filter(c => c.status === 'Applied').length },
      { stage: 'Selected', count: candidates.filter(c => c.status === 'Selected').length },
      { stage: 'Scheduled', count: candidates.filter(c => c.status === 'Scheduled').length },
      { stage: 'Completed', count: candidates.filter(c => c.status === 'Completed').length },
      { stage: 'Rejected', count: candidates.filter(c => c.status === 'Rejected').length },
      { stage: 'Hired', count: candidates.filter(c => c.status === 'Hired').length }
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
      { name: 'Selected', value: candidates.filter(c => c.status === 'Selected').length, color: '#3B82F6' },
      { name: 'Applied', value: candidates.filter(c => c.status === 'Applied').length, color: '#F59E0B' },
      { name: 'Rejected', value: candidates.filter(c => c.status === 'Rejected').length, color: '#EF4444' },
      { name: 'Hired', value: candidates.filter(c => c.status === 'Hired').length, color: '#10B981' }
    ];
  }, [candidates]);


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

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 mb-5">
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
                  Status Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
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
                <div className="space-y-1 mt-2 max-h-[90px] overflow-y-auto pr-1">
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
          </div>
        </>
      )}
    </DashboardLayout>);

}