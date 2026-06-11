import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { StatCard } from '../components/dashboard/StatCard';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CandidateDetailModal } from '../components/dashboard/CandidateDetailModal';
import { API_BASE_URL } from '../config';
import type { Candidate } from '../data/mockData';
import {
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  VideoIcon,
  MapPinIcon } from
'lucide-react';

const parseTime = (timePart: string): Date | null => {
  const match = timePart.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const isSlotActive = (dateStr: string, timeStr: string): boolean => {
  try {
    const today = new Date();
    const d = new Date(dateStr);
    if (d.getFullYear() !== today.getFullYear() ||
        d.getMonth() !== today.getMonth() ||
        d.getDate() !== today.getDate()) {
      return false;
    }
    
    const parts = timeStr.split('-');
    if (parts.length < 2) {
      const start = parseTime(parts[0].trim());
      if (!start) return false;
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      return today >= start && today <= end;
    }
    
    const start = parseTime(parts[0].trim());
    const end = parseTime(parts[1].trim());
    if (!start || !end) return false;
    
    return today >= start && today <= end;
  } catch (e) {
    return false;
  }
};

const getInterviewStartDateTime = (dateStr: string, timeStr: string): Date | null => {
  try {
    const d = new Date(dateStr);
    const parts = timeStr.split('-');
    const start = parseTime(parts[0].trim());
    if (!start) return null;
    d.setHours(start.getHours(), start.getMinutes(), 0, 0);
    return d;
  } catch (e) {
    return null;
  }
};

const formatShortDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export function PanelDashboard() {
  const navigate = useNavigate();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  
  const [timeTick, setTimeTick] = useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Sarah Johnson');
  
  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u && u.id) {
          setUserName(u.full_name || 'Sarah Johnson');
          fetch(`${API_BASE_URL}/user/${u.id}/panel-dashboard`)
            .then(res => {
              if (res.ok) return res.json();
              throw new Error('Failed to fetch dashboard');
            })
            .then(data => {
              setDashboardData(data);
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
      setLoading(false);
    }
  }, []);

  const currentPanel = dashboardData?.panel || {
    name: 'Panel A',
    type: 'HR/Technical',
    meetLink: '',
    members: []
  };
  const isCandidateAssignedToPanel = (candidate: any, panelId: string | number) => {
    if (!candidate.panelId) return false;
    const targetId = String(panelId);
    const candPanelIdStr = String(candidate.panelId);
    if (candPanelIdStr.startsWith('[')) {
      try {
        const parsed = JSON.parse(candPanelIdStr);
        if (Array.isArray(parsed)) {
          return parsed.map(String).includes(targetId);
        }
      } catch (e) {}
    }
    return candPanelIdStr === targetId;
  };

  const loggedInMember = currentPanel.members?.find((m: any) => m.name === userName);
  const loggedInMemberId = loggedInMember ? loggedInMember.id : '';

  const myCandidates = (dashboardData?.candidates || []).filter((c: any) => 
    loggedInMemberId ? isCandidateAssignedToPanel(c, loggedInMemberId) : false
  );
  
  const todayInterviews = myCandidates.filter((c: any) => {
    if (c.status !== 'Scheduled') return false;
    if (!c.interviewDate) return false;
    
    const today = new Date();
    const d = new Date(c.interviewDate);
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  }).slice(0, 3);

  const getActiveGroupMeetLink = () => {
    const onlineCandidates = myCandidates.filter((c: any) =>
      c.interviewDate &&
      c.interviewTime &&
      c.meetLink &&
      c.mode === 'Online'
    );

    // 1. Check for currently active candidate
    const activeCandidate = onlineCandidates.find((c: any) => isSlotActive(c.interviewDate, c.interviewTime));
    if (activeCandidate) {
      return {
        link: activeCandidate.meetLink,
        status: 'active',
        candidateName: activeCandidate.name,
        timeInfo: activeCandidate.interviewTime
      };
    }

    // 2. Check for next upcoming candidate
    const now = new Date();
    const upcomingCandidates = onlineCandidates
      .map((c: any) => {
        const startDateTime = getInterviewStartDateTime(c.interviewDate, c.interviewTime);
        return { candidate: c, startDateTime };
      })
      .filter((item: any) => item.startDateTime && item.startDateTime > now)
      .sort((a: any, b: any) => a.startDateTime!.getTime() - b.startDateTime!.getTime());

    if (upcomingCandidates.length > 0) {
      const upcomingCandidate = upcomingCandidates[0].candidate;
      return {
        link: upcomingCandidate.meetLink,
        status: 'upcoming',
        candidateName: upcomingCandidate.name,
        timeInfo: `${formatShortDate(upcomingCandidate.interviewDate)} @ ${upcomingCandidate.interviewTime.split('-')[0].trim()}`
      };
    }

    return {
      link: null,
      status: 'none',
      candidateName: null,
      timeInfo: null
    };
  };

  const handleJoin = (link?: string) => {
    if (link && link.trim() !== '') {
      toast.success('Opening meeting...');
      const formattedLink = link.startsWith('http://') || link.startsWith('https://')
        ? link
        : `https://${link}`;
      window.open(formattedLink, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('No meeting link available');
    }
  };

  const completedCount = myCandidates.filter((c: any) => 
    c.status === 'Completed' || c.status === 'Selected' || c.status === 'Rejected'
  ).length;

  const pendingFeedbackCount = myCandidates.filter((c: any) => {
    if (c.status !== 'Scheduled' || !c.interviewDate) return false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const intDate = new Date(c.interviewDate);
      intDate.setHours(0, 0, 0, 0);
      return intDate < today;
    } catch (e) {
      return false;
    }
  }).length;

  if (loading) {
    return (
      <DashboardLayout role="panel" title="Panel Dashboard" userName={userName}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="panel"
      title="Panel Dashboard"
      userName={userName}>
      
      {/* Welcome */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="mb-8 flex items-center justify-between flex-wrap gap-4">
        
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Welcome, {userName.split(' ')[0]}!
          </h1>
          <p className="text-sm text-secondary/70">
            • {todayInterviews.length} interviews
            today
          </p>
        </div>
        <Badge variant="primary" size="md">
          {currentPanel.type}
        </Badge>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={UsersIcon}
          label="Assigned Candidates"
          value={myCandidates.length}
          color="primary" />
        
        <StatCard
          icon={CalendarIcon}
          label="Today's Interviews"
          value={todayInterviews.length}
          color="cyan" />
        
        <StatCard
          icon={ClockIcon}
          label="Pending Feedback"
          value={pendingFeedbackCount}
          color="yellow" />
        
        <StatCard
          icon={CheckCircleIcon}
          label="Completed"
          value={completedCount}
          color="green" />
        
      </div>

      {/* Panel Committee + Meet Info */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          delay: 0.05
        }}
        className="mb-8">
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div>
              <div className="text-xs text-secondary/60 uppercase tracking-wide mb-1">
                Your Panel Committee
              </div>
              <h3 className="text-base font-semibold text-secondary">
                {currentPanel.name} · {currentPanel.members?.length || 0}-Member Committee
              </h3>
             
            </div>
            {(() => {
              const activeMeet = getActiveGroupMeetLink();
              return activeMeet.link ? (
                <Button onClick={() => handleJoin(activeMeet.link)}>
                  <VideoIcon className="w-4 h-4 mr-2" />
                  {activeMeet.status === 'active' ? 'Join Live Meeting' : 'Join Upcoming Meeting'}
                </Button>
              ) : (
                <Button disabled>
                  <VideoIcon className="w-4 h-4 mr-2" />
                  No Meeting
                </Button>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
            {currentPanel.members.map((m) => {
              const isYou = m.name === userName;
              return (
                <div
                  key={m.name}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${isYou ? 'bg-primary/10 border-primary/30' : 'bg-white/60 border-white/60'}`}>
                  
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isYou ? 'bg-primary text-white' : 'bg-primary/20 text-primary'}`}>
                    
                    {m.name.
                    split(' ').
                    map((n) => n[0]).
                    join('').
                    slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-medium text-secondary truncate">
                        {m.name}
                      </span>
                      {isYou &&
                      <span className="text-[9px] text-primary uppercase tracking-wider font-semibold">
                          You
                        </span>
                      }
                    </div>
                    <div className="text-[10px] text-secondary/70 truncate">
                      {m.role}
                    </div>
                  </div>
                </div>);

            })}
          </div>

          {(() => {
            const activeMeet = getActiveGroupMeetLink();
            return (
              <div className="bg-white/60 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap border border-white/50">
                <div className="min-w-0 flex-grow">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[10px] text-secondary/60 uppercase tracking-wider">
                      {activeMeet.status === 'active' 
                        ? 'Active Slot Link' 
                        : activeMeet.status === 'upcoming' 
                          ? 'Upcoming Slot Link' 
                          : 'Meeting Link'}
                    </span>
                    {activeMeet.status === 'active' && (
                      <span className="text-[8px] bg-red-500/10 text-red-500 font-bold px-1.5 py-0.5 rounded animate-pulse">
                        Live: {activeMeet.candidateName}
                      </span>
                    )}
                    {activeMeet.status === 'upcoming' && (
                      <span className="text-[8px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                        Next: {activeMeet.candidateName}
                      </span>
                    )}
                  </div>
                  {activeMeet.link ? (
                    <div className="flex flex-col">
                      <code className="text-[11px] text-primary font-mono truncate block" title={activeMeet.link}>
                        {activeMeet.link.replace('https://', '')}
                      </code>
                      {activeMeet.status === 'upcoming' && (
                        <span className="text-[8px] text-secondary/50 font-medium truncate mt-0.5">
                          {activeMeet.timeInfo}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-secondary/50 font-medium italic block py-0.5">
                      No schedule for current time slot
                    </span>
                  )}
                </div>
                <Badge variant="primary" size="sm">
                  {currentPanel.type}
                </Badge>
              </div>
            );
          })()}
        </GlassCard>
      </motion.div>

      {/* Today's Schedule */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          delay: 0.1
        }}
        className="mb-8">
        
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-secondary mb-6">
            Today's Schedule
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {todayInterviews.map((candidate, index) =>
            <motion.div
              key={candidate.id}
              initial={{
                opacity: 0,
                scale: 0.95
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
              transition={{
                delay: 0.1 * index
              }}
              className="bg-white/50 rounded-2xl p-4">
              
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-secondary">
                    {candidate.interviewTime}
                  </div>
                  <Badge
                  variant={candidate.mode === 'Online' ? 'info' : 'neutral'}
                  size="sm">
                  
                    {candidate.mode}
                  </Badge>
                </div>
                <div className="flex items-center space-x-3 mb-3">
                  <img
                  src={candidate.avatar}
                  alt={candidate.name}
                  className="w-10 h-10 rounded-full" />
                
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-secondary truncate">
                      {candidate.name}
                    </div>
                    <div className="text-xs text-secondary/60 truncate">
                      {candidate.role}
                    </div>
                  </div>
                </div>
                <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (candidate.mode === 'Online') {
                    handleJoin(candidate.meetLink || currentPanel?.meetLink);
                  } else {
                    setSelectedCandidate(candidate);
                  }
                }}>
                
                  {candidate.mode === 'Online' ?
                <>
                      <VideoIcon className="w-4 h-4 mr-2" />
                      Join Interview
                    </> :

                <>
                      <MapPinIcon className="w-4 h-4 mr-2" />
                      View Details
                    </>
                }
                </Button>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Assigned Candidates */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          delay: 0.2
        }}>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-secondary">
              Assigned Candidates
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant="primary">{myCandidates.length} candidates</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/panel/candidates')}>
                
                View All
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCandidates.slice(0, 6).map((candidate, index) =>
            <motion.div
              key={candidate.id}
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.05 * index
              }}
              whileHover={{
                scale: 1.02
              }}
              className="bg-white/50 rounded-2xl p-4 cursor-pointer"
              onClick={() => setSelectedCandidate(candidate)}>
              
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                    src={candidate.avatar}
                    alt={candidate.name}
                    className="w-12 h-12 rounded-full flex-shrink-0" />
                  
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-secondary truncate">
                        {candidate.name}
                      </div>
                      <div className="text-xs text-secondary/60 truncate">
                        {candidate.role}
                      </div>
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
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-xs text-secondary/60">
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    {new Date(
                    candidate.interviewDate!
                  ).toLocaleDateString()} at {candidate.interviewTime}
                  </div>
                </div>

                <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setSelectedCandidate(candidate)}>
                
                  Review Profile
                </Button>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      <CandidateDetailModal
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        viewerRole="panel"
        viewerName={userName} />
      
    </DashboardLayout>);

}