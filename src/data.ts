import { Tenant, StaffMember, Service, Appointment, ClientProfile, InventoryItem } from './types';

const TODAY_ISO = new Date().toISOString().split('T')[0];

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'madrid-centro',
    name: 'Elena de Autor - Madrid Salamanca',
    address: 'Calle de Claudio Coello 45',
    phone: '+34 910 123 456',
    city: 'Madrid'
  },
  {
    id: 'barcelona-sarria',
    name: 'Elena de Autor - Barcelona Sarrià',
    address: 'Carrer de Mandri 12',
    phone: '+34 930 987 654',
    city: 'Barcelona'
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-elena',
    name: 'Elena García',
    role: 'Administrador',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    email: 'elena@elenaos.es',
    phone: '+34 601 222 333',
    specialty: 'Coloración y diagnóstico capilar',
    tenantId: 'madrid-centro',
    visibleToClient: false
  },
  {
    id: 'staff-laura',
    name: 'Laura Gómez',
    role: 'Estilista de autor',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    email: 'laura@elenaos.es',
    phone: '+34 602 333 444',
    specialty: 'Mechas Balayage y Cortes Premium',
    tenantId: 'madrid-centro',
    visibleToClient: true
  },
  {
    id: 'staff-sofia',
    name: 'Sofia Varela',
    role: 'Recepcionista',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    email: 'sofia@elenaos.es',
    phone: '+34 603 444 555',
    specialty: 'Atención al cliente y agenda estelar',
    tenantId: 'madrid-centro',
    visibleToClient: false
  },
  {
    id: 'staff-matteo',
    name: 'Mateo Font',
    role: 'Especialista Facial',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    email: 'mateo@elenaos.es',
    phone: '+34 604 555 666',
    specialty: 'Masajes faciales e Hidratación de Autor',
    tenantId: 'barcelona-sarria',
    visibleToClient: true
  }
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'serv-balayage',
    name: 'Mechas Balayage + Matiz Premium',
    category: 'Cabello',
    price: 120,
    durationMinutes: 180
  },
  {
    id: 'serv-keratina',
    name: 'Tratamiento de Keratina Orgánica',
    category: 'Cabello',
    price: 150,
    durationMinutes: 120
  },
  {
    id: 'serv-manicura',
    name: 'Manicura Semipermanente Spa',
    category: 'Uñas',
    price: 35,
    durationMinutes: 45
  },
  {
    id: 'serv-facial',
    name: 'Tratamiento Facial Iluminador',
    category: 'Facial',
    price: 75,
    durationMinutes: 60
  },
  {
    id: 'serv-masaje',
    name: 'Masaje Relajante de autor (60m)',
    category: 'Masaje',
    price: 65,
    durationMinutes: 60
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-1',
    clientName: 'Sofia Vergara',
    clientId: 'carmen-ruiz', // Link code
    serviceName: 'Tratamiento Facial Iluminador',
    serviceId: 'serv-facial',
    staffName: 'Elena García',
    staffId: 'staff-elena',
    time: '10:00',
    date: TODAY_ISO,
    price: 75,
    status: 'Reservado',
    tenantId: 'madrid-centro'
  },
  {
    id: 'appt-2',
    clientName: 'Laura Gómez',
    clientId: 'marta-iglesias',
    serviceName: 'Masaje Relajante de autor (60m)',
    serviceId: 'serv-masaje',
    staffName: 'Laura Gómez',
    staffId: 'staff-laura',
    time: '11:30',
    date: TODAY_ISO,
    price: 65,
    status: 'Pagado',
    tenantId: 'madrid-centro'
  },
  {
    id: 'appt-3',
    clientName: 'Carmen Ruiz',
    clientId: 'carmen-ruiz',
    serviceName: 'Mechas Balayage + Matiz Premium',
    serviceId: 'serv-balayage',
    staffName: 'Laura Gómez',
    staffId: 'staff-laura',
    time: '13:00',
    date: TODAY_ISO,
    price: 120,
    status: 'Reservado',
    tenantId: 'madrid-centro'
  }
];

