import { ClientProfile, Appointment, FavoriteService, AppConfig } from '../types';

/**
 * Calculates the difference in days between two date strings (YYYY-MM-DD).
 * Reference date defaults to the current local day.
 */
export function getTodayISO(): string {
  // ponytail: local date, not UTC. toISOString() rolls over to tomorrow after ~22:00 in Spain.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function calculateDaysBetween(startDateStr: string, endDateStr: string = getTodayISO()): number {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  } catch {
    return 0;
  }
}

/**
 * Dynamically estimates a client's average frequency of visits in days based on 
 * their past completed/paid appointments. Falling back to pre-set frequency or 30 days.
 */
export function estimateAverageFrequency(
  client: ClientProfile, 
  allAppointments: Appointment[]
): number {
  // Extract completed/paid appointments for this client
  const paidAppts = allAppointments
    .filter(a => a.clientId === client.id && a.status === 'Pagado')
    .sort((a, b) => a.date.localeCompare(b.date));

  // If we have history in appointmentHistory as well, we can incorporate it
  const historyDates = (client.appointmentHistory || [])
    .filter(h => h.status === 'Pagado' || h.status === undefined)
    .map(h => {
      // Approximate date format in history is "12 Sep" but let's try to convert/parse if possible,
      // otherwise we rely on year or default. Since history is example data, we will prioritize active appointments.
      return h.date;
    });

  if (paidAppts.length >= 2) {
    let totalDaysBetweeen = 0;
    for (let i = 1; i < paidAppts.length; i++) {
      totalDaysBetweeen += calculateDaysBetween(paidAppts[i-1].date, paidAppts[i].date);
    }
    const derivedFreq = Math.round(totalDaysBetweeen / (paidAppts.length - 1));
    return derivedFreq > 7 ? derivedFreq : 15; // Minimum frequency cap at 1 week
  }

  // Fallback to average frequency in profile, or a reasonable default (30 days)
  return client.averageFrequencyDays || 30;
}

/**
 * Calculates current metrics and returns updated client profile risk classification
 */
export interface RiskAnalysis {
  riskDays: number;
  averageFrequency: number;
  riskLevel: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  ratio: number;
  reason: string;
  recommendation: {
    title: string;
    description: string;
    actionLabel: string;
  };
}

