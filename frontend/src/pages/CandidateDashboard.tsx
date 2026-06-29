import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { StatCard } from '../components/dashboard/StatCard';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { mockPanels } from '../data/mockData';
import { API_BASE_URL } from '../config';
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  VideoIcon,
  BriefcaseIcon,
  MapPinIcon,
  MailIcon,
  XCircleIcon } from
'lucide-react';
export function CandidateDashboard() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('John Doe');
  const [firstName, setFirstName] = useState('John');

  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u && u.full_name) {
          setFullName(u.full_name);
          setFirstName(u.full_name.split(' ')[0]);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const calculateCompletionFromCandidate = (candidate: any) => {
    if (!candidate) return 0;
    const countFilled = (value: any) =>
      value && String(value).trim().length > 0 ? 1 : 0;

    const personalCount =
      countFilled(candidate.full_name) +
      countFilled(candidate.email) +
      countFilled(candidate.phone) +
      countFilled(candidate.location);

    const hasEducation =
      Array.isArray(candidate.education) &&
      candidate.education.some(
        (edu: any) =>
          String(edu.university || '').trim() ||
          String(edu.graduation_year || '').trim() ||
          String(edu.gpa || '').trim()
      );
    const hasExperience =
      Array.isArray(candidate.experience) &&
      candidate.experience.some(
        (exp: any) =>
          String(exp.current_role || '').trim() ||
          String(exp.company || '').trim() ||
          String(exp.years_experience || '').trim() ||
          String(exp.summary || '').trim()
      );
    const hasSkills = Array.isArray(candidate.skills) && candidate.skills.length > 0;
    const linksCount =
      countFilled(candidate.links?.portfolio) +
      countFilled(candidate.links?.linkedin) +
      countFilled(candidate.links?.github);
    const resumeCount = countFilled(candidate.documents?.resume_path);
    const certificateCount =
      Array.isArray(candidate.documents?.certificates) && candidate.documents.certificates.length > 0
        ? 1
        : 0;

    const totalPoints = 11;
    const filledPoints =
      personalCount +
      (hasEducation ? 1 : 0) +
      (hasExperience ? 1 : 0) +
      (hasSkills ? 1 : 0) +
      resumeCount +
      certificateCount +
      linksCount;

    return Math.min(100, Math.round((filledPoints / totalPoints) * 100));
  };

  const profileCompletion = calculateCompletionFromCandidate(dashboardData?.candidate);

  const formatIndiaTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    }).format(date);
  };

  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u && u.id) {
          fetch(`${API_BASE_URL}/candidate/user/${u.id}/dashboard`)
            .then(res => res.json())
            .then(data => {
              setDashboardData(data);
              setLoading(false);
            })
            .catch(err => {
              console.error(err);
              setLoading(false);
            });

          fetch(`${API_BASE_URL}/user/${u.id}/notifications?limit=4&offset=0`)
            .then(res => res.json())
            .then(data => {
              setNotifications(data?.data ?? []);
            })
            .catch(err => console.error(err));
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

  const interviewSchedule = dashboardData?.interview_schedule;
  const meetLink = interviewSchedule?.gmeet_link ?? '';
  const venueAddress = interviewSchedule?.venue ?? dashboardData?.latest_application?.venue ?? '';
  const isOnline = interviewSchedule?.job_type
    ? (interviewSchedule.job_type === 'Online' || interviewSchedule.job_type === 'online')
    : (dashboardData?.latest_application?.job_type === 'Online' || dashboardData?.latest_application?.job_type === 'online');
  const isOffline = !isOnline;
  const hasApplied = dashboardData?.applications?.length > 0;
  const applicationStatus = dashboardData?.latest_application?.status ?? '';
  const isScheduled = applicationStatus === 'Scheduled' || applicationStatus === 'scheduled';

  const getStatusConfig = (status: string) => {
    const normalized = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : '';
    switch (normalized) {
      case 'Applied':
        return {
          badge: 'Under Review',
          variant: 'warning' as const,
          icon: ClockIcon,
          iconClass: 'text-warning',
          text: 'Your application is being reviewed by the panel. You will be notified once an interview is scheduled.'
        };
      case 'Selected':
        return {
          badge: 'Shortlisted',
          variant: 'primary' as const,
          icon: ClockIcon,
          iconClass: 'text-primary',
          text: 'Congratulations! You have been shortlisted for the interview. The panel will schedule the slot shortly.'
        };
      case 'Completed':
        return {
          badge: 'Interview Completed',
          variant: 'info' as const,
          icon: CheckCircleIcon,
          iconClass: 'text-cyan',
          text: 'You have completed your interview! The feedback has been submitted, and the recruitment team is evaluating the final decision.'
        };
      case 'Hired':
        return {
          badge: 'Hired',
          variant: 'success' as const,
          icon: CheckCircleIcon,
          iconClass: 'text-green-600',
          text: 'Congratulations! We are pleased to inform you that you have been selected for this position. Our HR team will reach out to you shortly.'
        };
      case 'Rejected':
        return {
          badge: 'Rejected',
          variant: 'danger' as const,
          icon: XCircleIcon,
          iconClass: 'text-red-600',
          text: 'Thank you for your interest. Unfortunately, we will not be moving forward with your application at this time.'
        };
      default:
        return {
          badge: status || 'Under Review',
          variant: 'neutral' as const,
          icon: ClockIcon,
          iconClass: 'text-neutral',
          text: 'Your application is under process.'
        };
    }
  };

  const getTimelineSteps = () => {
    const statusNorm = applicationStatus ? applicationStatus.toLowerCase() : '';
    const historyLogs = dashboardData?.history_logs || [];
    
    const formatTs = (tsStr?: string) => {
      if (!tsStr) return '';
      try {
        return new Date(tsStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        return '';
      }
    };

    const scheduledLog = [...historyLogs].reverse().find((h: any) => h.action === 'Scheduled' || h.action === 'Rescheduled');
    const completedLog = [...historyLogs].reverse().find((h: any) => h.action === 'Completed');
    const finalLog = [...historyLogs].reverse().find((h: any) => h.action === 'Hired' || h.action === 'Rejected');

    const scheduleDateStr = dashboardData?.interview_schedule?.date
      ? new Date(dashboardData.interview_schedule.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : formatTs(scheduledLog?.created_at);

    // Step 1: Application Submitted
    const step1 = {
      status: 'completed' as const,
      label: 'Application Submitted',
      date: dashboardData?.latest_application?.created_at
        ? new Date(dashboardData.latest_application.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A',
      icon: CheckCircleIcon
    };

    // Step 2: Application Under Review
    let step2Status: 'completed' | 'active' | 'pending' = 'pending';
    let step2Date = 'Pending';
    if (statusNorm === 'applied') {
      step2Status = 'active';
      step2Date = 'In Progress';
    } else if (statusNorm) {
      step2Status = 'completed';
      step2Date = 'Completed';
    }
    const step2 = {
      status: step2Status,
      label: 'Application Under Review',
      date: step2Date,
      icon: step2Status === 'completed' ? CheckCircleIcon : ClockIcon
    };

    // Step 3: Interview Scheduled
    let step3Status: 'completed' | 'active' | 'pending' = 'pending';
    let step3Date = 'Pending';
    if (statusNorm === 'selected') {
      step3Status = 'active';
      step3Date = 'In Progress';
    } else if (statusNorm === 'scheduled') {
      step3Status = 'completed';
      step3Date = scheduleDateStr || 'Scheduled';
    } else if (statusNorm === 'completed' || statusNorm === 'hired' || statusNorm === 'rejected') {
      step3Status = 'completed';
      step3Date = scheduleDateStr || (formatTs(scheduledLog?.created_at) || 'Completed');
    }
    const step3 = {
      status: step3Status,
      label: 'Interview Scheduled',
      date: step3Date,
      icon: step3Status === 'completed' ? CheckCircleIcon : CalendarIcon
    };

    // Step 4: Interview Completed
    let step4Status: 'completed' | 'active' | 'pending' = 'pending';
    let step4Date = 'Pending';
    if (statusNorm === 'scheduled') {
      step4Status = 'active';
      step4Date = 'In Progress';
    } else if (statusNorm === 'completed' || statusNorm === 'hired' || statusNorm === 'rejected') {
      step4Status = 'completed';
      step4Date = formatTs(completedLog?.created_at) || 'Completed';
    }
    const step4 = {
      status: step4Status,
      label: 'Interview Completed',
      date: step4Date,
      icon: step4Status === 'completed' ? CheckCircleIcon : ClockIcon
    };

    // Step 5: Final Decision
    let step5Status: 'completed' | 'active' | 'pending' = 'pending';
    let step5Date = 'Pending';
    let step5Icon = ClockIcon;
    if (statusNorm === 'completed') {
      step5Status = 'active';
      step5Date = 'In Progress';
    } else if (statusNorm === 'hired') {
      step5Status = 'completed';
      step5Date = formatTs(finalLog?.created_at) ? `Selected (${formatTs(finalLog.created_at)})` : 'Selected (Hired)';
      step5Icon = CheckCircleIcon;
    } else if (statusNorm === 'rejected') {
      step5Status = 'completed';
      step5Date = formatTs(finalLog?.created_at) ? `Not Selected (${formatTs(finalLog.created_at)})` : 'Not Selected';
      step5Icon = XCircleIcon;
    }
    const step5 = {
      status: step5Status,
      label: 'Final Decision',
      date: step5Date,
      icon: step5Icon
    };

    return [step1, step2, step3, step4, step5];
  };

  const handleJoinInterview = () => {
    if (isOffline) {
      if (!venueAddress) {
        toast.error('No venue available');
        return;
      }
      toast.success('Interview venue copied to clipboard');
      navigator.clipboard.writeText(venueAddress);
      return;
    }
    if (!meetLink || meetLink.trim() === '') {
      toast.error('No meeting link available');
      return;
    }
    toast.success('Opening Google Meet...');
    const formattedLink = meetLink.startsWith('http://') || meetLink.startsWith('https://')
      ? meetLink
      : `https://${meetLink}`;
    window.open(formattedLink, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => {
    if (isOffline) {
      if (!venueAddress) {
        toast.error('No venue available');
        return;
      }
      navigator.clipboard.writeText(venueAddress);
      toast.success('Venue copied');
      return;
    }
    if (!meetLink) {
      toast.error('No meeting link to copy');
      return;
    }
    navigator.clipboard.writeText(meetLink);
    toast.success('Link copied');
  };
  return (
    <DashboardLayout role="candidate" title="Dashboard" userName={fullName}>
      {/* Welcome */}
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
        
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-secondary mb-1">
              Welcome back, {firstName}
            </h1>
            
          </div>
          <div className="text-right">
            <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-1">
              Profile completion
            </div>
            <div className="flex items-center gap-2">
              <div className="w-28 h-1.5 bg-white/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{
                    width: 0
                  }}
                  animate={{
                    width: `${profileCompletion}%`
                  }}
                  className="h-full bg-primary" />
                
              </div>
              <span className="text-xs font-semibold text-primary">
                {profileCompletion}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 items-start">
        {/* Left column — Applications / Interview */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* No Applications - Empty State */}
          {!loading && !hasApplied && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}>
              <GlassCard className="p-5">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <BriefcaseIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-secondary mb-2">
                    No Job Applications Yet
                  </h3>
                  <p className="text-sm text-secondary/70 mb-4 max-w-xs">
                    You haven't applied for any job position. Browse available roles and start your application.
                  </p>
                  <Button size="sm" onClick={() => navigate('/candidate/profile#preferences')}>
                    <BriefcaseIcon className="w-3.5 h-3.5 mr-2" />
                    Browse Jobs
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Application Status - Applied but not scheduled */}
          {!loading && hasApplied && !isScheduled && (() => {
            const config = getStatusConfig(applicationStatus);
            const IconComponent = config.icon;
            return (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}>
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-secondary">
                      Application Status
                    </h3>
                    <Badge variant={config.variant} size="sm">
                      {config.badge}
                    </Badge>
                  </div>

                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <BriefcaseIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="text-sm font-semibold text-secondary mb-1">
                        {dashboardData?.latest_application?.role_title ?? 'Applied Role'}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-0.5">
                            Job Type
                          </div>
                          <div className="text-xs font-medium text-secondary flex items-center gap-1">
                            <VideoIcon className="w-3 h-3" />
                            {dashboardData?.latest_application?.job_type ?? 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-0.5">
                            Applied On
                          </div>
                          <div className="text-xs font-medium text-secondary">
                            {dashboardData?.latest_application?.created_at
                              ? new Date(dashboardData.latest_application.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/60 rounded-xl p-3 mb-3">
                    <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-1.5">
                      Status
                    </div>
                    <div className="flex items-center gap-2">
                      <IconComponent className={`w-4 h-4 ${config.iconClass}`} />
                      <span className="text-xs font-medium text-secondary">
                        {config.text}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })()}

          {/* Interview Scheduled */}
          {!loading && hasApplied && isScheduled && (
            <motion.div
              initial={{
                opacity: 0,
                y: 16
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.1
              }}>

              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-secondary">
                    Interview Schedule
                  </h3>
                  <Badge variant="primary" size="sm">
                    Scheduled
                  </Badge>
                </div>

                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <VideoIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-grow min-w-0">

                    <div className="text-sm font-semibold text-secondary mb-2">
                      {dashboardData?.latest_application?.role_title ?? ''}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-0.5">
                          Date & Time
                        </div>
                        <div className="text-xs font-medium text-secondary">
                          {dashboardData?.interview_schedule?.date
                            ? new Date(dashboardData.interview_schedule.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'N/A'}
                          {dashboardData?.interview_schedule?.start_time
                            ? ` · ${dashboardData.interview_schedule.start_time}`
                            : ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-0.5">
                          Job Type
                        </div>
                        <div className="text-xs font-medium text-secondary flex items-center gap-1">
                          {isOnline ? <VideoIcon className="w-3 h-3" /> : <MapPinIcon className="w-3 h-3" />}
                          {interviewSchedule?.job_type ?? dashboardData?.latest_application?.job_type ?? 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                <div className="bg-white/60 rounded-xl p-3 mb-3">
                  <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-1.5">
                    {isOnline ? 'Google Meet Link' : 'Venue Address'}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[11px] text-primary font-mono truncate">
                      {isOnline
                        ? (meetLink || 'No link available')
                        : (venueAddress || 'No venue available')}
                    </code>
                    <Button size="sm" variant="outline" onClick={handleCopyLink}>
                      Copy
                    </Button>
                  </div>
                </div>

                <Button
                  size="md"
                  onClick={handleJoinInterview}
                  className="w-full">

                  <VideoIcon className="w-3.5 h-3.5" />
                  {isOnline ? 'Join Interview' : 'Copy Venue'}
                </Button>
              </GlassCard>
            </motion.div>
          )}

          {/* Recent Notifications — now stacked under Next Interview */}
          <motion.div
            initial={{
              opacity: 0,
              y: 16
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.18
            }}>
            
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-secondary mb-4">
                Recent Notifications
              </h3>
              <div className="space-y-2.5">
                {notifications.length > 0 ? (
                  notifications.map((notif, index) => (
                    <div key={notif.id} className="p-2.5 bg-white/60 rounded-lg">
                      <div className="text-xs text-secondary mb-0.5 font-semibold">
                        {notif.title}
                      </div>
                      <div className="text-xs text-secondary mb-1">
                        {notif.message}
                      </div>
                      <div className="text-[10px] text-secondary/60">
                        {formatIndiaTime(notif.created_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 bg-white/60 rounded-lg text-center text-sm text-secondary/60">
                    No recent notifications
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Right column — Interview Timeline (sticky on desktop) */}
        <div className="lg:sticky lg:top-20">
          <motion.div
            initial={{
              opacity: 0,
              y: 16
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
                {hasApplied ? 'Application Timeline' : 'Get Started'}
              </h3>
              <div className="space-y-4">
                {(hasApplied ? getTimelineSteps() : [
                {
                  status: 'pending',
                  label: 'Browse Available Jobs',
                  date: 'Step 1',
                  icon: BriefcaseIcon
                },
                {
                  status: 'pending',
                  label: 'Submit Application',
                  date: 'Step 2',
                  icon: MailIcon
                },
                {
                  status: 'pending',
                  label: 'Wait for Review',
                  date: 'Step 3',
                  icon: ClockIcon
                },
                {
                  status: 'pending',
                  label: 'Attend Interview',
                  date: 'Step 4',
                  icon: VideoIcon
                },
                {
                  status: 'pending',
                  label: 'Get Hired',
                  date: 'Step 5',
                  icon: CheckCircleIcon
                }
                ]).map((step, index) =>
                <div key={index} className="flex items-start gap-3">
                    <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${step.status === 'completed' ? 'bg-green-500/10 border-green-500/20' : step.status === 'active' ? 'bg-primary/10 border-primary/20' : 'bg-neutral/10 border-neutral/20'}`}>

                      <step.icon
                      className={`w-3.5 h-3.5 ${step.status === 'completed' ? 'text-green-600' : step.status === 'active' ? 'text-primary' : 'text-neutral'}`} />

                    </div>
                    <div className="flex-grow pt-1">
                      <div className="text-xs font-medium text-secondary">
                        {step.label}
                      </div>
                      <div className="text-[10px] text-secondary/60">
                        {step.date}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>);

}