export const INITIAL_CLIENTS: ClientProfile[] = [
  {
    id: 'carmen-ruiz',
    name: 'Carmen Ruiz',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    phoneNumber: '+34 600 123 456',
    email: 'carmen.ruiz@email.com',
    birthdate: '15 de Mar (34 años)',
    age: 34,
    isVip: true,
    riskLevel: 'Crítico', // Default, but recalculates
    riskDays: 95,
    lastVisitDate: '2026-02-18',
    lastVisitService: 'Mechas Balayage + Matiz Premium',
    spendingLtv: 1450,
    totalVisits: 12,
    averageFrequencyDays: 45,
    favoriteServices: [
      { name: 'Mechas Balayage + Matiz Premium', count: 5, pricePerVisit: 120, icon: 'brush' },
      { name: 'Manicura Semipermanente Spa', count: 7, pricePerVisit: 35, icon: 'spa' }
    ],
    appointmentHistory: [
      { id: 'h1', date: '12 Sep', year: '2025', serviceName: 'Mechas Balayage + Corte + Peinado', attendedBy: 'Laura García', price: 165, status: 'Pagado' },
      { id: 'h2', date: '05 Ago', year: '2025', serviceName: 'Manicura Spa + Esmaltado Semi', attendedBy: 'Sofia Gómez', price: 45, status: 'Pagado' }
    ],
    preferences: [
      'Le gusta el café con bebida de avena, muy caliente.',
      'Prefiere música suave, estilo bossa nova o jazz ligero.',
      'Poco conversadora durante los servicios técnicos.'
    ],
    technicalNotes: '"Cuero cabelludo sensible. Usar siempre protector antes de la deco. Fórmula color: Raíz 6.0 + 20vol."',
    aiReason: '"Clienta habitual de Mechas que no ha reservado su retoque trimestral. Última visita hace más de 3 meses. Alto riesgo de pérdida."',
    suggestedOfferTitle: 'Tratamiento Hidratación de Regalo',
    suggestedOfferDesc: 'Tratamiento Hidratación de Regalo con su reserva de Mechas.',
    whatsappLog: [
      {
        id: 'msg1',
        sender: 'ai_auto',
        text: 'Hola Carmen, te recordamos tu cita de mañana a las 16:00 para Manicura Spa. ¿Confirmas tu asistencia? 💅',
        timestamp: '10:00',
        dateLabel: '04 Ago'
      },
      {
        id: 'msg2',
        sender: 'client',
        text: 'Hola! Sí, allí estaré. Gracias!',
        timestamp: '10:45',
        dateLabel: '04 Ago'
      }
    ],
    tenantId: 'madrid-centro'
  },
  {
    id: 'sofia-varela',
    name: 'Sofía Varela',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    phoneNumber: '+34 622 987 654',
    email: 'sofia.varela@email.com',
    birthdate: '10 de Feb (29 años)',
    age: 29,
    isVip: false,
    riskLevel: 'Alto',
    riskDays: 62,
    lastVisitDate: '2026-03-23',
    lastVisitService: 'Tratamiento de Keratina Orgánica',
    spendingLtv: 850,
    totalVisits: 8,
    averageFrequencyDays: 30,
    favoriteServices: [
      { name: 'Tratamiento de Keratina Orgánica', count: 3, pricePerVisit: 150, icon: 'brush' },
      { name: 'Peinado Ondas', count: 5, pricePerVisit: 30, icon: 'spa' }
    ],
    appointmentHistory: [
      { id: 'h4', date: '05 Nov', year: '2025', serviceName: 'Tratamiento Keratina', attendedBy: 'Sofia', price: 150, status: 'Pagado' }
    ],
    preferences: [
      'Prefiere té verde con limón.',
      'Le agradan las conversaciones animadas sobre tendencias capilares.'
    ],
    technicalNotes: '"Cabello poroso. Requiere extra hidratación post-champú. Fórmula: Champú de Keratina sin sulfatos."',
    aiReason: '"Clienta de alta frecuencia trimestral. Último tratamiento hace 62 días sin cita agendada. Desvío de conducta."',
    suggestedOfferTitle: 'Peinado Exprés Obsequio',
    suggestedOfferDesc: 'Peinado Exprés de regalo con su Tratamiento de Nutrición.',
    whatsappLog: [
      {
        id: 'msg3',
        sender: 'ai_auto',
        text: 'Hola Sofía, hemos notado que han pasado 60 días de tu servicio. ¿Te agendamos un lavado y peinado?',
        timestamp: '11:00',
        dateLabel: '08 Nov'
      }
    ],
    tenantId: 'madrid-centro'
  },
  {
    id: 'marta-iglesias',
    name: 'Marta Iglesias',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=200',
    phoneNumber: '+34 655 456 789',
    email: 'marta.i@gmail.com',
    birthdate: '22 de Nov (41 años)',
    age: 41,
    isVip: false,
    riskLevel: 'Bajo',
    riskDays: 18,
    lastVisitDate: '2026-05-06',
    lastVisitService: 'Manicura Semipermanente Spa',
    spendingLtv: 320,
    totalVisits: 5,
    averageFrequencyDays: 25,
    favoriteServices: [
      { name: 'Manicura Semipermanente Spa', count: 4, pricePerVisit: 30, icon: 'spa' }
    ],
    appointmentHistory: [
      { id: 'h6', date: '06 May', year: '2026', serviceName: 'Manicura Semipermanente Spa', attendedBy: 'Elena', price: 35, status: 'Pagado' }
    ],
    preferences: [
      'Prefiere agua mineral fría.',
      'Muy reservada y le gusta trabajar con su portátil durante la manicura.'
    ],
    technicalNotes: '"Uñas frágiles. Usar base fortalecedora y evitar removedores agresivos."',
    aiReason: '"Excelente asistencia y en tiempo de retención óptimo. Se recomienda fidelizar con detalles casuales."',
    suggestedOfferTitle: 'Esmaltado Regalo',
    suggestedOfferDesc: 'Esmaltado de Regalo con su tratamiento reparador.',
    whatsappLog: [],
    tenantId: 'madrid-centro'
  }
];

