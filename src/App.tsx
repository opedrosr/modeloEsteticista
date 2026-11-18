import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type Ref, type UIEvent as RUIEvent, type KeyboardEvent as RKeyboardEvent, type MouseEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import type * as THREE from 'three';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  ChevronsLeftRight,
  Clock,
  CreditCard,
  Droplets,
  Gift,
  HeartHandshake,
  Instagram,
  Mail,
  MapPin,
  Menu,
  Play,
  Plus,
  Quote,
  ShieldCheck,
  X,
} from 'lucide-react';

/**
 * NATIVA — site completo em um único arquivo (App.tsx) + index.css.
 * Dependências: react, lucide-react, three (+ @types/three).
 * Todo o conteúdo editável está na seção "DADOS" logo abaixo.
 */


// ==========================================================================
// DADOS (edite aqui: WhatsApp, endereço, horários, serviços, preços…)
// ==========================================================================


/**
 * TODO DA PROFISSIONAL — TUDO O QUE É CONTEÚDO FICA AQUI.
 * Troque textos, preços, endereço, horários e WhatsApp neste arquivo;
 * o site inteiro se atualiza. Itens marcados com PLACEHOLDER precisam
 * ser substituídos por informações reais antes de publicar.
 */

type Category = 'facial' | 'corporal' | 'olhar' | 'depilacao';

interface Service {
  id: string;
  category: Category;
  name: string;
  desc: string;
  minutes: number;
  /** 0 = exibido como "cortesia" */
  price: number;
  benefits: string[];
  ideal: string;
}

interface FaceZone {
  id: string;
  label: string;
  /** posição (x,y) no plano frontal do busto 3D. Pontos espelhados para os dois lados. */
  pts: { x: number; y: number }[];
  title: string;
  text: string;
  services: string[];
}

const contact = {
  // PLACEHOLDER — número com DDI+DDD, só dígitos
  whatsapp: '5511999999999',
  instagram: 'nativa.estetica',
  email: 'contato@nativa.com.br',
  address: {
    line: 'Rua das Acácias, 120 · sala 4',
    district: 'Vila Madalena',
    city: 'São Paulo – SP',
    zip: '05435-000',
    note: 'Estacionamento conveniado a 50 m. Metrô a 8 minutos a pé.',
  },
  payments: ['Pix', 'Cartão em até 6x', 'Dinheiro'],
  cancellation: 'Remarcações e cancelamentos com 24 horas de antecedência.',
};

/**
 * MODELO 3D DO ROSTO (.glb)
 * 1. Coloque o arquivo em  public/face.glb  (o nome pode ser outro, ajuste a url).
 * 2. Se o arquivo não existir ou der erro, o site usa o busto 3D padrão automaticamente.
 * Ajustes (mexa só se algo ficar fora do lugar):
 *  - fitHeight: altura do modelo na cena. Só o rosto/cabeça ≈ 2.0. Com pescoço e ombros ≈ 3.2.
 *  - offsetY:   sobe (+) ou desce (−) o modelo.
 *  - rotateY:   use Math.PI se o modelo aparecer de costas.
 *  - spreadX:   afasta (>1) ou aproxima (<1) os pontos laterais (olhos, bochechas, contorno).
 *  - scaleY:    espalha (>1) ou comprime (<1) os pontos de cima a baixo.
 */
const faceModel = {
  url: '/face.glb' as string | null,
  fitHeight: 2.0,
  offsetY: 0,
  rotateY: 0,
  spreadX: 1,
  scaleY: 1,
};

const photos = {
  hero: 7588302,
  philosophy: 4612139,
  facial: 5240342,
  products: 7670768,
  bottle: 7815016,
  ritual: 37229280,
};

/** 0 = domingo … 6 = sábado. null = fechado. */
const hours: Record<number, { open: string; close: string } | null> = {
  0: null,
  1: { open: '09:00', close: '19:00' },
  2: { open: '09:00', close: '19:00' },
  3: { open: '09:00', close: '19:00' },
  4: { open: '09:00', close: '19:00' },
  5: { open: '09:00', close: '19:00' },
  6: { open: '09:00', close: '15:00' },
};

/** Intervalo entre horários oferecidos, em minutos. */
const slotStep = 30;
/** Antecedência mínima para agendar no mesmo dia, em minutos. */
const leadMinutes = 120;

const categories: { id: Category; label: string }[] = [
  { id: 'facial', label: 'facial' },
  { id: 'corporal', label: 'corporal' },
  { id: 'olhar', label: 'olhar' },
  { id: 'depilacao', label: 'depilação' },
];

const services: Service[] = [
  {
    id: 'avaliacao-de-pele',
    category: 'facial',
    name: 'avaliação de pele',
    desc: 'Conversa, análise da pele e histórico para montar o seu plano de cuidados.',
    minutes: 30,
    price: 0,
    benefits: ['Mapeamento do tipo e das queixas', 'Plano de cuidados em casa', 'Indicação do protocolo ideal'],
    ideal: 'Primeira visita ou retomada da rotina.',
  },
  {
    id: 'ritual-de-presenca',
    category: 'facial',
    name: 'ritual de presença',
    desc: 'Limpeza profunda, máscara calmante e massagem facial para devolver viço e equilíbrio.',
    minutes: 60,
    price: 280,
    benefits: ['Higienização e extração suave', 'Máscara calmante', 'Massagem facial relaxante'],
    ideal: 'Pele opaca, oleosa ou com cravos.',
  },
  {
    id: 'pele-em-pausa',
    category: 'facial',
    name: 'pele em pausa',
    desc: 'Um tratamento restaurador que nutre a pele e silencia o excesso do dia.',
    minutes: 75,
    price: 340,
    benefits: ['Nutrição intensa', 'Calma para peles reativas', 'Efeito de pele descansada'],
    ideal: 'Pele sensível, ressecada ou estressada.',
  },
  {
    id: 'toque-profundo',
    category: 'facial',
    name: 'toque profundo',
    desc: 'Drenagem e manobras precisas para acordar a expressão e iluminar o rosto.',
    minutes: 90,
    price: 390,
    benefits: ['Drenagem facial e do pescoço', 'Alívio da tensão da mandíbula', 'Contorno mais definido'],
    ideal: 'Rosto inchado, tensão e falta de luminosidade.',
  },
  {
    id: 'peeling-suave',
    category: 'facial',
    name: 'peeling suave',
    desc: 'Renovação superficial para uniformizar a textura e devolver o viço.',
    minutes: 50,
    price: 260,
    benefits: ['Textura mais uniforme', 'Auxilia no controle de manchas leves', 'Preparo para outros protocolos'],
    ideal: 'Textura irregular, poros dilatados e tom desigual.',
  },
  {
    id: 'hidratacao-profunda',
    category: 'facial',
    name: 'hidratação profunda',
    desc: 'Camadas de ativos hidratantes e máscara oclusiva para repor a água da pele.',
    minutes: 55,
    price: 240,
    benefits: ['Reposição de água', 'Pele mais macia e flexível', 'Menos sensação de repuxar'],
    ideal: 'Pele seca, desidratada ou pós-sol.',
  },
  {
    id: 'drenagem-facial',
    category: 'facial',
    name: 'drenagem facial',
    desc: 'Manobras leves e ritmadas que reduzem o inchaço e relaxam o rosto.',
    minutes: 45,
    price: 200,
    benefits: ['Menos inchaço matinal', 'Olhar mais descansado', 'Relaxamento imediato'],
    ideal: 'Retenção, olheiras inchadas e rotina corrida.',
  },
  {
    id: 'revitalizacao-labial',
    category: 'facial',
    name: 'revitalização labial',
    desc: 'Esfoliação delicada, nutrição e massagem para lábios macios e com contorno definido.',
    minutes: 30,
    price: 120,
    benefits: ['Esfoliação suave', 'Hidratação intensa', 'Contorno mais nítido'],
    ideal: 'Lábios secos, com descamação ou sem viço.',
  },
  {
    id: 'massagem-relaxante',
    category: 'corporal',
    name: 'massagem relaxante',
    desc: 'Pressão suave e contínua para soltar o corpo e desacelerar.',
    minutes: 60,
    price: 220,
    benefits: ['Alívio de tensão', 'Sono mais tranquilo', 'Sensação de leveza'],
    ideal: 'Estresse, rotina sentada e ombros tensos.',
  },
  {
    id: 'drenagem-linfatica',
    category: 'corporal',
    name: 'drenagem linfática',
    desc: 'Técnica manual que estimula a circulação e reduz a retenção de líquidos.',
    minutes: 60,
    price: 200,
    benefits: ['Redução de inchaço', 'Pernas mais leves', 'Apoio ao pré e pós-operatório com liberação médica'],
    ideal: 'Retenção de líquidos e pernas cansadas.',
  },
  {
    id: 'massagem-modeladora',
    category: 'corporal',
    name: 'massagem modeladora',
    desc: 'Manobras firmes e ritmadas para trabalhar contorno e textura da pele.',
    minutes: 60,
    price: 230,
    benefits: ['Estímulo à circulação', 'Pele mais firme ao toque', 'Contorno mais definido'],
    ideal: 'Quem busca definição e cuidado com a textura.',
  },
  {
    id: 'design-sobrancelhas',
    category: 'olhar',
    name: 'design de sobrancelhas',
    desc: 'Mapeamento do formato ideal para o seu rosto, com acabamento natural.',
    minutes: 40,
    price: 90,
    benefits: ['Formato pensado para o seu rosto', 'Acabamento natural', 'Orientação de manutenção'],
    ideal: 'Quem quer um olhar mais aberto e alinhado.',
  },
  {
    id: 'lash-lifting',
    category: 'olhar',
    name: 'lash lifting',
    desc: 'Curvatura e definição dos cílios naturais, sem precisar de curvex.',
    minutes: 60,
    price: 190,
    benefits: ['Cílios curvados e alongados', 'Dura em média de 6 a 8 semanas', 'Rotina de make mais rápida'],
    ideal: 'Quem tem cílios retos ou caídos.',
  },
  {
    id: 'depilacao-pernas',
    category: 'depilacao',
    name: 'depilação · pernas completas',
    desc: 'Cera de baixa temperatura com acabamento calmante.',
    minutes: 50,
    price: 90,
    benefits: ['Cera de baixa temperatura', 'Menos irritação', 'Pele macia por mais tempo'],
    ideal: 'Pele sensível ou com tendência a vermelhidão.',
  },
  {
    id: 'depilacao-axilas-virilha',
    category: 'depilacao',
    name: 'depilação · axilas e virilha',
    desc: 'Atendimento discreto e rápido, com produtos calmantes.',
    minutes: 30,
    price: 70,
    benefits: ['Atendimento reservado', 'Produtos calmantes', 'Orientações para evitar encravados'],
    ideal: 'Quem quer praticidade com conforto.',
  },
];

const faceZones: FaceZone[] = [
  {
    id: 'testa',
    label: 'testa',
    pts: [{ x: 0, y: 0.6 }],
    title: 'linhas e textura',
    text: 'Para a testa com linhas de expressão, oleosidade ou textura irregular.',
    services: ['hidratacao-profunda', 'peeling-suave'],
  },
  {
    id: 'olhar',
    label: 'olhar',
    pts: [
      { x: 0.3, y: 0.1 },
      { x: -0.3, y: 0.1 },
    ],
    title: 'olhar descansado',
    text: 'Para inchaço, aparência cansada e moldura do olhar.',
    services: ['drenagem-facial', 'design-sobrancelhas', 'lash-lifting'],
  },
  {
    id: 'bochechas',
    label: 'bochechas',
    pts: [
      { x: 0.44, y: -0.22 },
      { x: -0.44, y: -0.22 },
    ],
    title: 'viço e uniformidade',
    text: 'Para pele opaca, manchas leves, vermelhidão e desidratação.',
    services: ['ritual-de-presenca', 'peeling-suave', 'hidratacao-profunda'],
  },
  {
    id: 'zona-t',
    label: 'zona T',
    pts: [{ x: 0, y: -0.12 }],
    title: 'poros e oleosidade',
    text: 'Para cravos, poros dilatados e brilho excessivo.',
    services: ['ritual-de-presenca', 'peeling-suave'],
  },
  {
    id: 'labios',
    label: 'lábios',
    pts: [{ x: 0, y: -0.5 }],
    title: 'maciez e contorno',
    text: 'Para ressecamento, descamação e falta de definição.',
    services: ['revitalizacao-labial', 'hidratacao-profunda'],
  },
  {
    id: 'contorno',
    label: 'contorno',
    pts: [
      { x: 0.38, y: -0.7 },
      { x: -0.38, y: -0.7 },
    ],
    title: 'mandíbula e contorno',
    text: 'Para tensão ao mastigar, retenção e perda de definição do contorno.',
    services: ['toque-profundo', 'drenagem-facial'],
  },
  {
    id: 'pescoco',
    label: 'pescoço',
    pts: [{ x: 0, y: -1.2 }],
    title: 'pescoço e colo',
    text: 'Para tensão, ressecamento e sinais de tempo. Uma área que merece o mesmo cuidado do rosto.',
    services: ['toque-profundo', 'pele-em-pausa'],
  },
];

const journey = [
  { n: '01', title: 'avaliação', text: 'Conversamos sobre sua rotina, histórico e o que você gostaria de mudar. Olhamos a pele de perto.' },
  { n: '02', title: 'plano', text: 'Você recebe uma indicação clara de protocolo, frequência e cuidados em casa.' },
  { n: '03', title: 'ritual', text: 'A sessão acontece sem pressa, em ambiente silencioso, com produtos escolhidos para você.' },
  { n: '04', title: 'acompanhamento', text: 'Depois da sessão, você tem orientação pelo WhatsApp e retorno para ajustar o plano.' },
];

interface Package {
  id: string;
  name: string;
  tag: string;
  price: number;
  per?: string;
  note?: string;
  items: string[];
  featured?: boolean;
}

const packages: Package[] = [
  {
    id: 'avulso',
    name: 'ritual avulso',
    tag: 'sem compromisso',
    price: 280,
    items: ['Uma sessão do ritual de presença', 'Avaliação de pele incluída', 'Plano de cuidados em casa'],
  },
  {
    id: 'jornada',
    name: 'jornada nativa',
    tag: 'mais escolhido',
    price: 1008,
    note: 'ou 4x de R$ 252 · 10% off',
    items: ['4 sessões do ritual de presença', 'Uma sessão a cada 15 dias', 'Acompanhamento pelo WhatsApp', 'Prioridade na agenda'],
    featured: true,
  },
  {
    id: 'clube',
    name: 'clube nativa',
    tag: 'assinatura mensal',
    price: 269,
    per: '/mês',
    items: ['1 ritual por mês, no seu horário fixo', '10% em produtos para casa', 'Remarcação sem custo', 'Cancele quando quiser'],
  },
];

