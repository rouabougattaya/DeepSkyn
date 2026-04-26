import React, { useMemo } from 'react';
import type { UserSkinProfile } from '../../types/aiAnalysis';
import {
    Calendar, AlertTriangle, CheckCircle2,
    Sun, Shield,
    Zap, Layers, Target, MapPin, Eye, MousePointer2, Droplets,
    History, Flame, CircleDot, ShieldAlert
} from 'lucide-react';
import type { SkinQuestionnaireData } from '../../types/skinQuestionnaire';

interface SkinProfileFormProps {
    profile: UserSkinProfile;
    setProfile: React.Dispatch<React.SetStateAction<UserSkinProfile>>;
    questionnaire: SkinQuestionnaireData;
    setQuestionnaire: React.Dispatch<React.SetStateAction<SkinQuestionnaireData>>;
    disabled?: boolean;
}

const SKIN_TYPES = [
    { id: 'Oily', label: 'Grasse', icon: Zap, color: '#eab308' },
    { id: 'Dry', label: 'Sèche', icon: Sun, color: '#f97316' }, // 🌵 -> Sun
    { id: 'Combination', label: 'Mixte', icon: Layers, color: '#8b5cf6' },
    { id: 'Sensitive', label: 'Sensible', icon: Shield, color: '#ef4444' },
    { id: 'Normal', label: 'Normale', icon: CheckCircle2, color: '#10b981' },
];

const GENDERS = [
    { id: 'Male', label: 'Homme' },
    { id: 'Female', label: 'Femme' },
    { id: 'Other', label: 'Autre' },
];

const FITZPATRICK_TYPES = [
    { id: 'Type I', label: 'Type I', description: 'Blanc très pâle', color: '#fef3e2' },
    { id: 'Type II', label: 'Type II', description: 'Blanc pâle', color: '#f5e6d3' },
    { id: 'Type III', label: 'Type III', description: 'Beige/Clair', color: '#e8d5c4' },
    { id: 'Type IV', label: 'Type IV', description: 'Brun clair', color: '#d4a574' },
    { id: 'Type V', label: 'Type V', description: 'Brun', color: '#b8860b' },
    { id: 'Type VI', label: 'Type VI', description: 'Très brun/Noir', color: '#6c4423' },
];


