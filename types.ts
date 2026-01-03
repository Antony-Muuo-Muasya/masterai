
export enum MasteringIntensity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum OutputTarget {
  STREAMING = 'STREAMING',
  CLUB = 'CLUB',
  PODCAST = 'PODCAST',
  DYNAMIC = 'DYNAMIC'
}

export interface SonicProfile {
  genre: string;
  lufs: number;
  peak: number;
  dynamics: 'Narrow' | 'Wide' | 'Medium';
  recommendedEq: {
    low: number;
    mid: number;
    high: number;
  };
  suggestedWidening: number;
}

export interface MasteringState {
  file: File | null;
  status: 'idle' | 'analyzing' | 'processing' | 'ready';
  intensity: MasteringIntensity;
  target: OutputTarget;
  isBypass: boolean;
  sonicProfile: SonicProfile | null;
}