export function analyzeChurnRisk(
  client: ClientProfile,
  allAppointments: Appointment[],
  referenceDate: string = getTodayISO(),
  config?: Pick<AppConfig, 'highRiskThresholdDays' | 'midRiskThresholdDays'>
): RiskAnalysis {
  // 1. Get last visit date. Find either the client's hardcoded lastVisitDate
  // or the latest paid appointment date which is <= referenceDate.
  let latestVisitDate = client.lastVisitDate || '2026-01-01';

  const paidAppts = allAppointments
    .filter(a => a.clientId === client.id && a.status === 'Pagado' && a.date <= referenceDate)
    .sort((a, b) => b.date.localeCompare(a.date)); // descending, newest first

  if (paidAppts.length > 0 && paidAppts[0].date > latestVisitDate) {
    latestVisitDate = paidAppts[0].date;
  }

  // Calculate days passed since that last visit
  const riskDays = calculateDaysBetween(latestVisitDate, referenceDate);

  // 2. Estimate average frequency — ponytail: fallback a 30 si es 0 (cliente nuevo online)
  const rawFrequency = estimateAverageFrequency(client, allAppointments);
  const averageFrequency = rawFrequency > 0 ? rawFrequency : 30;

  // 3. Determine risk level: ratio-based, con umbrales de config como mínimo absoluto
  const ratio = Number((riskDays / averageFrequency).toFixed(2));
  let riskLevel: 'Bajo' | 'Medio' | 'Alto' | 'Crítico' = 'Bajo';

  // Umbrales en días absolutos (de config) — solo aplican si son más estrictos que el ratio
  const midThreshold = config?.midRiskThresholdDays ?? Math.round(averageFrequency * 1.0);
  const highThreshold = config?.highRiskThresholdDays ?? Math.round(averageFrequency * 2.0);
  const critThreshold = Math.round(averageFrequency * 3.0);

  if (riskDays < midThreshold) {
    riskLevel = 'Bajo';
  } else if (riskDays < highThreshold) {
    riskLevel = 'Medio';
  } else if (riskDays < critThreshold) {
    riskLevel = 'Alto';
  } else {
    riskLevel = 'Crítico';
  }

  // 4. Generate straightforward, diagnostic reasons
  let reason = '';
  switch (riskLevel) {
    case 'Bajo':
      reason = `Frecuencia saludable. Visitó hace ${riskDays} días, dentro de su ciclo estimado de ${averageFrequency} días (Ratio: ${ratio}x).`;
      break;
    case 'Medio':
      reason = `Desviación temprana. Lleva ${riskDays} días ausente, excediendo ligeramente su promedio de ${averageFrequency} días (Ratio: ${ratio}x).`;
      break;
    case 'Alto':
      reason = `Ausencia prolongada. Registra ${riskDays} días inactiva, duplicando casi su frecuencia de ${averageFrequency} días (Ratio: ${ratio}x).`;
      break;
    case 'Crítico':
      reason = `Inactividad crítica. Suma ${riskDays} días sin programar visitas, superando por mucho los ${averageFrequency} días habituales (Ratio: ${ratio}x).`;
      break;
  }

  // 5. Generate action-oriented, simple recommendations depending on the treatment context
  const favorite = client.favoriteServices && client.favoriteServices.length > 0
    ? client.favoriteServices[0].name
    : client.lastVisitService || 'su tratamiento preferido';

  let recommendation = {
    title: '',
    description: '',
    actionLabel: ''
  };

  switch (riskLevel) {
    case 'Bajo':
      recommendation = {
        title: 'Fidelización Preventiva',
        description: `La clienta se encuentra al día. Se aconseja obsequiar un ritual sensorial de lavado o muestra de champú orgánico en su siguiente cita de ${favorite}.`,
        actionLabel: 'Ver Ficha'
      };
      break;
    case 'Medio':
      recommendation = {
        title: 'Prioridad de Agenda',
        description: `Enviar un recordatorio cordial de cortesía mediante una invitación de agenda prioritaria para su próximo servicio de ${favorite} antes de que finalice la semana.`,
        actionLabel: 'Sugerir Cita'
      };
      break;
    case 'Alto':
      recommendation = {
        title: 'Corte de Cortesía o 10% Off',
        description: `Reactivar ofreciendo un 10% de descuento directo en el tratamiento de ${favorite} o un peinado de diseño de cortesía para incentivar el regreso inmediato.`,
        actionLabel: 'Enviar Oferta'
      };
      break;
    case 'Crítico':
      recommendation = {
        title: 'Recuperación de Autor de Regalo (Valor 35€)',
        description: `Lanzar oferta de rescate de cortesía máxima: obsequiar un Tratamiento completo de Hidratación Profunda con vaporizador (gratis con su reserva premium de ${favorite}).`,
        actionLabel: 'Enviar Rescate'
      };
      break;
  }

  return {
    riskDays,
    averageFrequency,
    riskLevel,
    ratio,
    reason,
    recommendation
  };
}

import { generateAvatarUrl } from '../hooks/useTenantData';

/** Factory for a blank ClientProfile. Centralizes the default shape used in Agenda, Settings CSV import, and App quick-book. */
export function buildNewClient(
  overrides: Pick<ClientProfile, 'id' | 'name' | 'phoneNumber' | 'tenantId'> &
    Partial<Pick<ClientProfile, 'avatar' | 'email' | 'lastVisitService' | 'favoriteServices' | 'aiReason'>>
): ClientProfile {
  return {
    avatar: generateAvatarUrl(overrides.name),
    email: '',
    birthdate: '',
    age: 0,
    isVip: false,
    riskLevel: 'Bajo',
    riskDays: 0,
    lastVisitDate: getTodayISO(),
    lastVisitService: '',
    spendingLtv: 0,
    totalVisits: 1,
    averageFrequencyDays: 30,
    favoriteServices: [],
    appointmentHistory: [],
    preferences: [],
    technicalNotes: '',
    aiReason: 'Ficha creada manualmente.',
    suggestedOfferTitle: '',
    suggestedOfferDesc: '',
    whatsappLog: [],
    contactConsent: false,
    marketingOptOut: false,
    ...overrides,
  };
}
