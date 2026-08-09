export interface ReadingPreferences {
  profileId: string | null;
  fontFamily: string;
  fontSizePx: number;
  lineSpacing: string;
  theme: string;
  margins: string;
}

export const DefaultReadingPreferences: ReadingPreferences = {
  profileId: null,
  fontFamily: 'serif',
  fontSizePx: 18,
  lineSpacing: 'normal',
  theme: 'light',
  margins: 'normal',
};