// ponytail: fallback real cuando Gemini no está disponible. Interpola nombre/servicio/oferta
// reales de la clienta en vez de las 3 plantillas demo fijas (que decían "Marta"/"manicura" para todas).
export function buildFallbackTemplates(
  fullName: string,
  lastService: string,
  riskDays: number,
  offer: string,
): { Cercano: string; Profesional: string; Elegante: string } {
  const name = (fullName || 'cliente').trim().split(/\s+/)[0];
  const service = (lastService || 'tu último servicio').toLowerCase();
  const meses = riskDays >= 30 ? `${Math.round(riskDays / 30)} ${Math.round(riskDays / 30) === 1 ? 'mes' : 'meses'}` : `${riskDays} días`;
  const regalo = offer || 'un detalle de autor';
  return {
    Cercano: `¡Hola ${name}! Espero que estés muy bien.

He visto que ya hace ${meses} de tu ${service} y me acordé de ti. Como te echamos de menos por el salón, si reservas esta semana te invito a ${regalo} para consentirte.

¿Te busco un huequito?`,
    Profesional: `¡Hola ${name}! Un saludo del equipo.

Al revisar la agenda vimos que han pasado ${meses} desde tu ${service}. Nos encantaría volver a verte y mantener el resultado impecable. Si reservas esta semana, te obsequiamos ${regalo}.

¿Te reservamos un hueco?`,
    Elegante: `Estimada ${name},

Confiamos en que te encuentres de maravilla. Ha transcurrido un tiempo (${meses}) desde tu ${service} y deseamos invitarte a renovarlo para preservar su esplendor.

Como cortesía por tu fidelidad, nos complacerá ofrecerte ${regalo} en tu próxima visita.

Quedamos a tu disposición para asignarte tu cita.`,
  };
}

