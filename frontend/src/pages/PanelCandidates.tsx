import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { CandidateDetailModal } from '../components/dashboard/CandidateDetailModal';
import { API_BASE_URL } from '../config';
import type { Candidate } from '../data/mockData';
import {
  VideoIcon,
  CalendarIcon,
  MapPinIcon,
  CopyIcon,
  UsersIcon,
  SearchIcon,
  LayersIcon
} from 'lucide-react';

const isMeetingUrl = (url?: string): boolean => {
  if (!url) return false;
  const cleaned = url.trim().toLowerCase();
  return cleaned.startsWith('http://') || 
         cleaned.startsWith('https://') || 
         cleaned.includes('meet.google.com') || 
         cleaned.includes('teams.live.com') || 
         cleaned.includes('teams.microsoft.com') || 
         cleaned.includes('zoom.us');
};

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

export function PanelCandidates() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Sarah Johnson');
  
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );

  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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
              if (data?.panel) {
                setSelectedGroupId(data.panel.id);
                // Pre-select the logged-in panelist's category/tab
                const loggedIn = data.panel.members?.find(
                  (m: any) => m.name === (u.full_name || 'Sarah Johnson')
                );
                if (loggedIn) {
                  setSelectedCategoryId(loggedIn.id);
                }
              }
              setLoading(false);
            })
            .catch(err => {
              console.error(err);
              toast.error('Failed to load candidates data');
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

  const selectedCategory = dashboardData?.panel?.members?.find(
    (m: any) => m.id === selectedCategoryId
  );
  
  const selectedGroup = dashboardData?.panel;

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

  const loggedInMember = dashboardData?.panel?.members?.find(
    (m: any) => m.name === userName
  );
  const loggedInMemberId = loggedInMember ? loggedInMember.id : '';

  const rawCandidates = (dashboardData?.candidates || []).filter(
    (c: any) =>
    (selectedCategoryId === '' || isCandidateAssignedToPanel(c, selectedCategoryId)) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const candidates = [...rawCandidates].sort((a: any, b: any) => {
    const aAssigned = loggedInMemberId ? isCandidateAssignedToPanel(a, loggedInMemberId) : false;
    const bAssigned = loggedInMemberId ? isCandidateAssignedToPanel(b, loggedInMemberId) : false;
    if (aAssigned && !bAssigned) return -1;
    if (!aAssigned && bAssigned) return 1;
    return 0;
  });

  const onlineCandidates = candidates.filter((c: any) => c.mode === 'Online');
  const offlineCandidates = candidates.filter((c: any) => c.mode !== 'Online');

  const getActiveMeetLink = (filteredCandidates: any[]) => {
    const onlineCandidates = filteredCandidates.filter((c: any) =>
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

  const categoryLink = selectedCategory ? (selectedCategory.meetLink || selectedGroup?.meetLink) : null;
  const isCategoryMeet = categoryLink ? isMeetingUrl(categoryLink) : false;
  const showCategoryMeetBox = !!categoryLink && (isCategoryMeet ? onlineCandidates.length > 0 : offlineCandidates.length > 0);

  const groupLink = selectedGroup?.meetLink;
  const isGroupMeet = groupLink ? isMeetingUrl(groupLink) : false;
  const showGroupMeetBox = !!groupLink && (isGroupMeet ? onlineCandidates.length > 0 : offlineCandidates.length > 0);

  const handleJoin = (link?: string) => {
    if (!link || link.trim() === '') {
      toast.error('No meeting link available');
      return;
    }
    toast.success('Opening meeting...');
    const formattedLink = link.startsWith('http://') || link.startsWith('https://')
      ? link
      : `https://${link}`;
    window.open(formattedLink, '_blank', 'noopener,noreferrer');
  };

  const copyLink = (link?: string) => {
    if (!link) {
      toast.error('No link to copy');
      return;
    }
    navigator.clipboard.writeText(link);
    toast.success('Link copied');
  };

  if (loading) {
    return (
      <DashboardLayout role="panel" title="Candidates" userName={userName}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="panel" title="Candidates" userName={userName}>
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="mb-5">
        
        <h1 className="text-2xl font-bold text-secondary mb-1">
          Panel Candidates
        </h1>
      </motion.div>

      {/* Panel Group selector */}
      {selectedGroup && (
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
            delay: 0.05
          }}
          className="mb-4">
          
          <div className="flex items-center space-x-2 mb-2">
            <LayersIcon className="w-3.5 h-3.5 text-secondary/60" />
            <span className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">
              Panels
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGroupId(selectedGroup.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 bg-secondary text-white shadow-glass">
              <span>{selectedGroup.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">
                {(selectedGroup.members || []).length} categories
              </span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Category tabs (within selected panel) */}
      {selectedGroup && (
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
          }}
          className="mb-5">
          
          <div className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider mb-2">
            {selectedGroup.name} · Categories
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategoryId('')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${selectedCategoryId === '' ? 'bg-primary text-white shadow-glass' : 'bg-white/60 backdrop-blur-xl border border-white/60 text-secondary/70 hover:bg-white/80'}`}>
              <span>All Candidates</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full ${selectedCategoryId === '' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                {(dashboardData?.candidates || []).length}
              </span>
            </button>
            {(selectedGroup.members || []).map((member: any) => {
              const isActive = member.id === selectedCategoryId;
              const count = (dashboardData?.candidates || []).filter(
                (c: any) => isCandidateAssignedToPanel(c, member.id)
              ).length;
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedCategoryId(member.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${isActive ? 'bg-primary text-white shadow-glass' : 'bg-white/60 backdrop-blur-xl border border-white/60 text-secondary/70 hover:bg-white/80'}`}>
                  <span>{member.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Selected Category Info */}
      {selectedCategory ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory.id}
            initial={{
              opacity: 0,
              y: 10
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              y: -10
            }}
            transition={{
              duration: 0.2
            }}>
            
            <GlassCard className="p-4 mb-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <div className="flex items-center space-x-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] text-secondary/60 uppercase tracking-wider">
                        Category / Panelist
                      </div>
                      <div className="text-sm font-semibold text-secondary">
                        {selectedCategory.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-1">
                    Role
                  </div>
                  <div className="text-xs text-secondary font-medium">
                    {selectedCategory.role}
                  </div>
                </div>

                {(() => {
                  const activeMeet = getActiveMeetLink(candidates);
                  return (
                    <div className="bg-white/50 rounded-xl p-3 flex flex-col justify-between border border-white/40 animate-fadeIn">
                      <div>
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
                          <div className="flex flex-col mt-1">
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
                          <span className="text-[10px] text-secondary/50 font-medium italic block py-0.5 mt-1">
                            No schedule for current time slot
                          </span>
                        )}
                      </div>
                      {activeMeet.link && (
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => handleJoin(activeMeet.link)}
                            className="flex-grow px-3 py-1 bg-primary text-white text-[10px] font-medium rounded-lg hover:bg-primary/90 transition-colors">
                            Join Meet
                          </button>
                          <button
                            onClick={() => copyLink(activeMeet.link)}
                            className="px-2 py-1 bg-white/70 border border-white/60 text-secondary text-[10px] rounded-lg hover:bg-white/90 transition-colors">
                            <CopyIcon className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="bg-white/50 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      <VideoIcon className="w-3 h-3 text-cyan" />
                      <div className="text-[10px] text-secondary/60 uppercase tracking-wider">
                        Panel Group Details
                      </div>
                    </div>
                    <div className="text-[11px] text-secondary/70">
                      {selectedGroup?.description || 'No description available.'}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </AnimatePresence>
      ) : (
        selectedGroup && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            className="mb-5">
            <GlassCard className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center space-x-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] text-secondary/60 uppercase tracking-wider">
                        Panel Group
                      </div>
                      <div className="text-sm font-semibold text-secondary">
                        {selectedGroup.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-secondary/70">
                    {selectedGroup.description || 'No description available.'}
                  </div>
                </div>

                {(() => {
                  const activeMeet = getActiveMeetLink(candidates);
                  return (
                    <div className="bg-white/50 rounded-xl p-3 flex flex-col justify-between border border-white/40 animate-fadeIn">
                      <div>
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
                          <div className="flex flex-col mt-1">
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
                          <span className="text-[10px] text-secondary/50 font-medium italic block py-0.5 mt-1">
                            No schedule for current time slot
                          </span>
                        )}
                      </div>
                      {activeMeet.link && (
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={() => handleJoin(activeMeet.link)}
                            className="flex-grow px-3 py-1 bg-primary text-white text-[10px] font-medium rounded-lg hover:bg-primary/90 transition-colors">
                            Join Meet
                          </button>
                          <button
                            onClick={() => copyLink(activeMeet.link)}
                            className="px-2 py-1 bg-white/70 border border-white/60 text-secondary text-[10px] rounded-lg hover:bg-white/90 transition-colors">
                            <CopyIcon className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </GlassCard>
          </motion.div>
        )
      )}

      {/* Search */}
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
        }}
        className="mb-4">
        
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary/40" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/70 backdrop-blur-xl border border-white/60 rounded-xl text-xs text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          
        </div>
      </motion.div>

      {/* Candidates Grid */}
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-secondary">
              {selectedGroup?.name} {selectedCategory ? `/ ${selectedCategory.name}` : ''}
            </h3>
            <Badge variant="primary" size="sm">
              {candidates.length} candidates
            </Badge>
          </div>

          {/* Online Section */}
          <div className="border-b border-white/20 pb-2 mb-4">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <VideoIcon className="w-3.5 h-3.5" />
              Online Candidates ({onlineCandidates.length})
            </h4>
          </div>

          {onlineCandidates.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
              <AnimatePresence>
                {onlineCandidates.map((candidate: any, index: number) => (
                  <motion.div
                    key={candidate.id}
                    initial={{
                      opacity: 0,
                      y: 10
                    }}
                    animate={{
                      opacity: 1,
                      y: 0
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.95
                    }}
                    transition={{
                      delay: 0.03 * index
                    }}
                    whileHover={{
                      scale: 1.02
                    }}
                    className="bg-white/50 rounded-2xl p-3">
                    
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center space-x-2 min-w-0">
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
                      <Badge
                        variant={
                          candidate.status === 'Selected' || candidate.status === 'Hired' ?
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

                    <div className="space-y-1 mb-2.5">
                      {candidate.interviewDate && candidate.interviewTime ? (
                        <div className="flex items-center text-[10px] text-secondary/60">
                          <CalendarIcon className="w-2.5 h-2.5 mr-1.5" />
                          {new Date(candidate.interviewDate).toLocaleDateString()} • {candidate.interviewTime}
                        </div>
                      ) : (
                        <div className="flex items-center text-[10px] text-secondary/40 italic">
                          <CalendarIcon className="w-2.5 h-2.5 mr-1.5" />
                          Not scheduled yet
                        </div>
                      )}
                      <div className="flex items-center text-[10px] text-secondary/60">
                        <VideoIcon className="w-2.5 h-2.5 mr-1.5" />
                        Online
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {candidate.skills.slice(0, 3).map((skill: string, i: number) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleJoin(candidate.meetLink || selectedGroup?.meetLink)}
                        className="flex-grow flex items-center justify-center px-2.5 py-1.5 bg-primary text-white text-[10px] font-medium rounded-lg hover:bg-primary/90 transition-colors">
                        <VideoIcon className="w-2.5 h-2.5 mr-1" />
                        Join
                      </button>
                      <button
                        onClick={() => setSelectedCandidate(candidate)}
                        className="px-2.5 py-1.5 bg-white/70 border border-white/60 text-secondary text-[10px] font-medium rounded-lg hover:bg-white/90 transition-colors">
                        Profile
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-6 bg-white/30 rounded-xl mb-8 border border-white/40">
              <p className="text-xs text-secondary/50 italic">No online candidates found</p>
            </div>
          )}

          {/* Offline Section */}
          <div className="border-b border-white/20 pb-2 mb-4">
            <h4 className="text-xs font-semibold text-cyan uppercase tracking-wider flex items-center gap-1.5">
              <MapPinIcon className="w-3.5 h-3.5" />
              Offline Candidates ({offlineCandidates.length})
            </h4>
          </div>

          {offlineCandidates.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence>
                {offlineCandidates.map((candidate: any, index: number) => (
                  <motion.div
                    key={candidate.id}
                    initial={{
                      opacity: 0,
                      y: 10
                    }}
                    animate={{
                      opacity: 1,
                      y: 0
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.95
                    }}
                    transition={{
                      delay: 0.03 * index
                    }}
                    whileHover={{
                      scale: 1.02
                    }}
                    className="bg-white/50 rounded-2xl p-3">
                    
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center space-x-2 min-w-0">
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
                      <Badge
                        variant={
                          candidate.status === 'Selected' || candidate.status === 'Hired' ?
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

                    <div className="space-y-1 mb-2.5">
                      {candidate.interviewDate && candidate.interviewTime ? (
                        <div className="flex items-center text-[10px] text-secondary/60">
                          <CalendarIcon className="w-2.5 h-2.5 mr-1.5" />
                          {new Date(candidate.interviewDate).toLocaleDateString()} • {candidate.interviewTime}
                        </div>
                      ) : (
                        <div className="flex items-center text-[10px] text-secondary/40 italic">
                          <CalendarIcon className="w-2.5 h-2.5 mr-1.5" />
                          Not scheduled yet
                        </div>
                      )}
                      <div className="flex items-center text-[10px] text-secondary/60">
                        <MapPinIcon className="w-2.5 h-2.5 mr-1.5" />
                        Offline {candidate.venue ? `(${candidate.venue})` : ''}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {candidate.skills.slice(0, 3).map((skill: string, i: number) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setSelectedCandidate(candidate)}
                        className="flex-grow px-2.5 py-1.5 bg-white/70 border border-white/60 text-secondary text-[10px] font-medium rounded-lg hover:bg-white/90 transition-colors">
                        Profile
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-6 bg-white/30 rounded-xl border border-white/40">
              <p className="text-xs text-secondary/50 italic">No offline candidates found</p>
            </div>
          )}

          {candidates.length === 0 && (
            <div className="text-center py-10">
              <UsersIcon className="w-10 h-10 text-secondary/30 mx-auto mb-2" />
              <p className="text-xs text-secondary/60">No candidates found</p>
            </div>
          )}
        </GlassCard>
      </motion.div>

      <CandidateDetailModal
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        viewerRole="panel"
        viewerName={userName} />
      
    </DashboardLayout>
  );
}