const careGuides = {
  antes: [
    'Evite sol direto e bronzeamento nos 7 dias anteriores.',
    'Não use ácidos, esfoliantes ou retinoides nas 48 horas antes.',
    'Venha sem maquiagem, se possível. Higienizamos tudo ao chegar.',
    'Conte se estiver gestante, amamentando ou com algum tratamento em curso.',
    'Informe alergias a cosméticos, fragrâncias ou ativos.',
  ],
  depois: [
    'Use protetor solar FPS 30 ou mais todos os dias.',
    'Evite maquiagem pesada nas primeiras 12 horas.',
    'Mantenha a hidratação com os produtos indicados no seu plano.',
    'Não esprema nem toque em áreas sensibilizadas.',
    'Se algo parecer fora do normal, fale com a gente pelo WhatsApp.',
  ],
};

const biosafety = [
  'Materiais descartáveis e instrumentos esterilizados',
  'Ambiente higienizado entre cada atendimento',
  'Produtos com registro na Anvisa',
  'Avaliação de contraindicações antes de começar',
];

/** PLACEHOLDER — troque pela formação real da profissional. */
const credentials = [
  'Tecnologia em Estética e Cosmética',
  'Especialização em estética facial',
  'Formação em drenagem linfática',
];

/** PLACEHOLDER — troque por depoimentos reais, com autorização escrita das clientes (texto e foto). */
const testimonials = [
  {
    name: 'Camila R.',
    detail: 'ritual de presença',
    text: 'Entrei no ritmo do dia a dia e saí com a pele e a cabeça mais leves. A avaliação mudou minha rotina em casa.',
    photo: photos.hero,
    pos: '50% 28%',
  },
  {
    name: 'Juliana M.',
    detail: 'jornada nativa',
    text: 'Cuidado de verdade, sem pressa e sem empurrar procedimento. Explicaram cada etapa e o que esperar.',
    photo: photos.philosophy,
    pos: '50% 30%',
  },
  {
    name: 'Patrícia S.',
    detail: 'toque profundo',
    text: 'A massagem do rosto desfez uma tensão que eu nem sabia que tinha. Marquei a próxima antes de sair.',
    photo: photos.ritual,
    pos: '50% 35%',
  },
  {
    name: 'Renata A.',
    detail: 'peeling suave',
    text: 'Minha pele ficou uniforme sem aquela vermelhidão de susto. Tudo explicado com calma, do começo ao fim.',
    photo: photos.facial,
    pos: '50% 35%',
  },
  {
    name: 'Bianca L.',
    detail: 'clube nativa',
    text: 'Virou meu horário fixo do mês. É o único compromisso que eu realmente espero chegar.',
    photo: photos.products,
    pos: '50% 40%',
  },
];

const gallery = [
  { id: photos.facial, caption: 'ritual facial', alt: 'Ritual facial relaxante' },
  { id: photos.products, caption: 'produtos selecionados', alt: 'Produtos naturais de skincare' },
  { id: photos.ritual, caption: 'massagem facial', alt: 'Massagem facial em ambiente de spa' },
  { id: photos.bottle, caption: 'matéria botânica', alt: 'Frasco de skincare sobre fundo quente' },
  { id: photos.philosophy, caption: 'o toque', alt: 'Mulher recebendo tratamento facial' },
  { id: photos.hero, caption: 'pele real', alt: 'Retrato em close da pele iluminada' },
];

const faq = [
  {
    q: 'Como funciona a primeira visita?',
    a: 'Começamos com uma avaliação de cerca de 30 minutos: conversa sobre sua rotina e histórico, análise da pele e indicação do protocolo. Se você quiser, já podemos fazer a primeira sessão no mesmo dia.',
  },
  {
    q: 'Quantas sessões eu preciso?',
    a: 'Depende do objetivo e da sua pele. Para manutenção, uma sessão por mês costuma bastar. Para tratar queixas específicas, o plano inicial costuma ter de 3 a 6 sessões. Você recebe essa estimativa na avaliação.',
  },
  {
    q: 'Posso fazer estando gestante ou amamentando?',
    a: 'Alguns protocolos são seguros e outros não. Conte na hora de agendar para escolhermos o mais adequado, e, quando necessário, pedimos liberação do seu médico.',
  },
  {
    q: 'Como confirmo meu horário?',
    a: 'Ao escolher o dia e o horário no site, abrimos uma conversa no WhatsApp com tudo preenchido. O horário fica reservado assim que a Nativa confirma por lá.',
  },
  {
    q: 'Quais as formas de pagamento?',
    a: 'Pix, cartão de crédito em até 6x e dinheiro. Pacotes podem ser parcelados.',
  },
  {
    q: 'E se eu precisar remarcar?',
    a: 'Sem problema. Pedimos aviso com 24 horas de antecedência para liberar o horário para outra pessoa.',
  },
  {
    q: 'Os produtos são seguros para pele sensível?',
    a: 'Usamos produtos com registro na Anvisa e escolhemos a linha conforme sua pele. Sempre avaliamos alergias e sensibilidade antes de começar.',
  },
];

const healthFlags = [
  'Gestante ou amamentando',
  'Alergia a cosméticos ou ativos',
  'Uso de ácidos, retinoides ou isotretinoína',
  'Procedimento estético nos últimos 30 dias',
  'Pele sensível, rosácea ou dermatite',
];

const marquee = [
  'limpeza de pele',
  'drenagem',
  'peeling suave',
  'lash lifting',
  'massagem facial',
  'hidratação profunda',
  'design de sobrancelhas',
];

/**
 * ANTES/DEPOIS — troque as duas fotos (PLACEHOLDER) por fotos reais, com autorização/termo de uso de imagem.
 * Cada foto aceita o id de uma foto do Pexels (número) ou o caminho de uma foto sua (texto), ex.: '/antes.jpg'.
 * Qualquer tamanho serve: a foto entra INTEIRA na moldura (nunca é cortada); o espaço que sobrar é preenchido com a própria foto desfocada.
 * Com illustrative: true, o "antes" recebe um tratamento só para ilustrar e aparece o aviso "imagem ilustrativa".
 */
const beforeAfter: { before: number | string; after: number | string; illustrative: boolean } = {
  before: photos.hero,
  after: photos.hero,
  illustrative: true,
};


// ==========================================================================
// UTILITÁRIOS
// ==========================================================================


const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const brl = (value: number) => brlFmt.format(value);

const priceLabel = (value: number) => (value === 0 ? 'cortesia' : brl(value));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  try {
    history.replaceState(null, '', `#${id}`);
  } catch {
    /* ignore */
  }
}

const TZ = 'America/Sao_Paulo';

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

interface SPNow {
  y: number;
  m: number;
  d: number;
  wd: number;
  minutes: number;
}

/** Data e hora atuais no fuso de São Paulo, independente do fuso do aparelho. */
function nowSP(date = new Date()): SPNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const y = get('year');
  const m = get('month');
  const d = get('day');
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), minutes: get('hour') * 60 + get('minute') };
}

interface DayInfo {
  iso: string;
  wd: number;
  weekday: string;
  dayNum: string;
  month: string;
  long: string;
  isToday: boolean;
}

const wdFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'short' });
const monFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'short' });
const longFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: '2-digit' });

/** Próximos dias em que o espaço abre. */
function nextDays(count = 30): DayInfo[] {
  const now = nowSP();
  const out: DayInfo[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(Date.UTC(now.y, now.m - 1, now.d + i, 12));
    const wd = dt.getUTCDay();
    if (!hours[wd]) continue;
    out.push({
      iso: dt.toISOString().slice(0, 10),
      wd,
      weekday: wdFmt.format(dt).replace('.', ''),
      dayNum: String(dt.getUTCDate()),
      month: monFmt.format(dt).replace('.', ''),
      long: longFmt.format(dt),
      isToday: i === 0,
    });
  }
  return out;
}

/** Horários possíveis para o serviço: respeita duração, expediente e antecedência mínima. */
function slotsFor(day: DayInfo, minutes: number): string[] {
  const h = hours[day.wd];
  if (!h) return [];
  const open = toMin(h.open);
  const close = toMin(h.close);
  const now = nowSP();
  const earliest = day.isToday ? now.minutes + leadMinutes : 0;
  const out: string[] = [];
  for (let t = open; t + minutes <= close; t += slotStep) {
    if (t >= earliest) out.push(fromMin(t));
  }
  return out;
}

const period = (time: string) => {
  const m = toMin(time);
  if (m < 12 * 60) return 'manhã';
  if (m < 18 * 60) return 'tarde';
  return 'noite';
};

const waLink = (text: string) => `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}`;

interface BookingData {
  name: string;
  service: Service;
  day: DayInfo;
  time: string;
  first: 'sim' | 'nao';
  flags: string[];
  goal: string;
}

function buildMessage(b: BookingData): string {
  const lines = [
    `Olá! Sou ${b.name.trim()} e gostaria de agendar:`,
    '',
    `• Serviço: ${b.service.name} (${b.service.minutes} min${b.service.price ? ` · ${brl(b.service.price)}` : ''})`,
    `• Data: ${b.day.long}`,
    `• Horário: ${b.time}`,
    `• Primeira vez no espaço: ${b.first === 'sim' ? 'sim' : 'não'}`,
  ];
  if (b.flags.length) lines.push(`• Informações de saúde: ${b.flags.join('; ')}`);
  if (b.goal.trim()) lines.push(`• O que gostaria de melhorar: ${b.goal.trim()}`);
  lines.push('', 'Pode confirmar a disponibilidade? Obrigada!');
  return lines.join('\n');
}

const genericMessage = 'Olá! Gostaria de agendar uma avaliação.';


// ==========================================================================
// BLOCOS COMPARTILHADOS
// ==========================================================================