export const SkinProfileForm: React.FC<SkinProfileFormProps> = ({ profile, setProfile, questionnaire, setQuestionnaire, disabled }) => {
    const derivedInputs = useMemo(() => {
        const concerns: string[] = [];

        const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

        const acneBase = questionnaire.acne.enabled
            ? (questionnaire.acne.severity === 'severe' ? 85 : questionnaire.acne.severity === 'moderate' ? 60 : questionnaire.acne.severity === 'mild' ? 30 : 50)
            : undefined;
        const acneTypeBoost = questionnaire.acne.type === 'cystic' ? 10 : questionnaire.acne.type === 'hormonal' ? 6 : 0;
        const acneLocationBoost = (questionnaire.acne.location?.length || 0) * 3;
        const acneLevel = typeof acneBase === 'number' ? clamp(acneBase + acneTypeBoost + acneLocationBoost) : undefined;
        if (questionnaire.acne.enabled) concerns.push('Acné');

        const blackheadsBase = questionnaire.blackheads.enabled
            ? (questionnaire.blackheads.severity === 'high' ? 75 : questionnaire.blackheads.severity === 'medium' ? 50 : questionnaire.blackheads.severity === 'low' ? 25 : 45)
            : undefined;
        const blackheadsLocationBoost = (questionnaire.blackheads.location?.length || 0) * 2;
        const blackheadsLevel = typeof blackheadsBase === 'number' ? clamp(blackheadsBase + blackheadsLocationBoost) : undefined;
        if (questionnaire.blackheads.enabled) concerns.push('Points noirs');

        const wrinklesBase = questionnaire.wrinkles.enabled
            ? (questionnaire.wrinkles.depth === 'deep' ? 78 : questionnaire.wrinkles.depth === 'fine' ? 40 : 55)
            : undefined;
        const wrinklesLocationBoost = (questionnaire.wrinkles.location?.length || 0) * 4;
        const wrinklesDepth = typeof wrinklesBase === 'number' ? clamp(wrinklesBase + wrinklesLocationBoost) : undefined;
        if (questionnaire.wrinkles.enabled) concerns.push('Rides');

        const poresBase = questionnaire.pores.enabled
            ? (questionnaire.pores.visibility === 'high' ? 78 : questionnaire.pores.visibility === 'medium' ? 55 : questionnaire.pores.visibility === 'low' ? 28 : 50)
            : undefined;
        const poresZoneBoost = questionnaire.pores.zone === 'all' ? 10 : questionnaire.pores.zone === 'tzone' ? 6 : 0;
        const poreSize = typeof poresBase === 'number' ? clamp(poresBase + poresZoneBoost) : undefined;
        if (questionnaire.pores.enabled) concerns.push('Pores dilatés');

        const hydrationLevel = questionnaire.hydration.enabled
            ? (questionnaire.hydration.feel === 'very-dry' ? 20 : questionnaire.hydration.feel === 'tight' ? 40 : questionnaire.hydration.feel === 'normal' ? 70 : 55)
            : undefined;
        if (questionnaire.hydration.enabled) concerns.push('Déshydratation');

        const sensitivityLevel = questionnaire.sensitivity.enabled
            ? (questionnaire.sensitivity.level === 'high' ? 80 : questionnaire.sensitivity.level === 'medium' ? 55 : questionnaire.sensitivity.level === 'low' ? 25 : 45)
            : undefined;
        if (questionnaire.sensitivity.enabled) concerns.push('Sensibilité');

        const rednessBase = questionnaire.redness.enabled
            ? (questionnaire.redness.level === 'flaring' ? 82 : questionnaire.redness.level === 'persistent' ? 60 : questionnaire.redness.level === 'occasional' ? 35 : 48)
            : undefined;
        const rednessLocationBoost = (questionnaire.redness.location?.length || 0) * 2;
        const rednessLevel = typeof rednessBase === 'number' ? clamp(rednessBase + rednessLocationBoost) : undefined;
        if (questionnaire.redness.enabled) concerns.push('Rougeurs');

        return {
            concerns,
            acneLevel,
            blackheadsLevel,
            poreSize,
            wrinklesDepth,
            hydrationLevel,
            sensitivityLevel,
            rednessLevel,
        };
    }, [questionnaire]);

    React.useEffect(() => {
        setProfile(prev => {
            const next = {
                ...prev,
                concerns: derivedInputs.concerns,
                acneLevel: derivedInputs.acneLevel,
                blackheadsLevel: derivedInputs.blackheadsLevel,
                poreSize: derivedInputs.poreSize,
                wrinklesDepth: derivedInputs.wrinklesDepth,
                hydrationLevel: derivedInputs.hydrationLevel,
                sensitivityLevel: derivedInputs.sensitivityLevel,
                rednessLevel: derivedInputs.rednessLevel,
            };

            const unchanged =
                prev.concerns?.join('|') === next.concerns.join('|') &&
                prev.acneLevel === next.acneLevel &&
                prev.blackheadsLevel === next.blackheadsLevel &&
                prev.poreSize === next.poreSize &&
                prev.wrinklesDepth === next.wrinklesDepth &&
                prev.hydrationLevel === next.hydrationLevel &&
                prev.sensitivityLevel === next.sensitivityLevel &&
                prev.rednessLevel === next.rednessLevel;

            return unchanged ? prev : next;
        });
    }, [derivedInputs, setProfile]);

    const toggleCondition = (key: keyof SkinQuestionnaireData) => {
        setQuestionnaire({
            ...questionnaire,
            [key]: {
                ...questionnaire[key],
                enabled: !questionnaire[key].enabled,
            },
        });
    };

    const toggleMultiSelect = <K extends keyof SkinQuestionnaireData, V extends string>(
        key: K,
        field: keyof SkinQuestionnaireData[K],
        value: V,
    ) => {
        const current = (questionnaire[key][field] as unknown as V[]) || [];
        const exists = current.includes(value);
        const next = exists ? current.filter(item => item !== value) : [...current, value];
        setQuestionnaire({
            ...questionnaire,
            [key]: {
                ...questionnaire[key],
                [field]: next,
            },
        });
    };

    const setSingle = <K extends keyof SkinQuestionnaireData, V>(
        key: K,
        field: keyof SkinQuestionnaireData[K],
        value: V,
    ) => {
        setQuestionnaire({
            ...questionnaire,
            [key]: {
                ...questionnaire[key],
                [field]: value,
            },
        });
    };

    return (
        <div className="space-y-6">
            {/* Age & Genre */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Âge</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="number"
                            value={profile.age || ''}
                            onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                            disabled={disabled}
                            placeholder="Ex: 25"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all outline-none"
                            min="1"
                            max="120"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Genre</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {GENDERS.map(g => (
                            <button
                                key={g.id}
                                onClick={() => setProfile({ ...profile, gender: g.id as any })}
                                disabled={disabled}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${profile.gender === g.id ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Type de peau */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Type de peau</label>
                <div className="grid grid-cols-3 gap-2">
                    {SKIN_TYPES.map(type => {
                        const Icon = type.icon;
                        return (
                            <button
                                key={type.id}
                                onClick={() => setProfile({ ...profile, skinType: type.id as any })}
                                disabled={disabled}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${profile.skinType === type.id
                                    ? 'bg-teal-50 border-teal-200 text-teal-700 ring-1 ring-teal-200 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                <Icon size={24} style={{ color: type.color }} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">{type.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Couleur de peau (Fitzpatrick) */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Couleur de peau</label>
                <div className="grid grid-cols-3 gap-2">
                    {FITZPATRICK_TYPES.map(fitzType => (
                        <button
                            key={fitzType.id}
                            onClick={() => setProfile({ ...profile, fitzpatrickType: fitzType.id as any })}
                            disabled={disabled}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${profile.fitzpatrickType === fitzType.id
                                ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div
                                className="h-8 w-8 rounded-full border-2 border-slate-300"
                                style={{ backgroundColor: fitzType.color }}
                            />
                            <span className="text-[10px] font-bold text-slate-600">{fitzType.label}</span>
                            <span className="text-[9px] text-slate-500">{fitzType.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Conditions principales */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Conditions principales</label>
                <div className="grid grid-cols-2 gap-2">
                    {([
                        { key: 'acne', label: 'Acné', desc: 'Inflammations, boutons', color: '#f43f5e' },
                        { key: 'blackheads', label: 'Points noirs', desc: 'Comedons visibles', color: '#0f172a' },
                        { key: 'wrinkles', label: 'Rides', desc: 'Ridules, profondeur', color: '#d97706' },
                        { key: 'pores', label: 'Pores', desc: 'Pores dilates', color: '#8b5cf6' },
                        { key: 'hydration', label: 'Hydratation', desc: 'Secheresse, tiraillement', color: '#0ea5e9' },
                        { key: 'sensitivity', label: 'Sensibilite', desc: 'Peau reactive', color: '#ef4444' },
                        { key: 'redness', label: 'Rougeurs', desc: 'Irritations, rougeurs', color: '#dc2626' },
                    ] as Array<{ key: keyof SkinQuestionnaireData; label: string; desc: string; color: string }>).map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => toggleCondition(item.key)}
                            disabled={disabled}
                            className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all text-left ${questionnaire[item.key].enabled
                                ? 'bg-teal-50 border-teal-200 text-teal-700 ring-1 ring-teal-200 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                        >
                            <div className="text-sm font-bold" style={{ color: questionnaire[item.key].enabled ? '#0f766e' : item.color }}>{item.label}</div>
                            <div className="text-[10px] text-slate-500">{item.desc}</div>
                        </button>
                    ))}
                </div>

                {/* Conditional Details */}
                <div className="mt-4 space-y-4">
                    {questionnaire.acne.enabled && (
                        <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-xs font-black text-rose-600 uppercase tracking-widest">
                                <Target size={14} /> Acné — Diagnostic Détaillé
                            </div>
                            
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Gravité de l'inflammation</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['mild', 'moderate', 'severe'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('acne', 'severity', level)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                                questionnaire.acne.severity === level
                                                ? 'bg-white border-rose-400 shadow-md ring-2 ring-rose-500/10'
                                                : 'bg-white/50 border-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                                                questionnaire.acne.severity === level ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50'
                                            }`}>
                                                <div className={`rounded-full ${
                                                    level === 'mild' ? 'h-2 w-2 bg-rose-300' : 
                                                    level === 'moderate' ? 'h-4 w-4 bg-rose-400' : 
                                                    'h-6 w-6 bg-rose-600'
                                                }`} />
                                            </div>
                                            <span className={`text-[10px] font-bold ${questionnaire.acne.severity === level ? 'text-rose-700' : ''}`}>
                                                {level === 'mild' ? 'Léger' : level === 'moderate' ? 'Modéré' : 'Sévère'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Type d'imperfections</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['whiteheads', 'cystic', 'hormonal'] as const).map((kind) => (
                                        <button
                                            key={kind}
                                            type="button"
                                            onClick={() => setSingle('acne', 'type', kind)}
                                            className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                questionnaire.acne.type === kind
                                                ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-rose-200'
                                            }`}
                                        >
                                            {kind === 'whiteheads' ? 'Points Blancs' : kind === 'cystic' ? 'Kystique' : 'Hormonal'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Localisation sur le visage</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['forehead', 'cheeks', 'chin'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => toggleMultiSelect('acne', 'location', zone)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                                                questionnaire.acne.location.includes(zone)
                                                ? 'bg-white border-rose-400 text-rose-700 shadow-sm'
                                                : 'bg-white/50 border-slate-100 text-slate-500'
                                            }`}
                                        >
                                            <MapPin size={12} className={questionnaire.acne.location.includes(zone) ? 'text-rose-500' : 'text-slate-300'} />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">
                                                {zone === 'forehead' ? 'Front' : zone === 'cheeks' ? 'Joues' : 'Menton'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.wrinkles.enabled && (
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-widest">
                                <History size={14} /> Rides — Analyse Structurelle
                            </div>
                            
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Profondeur des sillons</div>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['fine', 'deep'] as const).map((depth) => (
                                        <button
                                            key={depth}
                                            type="button"
                                            onClick={() => setSingle('wrinkles', 'depth', depth)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                                questionnaire.wrinkles.depth === depth
                                                ? 'bg-white border-amber-400 shadow-md ring-2 ring-amber-500/10'
                                                : 'bg-white/50 border-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                                                questionnaire.wrinkles.depth === depth ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'
                                            }`}>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="h-[1px] w-4 bg-amber-300" />
                                                    {depth === 'deep' && (
                                                        <>
                                                            <div className="h-[2px] w-5 bg-amber-500" />
                                                            <div className="h-[1px] w-4 bg-amber-300" />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold ${questionnaire.wrinkles.depth === depth ? 'text-amber-700' : ''}`}>
                                                {depth === 'fine' ? 'Ridules' : 'Rides Profondes'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Zones marquées</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['eyes', 'forehead', 'mouth'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => toggleMultiSelect('wrinkles', 'location', zone)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                                                questionnaire.wrinkles.location.includes(zone)
                                                ? 'bg-white border-amber-400 text-amber-700 shadow-sm'
                                                : 'bg-white/50 border-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {zone === 'eyes' ? <Eye size={12} /> : <MapPin size={12} />}
                                            <span className="text-[10px] font-bold uppercase tracking-tight">
                                                {zone === 'eyes' ? 'Contour Yeux' : zone === 'forehead' ? 'Front' : 'Sillons Nasogéniens'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.hydration.enabled && (
                        <div className="rounded-2xl border border-sky-100 bg-sky-50/30 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-xs font-black text-sky-600 uppercase tracking-widest">
                                <Droplets size={14} /> Hydratation — Analyse du confort
                            </div>
                            
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Sensation de la peau</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['tight', 'normal', 'very-dry'] as const).map((feel) => (
                                        <button
                                            key={feel}
                                            type="button"
                                            onClick={() => setSingle('hydration', 'feel', feel)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                                questionnaire.hydration.feel === feel
                                                ? 'bg-white border-sky-400 shadow-md ring-2 ring-sky-500/10'
                                                : 'bg-white/50 border-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                                                questionnaire.hydration.feel === feel ? 'border-sky-200 bg-sky-50' : 'border-slate-100 bg-slate-50'
                                            }`}>
                                                <div className={`w-full h-full rounded-full opacity-30 ${
                                                    feel === 'normal' ? 'bg-sky-400' : 
                                                    feel === 'tight' ? 'bg-sky-200' : 
                                                    'bg-slate-300'
                                                }`} style={{ 
                                                    backgroundImage: feel === 'very-dry' ? 'radial-gradient(#94a3b8 1px, transparent 1px)' : 'none',
                                                    backgroundSize: '4px 4px'
                                                }} />
                                            </div>
                                            <span className={`text-[10px] font-bold ${questionnaire.hydration.feel === feel ? 'text-sky-700' : ''}`}>
                                                {feel === 'tight' ? 'Tiraillée' : feel === 'normal' ? 'Normale' : 'Très Sèche'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.blackheads.enabled && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-widest">
                                <CircleDot size={14} /> Points Noirs — Diagnostic de Visibilité
                            </div>
                            
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Densité & Visibilité</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['low', 'medium', 'high'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('blackheads', 'severity', level)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                                questionnaire.blackheads.severity === level
                                                ? 'bg-white border-slate-400 shadow-md ring-2 ring-slate-500/10'
                                                : 'bg-white/50 border-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                                                questionnaire.blackheads.severity === level ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-slate-50'
                                            }`}>
                                                <div className="flex flex-wrap gap-0.5 justify-center p-1">
                                                    <div className="h-1 w-1 rounded-full bg-slate-800" />
                                                    {level !== 'low' && <div className="h-1 w-1 rounded-full bg-slate-800" />}
                                                    {level === 'high' && (
                                                        <>
                                                            <div className="h-1 w-1 rounded-full bg-slate-800" />
                                                            <div className="h-1 w-1 rounded-full bg-slate-800" />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold ${questionnaire.blackheads.severity === level ? 'text-slate-700' : ''}`}>
                                                {level === 'low' ? 'Faible' : level === 'medium' ? 'Modéré' : 'Élevé'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Zones de concentration</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['nose', 'chin', 'cheeks'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => toggleMultiSelect('blackheads', 'location', zone)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                                                questionnaire.blackheads.location.includes(zone)
                                                ? 'bg-white border-slate-400 text-slate-700 shadow-sm'
                                                : 'bg-white/50 border-slate-100 text-slate-500'
                                            }`}
                                        >
                                            <MapPin size={12} className={questionnaire.blackheads.location.includes(zone) ? 'text-slate-600' : 'text-slate-300'} />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">
                                                {zone === 'nose' ? 'Nez' : zone === 'chin' ? 'Menton' : 'Joues'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.pores.enabled && (
                        <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-xs font-black text-violet-600 uppercase tracking-widest">
                                <Layers size={14} /> Pores — Analyse de la Texture
                            </div>
                            
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Visibilité des pores</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['low', 'medium', 'high'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('pores', 'visibility', level)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                                questionnaire.pores.visibility === level
                                                ? 'bg-white border-violet-400 shadow-md ring-2 ring-violet-500/10'
                                                : 'bg-white/50 border-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                                                questionnaire.pores.visibility === level ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-slate-50'
                                            }`}>
                                                <div className="grid grid-cols-2 gap-0.5 opacity-40">
                                                    <div className="h-1 w-1 rounded-full bg-violet-600" />
                                                    <div className="h-1 w-1 rounded-full bg-violet-600" />
                                                    {level !== 'low' && <div className="h-1 w-1 rounded-full bg-violet-600" />}
                                                    {level === 'high' && <div className="h-1 w-1 rounded-full bg-violet-600" />}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold ${questionnaire.pores.visibility === level ? 'text-violet-700' : ''}`}>
                                                {level === 'low' ? 'Fins' : level === 'medium' ? 'Visibles' : 'Dilatés'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Distribution</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['tzone', 'cheeks', 'all'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => setSingle('pores', 'zone', zone)}
                                            className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                questionnaire.pores.zone === zone
                                                ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                                                : 'bg-white border-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {zone === 'tzone' ? 'Zone T' : zone === 'cheeks' ? 'Joues' : 'Global'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.sensitivity.enabled && (
                        <div className="rounded-2xl border border-red-100 bg-red-50/30 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-xs font-black text-red-600 uppercase tracking-widest">
                                <ShieldAlert size={14} /> Sensibilité — Seuil de Réactivité
                            </div>
                            
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Niveau de tolérance</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['low', 'medium', 'high'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('sensitivity', 'level', level)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                                questionnaire.sensitivity.level === level
                                                ? 'bg-white border-red-400 shadow-md ring-2 ring-red-500/10'
                                                : 'bg-white/50 border-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                                                questionnaire.sensitivity.level === level ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'
                                            }`}>
                                                <div className={`h-4 w-4 rounded-full transition-all ${
                                                    level === 'low' ? 'bg-orange-300' : 
                                                    level === 'medium' ? 'bg-orange-500' : 
                                                    'bg-red-600 animate-pulse'
                                                }`} />
                                            </div>
                                            <span className={`text-[10px] font-bold ${questionnaire.sensitivity.level === level ? 'text-red-700' : ''}`}>
                                                {level === 'low' ? 'Stable' : level === 'medium' ? 'Réactive' : 'Critique'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.redness.enabled && (
                        <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-xs font-black text-rose-600 uppercase tracking-widest">
                                <Zap size={14} /> Rougeurs — Diagnostic Vasculaire
                            </div>
                            
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Intensité de l'érythème</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['occasional', 'persistent', 'flaring'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('redness', 'level', level)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                                questionnaire.redness.level === level
                                                ? 'bg-white border-rose-400 shadow-md ring-2 ring-rose-500/10'
                                                : 'bg-white/50 border-slate-100 text-slate-400'
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${
                                                questionnaire.redness.level === level ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50'
                                            }`}>
                                                <div className={`h-5 w-5 rounded-full filter blur-[1px] ${
                                                    level === 'occasional' ? 'bg-rose-200' : 
                                                    level === 'persistent' ? 'bg-rose-400' : 
                                                    'bg-rose-600 animate-pulse'
                                                }`} />
                                            </div>
                                            <span className={`text-[10px] font-bold ${questionnaire.redness.level === level ? 'text-rose-700' : ''}`}>
                                                {level === 'occasional' ? 'Légère' : level === 'persistent' ? 'Diffuse' : 'Intense'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Foyers de chaleur</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['cheeks', 'nose', 'chin'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => toggleMultiSelect('redness', 'location', zone)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                                                questionnaire.redness.location.includes(zone)
                                                ? 'bg-white border-rose-400 text-rose-700 shadow-sm'
                                                : 'bg-white/50 border-slate-100 text-slate-500'
                                            }`}
                                        >
                                            <MapPin size={12} className={questionnaire.redness.location.includes(zone) ? 'text-rose-500' : 'text-slate-300'} />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">
                                                {zone === 'cheeks' ? 'Joues' : zone === 'nose' ? 'Nez' : 'Menton'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
