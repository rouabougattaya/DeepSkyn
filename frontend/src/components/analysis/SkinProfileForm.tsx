import React, { useMemo } from 'react';
import type { UserSkinProfile } from '../../types/aiAnalysis';
import {
    Calendar, AlertTriangle, CheckCircle2,
    Sun, Shield,
    Zap, Layers
} from 'lucide-react';
import type { SkinQuestionnaireData } from '../../types/skinQuestionnaire';

interface SkinProfileFormProps {
    profile: UserSkinProfile;
    setProfile: (profile: UserSkinProfile) => void;
    questionnaire: SkinQuestionnaireData;
    setQuestionnaire: (data: SkinQuestionnaireData) => void;
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
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Âge</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="number"
                            value={profile.age}
                            onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 25 })}
                            disabled={disabled}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all outline-none"
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
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">Acne - Details</div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Gravite</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['mild', 'moderate', 'severe'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('acne', 'severity', level)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.acne.severity === level
                                                ? 'bg-rose-100 border-rose-200 text-rose-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {level === 'mild' ? 'Leger' : level === 'moderate' ? 'Modere' : 'Severe'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Type</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['whiteheads', 'cystic', 'hormonal'] as const).map((kind) => (
                                        <button
                                            key={kind}
                                            type="button"
                                            onClick={() => setSingle('acne', 'type', kind)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.acne.type === kind
                                                ? 'bg-rose-100 border-rose-200 text-rose-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {kind === 'whiteheads' ? 'Whiteheads' : kind === 'cystic' ? 'Kystique' : 'Hormonal'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Zones</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['forehead', 'cheeks', 'chin'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => toggleMultiSelect('acne', 'location', zone)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.acne.location.includes(zone)
                                                ? 'bg-rose-100 border-rose-200 text-rose-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {zone === 'forehead' ? 'Front' : zone === 'cheeks' ? 'Joues' : 'Menton'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.wrinkles.enabled && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">Rides - Details</div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Profondeur</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['fine', 'deep'] as const).map((depth) => (
                                        <button
                                            key={depth}
                                            type="button"
                                            onClick={() => setSingle('wrinkles', 'depth', depth)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.wrinkles.depth === depth
                                                ? 'bg-amber-100 border-amber-200 text-amber-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {depth === 'fine' ? 'Ridules' : 'Rides profondes'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Zones</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['eyes', 'forehead', 'mouth'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => toggleMultiSelect('wrinkles', 'location', zone)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.wrinkles.location.includes(zone)
                                                ? 'bg-amber-100 border-amber-200 text-amber-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {zone === 'eyes' ? 'Yeux' : zone === 'forehead' ? 'Front' : 'Bouche'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.hydration.enabled && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">Hydratation - Details</div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">La peau ressent...</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['tight', 'normal', 'very-dry'] as const).map((feel) => (
                                        <button
                                            key={feel}
                                            type="button"
                                            onClick={() => setSingle('hydration', 'feel', feel)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.hydration.feel === feel
                                                ? 'bg-sky-100 border-sky-200 text-sky-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {feel === 'tight' ? 'Tiraillee' : feel === 'normal' ? 'Normale' : 'Tres seche'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.blackheads.enabled && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">Points noirs - Details</div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Visibilite</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['low', 'medium', 'high'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('blackheads', 'severity', level)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.blackheads.severity === level
                                                ? 'bg-slate-200 border-slate-300 text-slate-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {level === 'low' ? 'Faible' : level === 'medium' ? 'Moyen' : 'Eleve'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Zones</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['nose', 'chin', 'cheeks'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => toggleMultiSelect('blackheads', 'location', zone)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.blackheads.location.includes(zone)
                                                ? 'bg-slate-200 border-slate-300 text-slate-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {zone === 'nose' ? 'Nez' : zone === 'chin' ? 'Menton' : 'Joues'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.pores.enabled && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">Pores - Details</div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Visibilite</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['low', 'medium', 'high'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('pores', 'visibility', level)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.pores.visibility === level
                                                ? 'bg-violet-100 border-violet-200 text-violet-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {level === 'low' ? 'Faible' : level === 'medium' ? 'Moyen' : 'Eleve'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Zone principale</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['tzone', 'cheeks', 'all'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => setSingle('pores', 'zone', zone)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.pores.zone === zone
                                                ? 'bg-violet-100 border-violet-200 text-violet-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {zone === 'tzone' ? 'Zone T' : zone === 'cheeks' ? 'Joues' : 'Partout'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.sensitivity.enabled && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">Sensibilite - Details</div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Niveau</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['low', 'medium', 'high'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('sensitivity', 'level', level)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.sensitivity.level === level
                                                ? 'bg-red-100 border-red-200 text-red-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {level === 'low' ? 'Faible' : level === 'medium' ? 'Moyen' : 'Eleve'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {questionnaire.redness.enabled && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">Rougeurs - Details</div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Intensite</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['occasional', 'persistent', 'flaring'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setSingle('redness', 'level', level)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.redness.level === level
                                                ? 'bg-rose-100 border-rose-200 text-rose-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {level === 'occasional' ? 'Occasionnelles' : level === 'persistent' ? 'Persistantes' : 'Poussees'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Zones</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['cheeks', 'nose', 'chin'] as const).map((zone) => (
                                        <button
                                            key={zone}
                                            type="button"
                                            onClick={() => toggleMultiSelect('redness', 'location', zone)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${questionnaire.redness.location.includes(zone)
                                                ? 'bg-rose-100 border-rose-200 text-rose-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            {zone === 'cheeks' ? 'Joues' : zone === 'nose' ? 'Nez' : 'Menton'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info contextuelle */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 items-start">
                <AlertTriangle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed italic">
                    Ces informations aident l'IA à contextualiser l'analyse de votre visage pour un score de précision accrue.
                </p>
            </div>
        </div>
    );
};
