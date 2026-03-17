export interface Report {
  id: string;
  title: string;
  corruptionType: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  date: string;
  evidenceLinks: string[];
  votesTrue: number;
  votesFalse: number;
  votesNeedEvidence: number;
  createdAt: any;
}

export interface CorruptionType {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export type VoteType = 'true' | 'false' | 'needEvidence';
