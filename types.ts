
export interface StoryData {
  openingParagraph: string;
  mood: string;
  setting: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AudioState {
  isPlaying: boolean;
  isBuffering: boolean;
}
