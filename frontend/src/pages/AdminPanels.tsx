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
  Trash2Icon
} from 'lucide-react';

interface ScheduleItem {
  id: string;
  candidate: string;
  avatar: string;
  role: string;
  date: string;
  time: string;
  mode: 'Online' | 'Offline';
}

export function AdminPanels() {
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
          mode: c.mode as 'Online' | 'Offline'
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
          <Button
            size="sm"
            onClick={() => setCreateGroupOpen(true)}
          >
            <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
            Add Panel Group
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-secondary/60 mt-4">Loading panels...</p>
        </div>
      ) : (
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
                  className={`p-4 h-full flex flex-col transition-all ${
                    isSelected ? 'ring-2 ring-primary/60 shadow-glass-lg' : ''
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
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-xl transition-colors mb-3 group ${
                      isSelected
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
                          className={`text-[9px] uppercase tracking-wider ${
                            isSelected ? 'text-white/80' : 'text-secondary/60'
                          }`}
                        >
                          Interviews Scheduled
                        </div>
                        <div
                          className={`text-[12px] font-semibold ${
                            isSelected ? 'text-white' : 'text-secondary'
                          }`}
                        >
                          {currentLoad} active
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        isSelected ? 'text-white' : 'text-primary'
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
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <select
                              value={String(group.id)}
                              onChange={(e) => {
                                const targetGroupId = e.target.value ? Number(e.target.value) : null;
                                handleAssignPanelist(m.id, targetGroupId);
                              }}
                              className="text-[9px] bg-white border border-white/60 rounded-lg px-1 py-0.5 text-secondary focus:outline-none font-medium cursor-pointer"
                            >
                              {panelGroups.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name.slice(0, 8)}
                                </option>
                              ))}
                              <option value="">Unassign</option>
                            </select>
                          </div>
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
                        className={`h-full ${
                          currentLoad >= 10 ? 'bg-red-500' : currentLoad > 7 ? 'bg-yellow-500' : 'bg-primary'
                        }`}
                      />
                    </div>
                  </div>

                  {group.meet_link && (
                    <div className="bg-white/60 rounded-xl p-2.5 mt-auto border border-white/50">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <VideoIcon className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[9px] text-secondary/60 uppercase tracking-wider">
                          Group Meet Link
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <code className="text-[10px] text-primary font-mono truncate flex-grow">
                          {group.meet_link.replace('https://', '')}
                        </code>
                        <button
                          onClick={() => copyLink(group.meet_link)}
                          className="p-1 hover:bg-white/60 rounded-lg transition-colors flex-shrink-0"
                          title="Copy meet link"
                        >
                          <CopyIcon className="w-2.5 h-2.5 text-secondary/60" />
                        </button>
                      </div>
                    </div>
                  )}
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
      )}

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
                            className={`aspect-square rounded-xl p-1.5 text-left transition-all relative ${
                              isSelected
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
                                    className={`w-1 h-1 rounded-full ${
                                      isSelected ? 'bg-white' : 'bg-primary'
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
                                {s.mode === 'Online' && selectedGroup?.meet_link && (
                                  <button
                                    onClick={() => {
                                      window.open(
                                        selectedGroup.meet_link,
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
    </DashboardLayout>
  );
}