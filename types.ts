
export interface Scene {
  title: string;
  description: string; // Used for generating the image
  fullPrompt: string; // The full, detailed prompt for the scene card
  imageUrl?: string;
}

export interface StoryboardResult {
  copyReadyPrompt: string;
  scenes: Scene[];
}

// --- User Auth Types ---
export type UserPlan = 'free' | 'pro';

export interface User {
    email: string;
    plan: UserPlan;
    credits: number;
}