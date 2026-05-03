import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCcw, Sparkles, Activity, HeartPulse, FileText, Sheet, Volume2, Square } from 'lucide-react';
import type { SkinAgeInsightResponse } from '@/services/skinAgeInsightsService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { digitalTwinService } from '@/services/digitalTwinService';

interface SkinAgeInsightCardProps {
  insight?: SkinAgeInsightResponse | null;
  loading?: boolean;
  onRetry?: (skipDebounce?: boolean) => void;
  onLaunchAnalysis?: () => void;
  productsLoading?: boolean;
  onRefreshProducts?: () => void;
  recommendedProducts?: any[];
}

const statusCopy: Record<string, { color: string; bg: string; label: string }> = {
  younger: { color: '#16a34a', bg: '#dcfce7', label: 'Skin age looks younger' },
  aligned: { color: '#0ea5e9', bg: '#e0f2fe', label: 'Skin age aligned' },
  older: { color: '#ef4444', bg: '#fee2e2', label: 'Needs improvement' },
  unknown: { color: '#64748b', bg: '#e2e8f0', label: 'Pending analysis' },
};

export const SkinAgeInsightCard: React.FC<SkinAgeInsightCardProps> = ({
  insight,
  loading,
  onRetry,
  onLaunchAnalysis,
  productsLoading,
  onRefreshProducts,
  recommendedProducts
}) => {
  const [latestTwin, setLatestTwin] = useState<any | null>(null);
  const [isSpeakingTips, setIsSpeakingTips] = useState(false);
  const copy = statusCopy[insight?.status || 'unknown'];
  const missingRealAge = !insight?.latestAnalysis?.realAge;
  const realAge = insight?.latestAnalysis?.realAge;
  const skinAge = insight?.latestAnalysis?.skinAge;
  const delta = insight?.delta;
  const score = insight?.latestAnalysis?.skinScore;
  const trendSeries = insight?.trend?.series || [];
  const quickTips = insight?.advice?.length ? insight.advice : ['Add a first analysis.'];

  useEffect(() => {
    let mounted = true;
    const loadTwin = async () => {
      try {
        const twin = await digitalTwinService.getLatestDigitalTwin();
        if (mounted) setLatestTwin(twin);
      } catch {
        if (mounted) setLatestTwin(null);
      }
    };
    void loadTwin();
    return () => {
      mounted = false;
    };
  }, [insight?.userId]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeakQuickTips = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const intro = insight?.headline
      ? `Skin Age Insights. ${insight.headline}.`
      : 'Skin Age Insights.';
    const tipsText = quickTips.map((tip, index) => `Tip ${index + 1}. ${tip}`).join(' ');
    const utterance = new SpeechSynthesisUtterance(`${intro} Quick tips. ${tipsText}`);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingTips(false);
    utterance.onerror = () => setIsSpeakingTips(false);

    setIsSpeakingTips(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopQuickTips = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeakingTips(false);
  };

  const safeNum = (value: unknown): number | null => {
    return typeof value === 'number' && !Number.isNaN(value) ? value : null;
  };

  const classifyScore = (value: number | null): string => {
    if (value == null) return 'Unknown';
    if (value >= 80) return 'Excellent';
    if (value >= 65) return 'Good';
    if (value >= 50) return 'Moderate';
    return 'Needs attention';
  };

  const classifyDelta = (value: number | null): string => {
    if (value == null) return 'Not available';
    if (value <= -2) return 'Skin appears younger than chronological age';
    if (value <= 1) return 'Skin age is aligned with chronological age';
    return 'Skin appears older than chronological age';
  };

  const getUserContext = (): { name: string; email: string } => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return { name: 'N/A', email: 'N/A' };
      const user = JSON.parse(raw) as { firstName?: string; name?: string; email?: string };
      return {
        name: user.firstName || user.name || 'N/A',
        email: user.email || 'N/A',
      };
    } catch {
      return { name: 'N/A', email: 'N/A' };
    }
  };

  const getRiskLevel = (value: number | null): string => {
    if (value == null) return 'Unknown';
    if (value >= 75) return 'Low Risk';
    if (value >= 55) return 'Moderate Risk';
    return 'High Risk';
  };

  const getLifestyleFactors = (): string[] => {
    const fromTwin = latestTwin?.simulationContext?.lifestyleFactors;
    if (Array.isArray(fromTwin) && fromTwin.length > 0) return fromTwin;
    try {
      const habitsRaw = localStorage.getItem('userHabits');
      if (!habitsRaw) return ['Not enough lifestyle data'];
      const habits = JSON.parse(habitsRaw) as { sleepHours?: number; waterIntake?: number; stressLevel?: string; sunProtection?: string };
      const factors: string[] = [];
      if (habits.sleepHours != null) factors.push(`Sleep: ${habits.sleepHours}h`);
      if (habits.waterIntake != null) factors.push(`Hydration: ${habits.waterIntake}L/day`);
      if (habits.stressLevel) factors.push(`Stress: ${habits.stressLevel}`);
      if (habits.sunProtection) factors.push(`Sun protection: ${habits.sunProtection}`);
      return factors.length > 0 ? factors : ['Not enough lifestyle data'];
    } catch {
      return ['Not enough lifestyle data'];
    }
  };

  const buildAnalysisSummary = (): string => {
    const scoreValue = safeNum(score);
    const deltaValue = safeNum(delta);
    const latestTrendDelta = trendSeries.length > 0 ? safeNum(trendSeries[trendSeries.length - 1]?.delta) : null;
    const getTrendDirection = () => {
      if (latestTrendDelta == null) return 'trend unavailable';
      if (latestTrendDelta <= 0) return 'favorable trend';
      return 'aging-gap trend to monitor';
    };
    const trendDirection = getTrendDirection();

    return [
      `Current skin score is ${fmt(scoreValue, '/100')} (${classifyScore(scoreValue)}).`,
      `Skin age gap is ${fmt(deltaValue, ' years')} (${classifyDelta(deltaValue)}).`,
      `Trend assessment indicates ${trendDirection}.`,
      `Status flag: ${insight?.status || 'unknown'}.`,
    ].join(' ');
  };

  const buildRecommendedActions = (): string[] => {
    const actions = [...(insight?.advice || [])];
    const scoreValue = safeNum(score);
    const deltaValue = safeNum(delta);
    const month1Hydration = safeNum(latestTwin?.month1Prediction?.metrics?.hydration);

    if (deltaValue != null && deltaValue > 1) {
      actions.push('Prioritize photo-protection (SPF 30+) and antioxidant support every morning.');
    }
    if (scoreValue != null && scoreValue < 55) {
      actions.push('Introduce a 30-day barrier-focused protocol with gentle cleansing and ceramides.');
    }
    if (month1Hydration != null && month1Hydration < 50) {
      actions.push('Increase hydration strategy: humectant serum + lipid-rich moisturizer, twice daily.');
    }
    if ((trendSeries.length > 0) && (safeNum(trendSeries[trendSeries.length - 1]?.delta) ?? 0) > 0) {
      actions.push('Schedule a monthly skin reassessment to verify response and adjust routine intensity.');
    }

    if (actions.length === 0) {
      actions.push('Maintain current routine consistency and monitor skin age monthly.');
    }

    return Array.from(new Set(actions)).slice(0, 8);
  };

  const fmt = (value: unknown, suffix = ''): string => {
    if (value == null) return 'N/A';
    if (typeof value === 'number') {
      const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
      return `${text}${suffix}`;
    }
    return `${String(value)}${suffix}`;
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const now = new Date();
    const fileDate = now.toISOString().slice(0, 10);
    const userCtx = getUserContext();

    const scoreValue = safeNum(score);
    const deltaValue = safeNum(delta);
    const avgTrendDelta = safeNum(insight?.trend?.averageDelta);
    const latestTrendDelta = trendSeries.length > 0 ? safeNum(trendSeries[trendSeries.length - 1]?.delta) : null;
    const earliestTrendDelta = trendSeries.length > 0 ? safeNum(trendSeries[0]?.delta) : null;
    const trendShift = latestTrendDelta != null && earliestTrendDelta != null
      ? Number((latestTrendDelta - earliestTrendDelta).toFixed(1))
      : null;
    const riskLevel = getRiskLevel(scoreValue);
    const lifestyleFactors = getLifestyleFactors();
    const recommendedActions = buildRecommendedActions();
    const analysisSummary = buildAnalysisSummary();

    const palette = {
      slate900: [15, 23, 42] as [number, number, number],
      slate700: [51, 65, 85] as [number, number, number],
      slate500: [100, 116, 139] as [number, number, number],
      slate100: [241, 245, 249] as [number, number, number],
      slate200: [226, 232, 240] as [number, number, number],
      teal700: [15, 118, 110] as [number, number, number],
      teal600: [13, 148, 136] as [number, number, number],
      teal500: [20, 184, 166] as [number, number, number],
      teal50: [240, 253, 250] as [number, number, number],
      emerald: [22, 163, 74] as [number, number, number],
      amber: [245, 158, 11] as [number, number, number],
      rose: [225, 29, 72] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
    };

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 14;

    const drawPageChrome = () => {
      // Subtle template-aligned background to make pages feel less flat.
      doc.setFillColor(palette.slate100[0], palette.slate100[1], palette.slate100[2]);
      doc.circle(pageWidth - 8, 12, 26, 'F');
      doc.setFillColor(palette.teal50[0], palette.teal50[1], palette.teal50[2]);
      doc.circle(10, pageHeight - 6, 30, 'F');
      doc.setDrawColor(palette.slate200[0], palette.slate200[1], palette.slate200[2]);
      doc.setLineWidth(0.2);
      doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);
    };

    drawPageChrome();

    const ensureSpace = (needed = 10) => {
      if (y + needed > pageHeight - 16) {
        doc.addPage();
        drawPageChrome();
        y = 14;
      }
    };

    const sectionHeader = (title: string, accent: [number, number, number]) => {
      ensureSpace(12);
      doc.setFillColor(palette.teal50[0], palette.teal50[1], palette.teal50[2]);
      doc.roundedRect(14, y, pageWidth - 28, 10, 2, 2, 'F');
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(14, y, 4, 10, 'F');
      doc.setTextColor(palette.slate900[0], palette.slate900[1], palette.slate900[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 21, y + 6.5);
      y += 14;
    };

    const paragraph = (text: string, indent = 16, maxWidth = 176) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(palette.slate700[0], palette.slate700[1], palette.slate700[2]);
      const lines = doc.splitTextToSize(text, maxWidth);
      ensureSpace(lines.length * 4.6 + 2);
      doc.text(lines, indent, y);
      y += lines.length * 4.6;
    };

    const metricCard = (x: number, label: string, value: string, color: [number, number, number]) => {
      doc.setFillColor(palette.white[0], palette.white[1], palette.white[2]);
      doc.setDrawColor(palette.slate200[0], palette.slate200[1], palette.slate200[2]);
      doc.roundedRect(x, y, 43, 24, 2, 2, 'FD');
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, y, 43, 4, 'F');
      doc.setFillColor(palette.teal50[0], palette.teal50[1], palette.teal50[2]);
      doc.roundedRect(x + 1.5, y + 5.2, 40, 16.8, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(palette.slate500[0], palette.slate500[1], palette.slate500[2]);
      doc.text(label, x + 2, y + 10);
      doc.setFontSize(12.5);
      doc.setTextColor(palette.slate900[0], palette.slate900[1], palette.slate900[2]);
      doc.text(value, x + 2, y + 18);
    };

    // Template-aligned cover/header
    doc.setFillColor(palette.teal600[0], palette.teal600[1], palette.teal600[2]);
    doc.rect(0, 0, pageWidth, 42, 'F');
    doc.setFillColor(palette.teal500[0], palette.teal500[1], palette.teal500[2]);
    doc.rect(0, 0, 78, 42, 'F');
    doc.setFillColor(palette.teal700[0], palette.teal700[1], palette.teal700[2]);
    doc.rect(0, 36, pageWidth, 6, 'F');
    doc.setTextColor(palette.white[0], palette.white[1], palette.white[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Skin Age Insights Report', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Personalized dermatology intelligence and action plan', 14, 23);
    doc.text(`Generated on ${now.toLocaleString()}`, 14, 30);
      
    doc.setFillColor(palette.white[0], palette.white[1], palette.white[2]);
    doc.roundedRect(136, 8, 58, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(palette.teal700[0], palette.teal700[1], palette.teal700[2]);
    doc.text('Premium Skin Intelligence', 140, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(palette.slate700[0], palette.slate700[1], palette.slate700[2]);
    doc.text(`Risk: ${riskLevel}`, 140, 18.5);
    doc.text(`Score: ${fmt(scoreValue, '/100')}`, 168, 18.5);

    y = 50;

    // KPI cards row
    const scorePercent = Math.max(0, Math.min(100, scoreValue ?? 0));
    const scoreColor: [number, number, number] = scorePercent >= 75 ? palette.emerald : scorePercent >= 55 ? palette.amber : palette.rose;
    metricCard(14, 'Skin Age Score', fmt(scoreValue, '/100'), scoreColor);
    metricCard(60, 'User Age', fmt(realAge, ' yrs'), palette.teal500);
    metricCard(106, 'Skin Age', fmt(skinAge, ' yrs'), palette.teal600);
    metricCard(152, 'Age Delta', fmt(deltaValue, ' yrs'), palette.teal700);
    y += 30;

    // Progress strip
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(palette.slate700[0], palette.slate700[1], palette.slate700[2]);
    doc.text(`Risk Level: ${riskLevel}`, 14, y);
    doc.text(`Score Band: ${classifyScore(scoreValue)}`, 64, y);
    doc.text(`Interpretation: ${classifyDelta(deltaValue)}`, 108, y);
    y += 4;
    doc.setFillColor(palette.slate200[0], palette.slate200[1], palette.slate200[2]);
    doc.roundedRect(14, y, 182, 5, 2, 2, 'F');
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.roundedRect(14, y, (182 * scorePercent) / 100, 5, 2, 2, 'F');
    y += 11;

    sectionHeader('User Profile', palette.teal500);
    [
      `User name: ${userCtx.name}`,
      `User email: ${userCtx.email}`,
      `Assessment date: ${insight?.latestAnalysis?.createdAt ? new Date(insight.latestAnalysis.createdAt).toLocaleString() : 'N/A'}`,
      `Status flag: ${insight?.status || 'unknown'}`,
    ].forEach((line) => paragraph(`- ${line}`));
    y += 2;

    sectionHeader('Executive Summary', palette.teal600);
    paragraph(insight?.headline || 'No summary available. Run a skin analysis to generate advanced insights.');
    y += 2;

    sectionHeader('Clinical Analysis', palette.teal700);
    paragraph(analysisSummary);
    y += 2;

    sectionHeader('Trend Intelligence', palette.teal500);
    if (trendSeries.length === 0) {
      paragraph('- Not enough historical data to determine trend evolution.');
    } else {
      [
        `Data points: ${trendSeries.length}`,
        `Earliest observed delta: ${fmt(earliestTrendDelta, ' yrs')}`,
        `Latest observed delta: ${fmt(latestTrendDelta, ' yrs')}`,
        `Average trend delta: ${fmt(avgTrendDelta, ' yrs')}`,
        `Shift over period: ${fmt(trendShift, ' yrs')}`,
      ].forEach((line) => paragraph(`- ${line}`));

      // Mini trend chart
      ensureSpace(34);
      const chartX = 18;
      const chartY = y + 4;
      const chartW = 170;
      const chartH = 24;
      doc.setDrawColor(203, 213, 225);
      doc.rect(chartX, chartY, chartW, chartH);
      const values = trendSeries.map((t) => safeNum(t.delta) ?? 0);
      const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
      const barW = Math.max(5, Math.floor((chartW - 10) / Math.max(1, values.length)));
      values.forEach((v, i) => {
        const x = chartX + 5 + i * barW;
        const barH = Math.min(chartH - 6, Math.abs((v / maxAbs) * (chartH - 8)));
        const baseY = chartY + chartH - 3;
        if (v <= 0) {
          doc.setFillColor(22, 163, 74);
          doc.rect(x, baseY - barH, barW - 1, barH, 'F');
        } else {
          doc.setFillColor(225, 29, 72);
          doc.rect(x, baseY - barH, barW - 1, barH, 'F');
        }
      });
      y += 34;
    }
    y += 2;

    sectionHeader('Recommended Actions', palette.teal600);
    recommendedActions.slice(0, 8).forEach((tip, idx) => paragraph(`${idx + 1}. ${tip}`));
    y += 2;

    sectionHeader('Lifestyle Factors', palette.teal500);
    lifestyleFactors.forEach((item) => paragraph(`- ${item}`));
    y += 2;

    sectionHeader('Product and Routine Focus', palette.teal700);
    (insight?.productSuggestions?.length ? insight.productSuggestions : ['Hydration support', 'Photoprotection (SPF)', 'Barrier reinforcement'])
      .slice(0, 6)
      .forEach((item, idx) => paragraph(`- Focus area ${idx + 1}: ${item}`));
    y += 2;

    sectionHeader('Benchmark Comparison', palette.teal600);
    const personalDelta = safeNum(insight?.userBenchmark?.avgDelta);
    const datasetDelta = safeNum(insight?.datasetBenchmark?.avgDelta);
    const gapToDataset = personalDelta != null && datasetDelta != null
      ? Number((personalDelta - datasetDelta).toFixed(1))
      : null;

    autoTable(doc, {
      startY: y,
      head: [['Source', 'Sample Size', 'Avg Real Age', 'Avg Skin Age', 'Avg Delta']],
      body: [
        [
          'Personal',
          fmt(insight?.userBenchmark?.sampleSize),
          fmt(insight?.userBenchmark?.avgRealAge),
          fmt(insight?.userBenchmark?.avgSkinAge),
          fmt(personalDelta),
        ],
        [
          'Dataset',
          fmt(insight?.datasetBenchmark?.sampleSize),
          fmt(insight?.datasetBenchmark?.avgRealAge),
          fmt(insight?.datasetBenchmark?.avgSkinAge),
          fmt(datasetDelta),
        ],
        ['Gap vs Dataset', '-', '-', '-', fmt(gapToDataset)],
      ],
      styles: { fontSize: 9, cellPadding: 2.8, textColor: [30, 41, 59] },
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      margin: { left: 14, right: 14 },
      theme: 'grid',
    });

    y = ((doc as any).lastAutoTable?.finalY || y) + 8;
    ensureSpace(10);
    doc.setFontSize(8.5);
    doc.setTextColor(palette.slate500[0], palette.slate500[1], palette.slate500[2]);
    doc.text('DeepSkyn Confidential - Informational report, not a substitute for medical diagnosis.', 14, y);

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(palette.teal700[0], palette.teal700[1], palette.teal700[2]);
      doc.text('DEEPSKYN', 14, pageHeight - 8.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(palette.slate500[0], palette.slate500[1], palette.slate500[2]);
      doc.text(`Page ${page}/${totalPages}`, pageWidth - 26, pageHeight - 8.2);
    }

    doc.save(`skin-age-insights-${fileDate}.pdf`);
  };

  const handleExportExcel = async () => {
    const now = new Date();
    const fileDate = now.toISOString().slice(0, 10);
    const workbook = new ExcelJS.Workbook();
    const userCtx = getUserContext();

    const scoreValue = safeNum(score);
    const deltaValue = safeNum(delta);
    const avgTrendDelta = safeNum(insight?.trend?.averageDelta);
    const latestTrendDelta = trendSeries.length > 0 ? safeNum(trendSeries[trendSeries.length - 1]?.delta) : null;
    const earliestTrendDelta = trendSeries.length > 0 ? safeNum(trendSeries[0]?.delta) : null;
    const trendShift = latestTrendDelta != null && earliestTrendDelta != null
      ? Number((latestTrendDelta - earliestTrendDelta).toFixed(1))
      : null;

    const addSheet = (name: string, data: any[], widths: number[]) => {
      const sheet = workbook.addWorksheet(name);
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        sheet.columns = keys.map((k, i) => ({ header: k, key: k, width: widths[i] || 20 }));
        data.forEach(row => sheet.addRow(row));
        sheet.getRow(1).font = { bold: true };
      }
    };

    const profileData = [
      { field: 'User name', value: userCtx.name },
      { field: 'User email', value: userCtx.email },
      { field: 'Chronological age (user age)', value: realAge ?? 'N/A' },
      { field: 'Estimated skin age', value: skinAge ?? 'N/A' },
      { field: 'Age delta', value: delta ?? 'N/A' },
      { field: 'Clinical interpretation', value: classifyDelta(deltaValue) },
      { field: 'Analysis ID', value: insight?.latestAnalysis?.id || 'N/A' },
      { field: 'Assessment date', value: insight?.latestAnalysis?.createdAt ? new Date(insight.latestAnalysis.createdAt).toLocaleString() : 'N/A' },
    ];
    addSheet('User_Profile', profileData, [34, 46]);

    const skinAnalysisRows = [
      {
        Date: insight?.latestAnalysis?.createdAt ? new Date(insight.latestAnalysis.createdAt).toLocaleDateString() : now.toLocaleDateString(),
        'Skin Age Score': score ?? 'N/A',
        'Risk Level': getRiskLevel(scoreValue),
        'Lifestyle Factors': getLifestyleFactors().join(' | '),
        Recommendations: buildRecommendedActions().join(' | '),
      },
    ];
    addSheet('Skin Analysis', skinAnalysisRows, [16, 14, 14, 40, 72]);

    const executiveData = [
      { metric: 'Report generated at', value: now.toLocaleString() },
      { metric: 'Analysis ID', value: insight?.latestAnalysis?.id || 'N/A' },
      { metric: 'Chronological age (user age)', value: realAge ?? 'N/A' },
      { metric: 'Estimated skin age', value: skinAge ?? 'N/A' },
      { metric: 'Age gap (delta)', value: delta ?? 'N/A' },
      { metric: 'Clinical interpretation', value: classifyDelta(deltaValue) },
      { metric: 'Skin score', value: score ?? 'N/A' },
      { metric: 'Score band', value: classifyScore(scoreValue) },
      { metric: 'Status', value: insight?.status || 'unknown' },
      { metric: 'Headline', value: insight?.headline || 'N/A' },
      { metric: 'Trend points', value: trendSeries.length },
      { metric: 'Average trend delta', value: avgTrendDelta ?? 'N/A' },
      { metric: 'Trend shift over period', value: trendShift ?? 'N/A' },
    ];
    addSheet('Executive', executiveData, [34, 22]);

    const summaryData = [
      { field: 'Generated At', value: now.toLocaleString() },
      { field: 'Analysis ID', value: insight?.latestAnalysis?.id || 'N/A' },
      { field: 'Status', value: insight?.status || 'unknown' },
      { field: 'Real Age', value: realAge ?? 'N/A' },
      { field: 'Skin Age', value: skinAge ?? 'N/A' },
      { field: 'Delta', value: delta ?? 'N/A' },
      { field: 'Skin Score', value: score ?? 'N/A' },
      { field: 'Headline', value: insight?.headline || 'N/A' },
      { field: 'Score Band', value: classifyScore(scoreValue) },
      { field: 'Interpretation', value: classifyDelta(deltaValue) },
    ];
    addSheet('Summary', summaryData, [28, 52]);

    const trendData = (insight?.trend?.series || []).length > 0
        ? (insight?.trend?.series || []).map((row, index, arr) => {
          const prev = index > 0 ? safeNum(arr[index - 1]?.delta) : null;
          const current = safeNum(row.delta);
          const change = current != null && prev != null ? Number((current - prev).toFixed(1)) : null;
          const getTrendDirection = (val: number | null) => {
            if (val == null) return 'N/A';
            if (val < 0) return 'Improving';
            if (val > 0) return 'Worsening';
            return 'Stable';
          };
          const direction = getTrendDirection(change);
          return {
            index: index + 1,
            date: new Date(row.createdAt).toLocaleDateString(),
            delta: row.delta ?? 'N/A',
            changeFromPrevious: change ?? 'N/A',
            direction,
          };
        })
        : [{ index: 'N/A', date: 'N/A', delta: 'No trend data', changeFromPrevious: 'N/A', direction: 'N/A' }];
    addSheet('Trend', trendData, [8, 16, 14, 20, 16]);
    
    const getTrendInterpretation = (val: number | null) => {
      if (val == null) return 'N/A';
      if (val < 0) return 'Improving trend';
      if (val > 0) return 'Worsening trend';
      return 'Stable trend';
    };

    const trendDiagnosticsData = [
      {
        metric: 'Trend points',
        value: trendSeries.length,
        interpretation: trendSeries.length >= 4 ? 'Sufficient history for trend reading' : 'Limited history',
      },
      {
        metric: 'Average delta',
        value: avgTrendDelta ?? 'N/A',
        interpretation: avgTrendDelta != null ? (avgTrendDelta <= 0 ? 'Favorable average profile' : 'Aging gap to improve') : 'N/A',
      },
      {
        metric: 'Shift over period',
        value: trendShift ?? 'N/A',
        interpretation: getTrendInterpretation(trendShift),
      },
      {
        metric: 'Score band',
        value: classifyScore(scoreValue),
        interpretation: scoreValue != null && scoreValue >= 65 ? 'Solid skin quality baseline' : 'Needs reinforcement plan',
      },
    ];
    addSheet('Trend_Diagnostics', trendDiagnosticsData, [24, 16, 44]);

    const recommendationData = buildRecommendedActions().map((tip, idx) => ({
        order: idx + 1,
        priority: idx < 2 ? 'High' : idx < 5 ? 'Medium' : 'Low',
        timeline: idx < 2 ? 'Next 7 days' : 'Next 30 days',
        recommendation: tip,
      }));
    if (recommendationData.length === 0) {
        recommendationData.push({ order: 1 as any, priority: 'N/A', timeline: 'N/A', recommendation: 'None' });
    }
    addSheet('Recommendations', recommendationData, [8, 12, 14, 72]);

    const productFocusData = (insight?.productSuggestions?.length ? insight.productSuggestions : ['Hydration support', 'Photoprotection (SPF)', 'Barrier reinforcement']).map((item, idx) => ({
        order: idx + 1,
        category: idx === 0 ? 'Core' : idx < 3 ? 'Priority' : 'Support',
        focus: item,
      }));
    addSheet('Product Focus', productFocusData, [8, 14, 60]);

    const benchmarkData = [
      {
        source: 'Personal',
        sampleSize: insight?.userBenchmark?.sampleSize ?? 'N/A',
        avgRealAge: insight?.userBenchmark?.avgRealAge ?? 'N/A',
        avgSkinAge: insight?.userBenchmark?.avgSkinAge ?? 'N/A',
        avgDelta: insight?.userBenchmark?.avgDelta ?? 'N/A',
      },
      {
        source: 'Dataset',
        sampleSize: insight?.datasetBenchmark?.sampleSize ?? 'N/A',
        avgRealAge: insight?.datasetBenchmark?.avgRealAge ?? 'N/A',
        avgSkinAge: insight?.datasetBenchmark?.avgSkinAge ?? 'N/A',
        avgDelta: insight?.datasetBenchmark?.avgDelta ?? 'N/A',
      },
      {
        source: 'Gap (Personal - Dataset)',
        sampleSize: 'N/A',
        avgRealAge: (safeNum(insight?.userBenchmark?.avgRealAge) != null && safeNum(insight?.datasetBenchmark?.avgRealAge) != null)
          ? Number((safeNum(insight?.userBenchmark?.avgRealAge)! - safeNum(insight?.datasetBenchmark?.avgRealAge)!).toFixed(1))
          : 'N/A',
        avgSkinAge: (safeNum(insight?.userBenchmark?.avgSkinAge) != null && safeNum(insight?.datasetBenchmark?.avgSkinAge) != null)
          ? Number((safeNum(insight?.userBenchmark?.avgSkinAge)! - safeNum(insight?.datasetBenchmark?.avgSkinAge)!).toFixed(1))
          : 'N/A',
        avgDelta: (safeNum(insight?.userBenchmark?.avgDelta) != null && safeNum(insight?.datasetBenchmark?.avgDelta) != null)
          ? Number((safeNum(insight?.userBenchmark?.avgDelta)! - safeNum(insight?.datasetBenchmark?.avgDelta)!).toFixed(1))
          : 'N/A',
      },
    ];
    addSheet('Benchmarks', benchmarkData, [24, 12, 14, 14, 14]);

    const excelBuffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    downloadBlob(blob, `skin-age-insights-${fileDate}.xlsx`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 border border-teal-200 grid place-items-center text-teal-700 flex-shrink-0 mt-0.5">
            <HeartPulse size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-1">Overview</p>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Skin Age Insights</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Track your skin age progression and get personalized insights</p>
          </div>
        </div>
        {onRetry && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              <FileText size={13} /> Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              <Sheet size={13} /> Export Excel
            </button>
            <button
              onClick={() => onRetry?.(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-100 rounded-lg" />
          <div className="h-4 bg-slate-100 rounded-lg w-2/3" />
          <div className="h-24 bg-slate-100 rounded-lg" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-2 rounded-full text-xs font-bold" style={{ color: copy.color, background: copy.bg }}>
              {copy.label}
            </span>
            {delta != null && (
              <span className="px-3 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold">
                Δ {delta > 0 ? '+' : ''}{delta} yrs
              </span>
            )}
            {score != null && (
              <span className="px-3 py-2 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200 flex items-center gap-2">
                <Activity size={13} /> Score {score}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50 via-white to-white md:order-1">
              <div className="flex items-center justify-between gap-3 mb-5">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">Quick tips</p>
                <button
                  onClick={isSpeakingTips ? handleStopQuickTips : handleSpeakQuickTips}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-teal-200 bg-white text-teal-700 text-xs font-semibold hover:bg-teal-50 transition-colors"
                  disabled={loading}
                >
                  {isSpeakingTips ? <Square size={13} /> : <Volume2 size={13} />}
                  {isSpeakingTips ? 'Arreter' : 'Ecouter'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {quickTips.map((item) => (
                  <span key={item} className="px-4 py-3 rounded-lg bg-white border border-slate-200 text-sm text-slate-800 font-medium shadow-sm hover:shadow-md hover:border-slate-300 transition-all">{item}</span>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-white md:order-2 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Summary</p>
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                  {insight?.headline || 'Analysis pending. Launch an AI scan to unlock your data.'}
                </p>
                {missingRealAge && (
                  <span className="inline-block mt-3 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">Age required</span>
                )}
              </div>

              <div className="space-y-3">
                {[{ label: 'Real Age', value: realAge, tone: 'text-slate-900' },
                  { label: 'Skin Age', value: skinAge, tone: 'text-slate-900' },
                  { label: 'Delta', value: delta != null ? `${delta > 0 ? '+' : ''}${delta}yrs` : '—', tone: delta != null && delta <= 0 ? 'text-emerald-600' : 'text-amber-600' },
                  { label: 'Score', value: score, tone: 'text-teal-700' }].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-100 shadow-xs">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{item.label}</p>
                    <p className={`text-lg font-extrabold ${item.tone}`}>{item.value ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            <div className="p-6 rounded-2xl border border-slate-200 bg-white lg:col-span-2 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Targeted recommendations</p>
              <div className="flex flex-wrap gap-2">
                {(insight?.productSuggestions || ['Anti-aging', 'Hydration']).map((item) => (
                  <span key={item} className="px-3 py-2 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-700 shadow-xs hover:bg-teal-100 transition-colors">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Benchmarks</p>
              <div className="space-y-2 text-xs text-slate-600">
                <p className="font-medium"><span className="font-bold">Personal:</span> {insight?.userBenchmark.avgRealAge ?? '—'}/{insight?.userBenchmark.avgSkinAge ?? '—'} yrs</p>
                <p className="font-medium"><span className="font-bold">Dataset:</span> {insight?.datasetBenchmark.avgRealAge ?? '—'}/{insight?.datasetBenchmark.avgSkinAge ?? '—'} yrs (n={insight?.datasetBenchmark.sampleSize ?? 0})</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onLaunchAnalysis}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-teal-700 hover:to-teal-600 transition-all"
              disabled={loading}
            >
              <Sparkles size={16} /> Launch Analysis
            </button>
            <Link
              to="/analysis/history"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all"
            >
              View history
              <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default SkinAgeInsightCard;
