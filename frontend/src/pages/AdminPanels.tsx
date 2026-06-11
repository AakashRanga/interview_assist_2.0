import React, {
  useEffect,
  useMemo,
  useState,
  useRef
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { API_BASE_URL } from '../config';
import {
  PlusIcon,
  UsersIcon,
  VideoIcon,
  CopyIcon,
  CalendarIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UploadIcon,
  UserPlusIcon,
  DownloadIcon,
  Trash2Icon,
  MapPinIcon,
  SearchIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MailIcon,
  ExternalLinkIcon,
  SlidersHorizontalIcon,
  ClockIcon
} from 'lucide-react';

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

interface ScheduleItem {
  id: string;
  candidate: string;
  avatar: string;
  role: string;
  date: string;
  time: string;
  mode: 'Online' | 'Offline';
  meetLink?: string;
}

export function AdminPanels() {
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  const [panelGroups, setPanelGroups] = useState<any[]>([]);
  const [dbPanels, setDbPanels] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupMeetLink, setNewGroupMeetLink] = useState('');

  const [addMemberOpen, setAddMemberOpen] = useState<number | null>(null); // PanelGroup ID
  const [selectedPanelistId, setSelectedPanelistId] = useState<string>('');

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const scheduleRef = useRef<HTMLDivElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Tab and panels list view states
  const [activeTab, setActiveTab] = useState<'groups' | 'panels'>('groups');
  const [panelSearch, setPanelSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedPanelId, setExpandedPanelId] = useState<number | null>(null);

  // Create panelist states
  const [createPanelistOpen, setCreatePanelistOpen] = useState(false);
  const [newPanelistName, setNewPanelistName] = useState('');
  const [newPanelistEmail, setNewPanelistEmail] = useState('');
  const [newPanelistPassword, setNewPanelistPassword] = useState('');
  const [creatingPanelist, setCreatingPanelist] = useState(false);

  const handleCreatePanelist = async () => {
    if (!newPanelistName.trim() || !newPanelistEmail.trim() || !newPanelistPassword.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setCreatingPanelist(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/add-panel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admin_email': localStorage.getItem('userEmail') || 'admin@example.com',
        },
        body: JSON.stringify({
          full_name: newPanelistName,
          email: newPanelistEmail,
          password: newPanelistPassword
        })
      });
      if (res.ok) {
        toast.success('Panelist created successfully');
        setCreatePanelistOpen(false);
        setNewPanelistName('');
        setNewPanelistEmail('');
        setNewPanelistPassword('');
        fetchDbPanels();
      } else {
        const errData = await res.json();
        toast.error(errData.detail || 'Failed to create panelist');
      }
    } catch (err) {
      toast.error('Error creating panelist');
    } finally {
      setCreatingPanelist(false);
    }
  };

  const getPanelistCandidates = (panelistId: number, panelGroupId: number | null) => {
    return candidates.filter((c) => {
      // Direct assignment check
      let isDirect = false;
      if (c.panelIds && Array.isArray(c.panelIds)) {
        isDirect = c.panelIds.map(Number).includes(Number(panelistId));
      }
      if (!isDirect && c.panelId) {
        if (c.panelId.startsWith('[')) {
          try {
            const parsed = JSON.parse(c.panelId);
            if (Array.isArray(parsed)) {
              isDirect = parsed.map(Number).includes(Number(panelistId));
            }
          } catch (e) {}
        } else {
          isDirect = String(c.panelId) === String(panelistId);
        }
      }
      // Group assignment check
      const isGroup = panelGroupId && String(c.panelGroupId) === String(panelGroupId);
      return isDirect || isGroup;
    });
  };

  const specializations = useMemo(() => {
    const types = dbPanels.map((p) => p.interview_type).filter(Boolean);
    return Array.from(new Set(types)) as string[];
  }, [dbPanels]);

  const filteredPanels = useMemo(() => {
    return dbPanels.filter((p) => {
      // 1. Search filter
      const matchesSearch =
        !panelSearch ||
        p.name.toLowerCase().includes(panelSearch.toLowerCase()) ||
        String(p.id).includes(panelSearch) ||
        (p.interview_type && p.interview_type.toLowerCase().includes(panelSearch.toLowerCase()));

      if (!matchesSearch) return false;

      // 2. Group filter
      if (groupFilter !== 'all') {
        if (groupFilter === 'unassigned') {
          if (p.panel_group_id !== null) return false;
        } else {
          if (String(p.panel_group_id) !== String(groupFilter)) return false;
        }
      }

      // 3. Specialization filter
      if (typeFilter !== 'all' && p.interview_type !== typeFilter) {
        return false;
      }

      // 4. Status filter (busy vs free)
      if (statusFilter !== 'all') {
        const assigned = getPanelistCandidates(p.id, p.panel_group_id);
        const hasInterviews = assigned.length > 0;
        if (statusFilter === 'busy' && !hasInterviews) return false;
        if (statusFilter === 'free' && hasInterviews) return false;
      }

      return true;
    });
  }, [dbPanels, panelSearch, groupFilter, typeFilter, statusFilter, candidates]);

  const [activeSelectPanelist, setActiveSelectPanelist] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.panelist-dropdown-container')) {
        setActiveSelectPanelist(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchPanelGroups = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/panel-groups`);
      if (res.ok) {
        const data = await res.json();
        setPanelGroups(data);
      }
    } catch (err) {
      console.error('Failed to fetch panel groups', err);
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

  const fetchCandidates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/candidates`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchPanelGroups(), fetchDbPanels(), fetchCandidates()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/admin/import-panels`, {
        method: 'POST',
        headers: {
          'admin_email': localStorage.getItem('userEmail') || 'admin@example.com',
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        if (data.failed_count === 0) {
          toast.success(`Successfully imported ${data.imported_count} panel members`);
        } else {
          toast.warning(`Imported ${data.imported_count} records, ${data.failed_count} failed`);
          if (data.errors && data.errors.length > 0) {
            console.log('Import errors:', data.errors);
            const errorMsg = data.errors.slice(0, 3).map((e: any) => `Row ${e.row}: ${e.error}`).join('\n');
            toast.error(`Errors:\n${errorMsg}`);
          }
        }
        loadAllData();
      } else {
        toast.error(data.detail || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import file');
    }
    e.target.value = '';
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/download-panel-template`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'panel_import_template.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Template downloaded');
      } else {
        toast.error('Failed to download template');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a panel group name');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/panel-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
          meet_link: newGroupMeetLink
        })
      });
      if (res.ok) {
        toast.success('Panel group created successfully');
        setCreateGroupOpen(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupMeetLink('');
        fetchPanelGroups();
      } else {
        const errData = await res.json();
        toast.error(errData.detail || 'Failed to create panel group');
      }
    } catch (err) {
      toast.error('Error creating panel group');
    }
  };

  const handleAssignPanelist = async (panelId: number, groupId: number | null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/panels/${panelId}/assign-group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panel_group_id: groupId })
      });
      if (res.ok) {
        toast.success(groupId ? 'Panel member assigned successfully' : 'Panel member removed from group');
        setAddMemberOpen(null);
        setSelectedPanelistId('');
        fetchPanelGroups();
        fetchDbPanels();
      } else {
        toast.error('Failed to assign panel member');
      }
    } catch (err) {
      toast.error('Error assigning panel member');
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm("Are you sure you want to delete this panel group? Assigned panelists will become unassigned.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/panel-groups/${groupId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Panel group deleted successfully');
        if (selectedGroupId === groupId) {
          setSelectedGroupId(null);
          setSelectedDate(null);
        }
        fetchPanelGroups();
        fetchDbPanels();
      } else {
        toast.error('Failed to delete group');
      }
    } catch (err) {
      toast.error('Error deleting group');
    }
  };

  useEffect(() => {
    if (selectedGroupId && scheduleRef.current) {
      scheduleRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [selectedGroupId]);

  const copyLink = (link: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success('Link copied');
  };

  const selectedGroup = useMemo(() => {
    return panelGroups.find((g) => g.id === selectedGroupId) || null;
  }, [panelGroups, selectedGroupId]);

  const groupInterviews = useMemo(() => {
    if (!selectedGroupId) return [];

    // Find panelists belonging to this group
    const groupPanelIds = dbPanels
      .filter(p => p.panel_group_id === selectedGroupId)
      .map(p => String(p.id));

    return candidates
      .filter(c => (String(c.panelGroupId) === String(selectedGroupId) || groupPanelIds.includes(String(c.panelId))) && c.interviewDate)
      .map((c): ScheduleItem => {
        const dbPanel = dbPanels.find(p => String(p.id) === String(c.panelId));
        const panelName = dbPanel ? dbPanel.name : (c.panelId || 'General');

        return {
          id: `c-sched-${c.id}`,
          candidate: c.name,
          avatar: c.avatar,
          role: `${c.role} (${panelName})`,
          date: c.interviewDate,
          time: c.interviewTime || '',
          mode: c.mode as 'Online' | 'Offline',
          meetLink: c.meetLink || ''
        };
      });
  }, [selectedGroupId, candidates, dbPanels]);

  // Calendar grid data
  const calendarData = useMemo(() => {
    if (!selectedGroup) return null;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = currentDate.toLocaleString('default', {
      month: 'long'
    });
    const interviewsByDay = new Map<number, ScheduleItem[]>();

    groupInterviews.forEach((s) => {
      const d = new Date(s.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
      if (!interviewsByDay.has(day)) interviewsByDay.set(day, []);
      interviewsByDay.get(day)!.push(s);
    });

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    return {
      year,
      month,
      monthName,
      days,
      interviewsByDay
    };
  }, [selectedGroup, groupInterviews, currentDate]);

  const selectedDayInterviews =
    selectedGroup && selectedDate && calendarData ?
      calendarData.interviewsByDay.get(selectedDate.getDate()) || [] :
      [];

  const handleDateButtonClick = (group: any) => {
    if (selectedGroupId === group.id) {
      setSelectedGroupId(null);
      setSelectedDate(null);
      return;
    }
    setSelectedGroupId(group.id);
    // Try to find the first interview day
    const nextInt = groupInterviews[0];
    const d = nextInt ? new Date(nextInt.date) : new Date();
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDate(nextInt ? new Date(nextInt.date) : d);
  };

  const getGroupLoad = (groupId: number) => {
    const groupPanelIds = dbPanels
      .filter(p => p.panel_group_id === groupId)
      .map(p => String(p.id));

    return candidates.filter(c =>
      (String(c.panelGroupId) === String(groupId) || groupPanelIds.includes(String(c.panelId))) &&
      c.status !== 'Completed' && c.status !== 'Rejected'
    ).length;
  };

  const formatShortDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getActiveGroupMeetLink = (group: any) => {
    const groupPanelIds = dbPanels
      .filter(p => p.panel_group_id === group.id)
      .map(p => String(p.id));

    const groupCandidates = candidates.filter(c =>
      (String(c.panelGroupId) === String(group.id) || groupPanelIds.includes(String(c.panelId))) &&
      c.interviewDate &&
      c.interviewTime &&
      c.meetLink &&
      c.mode === 'Online'
    );

    // 1. Check for currently active candidate
    const activeCandidate = groupCandidates.find(c => isSlotActive(c.interviewDate, c.interviewTime));
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
    const upcomingCandidates = groupCandidates
      .map(c => {
        const startDateTime = getInterviewStartDateTime(c.interviewDate, c.interviewTime);
        return { candidate: c, startDateTime };
      })
      .filter(item => item.startDateTime && item.startDateTime > now)
      .sort((a, b) => a.startDateTime!.getTime() - b.startDateTime!.getTime());

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

  return (
    <DashboardLayout role="admin" title="Panels" userName="Admin User">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-secondary mb-1">
            Panel Management
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelImport}
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadTemplate}
            title="Download Excel template"
          >
            <DownloadIcon className="w-3.5 h-3.5 mr-1.5" />
            Template
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => excelInputRef.current?.click()}
          >
            <UploadIcon className="w-3.5 h-3.5 mr-1.5" />
            Import Excel
          </Button>
          {activeTab === 'groups' ? (
            <Button
              size="sm"
              onClick={() => setCreateGroupOpen(true)}
            >
              <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
              Add Panel Group
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setCreatePanelistOpen(true)}
            >
              <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
              Add Panelist
            </Button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-white/20 mb-6">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all ${
            activeTab === 'groups'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-secondary/60 hover:text-secondary'
          }`}
        >
          <UsersIcon className="w-3.5 h-3.5" />
          Panel Groups
        </button>
        <button
          onClick={() => setActiveTab('panels')}
          className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all ${
            activeTab === 'panels'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-secondary/60 hover:text-secondary'
          }`}
        >
          <SlidersHorizontalIcon className="w-3.5 h-3.5" />
          Panels List
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-secondary/60 mt-4">Loading panels...</p>
        </div>
      ) : (
        <>
          {activeTab === 'groups' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {panelGroups.map((group, idx) => {
                  const currentLoad = getGroupLoad(group.id);
                  const loadPct = Math.min((currentLoad / 10) * 100, 100);
                  const isSelected = group.id === selectedGroupId;

                  return (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                    >
                      <GlassCard
                        className={`p-4 h-full flex flex-col transition-all ${isSelected ? 'ring-2 ring-primary/60 shadow-glass-lg' : ''
                          }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                              <UsersIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-secondary truncate">
                                {group.name}
                              </div>
                              <div className="text-[10px] text-secondary/60 truncate">
                                {group.description || 'No description'}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="p-1.5 hover:bg-red-500/10 text-secondary/60 hover:text-red-600 rounded-lg transition-colors flex-shrink-0"
                            title="Delete panel group"
                          >
                            <Trash2Icon className="w-4 h-4" />
                          </button>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDateButtonClick(group)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-xl transition-colors mb-3 group ${isSelected
                            ? 'bg-primary text-white border-primary'
                            : 'bg-primary/10 hover:bg-primary/20 border-primary/20'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <CalendarIcon
                              className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-primary'}`}
                            />
                            <div className="text-left">
                              <div
                                className={`text-[9px] uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-secondary/60'
                                  }`}
                              >
                                Interviews Scheduled
                              </div>
                              <div
                                className={`text-[12px] font-semibold ${isSelected ? 'text-white' : 'text-secondary'
                                  }`}
                              >
                                {currentLoad} active
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-medium ${isSelected ? 'text-white' : 'text-primary'
                              }`}
                          >
                            {isSelected ? 'Hide' : 'Schedule ↓'}
                          </span>
                        </motion.button>

                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="text-[9px] text-secondary/60 uppercase tracking-wider">
                              Panelists ({group.members?.length || 0})
                            </div>
                            <button
                              onClick={() => setAddMemberOpen(group.id)}
                              className="text-[9px] text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                            >
                              <UserPlusIcon className="w-2.5 h-2.5" />
                              Add
                            </button>
                          </div>
                          <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {group.members && group.members.map((m: any) => (
                              <li
                                key={m.id}
                                className="flex items-center justify-between gap-2 p-1.5 bg-white/40 border border-white/50 rounded-xl"
                              >
                                <div className="flex flex-col min-w-0 flex-grow">
                                  <span className="text-[11px] font-semibold text-secondary truncate">
                                    {m.name}
                                  </span>
                                  <span className="text-[9px] text-secondary/60 truncate">
                                    ID: {m.id} • {m.interview_type || 'General'}
                                  </span>
                                </div>
                                <select
                                  value={group.id}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'unassign') {
                                      handleAssignPanelist(m.id, null);
                                    } else {
                                      handleAssignPanelist(m.id, Number(val));
                                    }
                                  }}
                                  className="text-[9px] border border-white/60 rounded-lg px-1.5 py-0.5 focus:outline-none font-medium cursor-pointer"
                                  style={{ backgroundColor: '#02f5761a', color: '#02f576' }}
                                >
                                  {panelGroups.map((g) => (
                                    <option key={g.id} value={g.id} style={{ backgroundColor: '#1e293b', color: '#02f576' }}>
                                      {g.name.slice(0, 8)}
                                    </option>
                                  ))}
                                  <option value="unassign" style={{ backgroundColor: '#1e293b', color: '#ff4b4b' }}>
                                    Unassign
                                  </option>
                                </select>
                              </li>
                            ))}
                            {(!group.members || group.members.length === 0) && (
                              <p className="text-[10px] text-secondary/50 text-center py-2">
                                No panelists assigned
                              </p>
                            )}
                          </ul>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-secondary/60 uppercase tracking-wider">
                              Load Bar
                            </span>
                            <span className="font-medium text-secondary">
                              {currentLoad}/10
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${loadPct}%` }}
                              className={`h-full ${currentLoad >= 10 ? 'bg-red-500' : currentLoad > 7 ? 'bg-yellow-500' : 'bg-primary'
                                }`}
                            />
                          </div>
                        </div>

                        {(() => {
                          const activeMeet = getActiveGroupMeetLink(group);
                          return (
                            <div className="bg-white/60 rounded-xl p-2.5 mt-auto border border-white/50">
                              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                                <div className="flex items-center space-x-1.5">
                                  <VideoIcon className="w-2.5 h-2.5 text-primary" />
                                  <span className="text-[9px] text-secondary/60 uppercase tracking-wider">
                                    {activeMeet.status === 'active'
                                      ? 'Active Slot Link'
                                      : activeMeet.status === 'upcoming'
                                        ? 'Upcoming Slot Link'
                                        : 'Meeting Link'}
                                  </span>
                                </div>
                                {activeMeet.status === 'active' && (
                                  <span className="text-[8px] bg-red-500/10 text-red-500 font-bold px-1 py-0.5 rounded animate-pulse truncate max-w-[120px]">
                                    Live: {activeMeet.candidateName}
                                  </span>
                                )}
                                {activeMeet.status === 'upcoming' && (
                                  <span className="text-[8px] bg-primary/10 text-primary font-bold px-1 py-0.5 rounded truncate max-w-[120px]" title={activeMeet.timeInfo}>
                                    Next: {activeMeet.candidateName}
                                  </span>
                                )}
                              </div>
                              {activeMeet.link ? (
                                <div className="flex items-center justify-between gap-1.5 mt-1">
                                  <div className="flex flex-col min-w-0 flex-grow">
                                    <code className="text-[10px] text-primary font-mono truncate" title={activeMeet.link}>
                                      {activeMeet.link.replace('https://', '')}
                                    </code>
                                    {activeMeet.status === 'upcoming' && (
                                      <span className="text-[8px] text-secondary/50 font-medium truncate">
                                        {activeMeet.timeInfo}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => copyLink(activeMeet.link!)}
                                    className="p-1 hover:bg-white/60 rounded-lg transition-colors flex-shrink-0"
                                    title="Copy meet link"
                                  >
                                    <CopyIcon className="w-2.5 h-2.5 text-secondary/60" />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[9px] text-secondary/50 py-1 font-medium italic">
                                  No schedule for current time slot
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </GlassCard>
                    </motion.div>
                  );
                })}
                {panelGroups.length === 0 && (
                  <div className="col-span-4 text-center py-12">
                    <UsersIcon className="w-12 h-12 text-secondary/30 mx-auto mb-2" />
                    <p className="text-sm text-secondary/60">No panel groups created yet. Click "Add Panel Group" to get started.</p>
                  </div>
                )}
              </div>

              {/* Inline calendar schedule */}
              <div ref={scheduleRef}>
                <AnimatePresence mode="wait">
                  {selectedGroupId && calendarData && selectedGroup && (
                    <motion.div
                      key={selectedGroupId}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.25 }}
                      className="mt-6"
                    >
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div>
                          <h2 className="text-xl font-bold text-secondary mb-0.5">
                            {selectedGroup.name} — Interviews
                          </h2>
                          <p className="text-[11px] text-secondary/70">
                            Schedules of candidates assigned to this group
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGroupId(null);
                            setSelectedDate(null);
                          }}
                          className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                          title="Close schedule"
                        >
                          <XIcon className="w-4 h-4 text-secondary" />
                        </button>
                      </div>

                      <div className="grid lg:grid-cols-3 gap-5">
                        {/* Calendar */}
                        <div className="lg:col-span-2">
                          <GlassCard className="p-5">
                            <div className="flex items-center justify-between mb-5">
                              <h3 className="text-lg font-semibold text-secondary">
                                {calendarData.monthName} {calendarData.year}
                              </h3>
                              <div className="flex space-x-1.5">
                                <button
                                  onClick={() =>
                                    setCurrentDate(
                                      new Date(
                                        calendarData.year,
                                        calendarData.month - 1,
                                        1
                                      )
                                    )
                                  }
                                  className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                                >
                                  <ChevronLeftIcon className="w-4 h-4 text-secondary" />
                                </button>
                                <button
                                  onClick={() =>
                                    setCurrentDate(
                                      new Date(
                                        calendarData.year,
                                        calendarData.month + 1,
                                        1
                                      )
                                    )
                                  }
                                  className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                                >
                                  <ChevronRightIcon className="w-4 h-4 text-secondary" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-7 mb-1.5">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                                <div
                                  key={d}
                                  className="text-[10px] font-semibold text-secondary/60 text-center py-1.5 uppercase tracking-wider"
                                >
                                  {d}
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1.5">
                              {calendarData.days.map((day, index) => {
                                if (day === null) {
                                  return <div key={`empty-${index}`} className="aspect-square" />;
                                }

                                const dayInts = calendarData.interviewsByDay.get(day) || [];
                                const isSelected =
                                  selectedDate?.getDate() === day &&
                                  selectedDate?.getMonth() === calendarData.month;
                                const has = dayInts.length > 0;

                                return (
                                  <motion.button
                                    key={day}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() =>
                                      setSelectedDate(
                                        new Date(
                                          calendarData.year,
                                          calendarData.month,
                                          day
                                        )
                                      )
                                    }
                                    className={`aspect-square rounded-xl p-1.5 text-left transition-all relative ${isSelected
                                      ? 'bg-primary text-white shadow-glass'
                                      : has
                                        ? 'bg-primary/10 text-secondary hover:bg-primary/20'
                                        : 'bg-white/40 text-secondary/70 hover:bg-white/60'
                                      }`}
                                  >
                                    <div className="text-xs font-semibold">{day}</div>
                                    {has && (
                                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                                        {dayInts.slice(0, 3).map((_, i) => (
                                          <div
                                            key={i}
                                            className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'
                                              }`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </GlassCard>
                        </div>

                        {/* Day interview list */}
                        <div>
                          <GlassCard className="p-5">
                            <div className="flex items-center space-x-2.5 mb-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <CalendarIcon className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="text-[10px] text-secondary/60 uppercase tracking-wider">
                                  Selected Date
                                </div>
                                <div className="text-xs font-semibold text-secondary">
                                  {selectedDate ? (
                                    selectedDate.toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      month: 'short',
                                      day: 'numeric'
                                    })
                                  ) : (
                                    'Pick a date'
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-3">
                              {selectedDayInterviews.length} Interview
                              {selectedDayInterviews.length !== 1 ? 's' : ''}
                            </div>

                            <AnimatePresence mode="wait">
                              <motion.div
                                key={selectedDate?.toISOString() || 'empty'}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="space-y-2 max-h-[450px] overflow-y-auto pr-1"
                              >
                                {selectedDayInterviews.length === 0 ? (
                                  <div className="text-center py-6">
                                    <CalendarIcon className="w-8 h-8 text-secondary/30 mx-auto mb-1.5" />
                                    <p className="text-[11px] text-secondary/60">
                                      No interviews scheduled
                                    </p>
                                  </div>
                                ) : (
                                  selectedDayInterviews.map((s, i) => (
                                    <motion.div
                                      key={s.id}
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.04 }}
                                      className="bg-white/50 rounded-xl p-2.5 border border-white/60 shadow-sm"
                                    >
                                      <div className="flex items-center space-x-2 mb-1.5">
                                        <img
                                          src={s.avatar}
                                          alt={s.candidate}
                                          className="w-8 h-8 rounded-full flex-shrink-0"
                                        />
                                        <div className="min-w-0 flex-grow">
                                          <div className="text-xs font-semibold text-secondary truncate">
                                            {s.candidate}
                                          </div>
                                          <div className="text-[10px] text-secondary/60 truncate">
                                            {s.role}
                                          </div>
                                        </div>
                                        <Badge
                                          variant={s.mode === 'Online' ? 'info' : 'neutral'}
                                          size="sm"
                                        >
                                          {s.time}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center justify-between gap-1.5">
                                        <div className="text-[10px] text-secondary/60 flex items-center">
                                          {s.mode === 'Online' ? (
                                            <>
                                              <VideoIcon className="w-2.5 h-2.5 mr-1 text-primary" />
                                              Online
                                            </>
                                          ) : (
                                            <>
                                              <MapPinIcon className="w-2.5 h-2.5 mr-1 text-secondary" />
                                              Offline
                                            </>
                                          )}
                                        </div>
                                        {s.mode === 'Online' && s.meetLink && (
                                          <button
                                            onClick={() => {
                                              const link = s.meetLink || '';
                                              const formattedLink = link.startsWith('http://') || link.startsWith('https://')
                                                ? link
                                                : `https://${link}`;
                                              window.open(
                                                formattedLink,
                                                '_blank',
                                                'noopener,noreferrer'
                                              );
                                              toast.success('Opening meeting...');
                                            }}
                                            className="px-2.5 py-1 bg-primary text-white text-[10px] font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                          >
                                            Join
                                          </button>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))
                                )}
                              </motion.div>
                            </AnimatePresence>
                          </GlassCard>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'panels' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Filters Card */}
              <GlassCard className="p-4">
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Search */}
                  <div className="relative flex-grow min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary/40" />
                    <input
                      type="text"
                      placeholder="Search panels by name, ID, or specialization..."
                      value={panelSearch}
                      onChange={(e) => setPanelSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white/70 border border-white/60 rounded-xl text-xs text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  {/* Group filter */}
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="px-3 py-2 bg-white/70 border border-white/60 rounded-xl text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="all">All Groups</option>
                    <option value="unassigned">Unassigned</option>
                    {panelGroups.map((g) => (
                      <option key={g.id} value={String(g.id)}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                  {/* Specialization filter */}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-white/70 border border-white/60 rounded-xl text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="all">All Specializations</option>
                    {specializations.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>

                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white/70 border border-white/60 rounded-xl text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="busy">Busy (Has Candidates)</option>
                    <option value="free">Free (No Candidates)</option>
                  </select>
                </div>
              </GlassCard>

              {/* Panels Table */}
              <GlassCard className="overflow-visible">
                <div className="overflow-x-auto min-h-[300px] pb-6">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/40 border-b border-white/60">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                          Panel Member
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                          Specialization
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                          Assigned Group
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                          Candidates / Slots
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold text-secondary/70 uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPanels.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-20 text-secondary/50">
                            <UsersIcon className="w-10 h-10 text-secondary/30 mx-auto mb-2" />
                            <p className="text-xs">No panels match your filter criteria.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredPanels.map((p) => {
                          const assignedGroup = panelGroups.find((g) => g.id === p.panel_group_id);
                          const assignedCandidates = getPanelistCandidates(p.id, p.panel_group_id);
                          const isExpanded = expandedPanelId === p.id;
                          const hasInterviews = assignedCandidates.length > 0;

                          return (
                            <React.Fragment key={p.id}>
                              <tr className="border-b border-white/40 hover:bg-white/30 transition-colors">
                                {/* Panel Member Info */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2.5">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                                      {p.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-secondary">{p.name}</div>
                                      <div className="text-[10px] text-secondary/50">ID: {p.id}</div>
                                    </div>
                                  </div>
                                </td>

                                {/* Specialization */}
                                <td className="px-4 py-3">
                                  <Badge variant="info" size="sm">
                                    {p.interview_type || 'General'}
                                  </Badge>
                                </td>

                                {/* Assigned Group Dropdown */}
                                <td className="px-4 py-3">
                                  <select
                                    value={p.panel_group_id || 'unassigned'}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === 'unassigned') {
                                        handleAssignPanelist(p.id, null);
                                      } else {
                                        handleAssignPanelist(p.id, Number(val));
                                      }
                                    }}
                                    className="text-[11px] border border-white/60 rounded-xl px-2 py-1 focus:outline-none font-medium cursor-pointer"
                                    style={{ backgroundColor: '#02f5761a', color: '#02f576' }}
                                  >
                                    <option value="unassigned" style={{ backgroundColor: '#1e293b', color: '#ff4b4b' }}>
                                      Unassigned
                                    </option>
                                    {panelGroups.map((g) => (
                                      <option key={g.id} value={g.id} style={{ backgroundColor: '#1e293b', color: '#02f576' }}>
                                        {g.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* Active Candidates Count */}
                                <td className="px-4 py-3">
                                  <span className="text-xs font-semibold text-secondary">
                                    {assignedCandidates.length} Candidates
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-3">
                                  <Badge variant={hasInterviews ? 'warning' : 'success'} size="sm">
                                    {hasInterviews ? 'Busy' : 'Free'}
                                  </Badge>
                                </td>

                                {/* Action toggle */}
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setExpandedPanelId(isExpanded ? null : p.id)}
                                  >
                                    {isExpanded ? 'Hide' : 'Details'}
                                    {isExpanded ? (
                                      <ChevronUpIcon className="w-3.5 h-3.5 ml-1" />
                                    ) : (
                                      <ChevronDownIcon className="w-3.5 h-3.5 ml-1" />
                                    )}
                                  </Button>
                                </td>
                              </tr>

                              {/* Expanded Details Row */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-4 bg-white/20">
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="grid md:grid-cols-3 gap-6">
                                          {/* Left Column: Panelist details */}
                                          <div className="space-y-4">
                                            <h4 className="text-[10px] font-bold text-secondary/50 uppercase tracking-wider">
                                              Panelist Profile
                                            </h4>
                                            <GlassCard className="p-4 space-y-3 bg-white/40">
                                              <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg">
                                                  {p.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                  <div className="text-sm font-bold text-secondary">{p.name}</div>
                                                  <div className="text-xs text-secondary/60">ID: {p.id}</div>
                                                </div>
                                              </div>
                                              
                                              <div className="border-t border-white/30 pt-3 space-y-2">
                                                <div>
                                                  <span className="text-[9px] uppercase tracking-wider text-secondary/40 block">Specialization</span>
                                                  <span className="text-xs font-semibold text-secondary">{p.interview_type || 'General Interviewer'}</span>
                                                </div>
                                                <div>
                                                  <span className="text-[9px] uppercase tracking-wider text-secondary/40 block">Assigned Group</span>
                                                  <span className="text-xs font-semibold text-secondary">
                                                    {assignedGroup ? assignedGroup.name : 'None (Unassigned)'}
                                                  </span>
                                                </div>
                                              </div>
                                            </GlassCard>
                                          </div>

                                          {/* Right Column: Scheduled Candidates / Slots list */}
                                          <div className="md:col-span-2 space-y-3">
                                            <h4 className="text-[10px] font-bold text-secondary/50 uppercase tracking-wider">
                                              Assigned Candidate Interviews & Time Slots ({assignedCandidates.length})
                                            </h4>
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                              {assignedCandidates.length === 0 ? (
                                                <div className="text-center py-10 bg-white/40 rounded-2xl border border-white/50">
                                                  <CalendarIcon className="w-8 h-8 text-secondary/30 mx-auto mb-1.5" />
                                                  <p className="text-xs text-secondary/60">No candidate interviews scheduled.</p>
                                                </div>
                                              ) : (
                                                assignedCandidates.map((c) => (
                                                  <div
                                                    key={c.id}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white/50 border border-white/60 rounded-2xl shadow-sm gap-3 hover:bg-white/75 transition-all"
                                                  >
                                                    <div className="flex items-center space-x-3">
                                                      <img
                                                        src={c.avatar}
                                                        alt={c.name}
                                                        className="w-10 h-10 rounded-full flex-shrink-0"
                                                      />
                                                      <div>
                                                        <div className="text-xs font-bold text-secondary">{c.name}</div>
                                                        <div className="text-[10px] text-secondary/60">{c.role}</div>
                                                        <div className="flex gap-1.5 mt-1 items-center flex-wrap">
                                                          <Badge
                                                            variant={
                                                              c.status === 'Selected'
                                                                ? 'success'
                                                                : c.status === 'Rejected'
                                                                ? 'danger'
                                                                : c.status === 'Completed'
                                                                ? 'info'
                                                                : c.status === 'Scheduled'
                                                                ? 'primary'
                                                                : 'neutral'
                                                            }
                                                            size="sm"
                                                          >
                                                            {c.status}
                                                          </Badge>
                                                          <span className="text-[10px] text-secondary/50 font-medium">
                                                            {c.email}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    <div className="flex flex-col sm:items-end justify-center text-left sm:text-right gap-1">
                                                      {c.interviewDate && c.interviewTime ? (
                                                        <>
                                                          <div className="text-[11px] font-semibold text-secondary flex items-center sm:justify-end">
                                                            <CalendarIcon className="w-3 h-3 mr-1 text-primary" />
                                                            {new Date(c.interviewDate).toLocaleDateString('en-US', {
                                                              month: 'short',
                                                              day: 'numeric',
                                                              year: 'numeric',
                                                            })}
                                                          </div>
                                                          <div className="text-[10px] text-secondary/60 font-semibold flex items-center sm:justify-end">
                                                            <ClockIcon className="w-3 h-3 mr-1 text-primary" />
                                                            {c.interviewTime}
                                                          </div>
                                                        </>
                                                      ) : (
                                                        <div className="text-[10px] text-secondary/40 italic">Not scheduled</div>
                                                      )}

                                                      {c.mode && (
                                                        <div className="text-[10px] text-secondary/60 mt-0.5 flex items-center sm:justify-end">
                                                          {c.mode === 'Online' ? (
                                                            <>
                                                              <VideoIcon className="w-3 h-3 mr-1 text-cyan" />
                                                              Online
                                                            </>
                                                          ) : (
                                                            <>
                                                              <MapPinIcon className="w-3 h-3 mr-1 text-secondary" />
                                                              Offline
                                                            </>
                                                          )}
                                                        </div>
                                                      )}

                                                      {c.mode === 'Online' && c.meetLink && (
                                                        <button
                                                          onClick={() => {
                                                            const link = c.meetLink || '';
                                                            const formattedLink =
                                                              link.startsWith('http://') || link.startsWith('https://')
                                                                ? link
                                                                : `https://${link}`;
                                                            window.open(formattedLink, '_blank', 'noopener,noreferrer');
                                                            toast.success('Opening Google Meet...');
                                                          }}
                                                          className="mt-1 px-3 py-1 bg-primary text-white text-[10px] font-semibold rounded-lg hover:bg-primary/95 transition-all inline-flex items-center"
                                                        >
                                                          Join Meet
                                                          <ExternalLinkIcon className="w-2.5 h-2.5 ml-1" />
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    </td>
                                  </tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </>
      )}

      {/* Add Group Modal */}
      <Modal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        title="Add New Panel Group"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Panel Group Name"
            placeholder="e.g. Panel A"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <Input
            label="Description"
            placeholder="e.g. Frontend Technical Round Group"
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
          />
          <Input
            label="Group Meet Link"
            placeholder="https://meet.google.com/abc-defg-hij"
            value={newGroupMeetLink}
            onChange={(e) => setNewGroupMeetLink(e.target.value)}
          />
          <div className="flex space-x-3 pt-2">
            <Button
              className="flex-grow"
              onClick={handleCreateGroup}
            >
              Create
            </Button>
            <Button
              variant="outline"
              className="flex-grow"
              onClick={() => setCreateGroupOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Panel Member Modal */}
      <Modal
        isOpen={addMemberOpen !== null}
        onClose={() => {
          setAddMemberOpen(null);
          setSelectedPanelistId('');
        }}
        title="Add Panelist to Group"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <div className="text-[10px] text-secondary/60 uppercase tracking-wider mb-1">
              Adding Member to
            </div>
            <div className="text-sm font-semibold text-secondary">
              {panelGroups.find((g) => g.id === addMemberOpen)?.name}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-secondary/70 mb-2 uppercase tracking-wider">
              Select Panelist to Add
            </label>
            <select
              value={selectedPanelistId}
              onChange={(e) => setSelectedPanelistId(e.target.value)}
              className="w-full px-4 py-3 bg-white/70 border border-white/60 rounded-2xl text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select Panelist...</option>
              {dbPanels
                .filter(p => p.panel_group_id !== addMemberOpen)
                .map((p) => {
                  const currentGroup = panelGroups.find(g => g.id === p.panel_group_id);
                  const groupLabel = currentGroup ? ` (Currently in ${currentGroup.name})` : ' (Unassigned)';
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.interview_type || 'General'}{groupLabel}
                    </option>
                  );
                })
              }
            </select>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button
              className="flex-grow"
              disabled={!selectedPanelistId}
              onClick={() => {
                if (selectedPanelistId && addMemberOpen) {
                  handleAssignPanelist(Number(selectedPanelistId), addMemberOpen);
                }
              }}
            >
              Assign to Group
            </Button>
            <Button
              variant="outline"
              className="flex-grow"
              onClick={() => {
                setAddMemberOpen(null);
                setSelectedPanelistId('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Panelist Modal */}
      <Modal
        isOpen={createPanelistOpen}
        onClose={() => setCreatePanelistOpen(false)}
        title="Add New Panel Member"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Sarah Johnson"
            value={newPanelistName}
            onChange={(e) => setNewPanelistName(e.target.value)}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. sarah@example.com"
            value={newPanelistEmail}
            onChange={(e) => setNewPanelistEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={newPanelistPassword}
            onChange={(e) => setNewPanelistPassword(e.target.value)}
          />
          <div className="flex space-x-3 pt-2">
            <Button
              className="flex-grow"
              onClick={handleCreatePanelist}
              disabled={creatingPanelist}
            >
              {creatingPanelist ? 'Creating...' : 'Create Panelist'}
            </Button>
            <Button
              variant="outline"
              className="flex-grow"
              onClick={() => setCreatePanelistOpen(false)}
              disabled={creatingPanelist}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}