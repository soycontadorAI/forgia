'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type { ExperienceLevel, Objective, EquipmentLevel, WeightUnit } from '@/types/profile';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { trackSignupComplete, trackOnboardingStep } from '@/lib/analytics';
import StepIndicator from './StepIndicator';
import Step1BasicInfo from './Step1BasicInfo';
import Step2Objectives from './Step2Objectives';
import Step4Equipment from './Step4Equipment';
import Step4Frequency from './Step4Frequency';

interface FormData {
  name: string;
  age: number | '';
  experienceLevel: ExperienceLevel | null;
  injuryHistory: string;
  weightUnit: WeightUnit;
  objectives: Objective[];
  equipmentLevel: EquipmentLevel | null;
  trainingFrequency: number | null;
}

export default function OnboardingWizard() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    experienceLevel: null,
    injuryHistory: '',
    weightUnit: 'lbs' as WeightUnit,
    objectives: [],
    equipmentLevel: null,
    trainingFrequency: null,
  });

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return (
          formData.name.trim() !== '' &&
          typeof formData.age === 'number' &&
          formData.age >= 13 &&
          formData.age <= 120 &&
          formData.experienceLevel !== null
        );
      case 2:
        return formData.objectives.length >= 1;
      case 3:
        return formData.equipmentLevel !== null;
      case 4:
        return formData.trainingFrequency !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepValid(currentStep) && currentStep < 4) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      trackOnboardingStep(nextStep);
      window.scrollTo({ top: 0 });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0 });
    }
  };

  const handleSubmit = async () => {
    if (!user || !isStepValid(4)) return;

    setIsSubmitting(true);
    setError('');

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email!,
        display_name: formData.name.trim(),
        age: formData.age as number,
        experience_level: formData.experienceLevel,
        injury_history: formData.injuryHistory.trim() || null,
        objectives: formData.objectives,
        training_type: 'CrossFit',
        equipment_level: formData.equipmentLevel,
        weight_unit: formData.weightUnit,
        training_frequency: formData.trainingFrequency,
        onboarding_completed: true,
      });

    if (updateError) {
      setError('No se pudo guardar tu perfil. Inténtalo de nuevo.');
      setIsSubmitting(false);
      return;
    }

    await refreshProfile();
    trackSignupComplete();
    router.push('/app');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            data={{
              name: formData.name,
              age: formData.age,
              experienceLevel: formData.experienceLevel,
              injuryHistory: formData.injuryHistory,
              weightUnit: formData.weightUnit,
            }}
            onChange={(updates) => updateFormData(updates)}
          />
        );
      case 2:
        return (
          <Step2Objectives
            selectedObjectives={formData.objectives}
            onChange={(objectives) => updateFormData({ objectives })}
          />
        );
      case 3:
        return (
          <Step4Equipment
            selectedEquipment={formData.equipmentLevel}
            onChange={(equipmentLevel) => updateFormData({ equipmentLevel })}
          />
        );
      case 4:
        return (
          <Step4Frequency
            selectedFrequency={formData.trainingFrequency}
            onChange={(trainingFrequency) => updateFormData({ trainingFrequency })}
          />
        );
      default:
        return null;
    }
  };

  return (
    // En móvil la barra de acciones va fija: el padding inferior evita que tape el contenido
    <div className="mx-auto max-w-xl pb-28 sm:pb-0">
      <StepIndicator currentStep={currentStep} />

      <div className="min-h-[320px]">{renderStep()}</div>

      {error && (
        <div role="alert" className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
          {error}
        </div>
      )}

      {/*
        Barra de acciones: fija sobre la barra de pestañas en móvil, en línea desde sm.
        Es opaca y queda por encima del botón del Coach IA (z-30), que en este paso estorbaría.
        Si la barra de pestañas no está (--tabbar-h: 0), respeta el área segura inferior.
      */}
      <div className="fixed inset-x-0 bottom-(--tabbar-h) z-35 border-t border-line bg-ground px-4 pt-3 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)-var(--tabbar-h)+1rem))] sm:static sm:z-auto sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0">
        <div className="mx-auto flex max-w-xl gap-3">
          {currentStep > 1 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handlePrev}
              disabled={isSubmitting}
              icon={<ArrowLeft className="h-5 w-5" aria-hidden="true" />}
              className="px-5"
            >
              Atrás
            </Button>
          )}
          {currentStep < 4 ? (
            <Button size="lg" onClick={handleNext} disabled={!isStepValid(currentStep)} className="flex-1">
              Siguiente
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!isStepValid(4)}
              loading={isSubmitting}
              icon={<Check className="h-5 w-5" aria-hidden="true" />}
              className="flex-1"
            >
              {isSubmitting ? 'Guardando...' : 'Completar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
