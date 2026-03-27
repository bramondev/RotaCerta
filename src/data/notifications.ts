

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const notifications: Notification[] = [
  {
    id: '1',
    title: 'Economia de combustível',
    message: 'Sabia que manter a pressão correta dos pneus pode economizar até 3% de combustível?',
    type: 'info'
  },
  {
    id: '2',
    title: 'Manutenção preventiva',
    message: 'Trocar o óleo regularmente pode prolongar a vida útil do motor do seu veículo.',
    type: 'success'
  },
  {
    id: '3',
    title: 'Dica de segurança',
    message: 'Verifique seus freios a cada 20.000 km para garantir sua segurança nas estradas.',
    type: 'warning'
  },
  {
    id: '4',
    title: 'Economia de bateria',
    message: 'Veículos elétricos consomem mais bateria em altas velocidades. Mantenha uma velocidade constante.',
    type: 'info'
  },
  {
    id: '5',
    title: 'Documentação',
    message: 'Mantenha seus documentos de veículo sempre atualizados para evitar multas desnecessárias.',
    type: 'warning'
  },
  {
    id: '6',
    title: 'Sustentabilidade',
    message: 'Ao descartar óleo e outros fluidos automotivos, procure pontos de coleta adequados.',
    type: 'success'
  },
  {
    id: '7',
    title: 'Poluição',
    message: 'Dirigir de forma suave reduz a emissão de poluentes e economiza combustível.',
    type: 'info'
  },
  {
    id: '8',
    title: 'Gastos mensais',
    message: 'Defina um orçamento mensal para combustível e manutenção para controlar melhor seus gastos.',
    type: 'success'
  },
  {
    id: '9',
    title: 'Planejamento',
    message: 'Planejar suas rotas com antecedência pode economizar tempo e combustível.',
    type: 'info'
  },
  {
    id: '10',
    title: 'Metas de economia',
    message: 'Estabeleça metas mensais de economia de combustível e monitore seu progresso.',
    type: 'success'
  }
];

export function getRandomNotification(): Notification {
  const randomIndex = Math.floor(Math.random() * notifications.length);
  return notifications[randomIndex];
}
