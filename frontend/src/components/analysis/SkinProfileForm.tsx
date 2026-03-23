import React, { useRef } from 'react';
import type { UserSkinProfile } from '../../types/aiAnalysis';
import {
    Calendar, Droplets, AlertTriangle, CheckCircle2,
    X, Upload, Sun, Shield,
    Zap, Layers
} from 'lucide-react';

interface SkinProfileFormProps {
    profile: UserSkinProfile;
    setProfile: (profile: UserSkinProfile) => void;
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

const COMMON_CONCERNS = [
    'Acné', 'Rides', 'Pores dilatés', 'Rougeurs', 'Taches brunes', 'Cernes', 'Déshydratation', 'Points noirs'
];

export const SkinProfileForm: React.FC<SkinProfileFormProps> = ({ profile, setProfile, disabled }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleConcernToggle = (concern: string) => {
        const newConcerns = profile.concerns.includes(concern)
            ? profile.concerns.filter(c => c !== concern)
            : [...profile.concerns, concern];
        setProfile({ ...profile, concerns: newConcerns });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile({ ...profile, imageBase64: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setProfile({ ...profile, imageBase64: undefined });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-6">
            {/* Image Upload */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Image pour analyse (Optionnel)</label>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                />

                {profile.imageBase64 ? (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-teal-100 shadow-sm transition-all hover:border-teal-200">
                        <img
                            src={profile.imageBase64}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                        <button
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-red-500 shadow-lg hover:bg-red-50 transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 backdrop-blur-[2px] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-teal-400" />
                            Image prête pour l'analyse IA
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                        className="w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:bg-slate-100 hover:border-slate-300 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-teal-500 group-hover:scale-110 transition-all shadow-sm">
                            <Upload size={20} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-slate-600">Ajouter une photo</p>
                            <p className="text-[10px] text-slate-400 mt-1">Selfie clair recommandé</p>
                        </div>
                    </button>
                )}
            </div>

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

            {/* Préoccupations */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Préoccupations</label>
                <div className="flex flex-wrap gap-2">
                    {COMMON_CONCERNS.map(concern => {
                        const isSelected = profile.concerns.includes(concern);
                        return (
                            <button
                                key={concern}
                                onClick={() => handleConcernToggle(concern)}
                                disabled={disabled}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${isSelected
                                    ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                {isSelected ? <CheckCircle2 size={12} /> : <Droplets size={12} className="text-slate-300" />}
                                {concern}
                            </button>
                        );
                    })}
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
