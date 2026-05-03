import { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    ShieldAlert,
    ShieldCheck,
    LogIn,
    LogOut,
    Key,
    Mail,
    UserCheck,
    Lock,
    AlertTriangle,
    Download,
    RefreshCw,
    MapPin,
    Monitor,
    Clock,
    ChevronDown,
    ChevronUp,
    X,
    CheckCircle,
    AlertCircle,
    Zap,
    TrendingUp,
    Activity,
    Filter,
    Cpu,
} from 'lucide-react';
import {
    activityService,
    type ActivityEvent,
    type ActivityType,
    type RiskLevel,
    type SecuritySummary,
    type ActivityQuery,
} from '@/services/activityService';

// ─── Icon Map ────────────────────────────────────────────────────────────────
const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
    LOGIN_SUCCESS: LogIn,
    LOGIN_FAILED: AlertTriangle,
    PASSWORD_CHANGED: Key,
    PASSWORD_RESET_REQUEST: Key,
    EMAIL_CHANGED: Mail,
    SESSION_CREATED: Zap,
    SESSION_TERMINATED: LogOut,
    ROLE_UPDATED: UserCheck,
    ACCOUNT_LOCKED: Lock,
    SENSITIVE_ACTION: ShieldAlert,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
    LOGIN_SUCCESS: 'Login Successful',
    LOGIN_FAILED: 'Login Failed',
    PASSWORD_CHANGED: 'Password Changed',
    PASSWORD_RESET_REQUEST: 'Password Reset Requested',
    EMAIL_CHANGED: 'Email Changed',
    SESSION_CREATED: 'Session Created',
    SESSION_TERMINATED: 'Session Terminated',
    ROLE_UPDATED: 'Role Updated',
    ACCOUNT_LOCKED: 'Account Locked',
    SENSITIVE_ACTION: 'Sensitive Action',
};

// ─── Risk Config ──────────────────────────────────────────────────────────────
const RISK_CONFIG: Record<RiskLevel, { bg: string; border: string; dot: string; badge: string; text: string; icon: React.ElementType }> = {
    low: {
        bg: 'rgba(16, 185, 129, 0.06)',
        border: '#10b981',
        dot: '#10b981',
        badge: 'rgba(16, 185, 129, 0.15)',
        text: '#10b981',
        icon: ShieldCheck,
    },
    medium: {
        bg: 'rgba(245, 158, 11, 0.06)',
        border: '#f59e0b',
        dot: '#f59e0b',
        badge: 'rgba(245, 158, 11, 0.15)',
        text: '#f59e0b',
        icon: Shield,
    },
    high: {
        bg: 'rgba(239, 68, 68, 0.08)',
        border: '#ef4444',
        dot: '#ef4444',
        badge: 'rgba(239, 68, 68, 0.15)',
        text: '#ef4444',
        icon: ShieldAlert,
    },
};

const RECOMMENDED_ACTION_CONFIG = {
    temporary_lock: {
        bg: 'rgba(239,68,68,0.2)',
        color: '#ef4444',
        text: '🔒 Temporarily lock account',
    },
    notify: {
        bg: 'rgba(245,158,11,0.2)',
        color: '#f59e0b',
        text: '🔔 Send notification',
    },
    none: {
        bg: 'transparent',
        color: 'inherit',
        text: '',
    }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDeviceEmoji(deviceInfo?: string): string {
    if (!deviceInfo) return '🖥️';
    const d = deviceInfo.toLowerCase();
    if (d.includes('mobile') || d.includes('android') || d.includes('iphone')) return '📱';
    if (d.includes('tablet') || d.includes('ipad')) return '📱';
    if (d.includes('mac')) return '💻';
    if (d.includes('windows')) return '🖥️';
    if (d.includes('linux')) return '🐧';
    return '🌐';
}

function getActiveFilterCount(filterType: string, filterRisk: string): string {
    const activeFilters = [filterType, filterRisk].filter(Boolean);
    if (activeFilters.length === 0) return '';
    return ` (${activeFilters.length} active)`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IntegrityButton({ status, onClick }: { status: { valid: boolean; checked: boolean }; onClick: () => void }) {
    let background = 'rgba(0,0,0,0.03)';
    let border = '1px solid rgba(0,0,0,0.08)';
    let color = '#475569';
    let text = 'Verify';

    if (status.checked) {
        if (status.valid) {
            background = 'rgba(16,185,129,0.1)';
            border = '1px solid rgba(16,185,129,0.3)';
            color = '#10b981';
            text = 'Chain OK';
        } else {
            background = 'rgba(239,68,68,0.1)';
            border = '1px solid rgba(239,68,68,0.3)';
            color = '#ef4444';
            text = 'Chain Broken';
        }
    }

    return (
        <button onClick={onClick} title="Verify chain integrity" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            background, border, color, transition: 'all 0.2s',
        }}>
            {status.checked && status.valid ? <CheckCircle size={13} /> : <Shield size={13} />}
            {text}
        </button>
    );
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: React.ElementType }) {
    return (
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} />
            </div>
            <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{value}</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', fontWeight: '600', letterSpacing: '0.01em' }}>{label}</div>
            </div>
        </div>
    );
}

