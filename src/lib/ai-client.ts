import type { Wod, GenerateWodRequest } from '@/types/wod';
import type { MonthlyProgram } from '@/types/program';
import type { WeeklyAnalysisResponse } from '@/types/weekly-analysis';
import type { TrainingIntelligenceResponse } from '@/app/api/training-intelligence/route';
import type { LevelAssessment, AssessmentSelfReport } from '@/types/assessment';
import type { ChatHistoryEntry } from '@/types/chat';

export async function generateProgram(): Promise<MonthlyProgram> {
  const response = await fetch('/api/generate-program', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Error del servidor (estado ${response.status})` }));
    if (response.status === 429) {
      throw new Error(errorData.error || 'Has alcanzado el límite diario. Intenta de nuevo mañana.');
    }
    throw new Error(errorData.error || `La solicitud falló con el estado ${response.status}`);
  }

  return response.json();
}

export async function generateWod(request?: GenerateWodRequest): Promise<Wod> {
  const response = await fetch('/api/generate-wod', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request ?? {}),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Error del servidor (estado ${response.status})` }));
    if (response.status === 429) {
      throw new Error(errorData.error || 'Has alcanzado el límite diario. Intenta de nuevo mañana.');
    }
    throw new Error(errorData.error || `La solicitud falló con el estado ${response.status}`);
  }

  return response.json();
}

export async function fetchWeeklyAnalysis(): Promise<WeeklyAnalysisResponse> {
  const response = await fetch('/api/weekly-analysis');
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Has alcanzado el límite diario de análisis. Intenta de nuevo mañana.');
    }
    throw new Error('Error al cargar el análisis semanal');
  }
  return response.json();
}

export async function fetchTrainingIntelligence(): Promise<TrainingIntelligenceResponse> {
  const response = await fetch('/api/training-intelligence');
  if (!response.ok) {
    throw new Error('Error al cargar inteligencia de entrenamiento');
  }
  return response.json();
}

export async function startAssessment(benchmarkId: string): Promise<LevelAssessment> {
  const response = await fetch('/api/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ benchmarkId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error al iniciar evaluación' }));
    throw new Error(errorData.error || 'Error al iniciar evaluación');
  }
  return response.json();
}

export async function completeAssessment(
  id: string,
  selfReport: AssessmentSelfReport
): Promise<{ assessment: LevelAssessment; levelChanged: boolean }> {
  const response = await fetch(`/api/assessments/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selfReport }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error al completar evaluación' }));
    throw new Error(errorData.error || 'Error al completar evaluación');
  }
  return response.json();
}

export async function sendChatMessage(
  message: string,
  history: ChatHistoryEntry[],
  wod: Wod | null,
  signal?: AbortSignal
): Promise<{ body: ReadableStream<Uint8Array>; remaining: number }> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history: history.slice(-6),
      context: { wod },
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
    if (response.status === 429) {
      throw new Error(errorData.error || 'Has alcanzado el límite diario de mensajes. Intenta de nuevo mañana.');
    }
    if (response.status === 503) {
      throw new Error(errorData.error || 'El servicio de IA está temporalmente ocupado. Intenta de nuevo en unos segundos.');
    }
    throw new Error(errorData.error || 'No se pudo enviar tu mensaje. Intenta de nuevo.');
  }

  if (!response.body) {
    throw new Error('No se recibió respuesta del servidor.');
  }

  const remaining = parseInt(response.headers.get('X-Chat-Remaining') ?? '20', 10);

  return { body: response.body, remaining };
}
