import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ClockTimePicker } from '../components/ui/ClockTimePicker';
import { CandidateDetailModal } from '../components/dashboard/CandidateDetailModal';
import { API_BASE_URL } from '../config';
import {
  mockPanels,
  mockPanelGroups,
  Candidate
} from
  '../data/mockData';
import {
  SearchIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MoreVerticalIcon,
  DownloadIcon,
  UploadIcon,
  CalendarIcon
} from
  'lucide-react';

const convertTo24Hour = (timeStr: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const parts = trimmed.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (!match) return '';
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

export function AdminCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  const roles = useMemo(() => {
    const list = new Set(candidates.map((c) => c.role).filter(Boolean));
    return ['all', ...Array.from(list)];
  }, [candidates]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; openUpward: boolean } | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [feedbackViewOpen, setFeedbackViewOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );

  // Modal form states
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [selectedPanelGroupId, setSelectedPanelGroupId] = useState('');
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);

  // Bulk Upload & Manual Allotment states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scheduleManualOpen, setScheduleManualOpen] = useState(false);
  const [schedDate, setSchedDate] = useState('');
  const [schedStartTime, setSchedStartTime] = useState('');
  const [schedEndTime, setSchedEndTime] = useState('');
  const [schedMode, setSchedMode] = useState('Online');
  const [schedVenue, setSchedVenue] = useState('');
  const [schedLevel, setSchedLevel] = useState('Level 1');
  const [schedLevels, setSchedLevels] = useState<string[]>(['Level 1']);
  const [rescheduleLevel, setRescheduleLevel] = useState('Level 1');
  const [rescheduleLevels, setRescheduleLevels] = useState<string[]>([]);
  const [rescheduleMode, setRescheduleMode] = useState('Online');
  const [rescheduleVenue, setRescheduleVenue] = useState('');
  const [completedLevels, setCompletedLevels] = useState<string[]>([]);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [candidateToRejectId, setCandidateToRejectId] = useState<string | null>(null);
  const [busyPanelIds, setBusyPanelIds] = useState<string[]>([]);
  const [dbPanels, setDbPanels] = useState<any[]>([]);
  const [dbPanelGroups, setDbPanelGroups] = useState<any[]>([]);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideConflictingNames, setOverrideConflictingNames] = useState<string[]>([]);
  const onConfirmOverrideRef = useRef<() => void>(() => { });




  const fetchCandidates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/candidates`);
      if (!res.ok) throw new Error('Failed to fetch candidates');
      const data = await res.json();
      setCandidates(data);
    } catch (err: any) {
      toast.error(err.message || 'Error loading candidates');
    } finally {
      setLoading(false);
    }
  };

  const fetchDbPanels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/panels`);
      if (res.ok) {
        const data = await res.json();
        setDbPanels(data);
      }
    } catch (err) {
      console.error('Failed to fetch panels', err);
    }
  };

  const fetchDbPanelGroups = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/panel-groups`);
      if (res.ok) {
        const data = await res.json();
        setDbPanelGroups(data);
      }
    } catch (err) {
      console.error('Failed to fetch panel groups', err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchDbPanels();
    fetchDbPanelGroups();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (openMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.candidate-menu-container')) {
          setOpenMenu(null);
          setMenuCoords(null);
        }
      }
    };
    const handleScroll = () => {
      if (openMenu) {
        setOpenMenu(null);
        setMenuCoords(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [openMenu]);

  const handleAction = (action: string, candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setOpenMenu(null);
    if (action === 'reschedule') {
      setNewDate(candidate.interviewDate ? candidate.interviewDate.split('T')[0] : '');
      let startTime = '';
      let endTime = '';
      if (candidate.interviewTime) {
        const parts = candidate.interviewTime.split(' - ');
        if (parts[0]) startTime = convertTo24Hour(parts[0]);
        if (parts[1]) endTime = convertTo24Hour(parts[1]);
      }
      setNewStartTime(startTime);
      setNewEndTime(endTime);
      setRescheduleMode(candidate.mode || 'Online');
      setRescheduleVenue(candidate.venue || '');
      fetch(`${API_BASE_URL}/admin/candidates/${candidate.id}/next-level-info`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          setRescheduleLevel(candidate.current_level || data.next_level || 'Level 1');
          setRescheduleLevels(data.role_levels || ['Level 1']);
          setCompletedLevels(data.completed_levels || []);
          setRescheduleOpen(true);
        })
        .catch(() => {
          setRescheduleLevel(candidate.current_level || 'Level 1');
          setRescheduleLevels(['Level 1']);
          setCompletedLevels([]);
          setRescheduleOpen(true);
        });
    }
    if (action === 'reassign') {
      const initialGroupId = candidate.panelGroupId || String(dbPanelGroups[0]?.id || '');
      setSelectedPanelGroupId(initialGroupId);

      let initialIds: string[] = [];
      if (candidate.panelId) {
        if (candidate.panelId.startsWith('[')) {
          try {
            initialIds = JSON.parse(candidate.panelId).map(String);
          } catch (e) {
            initialIds = candidate.panelId.split(',').map(s => s.trim());
          }
        } else {
          initialIds = candidate.panelId.split(',').map(s => s.trim());
        }
      }
      setSelectedPanelIds(initialIds);
      setBusyPanelIds([]);

      if (candidate.interviewDate && candidate.interviewTime) {
        const timeParts = candidate.interviewTime.split(' - ');
        const startTimeStr = timeParts[0];
        const endTimeStr = timeParts[1] || timeParts[0];
        const dateStr = candidate.interviewDate.split('T')[0];

        const params = new URLSearchParams({
          date_str: dateStr,
          start_time_str: startTimeStr,
          end_time_str: endTimeStr,
          exclude_candidate_id: String(candidate.id)
        });

        fetch(`${API_BASE_URL}/admin/panels/busy?${params.toString()}`)
          .then(res => res.json())
          .then(data => {
            if (data.busy_panel_ids) {
              setBusyPanelIds(data.busy_panel_ids.map((id: any) => String(id)));
            }
          })
          .catch(err => console.error("Error fetching busy panels", err));
      }
      setReassignOpen(true);
    }
    if (action === 'feedback') {
      setFeedbackViewOpen(true);
    }
    if (action === 'schedule') {
      setSchedDate(candidate.interviewDate ? candidate.interviewDate.split('T')[0] : '');

      let startTime = '';
      let endTime = '';
      if (candidate.interviewTime) {
        const parts = candidate.interviewTime.split(' - ');
        if (parts[0]) startTime = convertTo24Hour(parts[0]);
        if (parts[1]) endTime = convertTo24Hour(parts[1]);
      }
      setSchedStartTime(startTime);
      setSchedEndTime(endTime);
      setSchedMode(candidate.mode || 'Online');
      setSchedVenue(candidate.venue || '');

      // Fetch level info
      fetch(`${API_BASE_URL}/admin/candidates/${candidate.id}/next-level-info`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          setSchedLevel(data.next_level || 'Level 1');
          setSchedLevels(data.role_levels || ['Level 1']);
          setCompletedLevels(data.completed_levels || []);
          setScheduleManualOpen(true);
        })
        .catch(() => {
          setSchedLevel('Level 1');
          setSchedLevels(['Level 1']);
          setCompletedLevels([]);
          setScheduleManualOpen(true);
        });
    }
  };

  const handleConfirmReschedule = async (force: any = false) => {
    const isForce = force === true;
    if (!selectedCandidate) return;
    if (!newDate || !newStartTime || !newEndTime) {
      toast.error('Please select date, start time, and end time');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/candidates/${selectedCandidate.id}/reschedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: newDate,
          start_time: newStartTime,
          end_time: newEndTime,
          interview_level: rescheduleLevel,
          interview_mode: rescheduleMode,
          venue: rescheduleMode === 'Offline' ? rescheduleVenue : undefined,
          force: isForce
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        if (errData.detail && errData.detail.error_type === "panel_busy") {
          setOverrideConflictingNames(errData.detail.conflicts);
          onConfirmOverrideRef.current = () => handleConfirmReschedule(true);
          setOverrideModalOpen(true);
          return;
        }
        throw new Error(errData.detail || 'Failed to reschedule');
      }
      toast.success('Interview rescheduled successfully');
      setRescheduleOpen(false);
      setOverrideModalOpen(false);
      fetchCandidates();
    } catch (err: any) {
      toast.error(err.message || 'Error rescheduling interview');
    }
  };

  const handleConfirmReassign = async (force: any = false) => {
    const isForce = force === true;
    if (!selectedCandidate) return;
    if (selectedPanelIds.length === 0) {
      toast.error('Please select at least one Panelist');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/candidates/${selectedCandidate.id}/reassign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          panel_group_id: selectedPanelGroupId || 'group-1',
          panel_id: JSON.stringify(selectedPanelIds),
          force: isForce
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        if (errData.detail && errData.detail.error_type === "panel_busy") {
          setOverrideConflictingNames(errData.detail.conflicts);
          onConfirmOverrideRef.current = () => handleConfirmReassign(true);
          setOverrideModalOpen(true);
          return;
        }
        throw new Error(errData.detail || 'Failed to assign panel');
      }
      toast.success('Panel assigned successfully');
      setReassignOpen(false);
      setOverrideModalOpen(false);
      fetchCandidates();
    } catch (err: any) {
      toast.error(err.message || 'Error assigning panel');
    }
  };

  const handleConfirmScheduleManual = async (force: any = false) => {
    const isForce = force === true;
    if (!selectedCandidate) return;
    if (!schedDate || !schedStartTime || !schedEndTime) {
      toast.error('Please select date, start time, and end time');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/candidates/${selectedCandidate.id}/schedule-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: schedDate,
          start_time: schedStartTime,
          end_time: schedEndTime,
          interview_mode: schedMode,
          interview_level: schedLevel,
          venue: schedMode === 'Offline' ? schedVenue : undefined,
          force: isForce
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        if (errData.detail && errData.detail.error_type === "panel_busy") {
          setOverrideConflictingNames(errData.detail.conflicts);
          onConfirmOverrideRef.current = () => handleConfirmScheduleManual(true);
          setOverrideModalOpen(true);
          return;
        }
        throw new Error(errData.detail || 'Failed to schedule');
      }
      toast.success('Interview slot scheduled successfully. Now you can assign a panel to activate the schedule.');
      setScheduleManualOpen(false);
      setOverrideModalOpen(false);
      fetchCandidates();
    } catch (err: any) {
      toast.error(err.message || 'Error scheduling interview');
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading('Uploading candidates selection list...');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/candidates/import-selected`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to upload selected candidates');
      }

      const data = await res.json();
      toast.dismiss(toastId);
      if (data.status === 'success') {
        toast.success(data.message || `Successfully uploaded selected candidates.`);
      } else {
        toast.warning(`Partial success: ${data.message}`);
      }
      fetchCandidates();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Error uploading candidate list');
    } finally {
      e.target.value = '';
    }
  };



  const handleApproveReject = async (status: 'Selected' | 'Rejected' | 'Hired', candidateId: string, rejectionReason?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/candidates/${candidateId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          rejection_reason: rejectionReason
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Failed to update status to ${status}`);
      }
      toast.success(`Candidate status updated to ${status} successfully`);
      fetchCandidates();
    } catch (err: any) {
      toast.error(err.message || `Error updating status to ${status}`);
    }
  };

  const handleConfirmRejection = () => {
    if (candidateToRejectId) {
      handleApproveReject('Rejected', candidateToRejectId, rejectionReasonText);
      setRejectionModalOpen(false);
      setCandidateToRejectId(null);
      setRejectionReasonText('');
    }
  };

  const filtered = candidates.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (groupFilter !== 'all' && c.panelGroupId !== groupFilter) return false;
    if (roleFilter !== 'all' && c.role !== roleFilter) return false;
    if (modeFilter !== 'all') {
      const mode = c.mode || 'Online';
      if (mode.toLowerCase() !== modeFilter.toLowerCase()) return false;
    }
    return true;
  });

  const handleDownloadExcel = async () => {
    if (filtered.length === 0) {
      toast.error('No candidates to download');
      return;
    }

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (groupFilter !== 'all') params.append('panelGroupId', groupFilter);
    if (roleFilter !== 'all') params.append('role', roleFilter);
    if (modeFilter !== 'all') params.append('mode', modeFilter);

    const toastId = toast.loading('Preparing Excel download...');

    try {
      const url = `${API_BASE_URL}/admin/candidates/export-excel?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to generate Excel download');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const filename = `candidates_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.dismiss(toastId);
      toast.success('Excel downloaded successfully');
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Failed to download Excel file');
    }
  };

  const statuses = [
    'all',
    'New',
    'Applied',
    'Selected',
    'Scheduled',
    'Completed',
    'Rejected',
    'Hired'
  ];

  const counts = {
    total: candidates.length,
    applied: candidates.filter((c) => c.status === 'Applied').length,
    selected: candidates.filter((c) => c.status === 'Selected').length,
    scheduled: candidates.filter((c) => c.status === 'Scheduled').length,
    completed: candidates.filter((c) => c.status === 'Completed').length,
    rejected: candidates.filter((c) => c.status === 'Rejected').length,
    hired: candidates.filter((c) => c.status === 'Hired').length
  };

  return (
    <DashboardLayout role="admin" title="Candidates" userName="Admin User">
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="mb-6">

        <h1 className="text-2xl font-bold text-secondary mb-1">
          Candidate Management
        </h1>
        {/* <p className="text-xs text-secondary/70">
          Manage all candidates across the recruitment pipeline
        </p> */}
      </motion.div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {[
          {
            label: 'Total',
            value: counts.total,
            icon: UsersIcon,
            color: 'primary'
          },
          {
            label: 'Selected',
            value: counts.selected,
            icon: CheckCircleIcon,
            color: 'green'
          },
          {
            label: 'Scheduled',
            value: counts.scheduled,
            icon: ClockIcon,
            color: 'cyan'
          },
          {
            label: 'Completed',
            value: counts.completed,
            icon: CheckCircleIcon,
            color: 'indigo'
          },
          {
            label: 'Rejected',
            value: counts.rejected,
            icon: XCircleIcon,
            color: 'red'
          },
          {
            label: 'Hired',
            value: counts.hired,
            icon: CheckCircleIcon,
            color: 'green'
          }].
          map((s, i) => {
            const Icon = s.icon;
            const colorMap: Record<string, string> = {
              primary: 'bg-primary/10 text-primary border-primary/20',
              green: 'bg-green-500/10 text-green-600 border-green-500/20',
              cyan: 'bg-cyan/10 text-cyan border-cyan/20',
              indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
              red: 'bg-red-500/10 text-red-600 border-red-500/20'
            };
            return (
              <motion.div
                key={s.label}
                initial={{
                  opacity: 0,
                  y: 10
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  delay: i * 0.05
                }}>

                <GlassCard className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colorMap[s.color]}`}>

                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-secondary">
                    {s.value}
                  </div>
                  <div className="text-[10px] text-secondary/60 uppercase tracking-wider">
                    {s.label}
                  </div>
                </GlassCard>
              </motion.div>);

          })}
      </div>

      {/* Filters */}
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
        }}
        className="mb-4">

        <GlassCard className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-grow min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary/40" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/70 border border-white/60 rounded-xl text-xs text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />

            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white/70 border border-white/60 rounded-xl text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50">

              {statuses.map((s) =>
                <option key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s}
                </option>
              )}
            </select>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2 bg-white/70 border border-white/60 rounded-xl text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50">

              <option value="all">All Panels</option>
              {dbPanelGroups.map((g) =>
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              )}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white/70 border border-white/60 rounded-xl text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="all">All Roles</option>
              {roles.filter(r => r !== 'all').map((r) =>
                <option key={r} value={r}>
                  {r}
                </option>
              )}
            </select>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="px-3 py-2 bg-white/70 border border-white/60 rounded-xl text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="all">All Modes</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
            <Button
              variant="outline"
              onClick={handleDownloadExcel}
              className="ml-auto flex items-center gap-1.5 bg-white/70 border border-white/60 text-xs text-secondary hover:bg-white/95 rounded-xl px-4 py-2"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              Download Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-white/70 border border-white/60 text-xs text-secondary hover:bg-white/95 rounded-xl px-4 py-2"
            >
              <UploadIcon className="w-3.5 h-3.5" />
              Upload Selected List
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBulkUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
          </div>
        </GlassCard>
      </motion.div>

      {/* Table */}
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

        <GlassCard className="overflow-visible">
          <div className="overflow-x-auto min-h-[280px] pb-12">
            <table className="w-full">
              <thead className="bg-white/40 border-b border-white/60">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                    Panel / Category
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                    Interview
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-secondary/60 mt-2">Loading candidates...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <UsersIcon className="w-10 h-10 text-secondary/30 mx-auto mb-2" />
                      <p className="text-xs text-secondary/60">No candidates match your filters</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, i) => {
                    const group = dbPanelGroups.find(
                      (g) => String(g.id) === String(c.panelGroupId)
                    );
                    return (
                      <motion.tr
                        key={c.id}
                        initial={{
                          opacity: 0
                        }}
                        animate={{
                          opacity: 1
                        }}
                        transition={{
                          delay: i * 0.02
                        }}
                        className="border-b border-white/40 hover:bg-white/30 transition-colors">

                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2.5">
                            <img
                              src={c.avatar}
                              alt={c.name}
                              className="w-8 h-8 rounded-full" />

                            <div>
                              <div className="text-xs font-medium text-secondary">
                                {c.name}
                              </div>
                              <div className="text-[10px] text-secondary/60">
                                {c.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-secondary">
                          {c.role}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-secondary">
                            {group?.name || '—'}
                          </div>
                          <div className="text-[10px] text-secondary/60">
                            {(() => {
                              if (!c.panelId) return '—';
                              let parsedIds: string[] = [];
                              if (c.panelId.startsWith('[')) {
                                try {
                                  parsedIds = JSON.parse(c.panelId).map(String);
                                } catch (e) {
                                  parsedIds = c.panelId.split(',').map(s => s.trim());
                                }
                              } else {
                                parsedIds = c.panelId.split(',').map(s => s.trim());
                              }

                              const names = parsedIds.map(pid => {
                                const dbPanel = dbPanels.find(p => String(p.id) === String(pid));
                                if (dbPanel) return `${dbPanel.name} (ID: ${dbPanel.id})`;
                                return pid;
                              });

                              if (names.length > 0) {
                                return names.join(', ');
                              }
                              return c.panelId;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {c.interviewDate ? (
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <span className="text-xs text-secondary font-medium">
                                  {new Date(c.interviewDate).toLocaleDateString()}
                                </span>
                                <span className="ml-1.5 text-[10px]">
                                  <Badge
                                    variant={c.mode === 'Offline' ? 'warning' : 'success'}
                                    size="sm"
                                  >
                                    {c.mode || 'Online'}
                                  </Badge>
                                </span>
                              </div>
                              <div className="text-[10px] text-secondary/60">
                                {c.interviewTime || '—'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-secondary/50">Not scheduled</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              c.status === 'Selected' || c.status === 'Hired' ?
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
                        </td>
                        <td className="px-4 py-3 text-right relative candidate-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openMenu === c.id) {
                                setOpenMenu(null);
                                setMenuCoords(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const estimatedHeight = 220;
                                const openUpward = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
                                setMenuCoords({
                                  top: openUpward ? rect.top : rect.bottom,
                                  left: Math.min(window.innerWidth - 186, Math.max(10, rect.right - 176)),
                                  openUpward
                                });
                                setSelectedCandidate(c);
                                setOpenMenu(c.id);
                              }
                            }}
                            className="p-1.5 hover:bg-white/60 rounded-lg transition-colors">

                            <MoreVerticalIcon className="w-4 h-4 text-secondary" />
                          </button>
                        </td>
                      </motion.tr>);

                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        title="Reject Candidate"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-medium text-secondary/70 mb-2 uppercase tracking-wider">
              Reason for Rejection
            </label>
            <textarea
              rows={4}
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              placeholder="Please provide the reason why this candidate is being rejected..."
              className="w-full px-4 py-3 bg-black/70 backdrop-blur-xl border border-white/60 rounded-2xl text-sm text-secondary placeholder:text-neutral/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-medium"
            />
          </div>
          <div className="flex space-x-3">
            <Button
              className="flex-grow bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmRejection}
            >
              Confirm Reject
            </Button>
            <Button
              variant="outline"
              className="flex-grow"
              onClick={() => setRejectionModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule modal */}
      <Modal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title={`Reschedule Interview Slot - ${selectedCandidate?.name ?? ''}`}
        size="md">

        <div className="space-y-4">
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">Detected Interview Level</p>
            <p className="text-xs text-secondary font-medium">Next: {rescheduleLevel}</p>
            {completedLevels.length > 0 && (
              <p className="text-[9px] text-secondary/50 mt-1">Completed rounds: {completedLevels.join(', ')}</p>
            )}
          </div>

          {rescheduleLevels.length > 0 && (
            <div>
              <label className="block text-[10px] font-medium text-secondary/70 mb-2 uppercase tracking-wider">
                Select Interview Level
              </label>
              <select
                value={rescheduleLevel}
                onChange={(e) => setRescheduleLevel(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-white/60 rounded-2xl text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {rescheduleLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            type="date"
            label="Date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <ClockTimePicker
              label="Start Time"
              value={newStartTime}
              onChange={(val) => setNewStartTime(val)}
            />
            <ClockTimePicker
              label="End Time"
              value={newEndTime}
              onChange={(val) => setNewEndTime(val)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-secondary/70 mb-2 uppercase tracking-wider">
              Interview Mode
            </label>
            <div className="flex space-x-3">
              {['Online', 'Offline'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRescheduleMode(m)}
                  className={`flex-grow py-2 text-xs font-semibold rounded-xl border transition-all ${rescheduleMode === m
                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                    : 'bg-secondary border-white/60 text-white hover:bg-secondary-50'
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {rescheduleMode === 'Offline' && (
            <Input
              type="text"
              label="Venue"
              placeholder="Enter interview venue/room details..."
              value={rescheduleVenue}
              onChange={(e) => setRescheduleVenue(e.target.value)}
            />
          )}

          <div className="flex space-x-3 mt-6">
            <Button
              className="flex-grow"
              onClick={handleConfirmReschedule}>
              Confirm
            </Button>
            <Button
              variant="outline"
              className="flex-grow"
              onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Panel modal */}
      <Modal
        isOpen={reassignOpen}
        onClose={() => setReassignOpen(false)}
        title={`Assign Panel to ${selectedCandidate?.name ?? ''}`}
        size="md">

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-medium text-secondary/70 mb-2 uppercase tracking-wider">
              Select Panel Group
            </label>
            <select
              value={selectedPanelGroupId}
              onChange={(e) => {
                setSelectedPanelGroupId(e.target.value);
                setSelectedPanelIds([]);
              }}
              className="w-full px-4 py-3 bg-white/70 border border-white/60 rounded-2xl text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select Group...</option>
              {dbPanelGroups.map((g) =>
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-secondary/70 mb-2 uppercase tracking-wider">
              Select Panelist Category (Name, ID & Availability)
            </label>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-white/40 rounded-2xl p-2 bg-white/30">
              {dbPanels
                .filter((p) => {
                  if (!selectedPanelGroupId) return true;
                  return String(p.panel_group_id) === String(selectedPanelGroupId);
                })
                .map((p) => {
                  const isBusy = busyPanelIds.includes(String(p.id));
                  const isSelected = selectedPanelIds.includes(String(p.id));
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        const pid = String(p.id);
                        setSelectedPanelIds(prev =>
                          prev.includes(pid)
                            ? prev.filter(id => id !== pid)
                            : [...prev, pid]
                        );
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${isSelected
                        ? 'bg-primary/20 border-primary/60 shadow-glass'
                        : 'bg-white/50 border-white/60 hover:bg-white/80'
                        }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-secondary">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-secondary/60">
                          ID: {p.id} • {p.hr_panelist_grade || 'General'}
                        </span>
                      </div>
                      <Badge
                        variant={isBusy ? 'danger' : 'success'}
                        size="sm"
                      >
                        {isBusy ? 'Busy' : 'Available'}
                      </Badge>
                    </div>
                  );
                })}
              {dbPanels.length === 0 && (
                <p className="text-xs text-secondary/50 text-center py-4">No panels found. Please import panels first.</p>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              className="flex-grow"
              onClick={handleConfirmReassign}>

              Assign Panel
            </Button>
            <Button
              variant="outline"
              className="flex-grow"
              onClick={() => setReassignOpen(false)}>

              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manual Schedule modal */}
      <Modal
        isOpen={scheduleManualOpen}
        onClose={() => setScheduleManualOpen(false)}
        title={`Schedule Interview Slot - ${selectedCandidate?.name ?? ''}`}
        size="md">

        <div className="space-y-4">
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">Detected Interview Level</p>
            <p className="text-xs text-secondary font-medium">Next: {schedLevel}</p>
            {completedLevels.length > 0 && (
              <p className="text-[9px] text-secondary/50 mt-1">Completed rounds: {completedLevels.join(', ')}</p>
            )}
          </div>

          {schedLevels.length > 0 && (
            <div>
              <label className="block text-[10px] font-medium text-secondary/70 mb-2 uppercase tracking-wider">
                Select Interview Level
              </label>
              <select
                value={schedLevel}
                onChange={(e) => setSchedLevel(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-white/60 rounded-2xl text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {schedLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            type="date"
            label="Date"
            value={schedDate}
            onChange={(e) => setSchedDate(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <ClockTimePicker
              label="Start Time"
              value={schedStartTime}
              onChange={(val) => setSchedStartTime(val)}
            />
            <ClockTimePicker
              label="End Time"
              value={schedEndTime}
              onChange={(val) => setSchedEndTime(val)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-secondary/70 mb-2 uppercase tracking-wider">
              Interview Mode
            </label>
            <div className="flex space-x-3">
              {['Online', 'Offline'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSchedMode(m)}
                  className={`flex-grow py-2 text-xs font-semibold rounded-xl border transition-all ${schedMode === m
                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                    : 'bg-secondary border-white/60 text-white hover:bg-secondary-50'
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {schedMode === 'Offline' && (
            <Input
              type="text"
              label="Venue"
              placeholder="Enter interview venue/room details..."
              value={schedVenue}
              onChange={(e) => setSchedVenue(e.target.value)}
            />
          )}

          <div className="flex space-x-3 mt-6">
            <Button
              className="flex-grow"
              onClick={handleConfirmScheduleManual}>
              Save Slot
            </Button>
            <Button
              variant="outline"
              className="flex-grow"
              onClick={() => setScheduleManualOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Override Confirm Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Confirm Panelist Overlap Override"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-500 mb-2">
            <span className="text-xl font-bold">!</span>
          </div>
          <p className="text-xs text-secondary font-medium leading-relaxed">
            The following panelist(s) are already assigned to another candidate at this date and time:
          </p>
          <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-white/20 p-3 rounded-xl max-h-40 overflow-y-auto">
            <ul className="text-[10px] text-left text-gray-800 dark:text-white space-y-1 list-disc pl-4 font-semibold">
              {overrideConflictingNames.map((name, idx) => (
                <li key={idx}>{name}</li>
              ))}
            </ul>
          </div>
          <p className="text-[10px] text-secondary/60">
            Do you want to override this conflict and proceed anyway?
          </p>
          <div className="flex space-x-3 pt-2">
            <Button
              className="flex-grow bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => onConfirmOverrideRef.current()}
            >
              Yes, Override
            </Button>
            <Button
              variant="outline"
              className="flex-grow"
              onClick={() => setOverrideModalOpen(false)}
            >
              No, Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Feedback view modal (admin) */}
      <CandidateDetailModal
        candidate={feedbackViewOpen ? selectedCandidate : null}
        onClose={() => setFeedbackViewOpen(false)}
        viewerRole="admin"
        onStatusUpdate={fetchCandidates} />

      {openMenu && menuCoords && selectedCandidate && createPortal(
        <div
          style={{
            position: 'fixed',
            top: menuCoords.openUpward ? `${menuCoords.top - 4}px` : `${menuCoords.top + 4}px`,
            left: `${menuCoords.left}px`,
            transform: menuCoords.openUpward ? 'translateY(-100%)' : 'none',
            zIndex: 9999,
            maxHeight: 'calc(100vh - 20px)',
            overflowY: 'auto'
          }}
          className="candidate-menu-container w-44 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        >
          {['New', 'Applied'].includes(selectedCandidate.status) && (
            <>
              <button
                onClick={() => {
                  setOpenMenu(null);
                  handleApproveReject('Selected', selectedCandidate.id);
                }}
                className="w-full text-left px-3 py-2 text-xs text-green-600 hover:bg-green-50/50 transition-colors font-medium border-b border-slate-100">
                Approve
              </button>
              <button
                onClick={() => {
                  setOpenMenu(null);
                  setCandidateToRejectId(selectedCandidate.id);
                  setRejectionReasonText('');
                  setRejectionModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50/50 transition-colors font-medium border-b border-slate-100">
                Reject
              </button>
            </>
          )}
          {['Selected', 'Scheduled', 'Completed'].includes(selectedCandidate.status) && (
            <>
              {!selectedCandidate.interviewDate ? (
                <button
                  onClick={() => handleAction('schedule', selectedCandidate)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-slate-100 font-semibold text-primary">
                  Schedule Date & Time
                </button>
              ) : (
                <button
                  onClick={() => handleAction('reschedule', selectedCandidate)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-slate-100">
                  Reschedule
                </button>
              )}
              {selectedCandidate.interviewDate && (
                <button
                  onClick={() => handleAction('reassign', selectedCandidate)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-slate-100">
                  {selectedCandidate.panelId ? 'Reassign Panel' : 'Assign Panel'}
                </button>
              )}
            </>
          )}
          <button
            onClick={() => handleAction('feedback', selectedCandidate)}
            className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors font-medium">
            View Feedback
          </button>
        </div>,
        document.body
      )}

    </DashboardLayout>
  );
}