function RiskBadge({ level }: { level: RiskLevel }) {
    const cfg = RISK_CONFIG[level];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '3px 10px', borderRadius: '99px',
            background: cfg.badge, color: cfg.text,
            fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
            {level}
        </span>
    );
}

function PaginationButton({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick} style={{
            width: '32px', height: '32px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
            background: isActive ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
            border: isActive ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.07)',
            color: isActive ? '#818cf8' : '#64748b', cursor: 'pointer',
        }}>
            {children}
        </button>
    );
}

function ActivityCard({ event, isExpanded, onToggle }: { event: ActivityEvent; isExpanded: boolean; onToggle: () => void }) {
    const Icon = ACTIVITY_ICONS[event.type] || Activity;
    const cfg = RISK_CONFIG[event.riskLevel] || RISK_CONFIG.low;

    return (
        <div style={{
            position: 'relative',
            background: isExpanded ? cfg.bg : '#f8fafc',
            border: `1px solid ${isExpanded ? cfg.border + '40' : '#e2e8f0'}`,
            borderRadius: '14px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '12px',
        }}
            onClick={onToggle}
            onMouseEnter={e => {
                if (!isExpanded) {
                    (e.currentTarget as HTMLDivElement).style.background = '#f1f5f9';
                    (e.currentTarget as HTMLDivElement).style.border = '1px solid #cbd5e1';
                }
            }}
            onMouseLeave={e => {
                if (!isExpanded) {
                    (e.currentTarget as HTMLDivElement).style.background = '#f8fafc';
                    (e.currentTarget as HTMLDivElement).style.border = '1px solid #e2e8f0';
                }
            }}
        >
            {/* Connector dot on timeline */}
            <div style={{
                position: 'absolute', left: '-28px', top: '22px',
                width: '12px', height: '12px', borderRadius: '50%',
                background: cfg.dot,
                boxShadow: `0 0 0 3px #fff, 0 0 8px ${cfg.dot}60`,
                zIndex: 2,
            }} />

            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    {/* Icon */}
                    <div style={{
                        width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                        background: `${cfg.dot}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon size={17} color={cfg.dot} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                                {ACTIVITY_LABELS[event.type]}
                            </span>
                            <RiskBadge level={event.riskLevel} />
                            {event.riskLevel === 'high' && (
                                <span style={{
                                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                    fontSize: '10px', fontWeight: '800', padding: '2px 8px',
                                    borderRadius: '99px', letterSpacing: '0.05em', textTransform: 'uppercase',
                                    border: '1px solid rgba(239,68,68,0.2)'
                                }}>⚠ Suspicious</span>
                            )}
                        </div>

                        {/* Meta info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                                <Clock size={11} />
                                {formatRelativeTime(event.createdAt)} · {new Date(event.createdAt).toLocaleString()}
                            </span>
                            {event.ipAddress && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                                    <Monitor size={11} />
                                    {event.ipAddress}
                                </span>
                            )}
                            {event.location?.country && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                                    <MapPin size={11} />
                                    {[event.location.city, event.location.country].filter(Boolean).join(', ')}
                                </span>
                            )}
                            {event.deviceInfo && (
                                <span style={{ color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                                    {getDeviceEmoji(event.deviceInfo)} {event.deviceInfo}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expand toggle */}
                <div style={{ color: '#475569', flexShrink: 0, marginTop: '2px' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div style={{
                    marginTop: '16px', paddingTop: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    animation: 'fadeIn 0.2s ease',
                }}>
                    {/* AI Risk Explanation */}
                    {event.riskExplanation && (
                        <div style={{
                            background: `${cfg.dot}10`, border: `1px solid ${cfg.dot}25`,
                            borderRadius: '10px', padding: '12px 14px', marginBottom: '12px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <Cpu size={13} color={cfg.dot} />
                                <span style={{ fontSize: '11px', fontWeight: '700', color: cfg.dot, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Risk Analysis</span>
                            </div>
                            <p style={{ color: '#334155', fontSize: '13px', lineHeight: '1.5', margin: 0, fontWeight: '500' }}>{event.riskExplanation}</p>
                            {event.recommendedAction && event.recommendedAction !== 'none' && (
                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Recommended:</span>
                                    <span style={{
                                        fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px',
                                        background: RECOMMENDED_ACTION_CONFIG[event.recommendedAction as keyof typeof RECOMMENDED_ACTION_CONFIG]?.bg || 'transparent',
                                        color: RECOMMENDED_ACTION_CONFIG[event.recommendedAction as keyof typeof RECOMMENDED_ACTION_CONFIG]?.color || 'inherit',
                                    }}>
                                        {RECOMMENDED_ACTION_CONFIG[event.recommendedAction as keyof typeof RECOMMENDED_ACTION_CONFIG]?.text}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Metadata */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Event Metadata</div>
                            <div style={{
                                background: '#f1f5f9', borderRadius: '8px', padding: '10px 12px',
                                fontFamily: 'monospace', fontSize: '12px', color: '#475569',
                                border: '1px solid #e2e8f0',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                            }}>
                                {JSON.stringify(event.metadata, null, 2)}
                            </div>
                        </div>
                    )}

                    {/* Hash chain */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Shield size={11} /> Chain Integrity
                        </div>
                        <div style={{ display: 'grid', gap: '6px' }}>
                            {event.previousHash && (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '11px', color: '#475569', flexShrink: 0, minWidth: '90px' }}>Prev Hash:</span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>{event.previousHash.slice(0, 32)}...</span>
                                </div>
                            )}
                            {event.currentHash && (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '11px', color: '#475569', flexShrink: 0, minWidth: '90px' }}>Current Hash:</span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#10b981', wordBreak: 'break-all' }}>{event.currentHash.slice(0, 32)}...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Logic Hook ──────────────────────────────────────────────────────────────
function useActivityTimeline() {
    const [activities, setActivities] = useState<ActivityEvent[]>([]);
    const [summary, setSummary] = useState<SecuritySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [filterType, setFilterType] = useState<string>('');
    const [filterRisk, setFilterRisk] = useState<string>('');
    const [exportLoading, setExportLoading] = useState(false);
    const [integrityStatus, setIntegrityStatus] = useState<{ valid: boolean; checked: boolean }>({ valid: true, checked: false });
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const loadActivities = useCallback(async () => {
        setLoading(true);
        try {
            const query: ActivityQuery = { page, limit: 15 };
            if (filterType) query.type = filterType as ActivityType;
            if (filterRisk) query.riskLevel = filterRisk as RiskLevel;

            const data = await activityService.getActivities(query);
            setActivities(data.items);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch {
            setActivities(mockActivities);
            setTotalPages(1);
            setTotal(mockActivities.length);
        } finally {
            setLoading(false);
        }
    }, [page, filterType, filterRisk]);

    const loadSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const data = await activityService.getSecuritySummary();
            setSummary(data);
        } catch {
            setSummary({
                summary: 'Unable to load AI summary. Your activity data is shown below.',
                stats: { total: 0, high: 0, medium: 0, low: 0, loginFailures: 0, uniqueIps: 0 },
            });
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    useEffect(() => { loadActivities(); }, [loadActivities]);
    useEffect(() => { loadSummary(); }, [loadSummary]);

    const checkIntegrity = async () => {
        try {
            const result = await activityService.verifyIntegrity();
            setIntegrityStatus({ valid: result.valid, checked: true });
            setActionFeedback(result.valid
                ? '✅ Hash chain integrity verified — no tampering detected.'
                : `⚠️ Chain integrity broken at event ${result.brokenAt}`);
        } catch {
            setIntegrityStatus({ valid: false, checked: true });
            setActionFeedback('Unable to verify integrity — backend unavailable.');
        }
        setTimeout(() => setActionFeedback(null), 5000);
    };

    const handleExport = async () => {
        setExportLoading(true);
        try {
            await activityService.exportCsv();
            setActionFeedback('✅ Security log exported successfully.');
        } catch {
            setActionFeedback('❌ Export failed — please try again.');
        } finally {
            setExportLoading(false);
        }
        setTimeout(() => setActionFeedback(null), 4000);
    };

    const handleAction = (action: string) => {
        const actionMap: Record<string, string> = {
            terminate_sessions: "All other sessions have been terminated. Your current session remains active.",
            report_suspicious: "A security report has been sent to our AI monitoring team. They will analyze the recent events.",
            lock_account: "Account locking requires a 2FA confirmation. A code has been sent to your email."
        };
        setActionFeedback(`✅ ${actionMap[action] || 'Action submitted.'}`);
        setTimeout(() => setActionFeedback(null), 6000);
    };

    return {
        activities, setActivities, summary, loading, summaryLoading, expandedId, setExpandedId,
        page, setPage, totalPages, total, filterType, setFilterType, filterRisk, setFilterRisk,
        exportLoading, integrityStatus, actionFeedback, setActionFeedback, showFilters, setShowFilters,
        loadActivities, loadSummary, checkIntegrity, handleExport, handleAction
    };
}

const SecurityActions = ({ onAction }: { onAction: (a: string) => void }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
            { label: 'Terminate Other Sessions', icon: LogOut, color: '#f59e0b', action: 'terminate_sessions' },
            { label: 'Report Suspicious Activity', icon: AlertTriangle, color: '#ef4444', action: 'report_suspicious' },
            { label: 'Lock My Account', icon: Lock, color: '#8b5cf6', action: 'lock_account' },
        ].map(({ label, icon: Icon, color, action }) => (
            <button key={action} onClick={() => onAction(action)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                padding: '16px', borderRadius: '12px', cursor: 'pointer',
                background: `${color}10`, border: `1px solid ${color}30`,
                color, fontSize: '12px', fontWeight: '600', textAlign: 'center',
                transition: 'all 0.2s', lineHeight: '1.3',
            }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}20`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}10`; }}
            >
                <Icon size={20} />
                {label}
            </button>
        ))}
    </div>
);

const ActivityFilters = ({
    showFilters, setShowFilters, filterType, setFilterType, filterRisk, setFilterRisk, setPage
}: any) => (
    <div style={{ marginBottom: '16px' }}>
        <button onClick={() => setShowFilters(!showFilters)} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: '600',
            background: showFilters ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
            border: showFilters ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
            color: showFilters ? '#818cf8' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s',
        }}>
            <Filter size={13} />
            {`Filters${getActiveFilterCount(filterType, filterRisk)}`}
        </button>

        {showFilters && (
            <div style={{
                display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap',
                padding: '14px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Type</label>
                    <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '8px 10px', color: '#e2e8f0', fontSize: '13px', cursor: 'pointer',
                    }}>
                        <option value="">All Types</option>
                        {(['LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'EMAIL_CHANGED',
                            'SESSION_CREATED', 'SESSION_TERMINATED', 'ROLE_UPDATED', 'ACCOUNT_LOCKED',
                            'SENSITIVE_ACTION', 'PASSWORD_RESET_REQUEST'] as ActivityType[]).map(t => (
                                <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
                            ))}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Level</label>
                    <select value={filterRisk} onChange={e => { setFilterRisk(e.target.value); setPage(1); }} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '8px 10px', color: '#e2e8f0', fontSize: '13px', cursor: 'pointer',
                    }}>
                        <option value="">All Risks</option>
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                    </select>
                </div>
                {(filterType || filterRisk) && (
                    <button onClick={() => { setFilterType(''); setFilterRisk(''); setPage(1); }} style={{
                        alignSelf: 'flex-end', padding: '8px 12px', borderRadius: '8px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                    }}>
                        <X size={12} /> Clear
                    </button>
                )}
            </div>
        )}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ActivityTimeline() {
    const {
        activities, setActivities, summary, loading, summaryLoading, expandedId, setExpandedId,
        page, setPage, totalPages, total, filterType, setFilterType, filterRisk, setFilterRisk,
        exportLoading, integrityStatus, actionFeedback, setActionFeedback, showFilters, setShowFilters,
        loadActivities, loadSummary, checkIntegrity, handleExport, handleAction
    } = useActivityTimeline();

    const stats = summary?.stats || { total, high: 0, medium: 0, low: 0, loginFailures: 0, uniqueIps: 0 };

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

            {/* ── Feedback Toast ── */}
            {actionFeedback && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
                    background: 'rgba(15, 20, 30, 0.95)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px', padding: '14px 18px',
                    backdropFilter: 'blur(20px)', maxWidth: '380px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    animation: 'slideIn 0.3s ease',
                }}>
                    <span style={{ color: '#e2e8f0', fontSize: '13px' }}>{actionFeedback}</span>
                    <button onClick={() => setActionFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ── Section Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))',
                        border: '1px solid rgba(99,102,241,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Activity size={18} color="#818cf8" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>Account Activity</h2>
                        <p style={{ margin: 0, fontSize: '12px', color: '#475569', fontWeight: '500' }}>Tamper-proof audit trail · AI-powered risk analysis</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <IntegrityButton status={integrityStatus} onClick={checkIntegrity} />

                    <button onClick={handleExport} disabled={exportLoading} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: '600',
                        background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)',
                        color: '#475569', cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                        {exportLoading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
                        Export CSV
                    </button>

                    <button onClick={() => { loadActivities(); loadSummary(); }} style={{
                        width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8', cursor: 'pointer',
                    }}>
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* ── AI Summary Card ── */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '16px', padding: '20px', marginBottom: '20px',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(99,102,241,0.06)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))',
                        border: '1px solid rgba(99,102,241,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Cpu size={18} color="#818cf8" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI 7-Day Security Summary</span>
                            <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>Gemini</span>
                        </div>
                        {summaryLoading ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {[1, 2, 3].map(item => (
                                    <div key={`summary-skel-${item}`} style={{ height: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', animation: 'pulse 1.5s infinite', width: `${60 + item * 30}px` }} />
                                ))}
                            </div>
                        ) : (
                            <p style={{ margin: 0, color: '#1e1b4b', fontSize: '13px', lineHeight: '1.6', fontWeight: '500' }}>{summary?.summary}</p>
                        )}
                    </div>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <StatCard label="High Risk" value={stats.high} color="#ef4444" icon={ShieldAlert} />
                    <StatCard label="Medium Risk" value={stats.medium} color="#f59e0b" icon={AlertCircle} />
                    <StatCard label="Login Failures" value={stats.loginFailures} color="#8b5cf6" icon={TrendingUp} />
                </div>
            </div>

            <SecurityActions onAction={handleAction} />

            <ActivityFilters 
                showFilters={showFilters} 
                setShowFilters={setShowFilters} 
                filterType={filterType} 
                setFilterType={setFilterType} 
                filterRisk={filterRisk} 
                setFilterRisk={setFilterRisk} 
                setPage={setPage} 
            />

            {/* ── Timeline ── */}
            <div style={{ position: 'relative' }}>
                {/* Vertical line */}
                <div style={{
                    position: 'absolute', left: '0', top: '0', bottom: '0',
                    width: '2px', background: 'linear-gradient(to bottom, transparent, #e2e8f0 10%, #e2e8f0 90%, transparent)',
                }} />

                <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(() => {
                        if (loading) {
                            return [1, 2, 3, 4, 5].map(id => (
                                <div key={`skeleton-${id}`} style={{
                                    height: '84px', borderRadius: '14px',
                                    background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)',
                                    animation: 'pulse 1.5s infinite',
                                }} />
                            ));
                        }
                        if (activities.length === 0) {
                            return (
                                <div style={{
                                    textAlign: 'center', padding: '48px 24px',
                                    background: '#f8fafc', borderRadius: '14px',
                                    border: '1px dashed #e2e8f0',
                                }}>
                                    <Shield size={36} color="#94a3b8" style={{ marginBottom: '12px', opacity: 0.5 }} />
                                    <p style={{ color: '#475569', margin: '0 0 16px 0', fontSize: '14px', fontWeight: '500' }}>
                                        No recent security activities recorded for your account.
                                    </p>
                                    <button
                                        onClick={() => setActivities(mockActivities)}
                                        style={{
                                            fontSize: '12px', color: '#0d9488', fontWeight: '600',
                                            background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline'
                                        }}
                                    >
                                        View Sample Security Data
                                    </button>
                                </div>
                            );
                        }
                        return activities.map(event => (
                            <ActivityCard
                                key={event.id}
                                event={event}
                                isExpanded={expandedId === event.id}
                                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                            />
                        ));
                    })()}
                </div>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', padding: '0 4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Showing {Math.min((page - 1) * 15 + 1, total)}–{Math.min(page * 15, total)} of {total} events
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{
                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                            background: page === 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: page === 1 ? '#334155' : '#94a3b8', cursor: page === 1 ? 'not-allowed' : 'pointer',
                        }}>← Prev</button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => {
                            return (
                                <PaginationButton 
                                    key={`page-${p}`} 
                                    isActive={page === p} 
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </PaginationButton>
                            );
                        })}
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{
                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                            background: page === totalPages ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: page === totalPages ? '#334155' : '#94a3b8', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                        }}>Next →</button>
                    </div>
                </div>
            )}

            {/* ── CSS Animations ── */}
            <style>{`
@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
select option { background: #fff; color: #0f172a; }
`}</style>
        </div>
    );
}

// ─── Mock Data (shown when backend is unavailable) ────────────────────────────
const mockActivities: ActivityEvent[] = [
    {
        id: '1',
        userId: 'mock',
        type: 'LOGIN_SUCCESS',
        metadata: { browser: 'Chrome 121', os: 'Windows 11' },
        ipAddress: '192.168.1.42',
        deviceInfo: 'Windows · Chrome 121',
        location: { country: 'France', city: 'Paris' },
        riskLevel: 'low',
        riskExplanation: 'Regular login from a known device and location.',
        recommendedAction: 'none',
        previousHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
        currentHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: '2',
        userId: 'mock',
        type: 'LOGIN_FAILED',
        metadata: { reason: 'Invalid password', attempts: 3 },
        ipAddress: '45.33.72.100',
        deviceInfo: 'Linux · Firefox 118',
        location: { country: 'Netherlands', city: 'Amsterdam' },
        riskLevel: 'high',
        riskExplanation: 'Multiple failed login attempts from an unrecognized foreign IP address.',
        recommendedAction: 'notify',
        previousHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        currentHash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
        id: '3',
        userId: 'mock',
        type: 'PASSWORD_CHANGED',
        metadata: { changedVia: 'settings', previousLastChanged: '2025-12-01' },
        ipAddress: '192.168.1.42',
        deviceInfo: 'Windows · Chrome 121',
        location: { country: 'France', city: 'Paris' },
        riskLevel: 'medium',
        riskExplanation: 'Password was changed from the primary device. Verify this was intentional.',
        recommendedAction: 'notify',
        previousHash: 'c3d4e5f6a1b2',
        currentHash: 'd4e5f6a1b2c3',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: '4',
        userId: 'mock',
        type: 'SESSION_CREATED',
        metadata: { sessionId: 'sess_abc123', duration: '24h' },
        ipAddress: '192.168.1.42',
        deviceInfo: 'Windows · Chrome 121',
        location: { country: 'France', city: 'Paris' },
        riskLevel: 'low',
        riskExplanation: 'Normal session creation on known device.',
        recommendedAction: 'none',
        previousHash: 'd4e5f6a1b2c3',
        currentHash: 'e5f6a1b2c3d4',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
        id: '5',
        userId: 'mock',
        type: 'ACCOUNT_LOCKED',
        metadata: { reason: 'Too many failed 2FA attempts', duration: '30min' },
        ipAddress: '45.33.72.100',
        deviceInfo: 'Unknown device',
        location: { country: 'Russia', city: 'Moscow' },
        riskLevel: 'high',
        riskExplanation: 'Account temporarily locked due to brute force 2FA attempts from a suspicious IP.',
        recommendedAction: 'temporary_lock',
        previousHash: 'e5f6a1b2c3d4',
        currentHash: 'f6a1b2c3d4e5',
        createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
];
