export interface CorruptionType {
  id: string;
  name: string;
  icon: string; // lucide icon name or emoji
}

export interface Report {
  id: string;
  title: string;
  description: string;
  corruptionType: string;
  locationName: string;
  latitude: number;
  longitude: number;
  evidenceLinks: string[];
  votesTrue: number;
  votesFalse: number;
  votesNeedEvidence: number;
  createdAt: any; // Firestore Timestamp
}

export type VoteType = 'true' | 'false' | 'needEvidence';