function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const pexelsUrl = (id: number, w: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/** Aceita id do Pexels (número) ou uma foto sua (texto: caminho ou URL, ex.: '/antes.jpg'). */
const photoSrc = (id: number | string, w: number) => (typeof id === 'string' ? id : pexelsUrl(id, w));

interface PhotoProps {
  id: number | string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  pos?: string;
  style?: CSSProperties;
  onLoad?: (img: HTMLImageElement) => void;
  /** Fundo que vai ser desfocado: baixa só uma versão pequena (largura em px). */
  lowres?: number;
}

/** Imagem responsiva com fallback elegante: se não carregar, o fundo do bloco aparece. */
function Photo({ id, alt, sizes = '100vw', priority, className = '', pos, style, onLoad, lowres }: PhotoProps) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      className={`photo${failed ? ' photo--failed' : ''} ${className}`.trim()}
      src={photoSrc(id, lowres ?? 960)}
      srcSet={typeof id === 'number' && !lowres ? `${pexelsUrl(id, 480)} 480w, ${pexelsUrl(id, 960)} 960w, ${pexelsUrl(id, 1600)} 1600w` : undefined}
      sizes={sizes}
      alt={failed ? '' : alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...(priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
      onError={() => setFailed(true)}
      onLoad={(e) => onLoad?.(e.currentTarget)}
      style={{ objectPosition: pos, ...style }}
    />
  );
}

/** Área expansível animada. Conteúdo fechado fica fora da ordem de tabulação. */
function Collapse({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return (
    <div className={`collapse${open ? ' collapse--open' : ''}`} id={id}>
      <div className="collapse__inner">{children}</div>
    </div>
  );
}

function SectionHead({
  index,
  label,
  title,
  lead,
  light,
}: {
  index: string;
  label: string;
  title: ReactNode;
  lead?: ReactNode;
  light?: boolean;
}) {
  return (
    <header className={`head${light ? ' head--light' : ''}`} data-reveal>
      <p className="label">
        {index} / {label}
      </p>
      <h2 className="h2">{title}</h2>
      {lead ? <p className="lead">{lead}</p> : null}
    </header>
  );
}


// ==========================================================================
// TOPO
// ==========================================================================


const links = [
  { id: 'servicos', label: 'serviços' },
  { id: 'mapa', label: 'mapa da pele' },
  { id: 'agendar', label: 'agendar' },
  { id: 'pacotes', label: 'pacotes' },
  { id: 'sobre', label: 'sobre' },
  { id: 'local', label: 'local' },
];

function Header({ onBook }: { onBook: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        // seção ativa: a que cruza uma linha a 35% da altura da tela (independe da ordem da página)
        const probe = window.innerHeight * 0.35;
        let current: string | null = null;
        for (const l of links) {
          const r = document.getElementById(l.id)?.getBoundingClientRect();
          if (r && r.top <= probe && r.bottom > probe) current = l.id;
        }
        setActive(current);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    document.body.style.overflow = '';
    requestAnimationFrame(() => scrollToId(id));
  };

  return (
    <>
      <header className={`nav${scrolled ? ' nav--solid' : ''}${open ? ' nav--open' : ''}`}>
        <div className="nav__bar">
          <a className="brand" href="#top" onClick={go('top')} aria-label="Nativa, ir ao início">
            nativa<span>®</span>
          </a>

          <nav className="nav__links" aria-label="Principal">
            {links.slice(0, 5).map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={go(l.id)}
                className={active === l.id ? 'is-active' : undefined}
                aria-current={active === l.id ? 'true' : undefined}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="nav__actions">
            <button type="button" className="btn btn--sm btn--primary nav__book" onClick={onBook}>
              agendar <ArrowUpRight size={14} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              className="nav__toggle"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={open}
              aria-controls="menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={22} strokeWidth={1.4} /> : <Menu size={22} strokeWidth={1.4} />}
            </button>
          </div>
        </div>
      </header>

      <div id="menu" className={`menu${open ? ' menu--open' : ''}`} aria-hidden={!open}>
        <nav className="menu__links" aria-label="Menu">
          {links.map((l, i) => (
            <a key={l.id} href={`#${l.id}`} onClick={go(l.id)} tabIndex={open ? 0 : -1} style={{ transitionDelay: `${open ? 80 + i * 45 : 0}ms` }}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="menu__foot">
          <a className="btn btn--primary btn--block" href={waLink(genericMessage)} target="_blank" rel="noopener noreferrer" tabIndex={open ? 0 : -1}>
            <WhatsAppIcon size={18} /> falar no whatsapp
          </a>
          <a className="menu__ig" href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer" tabIndex={open ? 0 : -1}>
            @{contact.instagram}
          </a>
        </div>
      </div>
    </>
  );
}

/** Palavra do hero: fonte da marca. 330 unidades de fonte + textLength 988 = encaixe de ponta a ponta, sem comprimir o espaçamento. */
const heroWordStyle: CSSProperties = { fontFamily: 'var(--serif)', fontSize: 330 };

/**
 * A palavra do hero em dois formatos: larga (computador) e alta (celular).
 * No celular a largura da tela limita o tamanho, então a palavra é esticada 1,4× na vertical
 * e os glifos ficam levemente condensados: bem maior, sem estourar a largura.
 */
function HeroWord({ tall, gRef }: { tall?: boolean; gRef: Ref<SVGGElement> }) {
  const k = tall ? 1.4 : 1;
  const id = tall ? 'hero-word-tall' : 'hero-word';
  return (
    <svg className={`hero__svg hero__svg--${tall ? 'tall' : 'wide'}`} viewBox={`0 0 1000 ${300 * k}`} aria-hidden="true" focusable="false">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="-20" y="-20" width="1040" height={340 * k}>
          <text
            x="4"
            y={280 * k}
            textLength={988}
            lengthAdjust={tall ? 'spacingAndGlyphs' : 'spacing'}
            fill="#fff"
            stroke="#fff"
            strokeWidth="2"
            strokeLinejoin="round"
            style={{ ...heroWordStyle, fontSize: 330 * k }}
          >
            nativa
          </text>
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <rect x="-20" y="-20" width="1040" height={340 * k} fill="#8f8a7f" />
        <g ref={gRef}>
          <image href={pexelsUrl(photos.hero, 1600)} x="-40" y={-170 * k} width="1080" height={520 * k} preserveAspectRatio="xMidYMid slice" />
        </g>
      </g>
    </svg>
  );
}

function Hero() {
  const media = useRef<HTMLDivElement>(null);
  const shift = useRef<SVGGElement>(null);
  const shiftTall = useRef<SVGGElement>(null);

  // Parallax sem re-render do React: o fundo desfocado desce devagar e a foto dentro das letras
  // acompanha o scroll (vertical) e o mouse (horizontal), como se as letras fossem uma janela.
  // A palavra do hero acompanha o movimento e se encaixa na marca do cabeçalho.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    let raf = 0;
    let px = 0;
    const draw = () => {
      raf = 0;
      const y = window.scrollY;
      if (y > window.innerHeight * 1.2) return;
      if (media.current) media.current.style.transform = `translate3d(0, ${y * 0.08}px, 0) scale(1.06)`;
      const move = `translate(${px.toFixed(1)} ${Math.min(y * 0.1, 70).toFixed(1)})`;
      shift.current?.setAttribute('transform', move);
      shiftTall.current?.setAttribute('transform', move);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth - 0.5) * -36;
      queue();
    };
    window.addEventListener('scroll', queue, { passive: true });
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="hero" id="top">
      {/* fundo: a mesma foto, desfocada e lavada em areia (atmosfera) */}
      <div className="hero__media" ref={media}>
        <Photo id={photos.hero} alt="" priority lowres={320} pos="center 27%" />
      </div>
      <div className="hero__wash" />

      <div className="hero__body wrap">
        <p className="eyebrow">estética facial &amp; corporal</p>
        <p className="hero__lead">
          <strong>beleza que respira.</strong>
          Skincare consciente e protocolos autorais, com uma avaliação feita para a sua pele.
        </p>

        <div className="hero__cta" aria-hidden="true" />
      </div>

      <div className="hero__meta wrap">
        <a className="scroll-cue" href="#essencia" onClick={(e) => (e.preventDefault(), scrollToId('essencia'))}>
          deslize <ArrowDown size={14} strokeWidth={1.4} />
        </a>
        <ul className="hero__trust">
          <li>
            <ShieldCheck size={16} strokeWidth={1.4} /> biossegurança rigorosa
          </li>
          <li>
            <HeartHandshake size={16} strokeWidth={1.4} /> avaliação personalizada
          </li>
          <li>
            <Droplets size={16} strokeWidth={1.4} /> protocolos autorais
          </li>
        </ul>
      </div>

      {/* palavra gigante: a foto nítida aparece por dentro das letras */}
      <div className="hero__word">
        <h1 className="hero__title">
          <span className="sr-only">nativa, beleza que respira</span>
          <HeroWord gRef={shift} />
          <HeroWord tall gRef={shiftTall} />
        </h1>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [...marquee, ...marquee];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {items.map((m, i) => (
          <span key={i}>
            {m} <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}

function Essence({ onBook }: { onBook: () => void }) {
  return (
    <section className="essence section" id="essencia">
      <div className="wrap essence__grid">
        <div className="essence__copy" data-reveal>
          <p className="label">01 / essência</p>
          <h2 className="h2">
            o cuidado
            <br />
            <em>começa</em> no toque.
          </h2>
          <p className="body">
            Um espaço para desacelerar e se reencontrar. Cada ritual é pensado para revelar a beleza da sua pele com presença, conhecimento e delicadeza.
          </p>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={onBook}>
              agendar avaliação <ArrowUpRight size={16} strokeWidth={1.6} />
            </button>
            <a className="link" href="#sobre" onClick={(e) => (e.preventDefault(), scrollToId('sobre'))}>
              conheça nosso olhar <ArrowUpRight size={15} strokeWidth={1.4} />
            </a>
          </div>
        </div>

        <figure className="essence__img frame" data-reveal>
          <Photo id={photos.philosophy} alt="Mulher recebendo tratamento facial" sizes="(min-width: 900px) 55vw, 100vw" pos="center 40%" />
          <figcaption className="caption">pele em seu estado mais natural</figcaption>
        </figure>
      </div>
    </section>
  );
}


// ==========================================================================
// SERVIÇOS
// ==========================================================================


/** Foto de cada categoria (placeholders: troque por fotos reais do espaço quando tiver). */
const serviceMedia: Record<Category, number> = {
  facial: photos.facial,
  corporal: photos.ritual,
  olhar: photos.hero,
  depilacao: photos.bottle,
};

function Services({ onBook }: { onBook: (serviceId?: string) => void }) {
  const [cat, setCat] = useState<Category>('facial');
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLUListElement>(null);
  const drag = useRef({ x: 0, dx: 0, on: false, moved: false });

  const list = services.filter((s) => s.category === cat);
  const last = list.length - 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const goTo = (n: number) => setIndex(clamp(n, 0, last));

  const choose = (c: Category) => {
    setCat(c);
    setIndex(0);
  };

  // Arraste (mouse e toque): o trilho acompanha o dedo e, ao soltar, avança ou volta um serviço.
  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, dx: 0, on: true, moved: false };
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on) return;
    d.dx = e.clientX - d.x;
    if (!d.moved && Math.abs(d.dx) > 6) {
      d.moved = true;
      track.current?.classList.add('is-dragging');
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.moved) track.current?.style.setProperty('--drag', `${d.dx * 0.5}px`);
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    track.current?.classList.remove('is-dragging');
    track.current?.style.removeProperty('--drag');
    if (d.moved) {
      if (d.dx < -50) goTo(index + 1);
      else if (d.dx > 50) goTo(index - 1);
    }
    // o clique que vem logo após soltar o arraste é ignorado
    window.setTimeout(() => {
      drag.current.moved = false;
    }, 0);
  };

  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  return (
    <section className="services section section--stone" id="servicos">
      <div className="wrap">
        <SectionHead
          index="02"
          label="serviços"
          title={
            <>
              feito para
              <br />
              <em>sentir.</em>
            </>
          }
          lead="Protocolos autorais para cada pele. Arraste, use as setas ou toque nas laterais para ver o próximo."
        />

        <div className="tabs" role="tablist" aria-label="Categorias de serviço" data-reveal>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cat === c.id}
              className={`tab${cat === c.id ? ' tab--on' : ''}`}
              onClick={() => choose(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="svc-ctrl" data-reveal>
          <p className="label" aria-live="polite">
            {pad(index + 1)} / {pad(list.length)}
          </p>
          <div className="svc-ctrl__bar" aria-hidden="true">
            <i style={{ transform: `scaleX(${(index + 1) / list.length})` }} />
          </div>
          <div className="svc-ctrl__btns">
            <button type="button" className="btn btn--ghost svc-arrow" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Serviço anterior">
              <ArrowLeft size={18} strokeWidth={1.5} />
            </button>
            <button type="button" className="btn btn--ghost svc-arrow" onClick={() => goTo(index + 1)} disabled={index === last} aria-label="Próximo serviço">
              <ArrowRight size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div
          className="svc-rail"
          role="group"
          aria-roledescription="carrossel"
          aria-label="Serviços"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          data-reveal
        >
          <ul className="svc-track" ref={track} style={{ '--i': index, '--n1': last } as CSSProperties}>
            {list.map((s, i) => {
              const on = i === index;
              return (
                <li key={s.id} className={`svc-card${on ? ' svc-card--on' : ''}`}>
                  <div className="svc-card__inner">
                    <div className="svc-card__media">
                      <Photo id={serviceMedia[s.category]} alt="" sizes="(min-width: 1024px) 400px, 80vw" pos={`${(i * 37 + 15) % 100}% 40%`} />
                    </div>

                    {/* fatia recolhida: número, nome na vertical; clique abre o serviço */}
                    <button
                      type="button"
                      className="svc-card__tab"
                      aria-label={`Ver ${s.name}`}
                      onClick={() => {
                        if (!drag.current.moved) goTo(i);
                      }}
                    >
                      <span className="svc-card__num">{pad(i + 1)}</span>
                      <strong>{s.name}</strong>
                      <Plus size={16} strokeWidth={1.4} />
                    </button>

                    <div className="svc-card__body" aria-hidden={!on}>
                      <div className="svc-body__top">
                        <span className="label">
                          {pad(i + 1)} / {pad(list.length)}
                        </span>
                        <span className="label">{categories.find((c) => c.id === s.category)?.label}</span>
                      </div>
                      <h3 className="svc-body__title">{s.name}</h3>
                      <p className="svc-body__meta">
                        <span>
                          <Clock size={13} strokeWidth={1.5} /> {s.minutes} min
                        </span>
                        <span className="svc-body__price">{priceLabel(s.price)}</span>
                      </p>
                      <p className="svc-body__desc">{s.desc}</p>
                      <ul className="ticks">
                        {s.benefits.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                      <p className="svc-body__ideal">
                        <span>ideal para</span> {s.ideal}
                      </p>
                      <div className="svc-body__cta">
                        <button type="button" className="btn btn--primary" onClick={() => onBook(s.id)}>
                          agendar este serviço <ArrowUpRight size={16} strokeWidth={1.6} />
                        </button>
                        <a
                          className="btn btn--ghost svc-body__wa"
                          href={waLink(`Olá! Tenho uma dúvida sobre ${s.name}.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Tirar dúvida sobre ${s.name} no WhatsApp`}
                        >
                          <WhatsAppIcon size={16} /> <span>tirar dúvida</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="services__foot" data-reveal>
          Não sabe por onde começar?{' '}
          <a className="link" href={waLink(genericMessage)} target="_blank" rel="noopener noreferrer">
            converse com a gente <ArrowUpRight size={15} strokeWidth={1.4} />
          </a>
        </p>
      </div>
    </section>
  );
}

// ==========================================================================
// MAPA DA PELE (3D)
// ==========================================================================


function FaceMap({ onBook }: { onBook: (serviceId?: string) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mount, setMount] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // O 3D só é carregado quando a seção está perto da tela.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMount(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const zone = faceZones.find((z) => z.id === selectedId) ?? null;
  const zoneRef = useRef<HTMLDivElement>(null);

  // No celular o resultado aparece abaixo do rosto: ao escolher uma região, mostra o resultado.
  useEffect(() => {
    if (!selectedId || window.innerWidth >= 1100) return;
    const el = zoneRef.current;
    if (!el) return;
    const id = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight || r.top < 80) {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
      }
    }, 350);
    return () => window.clearTimeout(id);
  }, [selectedId]);

  const zoneServices = zone ? zone.services.map((id) => services.find((s) => s.id === id)).filter((s) => !!s) : [];

  return (
    <section className="facemap section" id="mapa">
      <div className="wrap">
        <SectionHead
          index="03"
          label="mapa da pele"
          title={
            <>
              onde você
              <br />
              <em>sente?</em>
            </>
          }
          lead="Toque em uma região do rosto e veja os protocolos indicados. É um ponto de partida para a nossa conversa na avaliação."
        />

        <div className="facemap__frame" data-reveal>
          <div className="facemap__word" aria-hidden="true">
            pele
          </div>
          <p className="facemap__brand" aria-hidden="true">
            mapa da pele.
          </p>

          <div className="facemap__view" ref={wrap}>
            {!failed && mount ? (
              <FaceMap3D selectedId={selectedId} onSelect={setSelectedId} onFail={() => setFailed(true)} />
            ) : (
              <div className="facemap__loading">{failed ? 'use as regiões abaixo' : 'carregando mapa…'}</div>
            )}
          </div>

          <div className="facemap__rail">
            <div className="facemap__regions">
              <p className="label label--light">regiões do rosto</p>
              <div className="chips" role="group" aria-label="Regiões do rosto">
                {faceZones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    className={`chip${selectedId === z.id ? ' chip--on' : ''}`}
                    aria-pressed={selectedId === z.id}
                    onClick={() => setSelectedId(selectedId === z.id ? null : z.id)}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="btn btn--ghost-light facemap__cta" onClick={() => onBook('avaliacao-de-pele')}>
              prefiro uma avaliação <ArrowUpRight size={16} strokeWidth={1.6} />
            </button>
          </div>

          <div className="zone" aria-live="polite" ref={zoneRef}>
            {zone ? (
              <>
                <p className="label">{zone.label}</p>
                <h3 className="zone__title">{zone.title}</h3>
                <p className="body">{zone.text}</p>
                <ul className="zone__list">
                  {zoneServices.map((s) =>
                    s ? (
                      <li key={s.id}>
                        <div>
                          <strong>{s.name}</strong>
                          <small>
                            <Clock size={13} strokeWidth={1.5} /> {s.minutes} min · {priceLabel(s.price)}
                          </small>
                        </div>
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => onBook(s.id)}>
                          agendar <ArrowUpRight size={14} strokeWidth={1.6} />
                        </button>
                      </li>
                    ) : null,
                  )}
                </ul>
              </>
            ) : (
              <div className="zone__empty">
                <p className="label">ponto de partida</p>
                <p className="zone__title">escolha uma região</p>
                <p className="body">Toque nos pontos do rosto ou nos botões ao lado. Ao escolher, mostramos os protocolos indicados.</p>
              </div>
            )}
          </div>

          <a className="facemap__notch" href="#agendar" aria-label="ir para o agendamento">
            <ArrowDown size={16} strokeWidth={1.6} />
          </a>
        </div>
      </div>
    </section>
  );
}

type T3 = typeof import('three');

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const sstep = (a: number, b: number, t: number) => {
  const k = clamp((t - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-((x - cx) ** 2 / (2 * sx * sx) + (y - cy) ** 2 / (2 * sy * sy)));

const INK = '#252522';
const ACCENT = '#4f5a4d';

/** Busto escultural: esfera deformada com relevo de rosto + cor por vértice (pálpebras e lábios). */
function buildHead(T: T3, mergeVertices: (g: THREE.BufferGeometry, tol?: number) => THREE.BufferGeometry): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry = new T.SphereGeometry(1, 120, 90);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-5);

  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const clay = new T.Color('#ddd5c6');
  const lid = new T.Color('#a39988');
  const lip = new T.Color('#c4978c');
  const brow = new T.Color('#b4a995');
  const c = new T.Color();

  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i);
    const uy = pos.getY(i);
    const uz = pos.getZ(i);
    let x = ux * 0.78;
    const y = uy;
    let z = uz * 0.9;

    const jaw = sstep(-0.05, -0.98, y);
    x *= 1 - 0.34 * jaw;
    z *= 1 - 0.14 * jaw;
    if (uz < 0) z *= 1.04;

    const front = sstep(0.1, 0.65, uz);
    const ax = Math.abs(x);

    let bump = 0;
    bump += 0.12 * gauss(ax, y, 0, 0.05, 0.07, 0.28); // ponte do nariz
    bump += 0.16 * gauss(ax, y, 0, -0.2, 0.12, 0.09); // ponta
    bump += 0.05 * gauss(ax, y, 0.14, -0.2, 0.07, 0.06); // asas
    bump += 0.06 * gauss(ax, y, 0, 0.3, 0.5, 0.07); // arcada
    bump -= 0.05 * gauss(ax, y, 0.3, 0.17, 0.13, 0.07); // órbitas
    bump += 0.07 * gauss(ax, y, 0.45, -0.12, 0.17, 0.13); // maçãs do rosto
    bump += 0.05 * gauss(ax, y, 0, -0.48, 0.17, 0.04); // lábio superior
    bump += 0.05 * gauss(ax, y, 0, -0.58, 0.16, 0.04); // lábio inferior
    bump -= 0.03 * gauss(ax, y, 0, -0.525, 0.2, 0.012); // linha da boca
    bump += 0.08 * gauss(ax, y, 0, -0.8, 0.16, 0.12); // queixo
    z += front * bump;
    pos.setXYZ(i, x, y, z);

    c.copy(clay);
    c.lerp(lip, front * clamp(gauss(ax, y, 0, -0.5, 0.2, 0.065) * 1.1, 0, 1));
    c.lerp(lid, front * clamp(gauss(ax, y, 0.3, 0.165, 0.11, 0.013) * 1.25, 0, 1));
    c.lerp(brow, front * 0.65 * gauss(ax, y, 0.3, 0.31, 0.14, 0.02));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

interface Marker {
  zoneId: string;
  group: THREE.Group;
  core: THREE.Mesh;
  ring: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  normal: THREE.Vector3;
  phase: number;
}

interface Api {
  select: (id: string | null) => void;
}

/** Monta a cena inteira. Devolve a API de seleção e a função de limpeza. */
function setupScene(
  T: T3,
  mergeVertices: (g: THREE.BufferGeometry, tol?: number) => THREE.BufferGeometry,
  el: HTMLDivElement,
  hint: HTMLParagraphElement | null,
  initialId: string | null,
  onSelect: (id: string) => void,
  model: THREE.Object3D | null,
): { api: Api; dispose: () => void } | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, alpha: true, powerPreference: 'default' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'facemap__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  el.appendChild(canvas);

  const reduce = prefersReducedMotion();
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 50);

  scene.add(new T.HemisphereLight('#fff7ea', '#cfc8ba', 1.15));
  const key = new T.DirectionalLight('#fff0dc', 2.4);
  key.position.set(2.6, 3, 4);
  scene.add(key);
  const rim = new T.DirectionalLight('#d3dcd2', 1.2);
  rim.position.set(-3, 1.2, -2.5);
  scene.add(rim);

  const bust = new T.Group();
  scene.add(bust);

  const clayMat = new T.MeshStandardMaterial({ color: '#ddd5c6', roughness: 0.82, metalness: 0 });
  const headMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });

  const headGeo = buildHead(T, mergeVertices);
  const head = new T.Mesh(headGeo, headMat);
  if (!model) bust.add(head);

  const earGeo = new T.SphereGeometry(0.13, 24, 24);
  const earL = new T.Mesh(earGeo, clayMat);
  earL.scale.set(0.38, 1, 0.7);
  earL.position.set(-0.77, 0.0, -0.05);
  const earR = earL.clone();
  earR.position.x = 0.77;
  if (!model) bust.add(earL, earR);

  const neckGeo = new T.CylinderGeometry(0.34, 0.42, 1, 48, 1, true);
  const neck = new T.Mesh(neckGeo, clayMat);
  neck.position.set(0, -1.2, -0.08);
  if (!model) bust.add(neck);

  const shoulderGeo = new T.SphereGeometry(1, 64, 40);
  const shoulders = new T.Mesh(shoulderGeo, clayMat);
  shoulders.scale.set(1.35, 0.42, 0.7);
  shoulders.position.set(0, -1.88, -0.1);
  if (!model) bust.add(shoulders);

  // Modelo .glb: gira, escala e centraliza automaticamente para caber na cena.
  const modelMeshes: THREE.Mesh[] = [];
  if (model) {
    model.rotation.y = faceModel.rotateY;
    model.updateMatrixWorld(true);
    let box = new T.Box3().setFromObject(model);
    const size = box.getSize(new T.Vector3());
    model.scale.multiplyScalar(faceModel.fitHeight / (size.y || 1));
    model.updateMatrixWorld(true);
    box = new T.Box3().setFromObject(model);
    const ctr = box.getCenter(new T.Vector3());
    model.position.set(-ctr.x, -ctr.y + faceModel.offsetY, -ctr.z);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      modelMeshes.push(mesh);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        // sem mapa de reflexo, metal fica escuro: suaviza para o rosto não ficar preto
        if (typeof std.metalness === 'number' && std.metalness > 0.3) std.metalness = 0.1;
      });
    });
    bust.add(model);
  }

  // marcadores posicionados por raycast na superfície real
  scene.updateMatrixWorld(true);
  const rc = new T.Raycaster();
  const surfaces: THREE.Object3D[] = model ? modelMeshes : [head, neck, shoulders];
  const markers: Marker[] = [];
  const coreGeo = new T.SphereGeometry(0.036, 20, 20);
  const ringGeo = new T.RingGeometry(0.055, 0.066, 40);

  faceZones.forEach((zone) => {
    zone.pts.forEach((pt, idx) => {
      rc.set(new T.Vector3(pt.x * (model ? faceModel.spreadX : 1), pt.y * (model ? faceModel.scaleY : 1), 6), new T.Vector3(0, 0, -1));
      const hit = rc.intersectObjects(surfaces, false)[0];
      if (!hit) return;
      const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new T.Vector3(0, 0, 1);
      const group = new T.Group();
      group.position.copy(hit.point).addScaledVector(normal, 0.03);
      const coreMat = new T.MeshBasicMaterial({ color: INK });
      const ringMat = new T.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.6, depthWrite: false });
      const core = new T.Mesh(coreGeo, coreMat);
      const ring = new T.Mesh(ringGeo, ringMat);
      group.add(core, ring);
      bust.add(group);
      ring.lookAt(group.position.clone().add(normal));
      markers.push({ zoneId: zone.id, group, core, ring, coreMat, ringMat, normal, phase: idx * 0.35 });
    });
  });

  const state = {
    yaw: 0,
    yawT: 0,
    lookY: -0.3,
    lookYT: -0.3,
    dist: 5.4,
    distT: 5.4,
    auto: !reduce,
    baseDist: 5.4,
    selected: null as string | null,
  };

  function applySelection(id: string | null) {
    state.selected = id;
    const zone = id ? faceZones.find((z) => z.id === id) : null;
    if (!zone) {
      state.lookYT = -0.3;
      state.distT = state.baseDist;
      return;
    }
    state.auto = false;
    const pt = zone.pts[0];
    state.yawT = zone.pts.length > 1 ? -0.42 : -Math.atan2(pt.x, 0.9) * 0.8;
    state.lookYT = pt.y * 0.62 - 0.22;
    state.distT = state.baseDist * 0.74;
  }

  const resize = () => {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    state.baseDist = 5.4 * Math.max(1, 0.86 / camera.aspect);
    camera.updateProjectionMatrix();
    applySelection(state.selected);
  };

  const v = new T.Vector3();
  const nearest = (cx: number, cy: number): string | null => {
    const r = canvas.getBoundingClientRect();
    let best: string | null = null;
    let bestD = 46; // raio de toque confortável (px)
    bust.updateMatrixWorld(true);
    markers.forEach((m) => {
      m.group.getWorldPosition(v);
      const worldN = m.normal.clone().applyQuaternion(bust.quaternion);
      const toCam = camera.position.clone().sub(v).normalize();
      if (worldN.dot(toCam) < 0.15) return; // virado para trás
      v.project(camera);
      const sx = r.left + ((v.x + 1) / 2) * r.width;
      const sy = r.top + ((1 - v.y) / 2) * r.height;
      const d = Math.hypot(sx - cx, sy - cy);
      if (d < bestD) {
        bestD = d;
        best = m.zoneId;
      }
    });
    return best;
  };

  let drag: { x: number; yaw: number; moved: number } | null = null;
  const fadeHint = () => {
    if (hint) hint.style.opacity = '0';
  };

  const onDown = (e: PointerEvent) => {
    drag = { x: e.clientX, yaw: state.yawT, moved: 0 };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) {
      if (e.pointerType === 'mouse') canvas.style.cursor = nearest(e.clientX, e.clientY) ? 'pointer' : 'grab';
      return;
    }
    const dx = e.clientX - drag.x;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    if (drag.moved > 6) {
      state.auto = false;
      fadeHint();
      state.yawT = clamp(drag.yaw + dx * 0.009, -1.1, 1.1);
    }
  };
  const onUp = (e: PointerEvent) => {
    if (drag && drag.moved <= 6) {
      const id = nearest(e.clientX, e.clientY);
      if (id) {
        fadeHint();
        onSelect(id);
      }
    }
    drag = null;
  };
  const onCancel = () => {
    drag = null;
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);

  // loop: pausa fora da tela e com a aba oculta
  let raf = 0;
  let inView = true;
  let last = performance.now();
  let t = 0;
  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    const k = 1 - Math.exp(-6 * dt);
    if (state.auto) state.yawT = Math.sin(t * 0.45) * 0.32;
    state.yaw += (state.yawT - state.yaw) * k;
    state.lookY += (state.lookYT - state.lookY) * k;
    state.dist += (state.distT - state.dist) * k;
    bust.rotation.y = state.yaw;
    camera.position.set(0, state.lookY, state.dist);
    camera.lookAt(0, state.lookY, 0);

    markers.forEach((m) => {
      const on = m.zoneId === state.selected;
      m.coreMat.color.set(on ? ACCENT : INK);
      m.core.scale.setScalar(on ? 1.6 : 1);
      const p = (((t * 0.7 + m.phase) % 1) + 1) % 1;
      m.ring.scale.setScalar(1 + p * (on ? 1.6 : 0.9));
      m.ringMat.opacity = (1 - p) * (on ? 0.85 : 0.55);
    });

    renderer.render(scene, camera);
    if (inView && document.visibilityState === 'visible') raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
    },
    { threshold: 0.05 },
  );
  io.observe(el);
  const onVis = () => {
    if (document.visibilityState === 'visible') start();
  };
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => {
    resize();
    renderer.render(scene, camera);
  });
  ro.observe(el);

  resize();
  applySelection(initialId);
  start();

  const dispose = () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    [headGeo, earGeo, neckGeo, shoulderGeo, coreGeo, ringGeo].forEach((g) => g.dispose());
    [clayMat, headMat].forEach((m) => m.dispose());
    model?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
    });
    markers.forEach((m) => {
      m.coreMat.dispose();
      m.ringMat.dispose();
    });
    renderer.dispose();
    canvas.remove();
  };

  return { api: { select: applySelection }, dispose };
}

