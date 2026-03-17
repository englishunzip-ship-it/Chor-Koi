import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const IMGBB_API_KEY = "d685822691566e39accb630d6ef7a6d9";

export async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  if (data.success) {
    return data.data.url;
  }
  throw new Error('Image upload failed');
}

export function getVoteStatus(report: any) {
  const { votesTrue, votesFalse, votesNeedEvidence } = report;
  const total = votesTrue + votesFalse + votesNeedEvidence;
  if (total === 0) return 'gray';
  
  if (votesTrue > votesFalse && votesTrue > votesNeedEvidence) return 'red';
  if (votesNeedEvidence > votesTrue && votesNeedEvidence > votesFalse) return 'yellow';
  return 'gray';
}