export const TEMPLATES_BY_TONE = {
  carmen: {
    Cercano: `¡Hola Carmen! Esperamos que estés súper bien. 

Siento mucho molestarte, pero al revisar nuestra agenda de citas he visto que pasaron tres meses desde tus últimas mechas y quería asegurarme de que tu pelo siga tan bonito como siempre. 

Como te extrañamos mucho por aquí, si agendas tu retoque para esta semana te voy a regalar un Tratamiento de Hidratación Profunda con vapor (que vale 35€) para consentirte. 

¿Vemos un huequito con Laura?`,
    Profesional: `¡Hola Carmen! Esperamos que estés muy bien. 

Hemos notado al revisar nuestra agenda de reservas que ya han pasado un par de meses desde tu última visita para tus mechas. Nos encantaría volver a verte y asegurarnos de que tu cabello siga luciendo espectacular. 

Como valoramos mucho tu fidelidad, si reservas tu retoque esta semana, queremos obsequiarte un Tratamiento de Hidratación Profunda (valorado en 35€). 

¿Te gustaría que busquemos un hueco en la agenda de Sofía?`,
    Elegante: `Estimada Carmen, un placer saludarte.

Esperamos que te encuentres de maravilla. Al revisar nuestro registro premium, observamos que tu última sesión de coloración fue hace tres meses. Deseamos invitarte a renovar el exquisito matizado de tus mechas para preservar su fulgor natural.

Por ser una de nuestras clientas más distinguidas, nos complacerá obsequiarte nuestro selecto Tratamiento de Hidratación Profunda de autor en tu próxima reserva.

Será un honor reservarte un espacio reservado con nuestras estilistas.`
  },
  sofia: {
    Cercano: `¡Hola Sofi! Qué gusto saludarte.

Te escribo porque vi que ya pasaron dos meses de tu última keratina y seguramente ya necesites ese retoque para mantener el cabello súper lacio y brillante.

Si agendas esta semana te regalamos un hermoso Peinado Exprés de obsequio. ¿Cómo te viene los próximos días?`,
    Profesional: `Hola Sofía, un saludo cordial de parte del equipo.

Hemos verificado en nuestra plataforma que han transcurrido 62 días desde tu Keratina. Sugerimos agendar tu mantenimiento para proteger y prolongar el efecto liso.

Esta semana disponemos de una promoción que incluye un Peinado Exprés de Obsequio con tu servicio en el centro.

¿Te reservamos un hueco?`,
    Elegante: `Estimada Sofía,

Confiamos en que estés disfrutando de una excelente jornada. Tras completar el trimestre de tu exquisito tratamiento de Keratina, te sugerimos renovar el sellado de brillo para conservar su sedosidad impecable.

Será un auténtico deleite asignarte un Peinado Express como cortesía complementaria en tu próxima visita de distinción.

¿Nos indicas tu fecha ideal?`
  },
  marta: {
    Cercano: `¡Hola Marta! ¿Qué tal todo?

Ya pasaron casi 35 días de tu manicura y seguro que tus uñas ya necesitan cariño. ¿Vienes por el salón a tomar un café y te las dejamos impecables?

Te mando un abrazo grande.`,
    Profesional: `Estimada Marta, un afectuoso saludo de nuestro equipo de estilistas.

Hemos observado que ha excedido su ciclo habitual de visita para su servicio de manicura. Le recomendamos agendar para mantener sus manos impecables y saludables.

¿Desea conocer nuestras disponibilidades disponibles para esta semana?`,
    Elegante: `Estimada Marta,

Le enviamos nuestros saludos más selectos. Con el propósito de resguardar la pulcritud y la salud de sus manos, le ofrecemos un espacio selecto para renovar su Manicura Semipermanente habitual.

Quedamos a su distinguida disposición para formalizar su próxima cita.`,
  }
};

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: "Champú Hidratante Keratina 1L",
    brand: "L'Oréal",
    category: 'Tratamiento',
    unit: 'unidades',
    currentStock: 12,
    minStock: 5,
    costPrice: 18.50,
    supplier: "L'Oréal España",
    notes: 'Uso en lavacabezas.',
    tenantId: 'madrid-centro',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-2',
    name: 'Decoloración Premium en Polvo 500g',
    brand: 'Schwarzkopf',
    category: 'Coloración',
    unit: 'unidades',
    currentStock: 3,
    minStock: 4,
    costPrice: 24.90,
    supplier: 'Schwarzkopf Pro',
    notes: 'Para balayage.',
    tenantId: 'madrid-centro',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inv-3',
    name: 'Esmalte Gel Semipermanente Rojo Pasión 15ml',
    brand: 'OPI',
    category: 'Uñas',
    unit: 'unidades',
    currentStock: 8,
    minStock: 3,
    costPrice: 9.20,
    supplier: 'OPI Distribución',
    notes: 'Color más solicitado.',
    tenantId: 'madrid-centro',
    updatedAt: new Date().toISOString(),
  }
];

