export const darkColors = {
  bg: '#07110C',
  surface: '#141C18',
  surface2: '#1C2621',
  stroke: '#2A3830',
  lime: '#B6FF00',
  limeDim: 'rgba(182, 255, 0, 0.14)',
  text: '#F4F7F2',
  muted: '#9AA89F',
  faint: '#6E7C74',
  link: '#B6FF00',
  danger: '#FF5C5C',
  dangerBg: '#2A1518',
  dangerStroke: '#6E2A32',
  onLime: '#10210A',
  overlay: 'rgba(0,0,0,0.45)',
  blue: '#3D8BFF',
  amber: '#F5B942',
  white: '#FFFFFF',
};

export const lightColors: typeof darkColors = {
  bg: '#F3F5F0',
  surface: '#FFFFFF',
  surface2: '#E7EEE6',
  stroke: '#D3DDD4',
  lime: '#B6FF00',
  limeDim: 'rgba(92, 140, 0, 0.12)',
  text: '#122018',
  muted: '#3E5248',
  faint: '#5C6E64',
  link: '#3D6E00',
  danger: '#B42318',
  dangerBg: '#FDECEC',
  dangerStroke: '#F0B4B4',
  onLime: '#10210A',
  overlay: 'rgba(0,0,0,0.28)',
  blue: '#1D6FE0',
  amber: '#9A6B00',
  white: '#FFFFFF',
};

export type Palette = typeof darkColors;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
};

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};
