'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/profiles';
import { trackProfileUpdated } from '@/lib/analytics';
import {
  EXPERIENCE_LEVELS,
  OBJECTIVES,
  INCOMPATIBLE_OBJECTIVES,
  CROSSFIT_EQUIPMENT_OPTIONS,
  TRAINING_FREQUENCY_OPTIONS,
} from '@/lib/training-constants';
import type { ExperienceLevel, Objective, EquipmentLevel, WeightUnit, Gender } from '@/types/profile';
import SegmentedButton from '@/components/ui/SegmentedButton';
import {
  Info,
  Circle,
  CircleDot,
  CircleCheck,
  Square,
  Save,
  Loader2,
} from 'lucide-react';
import LevelAssessmentCard from '@/components/LevelAssessmentCard';

interface FormData {
  age: number | '';
  weight: number | '';
  height: number | '';
  experienceLevel: ExperienceLevel | null;
  injuryHistory: string;
  weightUnit: WeightUnit;
  objectives: Objective[];
  equipmentLevel: EquipmentLevel | null;
  trainingFrequency: number | null;
  gender: Gender | null;
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    age: '',
    weight: '',
    height: '',
    experienceLevel: null,
    injuryHistory: '',
    weightUnit: 'lbs',
    objectives: [],
    equipmentLevel: null,
    trainingFrequency: null,
    gender: null,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Initialize form from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        age: profile.age ?? '',
        weight: profile.weight ?? '',
        height: profile.height ?? '',
        experienceLevel: profile.experience_level,
        injuryHistory: profile.injury_history || '',
        weightUnit: profile.weight_unit || 'lbs',
        objectives: profile.objectives || [],
        equipmentLevel: profile.equipment_level,
        trainingFrequency: profile.training_frequency ?? null,
        gender: profile.gender ?? null,
      });
    }
  }, [profile]);

  // Dirty checking — detect if form has changed from profile values
  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      formData.age !== (profile.age ?? '') ||
      formData.weight !== (profile.weight ?? '') ||
      formData.height !== (profile.height ?? '') ||
      formData.experienceLevel !== profile.experience_level ||
      formData.injuryHistory !== (profile.injury_history || '') ||
      formData.weightUnit !== (profile.weight_unit || 'lbs') ||
      JSON.stringify(formData.objectives) !== JSON.stringify(profile.objectives || []) ||
      formData.equipmentLevel !== profile.equipment_level ||
      formData.trainingFrequency !== (profile.training_frequency ?? null) ||
      formData.gender !== (profile.gender ?? null)
    );
  }, [formData, profile]);

  const updateFormField = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // --- Objectives logic ---
  const isObjectiveSelected = (obj: Objective) => formData.objectives.includes(obj);

  const isObjectiveDisabled = (obj: Objective) => {
    if (isObjectiveSelected(obj)) return false;
    if (formData.objectives.length >= 2) return true;
    return formData.objectives.some(
      (selected) => INCOMPATIBLE_OBJECTIVES[selected]?.includes(obj)
    );
  };

  const getIncompatibleMessage = (): string | null => {
    for (const selected of formData.objectives) {
      const incompatibles = INCOMPATIBLE_OBJECTIVES[selected];
      if (incompatibles.length > 0) {
        const disabledNames = incompatibles.filter(
          (obj) => OBJECTIVES.some((o) => o.value === obj) && !isObjectiveSelected(obj)
        );
        if (disabledNames.length > 0) {
          return `${selected} no es compatible con ${disabledNames.join(', ')} para este programa.`;
        }
      }
    }
    return null;
  };

  const toggleObjective = (obj: Objective) => {
    if (isObjectiveDisabled(obj)) return;
    if (isObjectiveSelected(obj)) {
      updateFormField({ objectives: formData.objectives.filter((o) => o !== obj) });
    } else {
      updateFormField({ objectives: [...formData.objectives, obj] });
    }
  };

  // --- Validation ---
  const isFormValid = (): boolean => {
    return (
      typeof formData.age === 'number' &&
      formData.age >= 13 &&
      formData.age <= 120 &&
      formData.experienceLevel !== null &&
      formData.objectives.length >= 1 &&
      formData.objectives.length <= 2 &&
      formData.equipmentLevel !== null
    );
  };

  // --- Save ---
  const handleSave = async () => {
    if (!user || !isFormValid()) return;

    setIsSaving(true);

    try {
      await updateProfile(user.id, {
        display_name: profile?.display_name || '',
        age: formData.age as number,
        experience_level: formData.experienceLevel!,
        injury_history: formData.injuryHistory.trim() || null,
        objectives: formData.objectives,
        training_type: 'CrossFit',
        equipment_level: formData.equipmentLevel!,
        weight_unit: formData.weightUnit,
        training_frequency: formData.trainingFrequency,
        gender: formData.gender,
        weight: formData.weight === '' ? null : formData.weight,
        height: formData.height === '' ? null : formData.height,
      });

      await refreshProfile();
      trackProfileUpdated();
      toast.success('Cambios guardados correctamente.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  const incompatibleMessage = getIncompatibleMessage();

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          Mi Perfil
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
          Configura tu entrenamiento personalizado
        </p>
      </div>

      {/* Training Configuration */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          Configuración de Entrenamiento
        </h2>

        {/* Datos Físicos */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Datos Físicos
          </label>

          {/* Age + Weight + Height row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="profile-age" className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                Edad <span className="text-red-500">*</span>
              </label>
              <input
                id="profile-age"
                type="number"
                min={13}
                max={120}
                value={formData.age}
                onChange={(e) => updateFormField({ age: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="25"
                className="w-full px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-red-500 focus:border-red-500 transition duration-150 ease-in-out text-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-weight" className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                Peso (kg)
              </label>
              <input
                id="profile-weight"
                type="number"
                min={30}
                max={300}
                value={formData.weight}
                onChange={(e) => updateFormField({ weight: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="75"
                className="w-full px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-red-500 focus:border-red-500 transition duration-150 ease-in-out text-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-height" className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                Altura (cm)
              </label>
              <input
                id="profile-height"
                type="number"
                min={100}
                max={250}
                value={formData.height}
                onChange={(e) => updateFormField({ height: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="170"
                className="w-full px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-red-500 focus:border-red-500 transition duration-150 ease-in-out text-sm"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              Sexo
              <span className="text-neutral-400 font-normal ml-1">(opcional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { value: 'hombre' as Gender, label: 'Hombre' },
                { value: 'mujer' as Gender, label: 'Mujer' },
                { value: 'prefiero_no_definir' as Gender, label: 'Prefiero no definir' },
              ]).map(({ value, label }) => {
                const selected = formData.gender === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateFormField({ gender: selected ? null : value })}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 text-left ${
                      selected
                        ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    {selected ? (
                      <CircleDot className="w-5 h-5 text-red-500 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-neutral-300 dark:text-neutral-600 shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${selected ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5">
              Se usa para personalizar pesos, estándares y cargas en tus entrenamientos.
            </p>
          </div>
        </div>

        {/* Weight Unit */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Unidad de peso
          </label>
          <div className="w-full sm:w-48">
            <SegmentedButton
              options={['lbs', 'kg']}
              selected={formData.weightUnit}
              onSelect={(v) => updateFormField({ weightUnit: v as WeightUnit })}
            />
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5">
            Los pesos en tus WODs se mostrarán en esta unidad.
          </p>
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Nivel de experiencia <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPERIENCE_LEVELS.map(({ value, description }) => {
              const isSelected = formData.experienceLevel === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateFormField({ experienceLevel: value })}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  {isSelected ? (
                    <CircleDot className="w-5 h-5 text-red-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-neutral-300 dark:text-neutral-600 shrink-0" />
                  )}
                  <div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {value}
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Injury History */}
        <div>
          <label htmlFor="profile-injury" className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Historial de lesiones
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400 font-normal">(opcional)</span>
          </label>
          <textarea
            id="profile-injury"
            value={formData.injuryHistory}
            onChange={(e) => updateFormField({ injuryHistory: e.target.value })}
            placeholder="Ej: Lesión en rodilla izquierda hace 6 meses, dolor crónico en hombro..."
            className="w-full px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-red-500 focus:border-red-500 transition duration-150 ease-in-out text-sm"
            rows={3}
          />
        </div>

        {/* Objectives */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Objetivos <span className="text-red-500">*</span>
            <span className="text-neutral-400 font-normal ml-1">(selecciona 1 o 2)</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            {OBJECTIVES.map(({ value, icon: Icon, description }) => {
              const selected = isObjectiveSelected(value);
              const disabled = isObjectiveDisabled(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleObjective(value)}
                  disabled={disabled}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 text-left ${
                    selected
                      ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                      : disabled
                        ? 'border-neutral-200 dark:border-neutral-700 opacity-40 cursor-not-allowed'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${selected ? 'text-red-500' : 'text-neutral-400 dark:text-neutral-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      selected ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'
                    }`}>
                      {value}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {description}
                    </p>
                  </div>
                  {selected ? (
                    <CircleCheck className="w-5 h-5 text-red-500 shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-neutral-300 dark:text-neutral-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          {incompatibleMessage && (
            <div className="flex items-start gap-2 p-3 mt-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {incompatibleMessage}
              </p>
            </div>
          )}
        </div>

        {/* Equipment Level */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Equipamiento <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-3">
            {CROSSFIT_EQUIPMENT_OPTIONS.map(({ value, title, description, icon: Icon }) => {
              const selected = formData.equipmentLevel === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateFormField({ equipmentLevel: value })}
                  className={`flex items-start gap-4 text-left p-5 rounded-lg border transition-all duration-200 ${
                    selected
                      ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${selected ? 'text-red-500' : 'text-neutral-400 dark:text-neutral-500'}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base font-semibold ${
                      selected ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'
                    }`}>
                      {title}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {description}
                    </p>
                  </div>
                  {selected ? (
                    <CircleCheck className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-neutral-300 dark:text-neutral-600 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Training Frequency */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Frecuencia de entrenamiento
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TRAINING_FREQUENCY_OPTIONS.map(({ value, label, description }) => {
              const selected = formData.trainingFrequency === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateFormField({ trainingFrequency: value })}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 text-left ${
                    selected
                      ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <span className={`text-lg font-bold tabular-nums ${selected ? 'text-red-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {value}
                  </span>
                  <div>
                    <span className={`text-sm font-medium ${selected ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {label}
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Level Assessment */}
      <LevelAssessmentCard />

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving || !hasChanges || !isFormValid()}
        className="w-full py-3 text-sm font-bold uppercase tracking-wider text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Guardar Cambios
          </>
        )}
      </button>

    </div>
  );
}