function FaceMap3D({ selectedId, onSelect, onFail }: { selectedId: string | null; onSelect: (id: string) => void; onFail: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  const api = useRef<Api | null>(null);
  const selRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onFailRef = useRef(onFail);
  selRef.current = selectedId;
  onSelectRef.current = onSelect;
  onFailRef.current = onFail;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    // three.js só é baixado quando esta seção está perto da tela.
    Promise.all([
      import('three'),
      import('three/examples/jsm/utils/BufferGeometryUtils.js'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
    ])
      .then(async ([T, utils, gltfMod, dracoMod]) => {
        let model: THREE.Object3D | null = null;
        if (faceModel.url) {
          try {
            const draco = new dracoMod.DRACOLoader();
            draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
            const loader = new gltfMod.GLTFLoader();
            loader.setDRACOLoader(draco);
            const gltf = await loader.loadAsync(faceModel.url);
            model = gltf.scene;
            draco.dispose();
          } catch {
            model = null; // sem arquivo ou arquivo inválido: usa o busto padrão
          }
        }
        if (cancelled) return;
        const result = setupScene(T, utils.mergeVertices, el, hint.current, selRef.current, (id) => onSelectRef.current(id), model);
        if (!result) {
          onFailRef.current();
          return;
        }
        api.current = result.api;
        dispose = result.dispose;
      })
      .catch(() => {
        if (!cancelled) onFailRef.current();
      });

    return () => {
      cancelled = true;
      api.current = null;
      dispose?.();
    };
  }, []);

  useEffect(() => {
    api.current?.select(selectedId);
  }, [selectedId]);

  return (
    <div className="facemap__stage" ref={host}>
      <p className="facemap__hint" ref={hint}>
        arraste para girar · toque nos pontos
      </p>
    </div>
  );
}


