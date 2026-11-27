export const colors = {
  white: '#FFFFFF', paper: '#F5F8FC', blue: '#6CAAE8', pressed: '#5195DD',
  softBlue: '#EAF4FF', accent: '#347EC7', ink: '#20334D', muted: '#54677E',
  secondary: '#718096', line: '#E2E8F0', action: '#2364A1', actionPressed: '#1D568D',
  success: '#70BBA3', warning: '#E5B65C', danger: '#D97C83', disabled: '#CBD5E1',
  errorText: '#8C3541', errorSurface: '#FDF0F2', greenText: '#326D5D',
  lavender: '#A094D7', blueRule: '#CDDEF0',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const emoji = {
  life: '📖', career: '💼', relationships: '🤝', age: '➕', assets: '💰', activities: '🎲',
  world: '🌍', settings: '⚙️', school: '🏫', classroom: '👥', study: '📚', family: '🏡', tree: '🌳',
  bank: '💵', health: '❤️', rest: '🛌', walk: '🚶', art: '🎨',
  new: '🌱', continue: '▶️', save: '💾', load: '📂', back: '◀️', accept: '✅',
  decline: '↩️', close: '✖️', trophy: '🏆', history: '📜', stats: '📊', custom: '✍️',
  random: '🎲', location: '📍', support: '🤝', talk: '🗣️', home: '🏠', delete: '🗑️',
  phone: '📳', options: '🔹', calendar: '📅', person: '👤', next: '➡️',
  university: '🎓', vocational: '🛠️', exam: '📝', library: '📖', extracurricular: '🏅',
  hair: '✂️', gift: '🎁', thanks: '😊', compliment: '😘', together: '🎟️', guidance: '🧭',
  insult: '😠', prank: '👉', coffee: '☕', work: '📋', search: '🔎', harder: '📈', hours: '🕰️', exit: '🚪', retire: '🌿',
  laptop: '💻', computer: '🖥️', medical: '🩺', blueprint: '📐', files: '🗃️', calculator: '🧮',
  ambulance: '🚑', eye: '👁️', thoughts: '🧠', blood: '🩸', syringe: '💉',
  court: '⚖️', restaurant: '🍽️', cooking: '🍳', cart: '🛒', camera: '🎥',
  car: '🚗', motorcycle: '🏍️',
  rose: '🌹', loveLetter: '💌', ring: '💍', brokenHeart: '💔', bottle: '🍼',
  star: '🌟', datingPhone: '📱', pride: '🏳️‍🌈', night: '🌙',
  remembrance: '🕯️',
  football: '⚽', basketball: '🏀', tennis: '🎾', swimming: '🏊', running: '👟', martialArts: '🥋',
  guitar: '🎸', piano: '🎹', violin: '🎻', drums: '🥁', singing: '🎤', drawing: '✏️',
  photography: '📷', acting: '🎭', math: '📐', leadership: '🧑‍💼', chess: '♟️', languages: '💬',
  fitness: '🏋️', meditation: '🧘', food: '🥗', cinema: '🎬', park: '🌳', train: '🚆', music: '🎵',
  news: '📰',
  download: '📥', upload: '📤', savings: '🏦', key: '🔑', build: '🧱', repair: '🔧', bonds: '📜',
} as const;
export type Emoji = keyof typeof emoji;
