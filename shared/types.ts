export interface RecordingSettings {
  quality: "1080" | "720" | "480";
  frameRate: "60" | "30" | "24";
  includeAudio: boolean;
  showCursor: boolean;
}

export type RecordingMode = "screen" | "camera" | "audio";

export interface Recording {
  id: string;
  mode: RecordingMode;
  blob: Blob;
  url: string;
  duration: number;
  createdAt: Date;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  recordingMode: RecordingMode;
  settings: RecordingSettings;
  mediaStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  recordedChunks: Blob[];
  recording: Recording | null;
}