// ==========================================================================
// AGENDAMENTO
// ==========================================================================


interface BookingPreset {
  serviceId?: string;
  nonce: number;
}

const steps = ['serviço', 'data e hora', 'sobre você', 'revisar'];

// ——— calendário em vidro: semana (dias em arco) ou mês ———

const monthLongFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long' });
const weekdayLongFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long' });
const isoDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
const monthDows = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

interface CalendarProps {
  days: DayInfo[];
  selected: string | null;
  isOff: (d: DayInfo) => boolean;
  onPick: (iso: string) => void;
  caption: string;
}

function BookingCalendar({ days, selected, isOff, onPick, caption }: CalendarProps) {
  const [view, setView] = useState<'semana' | 'mes'>('semana');
  const [month, setMonth] = useState(() => (selected ?? days[0].iso).slice(0, 7));
  const drag = useRef({ x: 0, on: false, moved: false });

  const firstFree = days.find((d) => !isOff(d)) ?? days[0];
  const focusIso = selected ?? firstFree.iso;
  const focusIdx = Math.max(0, days.findIndex((d) => d.iso === focusIso));
  const months = Array.from(new Set(days.map((d) => d.iso.slice(0, 7))));
  const monthIdx = months.indexOf(month);
  const shownMonth = view === 'mes' ? month : focusIso.slice(0, 7);

  const pick = (iso: string) => {
    onPick(iso);
    setMonth(iso.slice(0, 7));
  };

  // próximo dia livre na direção escolhida (arraste, setas do teclado)
  const move = (dir: 1 | -1) => {
    for (let i = focusIdx + dir; i >= 0 && i < days.length; i += dir) {
      if (!isOff(days[i])) {
        pick(days[i].iso);
        return;
      }
    }
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, on: true, moved: false };
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 40) {
      d.moved = true;
      move(dx < 0 ? 1 : -1);
      window.setTimeout(() => {
        drag.current.moved = false;
      }, 0);
    }
  };
  const onKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    }
  };

  // grade do mês
  const [yy, mm] = month.split('-').map(Number);
  const lead = new Date(Date.UTC(yy, mm - 1, 1, 12)).getUTCDay();
  const dim = new Date(Date.UTC(yy, mm, 0, 12)).getUTCDate();
  const cells: (number | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  return (
    <div className="cal">
      <div className="cal__top">
        <div className="cal__seg" role="tablist" aria-label="Visualização do calendário">
          {(['semana', 'mes'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}>
              {v === 'mes' ? 'mês' : 'semana'}
            </button>
          ))}
        </div>
        <div className="cal__tools">
          {view === 'semana' ? (
            <button type="button" className="cal__round" aria-label="Voltar ao primeiro dia disponível" onClick={() => pick(firstFree.iso)}>
              {days[0].isToday ? 'hoje' : 'início'}
            </button>
          ) : (
            <>
              <button type="button" className="cal__round" aria-label="Mês anterior" disabled={monthIdx <= 0} onClick={() => setMonth(months[monthIdx - 1])}>
                <ArrowLeft size={16} strokeWidth={1.6} />
              </button>
              <button type="button" className="cal__round" aria-label="Próximo mês" disabled={monthIdx >= months.length - 1} onClick={() => setMonth(months[monthIdx + 1])}>
                <ArrowRight size={16} strokeWidth={1.6} />
              </button>
            </>
          )}
        </div>
      </div>

      <h4 className="cal__title" aria-live="polite">
        <span>{monthLongFmt.format(isoDate(`${shownMonth}-01`))}</span>
        <span>{days[focusIdx].dayNum}</span>
      </h4>
      <p className="cal__sub">
        {weekdayLongFmt.format(isoDate(focusIso))}
        {caption ? ` · ${caption}` : ''}
      </p>

      {view === 'semana' ? (
        <div className="cal__week" role="radiogroup" aria-label="Dia" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (drag.current.on = false)} onKeyDown={onKey}>
          <svg className="cal__arc" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M0 70 Q200 -5 400 70 L400 100 Q200 25 0 100 Z" vectorEffect="non-scaling-stroke" />
          </svg>
          {days.map((d, i) => {
            const off = i - focusIdx;
            const on = selected === d.iso;
            return (
              <button
                key={d.iso}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={isOff(d)}
                tabIndex={off === 0 ? 0 : -1}
                className={`cal__day${on ? ' is-on' : ''}${Math.abs(off) > 3 ? ' is-far' : ''}`}
                style={{ '--o': off, '--a': Math.abs(off) } as CSSProperties}
                onClick={() => {
                  if (!drag.current.moved) pick(d.iso);
                }}
              >
                <small>{d.isToday ? 'hoje' : d.weekday}</small>
                <b>{d.dayNum}</b>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="cal__month">
          <div className="cal__dows" aria-hidden="true">
            {monthDows.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="cal__grid" role="radiogroup" aria-label="Dia">
            {cells.map((n, i) => {
              if (n === null) return <span key={`b${i}`} />;
              const iso = `${month}-${String(n).padStart(2, '0')}`;
              const info = days.find((x) => x.iso === iso);
              const on = selected === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!info || isOff(info)}
                  className={`cal__cell${on ? ' is-on' : ''}${info?.isToday ? ' is-today' : ''}`}
                  onClick={() => pick(iso)}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Booking({ preset }: { preset: BookingPreset }) {
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState<Category>('facial');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dayIso, setDayIso] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [first, setFirst] = useState<'sim' | 'nao'>('sim');
  const [flags, setFlags] = useState<string[]>([]);
  const [goal, setGoal] = useState('');

  const days = useMemo(() => nextDays(30), []);
  const service = services.find((s) => s.id === serviceId) ?? null;
  const day = days.find((d) => d.iso === dayIso) ?? null;
  const slots = useMemo(() => (day && service ? slotsFor(day, service.minutes) : []), [day, service]);

  const card = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  // Depois de escolher algo, leva o botão "continuar" (ou os horários) para dentro da tela.
  const reveal = (el: HTMLElement | null) => {
    if (!el) return;
    window.setTimeout(() => el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' }), 120);
  };

  // Serviço escolhido em outra seção: já abre na etapa de data.
  useEffect(() => {
    if (!preset.serviceId) return;
    const s = services.find((x) => x.id === preset.serviceId);
    if (!s) return;
    setServiceId(s.id);
    setCat(s.category);
    setDayIso(null);
    setTime(null);
    setStep(1);
  }, [preset.nonce, preset.serviceId]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const el = card.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.45) {
      el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }, [step]);

  // Etapa de data: o primeiro dia livre já vem selecionado (os horários aparecem de imediato).
  useEffect(() => {
    if (step !== 1 || !service || dayIso) return;
    const firstFree = days.find((d) => slotsFor(d, service.minutes).length > 0);
    if (firstFree) setDayIso(firstFree.iso);
  }, [step, service, dayIso, days]);

  const pickService = (id: string) => {
    setServiceId(id);
    setDayIso(null);
    setTime(null);
    reveal(navRef.current);
  };

  const valid = [!!service, !!day && !!time, name.trim().length >= 2, true][step];
  const hint = [
    'Escolha um serviço para continuar.',
    'Escolha um dia e um horário.',
    'Informe seu nome para continuar.',
    '',
  ][step];

  const toggleFlag = (f: string) => setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const message = service && day && time ? buildMessage({ name, service, day, time, first, flags, goal }) : '';
  const list = services.filter((s) => s.category === cat);

  const periods = ['manhã', 'tarde', 'noite'].map((p) => ({ p, items: slots.filter((s) => period(s) === p) })).filter((g) => g.items.length);

  return (
    <section className="booking section section--ink" id="agendar">
      <div className="liquid" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="wrap">
        <SectionHead
          index="04"
          label="agendar"
          light
          title={
            <>
              reserve seu
              <br />
              <em>momento.</em>
            </>
          }
          lead="Quatro toques e a conversa já abre no WhatsApp com tudo preenchido. O horário fica reservado quando a Nativa confirma."
        />

        <div className="bk" ref={card} data-reveal>
          <ol className="bk__steps" aria-label="Etapas do agendamento">
            {steps.map((s, i) => (
              <li key={s} className={`bk__step${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}`} aria-current={i === step ? 'step' : undefined}>
                <span>{i < step ? <Check size={13} strokeWidth={2} /> : i + 1}</span>
                <em>{s}</em>
              </li>
            ))}
          </ol>

          {/* ——— 1. serviço ——— */}
          {step === 0 && (
            <div className="bk__panel">
              <h3 className="bk__title">o que você quer cuidar?</h3>
              <div className="tabs tabs--dark" role="tablist" aria-label="Categorias">
                {categories.map((c) => (
                  <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={`tab${cat === c.id ? ' tab--on' : ''}`} onClick={() => setCat(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="opts" role="radiogroup" aria-label="Serviço">
                {list.map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={serviceId === s.id} className={`opt${serviceId === s.id ? ' opt--on' : ''}`} onClick={() => pickService(s.id)}>
                    <span className="opt__main">
                      <strong>{s.name}</strong>
                      <small>{s.minutes} min</small>
                    </span>
                    <span className="opt__price">{priceLabel(s.price)}</span>
                    <span className="opt__check" aria-hidden="true">
                      <Check size={15} strokeWidth={2} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ——— 2. data e hora ——— */}
          {step === 1 && service && (
            <div className="bk__panel">
              <h3 className="bk__title">quando fica bom para você?</h3>
              <p className="bk__sub">
                {service.name} · {service.minutes} min
              </p>

              <BookingCalendar
                days={days}
                selected={dayIso}
                isOff={(d) => slotsFor(d, service.minutes).length === 0}
                onPick={(iso) => {
                  setDayIso(iso);
                  setTime(null);
                  reveal(slotsRef.current);
                }}
                caption={day ? `${slots.length} ${slots.length === 1 ? 'horário livre' : 'horários livres'}` : ''}
              />

              <div ref={slotsRef} />
              {day ? (
                periods.map((g) => (
                  <div key={g.p} className="slots">
                    <p className="label label--light">{g.p}</p>
                    <div className="slots__row" role="radiogroup" aria-label={`Horários da ${g.p}`}>
                      {g.items.map((t) => (
                        <button key={t} type="button" role="radio" aria-checked={time === t} className={`slot${time === t ? ' slot--on' : ''}`} onClick={() => { setTime(t); reveal(navRef.current); }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="bk__empty">Escolha um dia para ver os horários.</p>
              )}
            </div>
          )}

          {/* ——— 3. sobre você ——— */}
          {step === 2 && (
            <div className="bk__panel">
              <h3 className="bk__title">um pouco sobre você</h3>

              <label className="field">
                <span>seu nome</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="como podemos te chamar?" enterKeyHint="next" />
              </label>

              <fieldset className="field">
                <legend>primeira vez no espaço?</legend>
                <div className="seg" role="radiogroup">
                  {(['sim', 'nao'] as const).map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={first === v} className={`seg__btn${first === v ? ' seg__btn--on' : ''}`} onClick={() => setFirst(v)}>
                      {v === 'sim' ? 'sim' : 'já sou cliente'}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="field">
                <legend>
                  algo que devemos saber? <em>opcional</em>
                </legend>
                <div className="checks">
                  {healthFlags.map((f) => (
                    <label key={f} className={`check${flags.includes(f) ? ' check--on' : ''}`}>
                      <input type="checkbox" checked={flags.includes(f)} onChange={() => toggleFlag(f)} />
                      <span className="check__box" aria-hidden="true">
                        <Check size={13} strokeWidth={2.4} />
                      </span>
                      {f}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="field">
                <span>
                  o que você gostaria de melhorar? <em>opcional</em>
                </span>
                <textarea rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="manchas, oleosidade, tensão, só quero relaxar…" />
              </label>
            </div>
          )}

          {/* ——— 4. revisar ——— */}
          {step === 3 && service && day && time && (
            <div className="bk__panel">
              <h3 className="bk__title">tudo certo, {name.trim().split(' ')[0]}?</h3>
              <dl className="sum">
                <div>
                  <dt>serviço</dt>
                  <dd>
                    {service.name} <small>{service.minutes} min · {priceLabel(service.price)}</small>
                  </dd>
                  <button type="button" onClick={() => setStep(0)}>
                    editar
                  </button>
                </div>
                <div>
                  <dt>quando</dt>
                  <dd>
                    {day.long} <small>às {time}</small>
                  </dd>
                  <button type="button" onClick={() => setStep(1)}>
                    editar
                  </button>
                </div>
                <div>
                  <dt>você</dt>
                  <dd>
                    {name.trim()} <small>{first === 'sim' ? 'primeira vez' : 'já é cliente'}{flags.length ? ` · ${flags.length} aviso(s) de saúde` : ''}</small>
                  </dd>
                  <button type="button" onClick={() => setStep(2)}>
                    editar
                  </button>
                </div>
              </dl>

              <a className="btn btn--light btn--block btn--lg" href={waLink(message)} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={20} /> enviar pelo whatsapp
              </a>
              <p className="bk__note">Ao enviar, abrimos o WhatsApp com a mensagem pronta. Nada é cobrado agora e nenhum dado fica salvo neste site.</p>
            </div>
          )}

          {/* ——— navegação ——— */}
          <div className="bk__nav" ref={navRef}>
            {step > 0 ? (
              <button type="button" className="btn btn--ghost-light" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} strokeWidth={1.6} /> voltar
              </button>
            ) : (
              <span />
            )}
            {step < 3 && (
              <button type="button" className="btn btn--light" disabled={!valid} onClick={() => setStep(step + 1)}>
                continuar <ArrowRight size={16} strokeWidth={1.6} />
              </button>
            )}
          </div>
          {step < 3 && !valid && hint ? <p className="bk__hint">{hint}</p> : null}
        </div>

        <p className="booking__alt" data-reveal>
          Prefere conversar?{' '}
          <a className="link link--light" href={waLink(genericMessage)} target="_blank" rel="noopener noreferrer">
            chamar no whatsapp
          </a>
        </p>
      </div>
    </section>
  );
}


// ==========================================================================
// JORNADA, RESULTADOS, PACOTES, SOBRE
// ==========================================================================


function Journey({ onBook }: { onBook: () => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);
  const journeyImages = [photos.hero, photos.philosophy, photos.ritual, photos.facial];

  useEffect(() => {
    const updateActiveStep = () => {
      const focusY = window.innerHeight * 0.46;
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      stepRefs.current.forEach((step, index) => {
        if (!step) return;
        const rect = step.getBoundingClientRect();
        const distance = Math.abs((rect.top + rect.height * 0.42) - focusY);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });

      setActiveStep((current) => current === nearest ? current : nearest);
    };

    let raf = 0;
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; updateActiveStep(); });
    };
    updateActiveStep();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    };
  }, []);

  return (
    <section className="journey section" id="jornada">
      <div className="wrap">
        <SectionHead
          index="05"
          label="jornada"
          title={
            <>
              do primeiro olhar
              <br />
              ao <em>resultado.</em>
            </>
          }
          lead="Um caminho simples e acompanhado, do primeiro contato ao pós-sessão."
        />

        <div className="journey__scrolly">
          <div className="journey__visual" aria-live="polite">
            <div className="journey__image">
              <Photo
                key={activeStep}
                id={journeyImages[activeStep]}
                alt={`Etapa ${journey[activeStep].n}: ${journey[activeStep].title}`}
                sizes="(min-width: 900px) 42vw, 90vw"
              />
              <div className="journey__image-shade" />
              <div className="journey__visual-meta">
                <span className="journey__visual-count">{journey[activeStep].n} / 04</span>
                <span className="journey__visual-title">{journey[activeStep].title}</span>
              </div>
            </div>
            <div className="journey__progress" aria-hidden="true">
              <i style={{ transform: `scaleY(${(activeStep + 1) / journey.length})` }} />
            </div>
          </div>

          <ol className="journey__list">
            {journey.map((j, index) => (
              <li
                key={j.n}
                ref={(element) => { stepRefs.current[index] = element; }}
                className={activeStep === index ? 'journey__step--active' : ''}
                aria-current={activeStep === index ? 'step' : undefined}
              >
                <span className="journey__n">{j.n}</span>
                <div className="journey__step-copy">
                  <p className="journey__eyebrow">etapa {j.n}</p>
                  <h3>{j.title}</h3>
                  <p>{j.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="center" data-reveal>
          <button type="button" className="btn btn--primary btn--lg" onClick={onBook}>
            começar pela avaliação <ArrowUpRight size={18} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </section>
  );
}

/** Foto que aparece por dentro das letras (preto e branco). Troque aqui, se quiser outra. */
const baLetterPhoto: number | string = photos.philosophy;

/** Três linhas empilhadas, cada uma esticada de ponta a ponta (textLength): letras enormes, coladas, estilo cartaz. */
const baLines = [
  { text: 'uma', y: 232, size: 400 },
  { text: 'pele', y: 561, size: 420 },
  { text: 'cuidada', y: 832, size: 228 },
];
const baPhrase = ['não', 'precisa', 'dizer', 'nada.'];

/**
 * Antes e depois em scrollytelling: a seção fica fixa na tela e a rolagem comanda tudo.
 *  1. letras enormes com a foto em preto e branco por dentro (nítida, como na hero); a foto desliza e as
 *     linhas se afastam, enquanto a frase acende palavra por palavra;
 *  2. a escrita sobe e some, e a moldura do comparador abre no lugar;
 *  3. o comparador corre do "antes" para o "depois". No fim, dá para arrastar à mão.
 * As variáveis --a, --x, --c e --pos são escritas direto no DOM (sem re-render do React).
 */
function BeforeAfter({ onBook }: { onBook: () => void }) {
  const root = useRef<HTMLElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const setPos = (v: number) => {
      el.style.setProperty('--pos', `${v.toFixed(2)}%`);
      if (range.current) range.current.value = String(Math.round(v));
    };
    if (prefersReducedMotion()) {
      setPos(50);
      return;
    }
    let raf = 0;
    let lastC = -1;
    const lastVars: Record<string, string> = {};
    const setVar = (k: string, v: string) => {
      if (lastVars[k] === v) return;
      lastVars[k] = v;
      el.style.setProperty(`--${k}`, v);
    };
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      const a = clamp(p / 0.36, 0, 1); // escrita
      const x = sstep(0, 1, clamp((p - 0.34) / 0.2, 0, 1)); // troca: escrita sai, comparador entra
      const c = clamp((p - 0.54) / 0.4, 0, 1); // comparador corre
      setVar('a', a.toFixed(3));
      setVar('x', x.toFixed(3));
      setVar('c', c.toFixed(3));
      const live = x > 0.6;
      if (live !== el.hasAttribute('data-live')) el.toggleAttribute('data-live', live);
      const done = c > 0.6;
      if (done !== el.hasAttribute('data-done')) el.toggleAttribute('data-done', done);

      // dentro das letras: a foto desliza e cresce (só transform, na placa de vídeo, sem redesenhar)
      const s = 1 + a * 0.1;
      if (photoRef.current) {
        const tx = (((0.5 - a) * 50) / 1000) * 100;
        const ty = (((0.5 - a) * 90) / 840) * 100;
        photoRef.current.style.transform = `scale(${s.toFixed(4)}) translate(${tx.toFixed(3)}%, ${ty.toFixed(3)}%)`;
      }

      // só mexe no comparador enquanto a rolagem o move: depois disso a pessoa pode arrastar
      if (c !== lastC) {
        lastC = c;
        setPos(92 - 84 * sstep(0, 1, c));
      }
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="ba" id="resultados" ref={root} data-demo={beforeAfter.illustrative ? '' : undefined}>
      <div className="ba__pin">
        {/* 1 — letras brutas com a foto em preto e branco por dentro */}
        <div className="ba__intro">
          <div className="ba__col ba__col--intro">
            <p className="label ba__label">06 / resultados</p>
            <h2 className="ba__title">
              <span className="sr-only">uma pele cuidada não precisa dizer nada</span>
              {/* a foto anda por baixo (transform) e uma placa de areia com as letras vazadas fica parada por cima */}
              <span className="ba__letters" aria-hidden="true">
                <span className="ba__photo" ref={photoRef}>
                  <Photo id={baLetterPhoto} alt="" className="ba__photo-img" sizes="(min-width: 900px) 700px, 100vw" />
                </span>
                <svg className="ba__cover" viewBox="0 0 1000 840" focusable="false">
                  <defs>
                    <mask id="ba-knock" maskUnits="userSpaceOnUse" x="-20" y="-20" width="1040" height="880">
                      <rect x="-20" y="-20" width="1040" height="880" fill="#fff" />
                      {baLines.map((l) => (
                        <text
                          key={l.text}
                          x="20"
                          y={l.y}
                          textLength={960}
                          lengthAdjust="spacingAndGlyphs"
                          fill="#000"
                          stroke="#000"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: l.size }}
                        >
                          {l.text}
                        </text>
                      ))}
                    </mask>
                  </defs>
                  <rect x="-20" y="-20" width="1040" height="880" mask="url(#ba-knock)" style={{ fill: 'var(--sand)' }} />
                </svg>
              </span>
            </h2>
            <div className="ba__copy" aria-hidden="true">
              <p className="ba__lead">
                {baPhrase.map((w, i) => (
                  <span key={w} className="w" style={{ '--i': i } as CSSProperties}>
                    {w}{' '}
                  </span>
                ))}
              </p>
              <p className="ba__cue">
                role para ver <ArrowDown size={14} strokeWidth={1.4} />
              </p>
            </div>
          </div>
        </div>

        {/* 2 e 3 — a moldura abre e o comparador corre do antes para o depois */}
        <div className="ba__reveal">
          <div className="ba__col">
            <div className="ba__stack">
              <p className="ba__sub">
                Arraste para comparar.<span className="ba__sub-more"> Cada resultado varia conforme a pele, o plano e a constância dos cuidados.</span>
              </p>
              <div className="ba__slider">
                {/* cada lado: fundo desfocado da própria foto + a foto inteira, sem corte */}
                <div className="ba__side ba__side--after">
                  <Photo id={beforeAfter.after} alt="" className="ba__fill" lowres={64} />
                  <Photo id={beforeAfter.after} alt="Pele depois do protocolo" className="ba__fit" sizes="(min-width: 900px) 920px, 100vw" />
                </div>
                <div className="ba__wipe">
                  <div className="ba__side ba__side--before">
                    <Photo id={beforeAfter.before} alt="" className="ba__fill" lowres={64} />
                    <Photo id={beforeAfter.before} alt="Pele antes do protocolo" className="ba__fit" sizes="(min-width: 900px) 920px, 100vw" />
                  </div>
                </div>
                <span className="ba__tag ba__tag--l">antes</span>
                <span className="ba__tag ba__tag--r">depois</span>
                {beforeAfter.illustrative ? <span className="ba__note">imagem ilustrativa</span> : null}
                <div className="ba__handle" aria-hidden="true">
                  <i />
                  <b>
                    <ChevronsLeftRight size={18} strokeWidth={1.4} />
                  </b>
                  <i />
                </div>
                <input
                  ref={range}
                  className="ba__range"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={92}
                  onChange={(e) => root.current?.style.setProperty('--pos', `${e.currentTarget.value}%`)}
                  aria-label="Comparar antes e depois"
                />
              </div>
              <div className="ba__foot">
                <button type="button" className="btn btn--primary btn--block" onClick={onBook}>
                  quero o meu plano <ArrowUpRight size={16} strokeWidth={1.6} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Filtro SVG do vidro canelado: cada estria de 12px desloca o que está atrás, como um vidro de verdade. */
const fluteMap =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='0'%3E%3Cstop offset='0' stop-color='%23008080'/%3E%3Cstop offset='1' stop-color='%23ff8080'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='12' height='8' fill='url(%23g)'/%3E%3C/svg%3E";


/** Celular, Safari e navegadores sem filtro SVG no backdrop usam o vidro canelado "assado" em canvas. */
function wantsBakedGlass(): boolean {
  const ua = navigator.userAgent;
  const webkitOnly = (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/.test(ua)) || /CriOS|FxiOS|EdgiOS/.test(ua);
  return webkitOnly || window.matchMedia('(max-width: 719px)').matches;
}

let fluteTile: Promise<Uint8ClampedArray> | null = null;
/** Lê o mapa de deslocamento do vidro (o mesmo usado no filtro SVG): 12×8 px de R/G. */
function loadFluteTile(): Promise<Uint8ClampedArray> {
  if (!fluteTile) {
    fluteTile = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = 12;
          cv.height = 8;
          const cx = cv.getContext('2d', { willReadFrequently: true });
          if (!cx) throw new Error('canvas');
          cx.drawImage(img, 0, 0, 12, 8);
          resolve(cx.getImageData(0, 0, 12, 8).data);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = fluteMap;
    });
  }
  return fluteTile;
}

/**
 * Desenha, para cada cartão, o trecho da palavra "preços" que fica atrás dele, já com o deslocamento das
 * estrias (mesma conta do feDisplacementMap), e guarda como imagem de fundo do cartão. Roda uma vez (e ao
 * redimensionar): na rolagem não custa nada.
 */
async function bakeFluteGlass(stage: HTMLElement) {
  const word = stage.querySelector<SVGSVGElement>('.pk-word');
  const text = word?.querySelector('text');
  const section = stage.closest<HTMLElement>('.packages');
  const rail = stage.querySelector<HTMLElement>('.pk-grid');
  const cards = Array.from(stage.querySelectorAll<HTMLElement>('.pk'));
  if (!word || !text || !section || !rail || !cards.length) throw new Error('sem palavra');

  const cs = getComputedStyle(text);
  const str = text.textContent ?? '';
  const wr = word.getBoundingClientRect();
  const k = wr.width / 1000; // px por unidade do viewBox
  if (!k) throw new Error('sem largura');
  const fontPx = 300 * k;
  await document.fonts.load(`${fontPx}px ${cs.fontFamily}`, str).catch(() => []);
  await document.fonts.ready;
  const tile = await loadFluteTile();

  const d = Math.min(window.devicePixelRatio || 1, 2);
  const scale = 14 + 16 * Math.min(1, k); // deslocamento em px: 30 no computador, menor quando a palavra é pequena
  const scrolls = ['auto', 'scroll'].includes(getComputedStyle(rail).overflowX);
  const bg = getComputedStyle(section).backgroundColor || '#252522';
  const sand = getComputedStyle(document.documentElement).getPropertyValue('--sand').trim() || '#f3f1eb';
  const glyphs = Array.from(str).map((ch, i) => ({ ch, x: text.getStartPositionOfChar(i).x * k }));
  const baseY = 172 * k;

  for (const card of cards) {
    const cw = card.offsetWidth;
    const top = card.offsetTop;
    const rh = Math.min(Math.ceil(wr.height - top), card.offsetHeight);
    if (rh < 4 || cw < 4) continue;
    const ox = scrolls ? 0 : card.offsetLeft; // no carrossel, o cartão em repouso fica na borda esquerda da palavra
    const W = Math.round(cw * d);
    const H = Math.round(rh * d);

    const src = document.createElement('canvas');
    src.width = W;
    src.height = H;
    const sx = src.getContext('2d', { willReadFrequently: true });
    if (!sx) throw new Error('canvas');
    sx.fillStyle = bg;
    sx.fillRect(0, 0, W, H);
    sx.fillStyle = sand;
    sx.font = `${fontPx * d}px ${cs.fontFamily}`;
    sx.textBaseline = 'alphabetic';
    glyphs.forEach((g) => sx.fillText(g.ch, (g.x - ox) * d, (baseY - top) * d));
    const sd = sx.getImageData(0, 0, W, H).data;

    const out = sx.createImageData(W, H);
    const od = out.data;
    const fade = 8 * d;
    for (let Y = 0; Y < H; Y++) {
      const ty = Math.floor(Y / d) % 8;
      for (let X = 0; X < W; X++) {
        const ti = (ty * 12 + (Math.floor(X / d) % 12)) * 4;
        const px = Math.min(W - 1, Math.max(0, Math.round(X + scale * (tile[ti] / 255 - 0.5) * d)));
        const py = Math.min(H - 1, Math.max(0, Math.round(Y + scale * (tile[ti + 1] / 255 - 0.5) * d)));
        const si = (py * W + px) * 4;
        const oi = (Y * W + X) * 4;
        od[oi] = Math.min(255, sd[si] * 1.12);
        od[oi + 1] = Math.min(255, sd[si + 1] * 1.12);
        od[oi + 2] = Math.min(255, sd[si + 2] * 1.12);
        od[oi + 3] = Math.round(255 * Math.min(1, (H - Y) / fade)); // some suave na borda de baixo
      }
    }
    sx.putImageData(out, 0, 0);
    // putImageData não mistura: o canvas fica com o resultado exato (inclusive o alfa)
    card.style.setProperty('--pk-img', `url(${src.toDataURL('image/png')})`);
    card.style.setProperty('--pk-rh', `${rh}px`);
  }
}

function Packages() {
  // Mantém o filtro SVG de refração ativo também no mobile.
  // Navegadores sem suporte ao backdrop-filter SVG usam o fallback de estrias abaixo.
  // Vidro canelado: no Chrome do computador o navegador refrata a palavra (filtro SVG no backdrop, ligado só
  // enquanto a seção está na tela). No celular e no Safari esse filtro não existe ou pesa demais, então a
  // palavra distorcida é desenhada uma vez num canvas e vira a camada de baixo de cada cartão.
  const [flute, setFlute] = useState(false);
  const [baked, setBaked] = useState(false);
  useEffect(() => {
    const el = document.getElementById('pacotes');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setFlute(e.isIntersecting), { rootMargin: '150px 0px' });
    io.observe(el);

    let timer = 0;
    let gen = 0;
    const run = async () => {
      const my = ++gen;
      const stage = el.querySelector<HTMLElement>('.pk-stage');
      if (!stage || !wantsBakedGlass()) {
        setBaked(false);
        return;
      }
      try {
        await bakeFluteGlass(stage);
        if (my === gen) setBaked(true);
      } catch {
        if (my === gen) setBaked(false);
      }
    };
    const later = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 180);
    };
    run();
    const ro = new ResizeObserver(later);
    const stage = el.querySelector('.pk-stage');
    if (stage) ro.observe(stage);
    return () => {
      gen++;
      window.clearTimeout(timer);
      io.disconnect();
      ro.disconnect();
    };
  }, []);
  const [activePackage, setActivePackage] = useState(0);
  const packageRail = useRef<HTMLDivElement>(null);

  const selectPackage = (index: number) => {
    const rail = packageRail.current;
    const card = rail?.children[index] as HTMLElement | undefined;
    if (!rail || !card) return;
    rail.scrollTo({ left: card.offsetLeft - (rail.firstElementChild as HTMLElement).offsetLeft, behavior: 'smooth' });
    setActivePackage(index);
  };

  const onPackageScroll = (event: RUIEvent<HTMLDivElement>) => {
    const rail = event.currentTarget;
    const firstCard = rail.firstElementChild as HTMLElement | null;
    if (!firstCard) return;
    const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
    setActivePackage(Math.max(0, Math.min(packages.length - 1, Math.round(rail.scrollLeft / (firstCard.offsetWidth + gap)))));
  };

  return (
    <section className="packages section section--ink" id="pacotes" data-flute={flute && !baked ? 'on' : undefined} data-baked={baked ? '' : undefined}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id="pk-flute" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={fluteMap} x="0" y="0" width="12" height="8" result="tile" />
          <feTile in="tile" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="30" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="pk-flute-m" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={fluteMap} x="0" y="0" width="12" height="8" result="tile" />
          <feTile in="tile" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="liquid" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <div className="wrap">
        <header className="pk-head" data-reveal>
          <p className="label label--light">07 / pacotes</p>
          <p className="lead">A pele responde ao hábito. Escolha o ritmo que cabe na sua rotina.</p>
        </header>
        <h2 className="sr-only">preços e pacotes</h2>

        <div className="pk-stage">
          {/* a palavra fica atrás dos cartões: as estrias do vidro a distorcem */}
          <svg className="pk-word" viewBox="0 0 1000 245" aria-hidden="true" focusable="false">
            <text x="4" y="172" textLength={988} lengthAdjust="spacing" style={{ fontFamily: 'var(--serif)', fontSize: 300 }}>
              preços
            </text>
          </svg>

          <div className="pk-grid" ref={packageRail} onScroll={onPackageScroll}>
            {packages.map((p) => (
              <article key={p.id} className={`pk${p.featured ? ' pk--featured' : ''}`} data-reveal>
                <p className="pk__tag">{p.tag}</p>
                <h3 className="pk__name">{p.name}</h3>
                <p className="pk__price">
                  {brl(p.price)}
                  {p.per ? <small>{p.per}</small> : null}
                </p>
                <p className="pk__note">{p.note ?? ' '}</p>
                <ul className="pk__list">
                  {p.items.map((i) => (
                    <li key={i}>
                      <span className="pk__chk" aria-hidden="true">
                        <Check size={11} strokeWidth={2.6} />
                      </span>
                      {i}
                    </li>
                  ))}
                </ul>
                <a
                  className={`btn btn--block ${p.featured ? 'btn--light' : 'btn--ghost-light'}`}
                  href={waLink(`Olá! Tenho interesse no pacote "${p.name}". Podem me explicar como funciona?`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  quero este <ArrowUpRight size={16} strokeWidth={1.6} />
                </a>
              </article>
            ))}
          </div>
          <div className="pk-nav">
          <p className="pk-count" aria-live="polite">
            <b>{String(activePackage + 1).padStart(2, '0')}</b> / {String(packages.length).padStart(2, '0')}
          </p>
          <div className="pk-dots" role="tablist" aria-label="Planos disponíveis">
            {packages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`pk-dot${activePackage === i ? ' pk-dot--active' : ''}`}
                role="tab"
                aria-label={`Ver plano ${i + 1}: ${p.name}`}
                aria-selected={activePackage === i}
                onClick={() => selectPackage(i)}
              />
            ))}
          </div>
          </div>
        </div>

        <div className="gift" data-reveal>
          <Gift size={22} strokeWidth={1.3} />
          <div>
            <h3>vale-presente</h3>
            <p>Dê um momento de cuidado a quem você ama. Valor livre ou um ritual específico.</p>
          </div>
          <a className="btn btn--ghost-light" href={waLink('Olá! Gostaria de presentear com um vale-presente.')} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={16} /> presentear
          </a>
        </div>
      </div>
    </section>
  );
}

function Care() {
  const [tab, setTab] = useState<'antes' | 'depois'>('antes');
  return (
    <section className="care section section--stone" id="cuidados">
      <div className="wrap care__grid">
        <div data-reveal>
          <p className="label">08 / cuidados</p>
          <h2 className="h2">
            antes e
            <br />
            <em>depois.</em>
          </h2>
          <p className="body">Orientações gerais para aproveitar melhor cada sessão. Ajustamos tudo ao seu caso na avaliação.</p>
        </div>

        <div className="care__card" data-reveal>
          <div className="seg seg--light" role="tablist" aria-label="Momento">
            {(['antes', 'depois'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className={`seg__btn${tab === t ? ' seg__btn--on' : ''}`} onClick={() => setTab(t)}>
                {t === 'antes' ? 'antes da sessão' : 'depois da sessão'}
              </button>
            ))}
          </div>
          <ul className="ticks ticks--lg" role="tabpanel">
            {careGuides[tab].map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Vídeo institucional da clínica (arquivo .mp4 em /public ou endereço completo). Vazio = o botão de play mostra um aviso. */
const aboutVideo = '';

/** Textos do "Sobre". O parágrafo e as listas são contados em palavras para a rolagem acendê-los na ordem. */
const aboutParagraphs = [
  'A Nativa nasceu da vontade de fazer estética sem pressa e sem promessas milagrosas: avaliação honesta, protocolos pensados para cada pele e um ambiente onde dá para respirar.',
  'Cada atendimento começa por uma conversa e uma avaliação da pele. Só então indicamos o protocolo, com o que esperar de cada sessão e quanto tempo o cuidado leva.',
];
const aboutBlocks: { title: string; items: string[] }[] = [
  { title: 'formação', items: credentials },
  { title: 'biossegurança', items: biosafety },
];
const aboutWords = (s: string) => s.split(' ').length;
const aboutCount =
  aboutParagraphs.reduce((n, p) => n + aboutWords(p), 0) +
  aboutBlocks.reduce((n, b) => n + aboutWords(b.title) + b.items.reduce((m, i) => m + aboutWords(i), 0), 0);

/**
 * Sobre: abertura escura com título gigante sobre a foto desfocada, faixa panorâmica nítida,
 * e abaixo "rótulo + play" à esquerda e texto à direita. Rolagem scrub: a foto abre e as palavras acendem.
 */
function About({ onBook }: { onBook: () => void }) {
  const root = useRef<HTMLElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--p', '1');
      el.style.setProperty('--q', '1');
      return;
    }
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      const s = top.current?.getBoundingClientRect();
      const c = copyRef.current?.getBoundingClientRect();
      if (!s || !c) return;
      // abertura: a faixa panorâmica "abre" e a foto de fundo ganha nitidez enquanto o topo sobe pela tela
      el.style.setProperty('--q', clamp((vh * 0.9 - s.top) / (vh * 0.8)).toFixed(4));
      // texto: as palavras acendem na ordem
      el.style.setProperty('--p', clamp((vh * 0.85 - c.top) / Math.max(1, c.height - vh * 0.1)).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  let n = 0;
  const words = (s: string) =>
    s.split(' ').map((w, i) => (
      <span key={i} className="w" style={{ '--i': n++ } as CSSProperties}>
        {w}{' '}
      </span>
    ));

  const openVideo = () => dialog.current?.showModal();
  const closeVideo = () => {
    const d = dialog.current;
    d?.querySelector('video')?.pause();
    d?.close();
  };

  return (
    <section className="about section--ink" id="sobre" ref={root} style={{ '--nn': aboutCount + 6 } as CSSProperties}>
      <div className="about__top" ref={top}>
        <div className="about__bg" aria-hidden="true">
          <Photo id={photos.ritual} alt="" className="about__bg-img" pos="50% 40%" lowres={640} />
        </div>

        <div className="wrap about__hero">
          <h2 className="about__title">
            somos a
            <br />
            Nativa.
          </h2>
          <div className="about__tags">
            <p>
              estética
              <br />
              sem pressa
            </p>
            <p>
              cuidado para
              <br />
              peles reais
            </p>
          </div>
        </div>

        <div className="wrap">
          <figure className="about__band">
            <Photo id={photos.ritual} alt="Massagem facial em ambiente de spa" className="about__band-img" pos="50% 40%" sizes="(min-width: 1320px) 1280px, 100vw" />
          </figure>
        </div>
      </div>

      <div className="wrap about__body">
        <div className="about__side">
          <p className="about__label">sobre a clínica</p>
          <button type="button" className="about__play" onClick={openVideo} aria-label="Assistir ao vídeo da clínica">
            <Play size={26} strokeWidth={0} fill="currentColor" />
          </button>
        </div>

        <div className="about__copy" ref={copyRef}>
          {aboutParagraphs.map((p) => (
            <p key={p} className="about__p">
              {words(p)}
            </p>
          ))}

          <div className="about__lists">
            {aboutBlocks.map((b) => (
              <div key={b.title}>
                <h3 className="about__h">{words(b.title)}</h3>
                <ul className="about__ul">
                  {b.items.map((c) => (
                    <li key={c}>{words(c)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <button type="button" className="about__link" onClick={onBook}>
            ( agendar uma avaliação )
          </button>
        </div>
      </div>

      <dialog className="about__dialog" ref={dialog} onClick={(e) => e.target === e.currentTarget && closeVideo()} aria-label="Vídeo da clínica">
        <button type="button" className="about__close" onClick={closeVideo} aria-label="Fechar vídeo">
          <X size={20} strokeWidth={1.5} />
        </button>
        {aboutVideo ? (
          <video src={aboutVideo} controls playsInline autoPlay />
        ) : (
          <p className="about__novideo">Vídeo da clínica: defina o arquivo em <code>aboutVideo</code> no App.tsx.</p>
        )}
      </dialog>
    </section>
  );
}


// ==========================================================================
// DEPOIMENTOS, GALERIA, FAQ, LOCAL
// ==========================================================================


/**
 * Carrossel "coverflow" compartilhado (galeria e depoimentos).
 * Cada cartão recebe sua distância até o centro (--d, com sinal) e o módulo (--a): o CSS faz o resto.
 */
function useCoverflow(count: number) {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const last = count - 1;

  const update = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const mid = el.scrollLeft + el.clientWidth / 2;
    const step = (cards[1]?.offsetLeft ?? 0) - (cards[0]?.offsetLeft ?? 0) || cards[0]?.offsetWidth || 1;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, i) => {
      const d = (card.offsetLeft + card.offsetWidth / 2 - mid) / step;
      card.style.setProperty('--d', d.toFixed(3));
      card.style.setProperty('--a', Math.min(Math.abs(d), 2.5).toFixed(3));
      if (Math.abs(d) < bestDist) {
        bestDist = Math.abs(d);
        best = i;
      }
    });
    setActive((prev) => (prev === best ? prev : best));
  }, []);

  useEffect(() => {
    // abre no cartão do meio, para os dois lados já aparecerem
    const el = rail.current;
    const start = el?.children[Math.floor(count / 2)] as HTMLElement | undefined;
    if (el && start) el.scrollLeft = start.offsetLeft + start.offsetWidth / 2 - el.clientWidth / 2;
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update, count]);

  const goTo = (i: number) => {
    const el = rail.current;
    const card = el?.children[Math.max(0, Math.min(last, i))] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  // Mouse: arrastar para o lado (toque e trackpad já rolam nativamente).
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const wasDragged = useRef(false);
  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
  };
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 5) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.classList.add('is-dragging');
    }
    e.currentTarget.scrollLeft = d.left - dx;
  };
  const endDrag = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    e.currentTarget.classList.remove('is-dragging');
    if (d?.moved) {
      // o clique que o navegador dispara ao soltar o mouse não deve trocar de cartão
      wasDragged.current = true;
      window.setTimeout(() => (wasDragged.current = false), 0);
      goTo(active); // reassenta no cartão mais próximo do centro
    }
  };
  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') (e.preventDefault(), goTo(active + 1));
    else if (e.key === 'ArrowLeft') (e.preventDefault(), goTo(active - 1));
  };

  const bind = { onScroll: update, onKeyDown, onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onPointerLeave: endDrag };
  return { rail, active, last, goTo, wasDragged, bind };
}

function Testimonials() {
  const { rail, active, last, goTo, wasDragged, bind } = useCoverflow(testimonials.length);

  return (
    <section className="voices section section--mist" id="depoimentos">
      <div className="voices__glow" aria-hidden="true" />
      <div className="wrap">
        <SectionHead
          index="11"
          label="depoimentos"
          title={
            <>
              quem já
              <br />
              <em>sentiu.</em>
            </>
          }
        />
      </div>

      <div
        className="voices__rail"
        ref={rail}
        tabIndex={0}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Depoimentos, deslize para o lado"
        {...bind}
      >
        {testimonials.map((t, i) => (
          <figure key={t.name} className={`voice${i === active ? ' is-active' : ''}`} aria-hidden={i === active ? undefined : true} onClick={() => i !== active && !wasDragged.current && goTo(i)}>
            <Photo id={t.photo} alt="" className="voice__photo" pos={t.pos} sizes="(min-width: 720px) 440px, 78vw" />
            <div className="voice__glass">
              <Quote size={20} strokeWidth={1.2} />
              <blockquote>{t.text}</blockquote>
              <figcaption>
                <strong>{t.name}</strong>
                <small>{t.detail}</small>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>

      <div className="wrap">
        <div className="voices__ctrl">
          <p className="voices__count" aria-live="polite">
            <b>{String(active + 1).padStart(2, '0')}</b> / {String(testimonials.length).padStart(2, '0')}
          </p>
          <div className="voices__bar" aria-hidden="true">
            <i style={{ transform: `scaleX(${(active + 1) / testimonials.length})` }} />
          </div>
          <div className="voices__btns">
            <button type="button" className="btn btn--ghost btn--sm voices__arrow" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Depoimento anterior">
              <ArrowLeft size={18} strokeWidth={1.4} />
            </button>
            <button type="button" className="btn btn--ghost btn--sm voices__arrow" onClick={() => goTo(active + 1)} disabled={active === last} aria-label="Próximo depoimento">
              <ArrowRight size={18} strokeWidth={1.4} />
            </button>
          </div>
        </div>
        <p className="voices__note">Depoimentos ilustrativos. Substitua por relatos reais, com autorização das clientes.</p>
      </div>
    </section>
  );
}

function Gallery() {
  const { rail, active, last, goTo, wasDragged, bind } = useCoverflow(gallery.length);
  const section = useRef<HTMLElement>(null);

  // Ao chegar na última foto, a página desce sozinha e suave até os depoimentos,
  // como se galeria e depoimentos fossem um único movimento.
  // Cancela se a pessoa trocar de foto ou rolar a página por conta própria nesse meio-tempo.
  useEffect(() => {
    if (active !== last) return;
    const el = section.current;
    if (!el) return;
    const y0 = window.scrollY;
    const id = window.setTimeout(() => {
      if (Math.abs(window.scrollY - y0) > 40) return;
      const r = el.getBoundingClientRect();
      const visible = r.top < window.innerHeight * 0.7 && r.bottom > window.innerHeight * 0.3;
      if (visible) scrollToId('depoimentos');
    }, 1100);
    return () => window.clearTimeout(id);
  }, [active, last]);

  return (
    <section className="voices gallery section section--mist" id="galeria" ref={section}>
      <div className="voices__glow" aria-hidden="true" />
      <div className="wrap">
        <SectionHead
          index="10"
          label="galeria"
          title={
            <>
              o espaço, os
              <br />
              <em>detalhes.</em>
            </>
          }
        />
      </div>

      <div
        className="voices__rail"
        ref={rail}
        tabIndex={0}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Galeria, deslize para o lado"
        {...bind}
      >
        {gallery.map((g, i) => (
          <figure key={g.caption} className={`voice${i === active ? ' is-active' : ''}`} aria-hidden={i === active ? undefined : true} onClick={() => i !== active && !wasDragged.current && goTo(i)}>
            <Photo id={g.id} alt={g.alt} className="voice__photo" pos="50% 40%" sizes="(min-width: 720px) 440px, 78vw" />
            <div className="voice__glass">
              <Camera size={20} strokeWidth={1.2} />
              <p className="voice__cap">{g.caption}</p>
              <figcaption>
                <small>
                  {String(i + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}
                </small>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>

      <div className="wrap">
        <div className="voices__ctrl">
          <p className="voices__count" aria-live="polite">
            <b>{String(active + 1).padStart(2, '0')}</b> / {String(gallery.length).padStart(2, '0')}
          </p>
          <div className="voices__bar" aria-hidden="true">
            <i style={{ transform: `scaleX(${(active + 1) / gallery.length})` }} />
          </div>
          <div className="voices__btns">
            <button type="button" className="btn btn--ghost btn--sm voices__arrow" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Foto anterior">
              <ArrowLeft size={18} strokeWidth={1.4} />
            </button>
            <button type="button" className="btn btn--ghost btn--sm voices__arrow" onClick={() => goTo(active + 1)} disabled={active === last} aria-label="Próxima foto">
              <ArrowRight size={18} strokeWidth={1.4} />
            </button>
          </div>
        </div>
        <div className="center">
          <a className="btn btn--ghost" href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer">
            ver mais no instagram <ArrowUpRight size={16} strokeWidth={1.6} />
          </a>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="faq section section--ink" id="duvidas">
      <div className="wrap faq__grid">
        <div className="faq__head" data-reveal>
          <p className="label">12 / dúvidas</p>
          <h2 className="h2">
            perguntas
            <br />
            <em>frequentes.</em>
          </h2>
        </div>
        <ul className="faq__list">
          {faq.map((f, i) => (
            <li key={f.q} className={`faq__item${open === i ? ' faq__item--open' : ''}`}>
              <button type="button" className="faq__q" aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                <span>{f.q}</span>
                <Plus size={20} strokeWidth={1.3} className="faq__icon" aria-hidden="true" />
              </button>
              <Collapse open={open === i} id={`faq-${i}`}>
                <p className="faq__a">{f.a}</p>
              </Collapse>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const order = [1, 2, 3, 4, 5, 6, 0];

function useOpenNow() {
  const [now, setNow] = useState(() => nowSP());
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowSP()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const h = hours[now.wd];
  const open = !!h && now.minutes >= toMin(h.open) && now.minutes < toMin(h.close);
  return { open, wd: now.wd };
}

function Place() {
  const { open, wd } = useOpenNow();
  const a = contact.address;
  const full = `${a.line}, ${a.district}, ${a.city}`;
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(full)}`;
  const waze = `https://waze.com/ul?q=${encodeURIComponent(full)}&navigate=yes`;

  return (
    <section className="place section" id="local">
      <div className="wrap">
        <SectionHead
          index="13"
          label="local"
          title={
            <>
              venha nos
              <br />
              <em>visitar.</em>
            </>
          }
        />

        <div className="place__grid">
          <div className="place__card" data-reveal>
            <div className="place__row">
              <MapPin size={20} strokeWidth={1.3} />
              <div>
                <p className="label">endereço</p>
                <p className="place__val">
                  {a.line}
                  <br />
                  {a.district} · {a.city}
                  <br />
                  CEP {a.zip}
                </p>
                <p className="place__small">{a.note}</p>
              </div>
            </div>
            <div className="row">
              <a className="btn btn--primary" href={maps} target="_blank" rel="noopener noreferrer">
                como chegar <ArrowUpRight size={16} strokeWidth={1.6} />
              </a>
              <a className="btn btn--ghost" href={waze} target="_blank" rel="noopener noreferrer">
                abrir no waze
              </a>
            </div>
          </div>

          <div className="place__card" data-reveal>
            <div className="place__row">
              <Clock size={20} strokeWidth={1.3} />
              <div className="place__hours">
                <p className="label">
                  horários <span className={`pill${open ? ' pill--on' : ''}`}>{open ? 'aberto agora' : 'fechado agora'}</span>
                </p>
                <ul>
                  {order.map((d) => {
                    const h = hours[d];
                    return (
                      <li key={d} className={d === wd ? 'is-today' : ''}>
                        <span>{names[d]}</span>
                        <span>{h ? `${h.open} – ${h.close}` : 'fechado'}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          <div className="place__card" data-reveal>
            <div className="place__row">
              <CreditCard size={20} strokeWidth={1.3} />
              <div>
                <p className="label">pagamento</p>
                <p className="place__val">{contact.payments.join(' · ')}</p>
                <p className="place__small">{contact.cancellation}</p>
              </div>
            </div>
            <a className="btn btn--ghost" href={waLink(genericMessage)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={16} /> falar com a Nativa
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}


// ==========================================================================
// RODAPÉ E CTAs
// ==========================================================================


function FinalCTA({ onBook }: { onBook: () => void }) {
  return (
    <section className="final section" id="contato">
      <div className="wrap final__inner" data-reveal>
        <p className="label">seu momento</p>
        <h2 className="h2 h2--xl">
          vamos cuidar
          <br />
          <em>de você?</em>
        </h2>
        <p className="body">Agende uma avaliação para encontrarmos o ritual que faz sentido para a sua pele.</p>
        <div className="final__cta">
          <button type="button" className="btn btn--primary btn--lg" onClick={onBook}>
            agendar avaliação <ArrowUpRight size={18} strokeWidth={1.6} />
          </button>
          <a className="btn btn--ghost btn--lg" href={waLink(genericMessage)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={18} /> conversar no whatsapp
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const go = (id: string) => (e: MouseEvent) => (e.preventDefault(), scrollToId(id));
  return (
    <footer className="footer" id="rodape">
      <div className="wrap footer__grid">
        <div>
          <a className="brand brand--lg" href="#top" onClick={go('top')}>
            nativa<span>®</span>
          </a>
          <p className="footer__tag">estética essencial
            <br />
            para todos os dias
          </p>
        </div>

        <nav className="footer__col" aria-label="Rodapé">
          <p className="label label--light">navegar</p>
          <a href="#servicos" onClick={go('servicos')}>serviços</a>
          <a href="#mapa" onClick={go('mapa')}>mapa da pele</a>
          <a href="#agendar" onClick={go('agendar')}>agendar</a>
          <a href="#pacotes" onClick={go('pacotes')}>pacotes</a>
          <a href="#duvidas" onClick={go('duvidas')}>dúvidas</a>
        </nav>

        <div className="footer__col">
          <p className="label label--light">contato</p>
          <a href={waLink(genericMessage)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={15} /> whatsapp</a>
          <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer"><Instagram size={15} strokeWidth={1.4} /> @{contact.instagram}</a>
          <a href={`mailto:${contact.email}`}><Mail size={15} strokeWidth={1.4} /> {contact.email}</a>
        </div>
      </div>
      {/* palavra gigante de ponta a ponta, cortada na metade: só a parte de cima das letras aparece */}
      <svg className="footer__word" viewBox="0 0 1000 148" aria-hidden="true" focusable="false">
        <text x="-14" y="228" textLength={1028} lengthAdjust="spacingAndGlyphs" style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 300 }}>
          nativa
        </text>
      </svg>
      <div className="wrap footer__legal">
        <small>© {new Date().getFullYear()} Nativa Estética</small>
        <small>{contact.cancellation}</small>
        <a href="#top" onClick={go('top')}><small>voltar ao topo ↑</small></a>
      </div>
    </footer>
  );
}

/** Barra de ação fixa: aparece depois da primeira dobra e some quando o próprio CTA já está na tela. */
function StickyCTA({ onBook }: { onBook: () => void }) {
  const [heroOut, setHeroOut] = useState(false);
  const [hidden, setHidden] = useState(false);
  const hiddenSet = useRef(new Set<string>());

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const watch = (id: string, cb: (visible: boolean) => void) => {
      const el = document.getElementById(id);
      if (!el) return;
      const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), { threshold: 0.12 });
      io.observe(el);
      observers.push(io);
    };
    watch('top', (v) => setHeroOut(!v));
    ['agendar', 'rodape', 'contato'].forEach((id) =>
      watch(id, (v) => {
        if (v) hiddenSet.current.add(id);
        else hiddenSet.current.delete(id);
        setHidden(hiddenSet.current.size > 0);
      }),
    );
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const show = heroOut && !hidden;
  return (
    <div className={`sticky${show ? ' sticky--on' : ''}`} aria-hidden={!show}>
      <button type="button" className="btn btn--light sticky__main" onClick={onBook} tabIndex={show ? 0 : -1}>
        agendar avaliação <ArrowUpRight size={16} strokeWidth={1.6} />
      </button>
      <a className="sticky__wa" href={waLink(genericMessage)} target="_blank" rel="noopener noreferrer" aria-label="Conversar no WhatsApp" tabIndex={show ? 0 : -1}>
        <WhatsAppIcon size={22} />
      </a>
    </div>
  );
}


// ==========================================================================
// APP
// ==========================================================================


export default function App() {

  // Animações contínuas só rodam enquanto o bloco está na tela.
  useEffect(() => {
    const els = document.querySelectorAll('.liquid, .marquee');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting));
    });
    els.forEach((el) => {
      el.classList.add('is-off');
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('js');
    document.title = 'Nativa · Estética essencial em São Paulo';

    // Trava o zoom-out: a página nunca fica menor que a tela (só dá para ampliar).
    let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover';

    // Impede qualquer rolagem lateral da página (é ela que faz o navegador "encolher" o site).
    root.style.overflowX = 'clip';
    document.body.style.overflowX = 'clip';
  }, []);

  const [preset, setPreset] = useState<BookingPreset>({ nonce: 0 });

  // Todo CTA do site passa por aqui: escolhe o serviço (se houver) e leva à seção de agendamento.
  const book = useCallback((serviceId?: string) => {
    setPreset((p) => ({ serviceId, nonce: p.nonce + 1 }));
    scrollToId('agendar');
  }, []);

  // Revelação suave dos blocos ao entrar na tela (um único observer).
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <a className="skip" href="#sobre">
        ir para o conteúdo
      </a>
      <Header onBook={() => book()} />
      <main>
        <Hero />
        <Marquee />
        <About onBook={() => book()} />
        <Services onBook={book} />
        <FaceMap onBook={book} />
        <Booking preset={preset} />
        <BeforeAfter onBook={() => book()} />
        <Packages />
        <Gallery />
        <Testimonials />
        <FAQ />
        <Place />
        <FinalCTA onBook={() => book()} />
      </main>
      <Footer />
      <StickyCTA onBook={() => book()} />
    </>
  );
}