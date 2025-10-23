
import { Scene } from '../types';

export interface ParsedStoryboard {
  copyReadyPrompt: string;
  scenes: Omit<Scene, 'imageUrl'>[];
}

export const parseStoryboard = (fullResponse: string): ParsedStoryboard => {
  const scenes: Omit<Scene, 'imageUrl'>[] = [];
  // Regex to capture scenes, looking for "Scene" followed by a number and a colon.
  // It captures the entire block until the next "Scene" or the end of the string.
  const sceneRegex = /Scene\s*\d+:([\s\S]*?)(?=Scene\s*\d+:|$)/g;
  
  let match;
  while ((match = sceneRegex.exec(fullResponse)) !== null) {
    const fullPrompt = `Scene ${scenes.length + 1}:${match[1].trim()}`;
    const content = match[1].trim();
    
    // Extract title from the first line
    const title = content.split('\n')[0].trim();

    // Create a detailed description for image generation by combining key fields.
    const subjectMatch = content.match(/Subject:\s*(.*)/);
    const environmentMatch = content.match(/Environment:\s*(.*)/);
    const lightingMatch = content.match(/Lighting:\s*(.*)/);
    const gradeMatch = content.match(/Grade:\s*(.*)/);
    const actionMatch = content.match(/Action Cues:\s*\n0.0s:\s*(.*)/);

    let descriptionParts = [];
    if (subjectMatch) descriptionParts.push(subjectMatch[1].trim());
    if (actionMatch) descriptionParts.push(actionMatch[1].trim());
    if (environmentMatch) descriptionParts.push(`in ${environmentMatch[1].trim()}`);
    if (lightingMatch) descriptionParts.push(`with ${lightingMatch[1].trim()}`);
    if (gradeMatch) descriptionParts.push(`(${gradeMatch[1].trim()} color grade)`);
    
    let description = descriptionParts.join(', ').trim();
    
    // Fallback if the detailed parts aren't found
    if (!description) {
        description = title;
    }
    
    scenes.push({ title, description, fullPrompt });
  }

  // The final prompt is a concatenation of all individual full scene prompts
  const copyReadyPrompt = scenes.map(s => s.fullPrompt).join('\n\n');

  // Fallback if regex fails
  if (scenes.length === 0 && fullResponse.length > 0) {
      const fallbackPrompt = "Could not parse scenes. Raw output:\n" + fullResponse;
      scenes.push({
          title: "Parsing Error",
          description: "Could not parse scenes from response.",
          fullPrompt: fallbackPrompt
      });
      return {
        copyReadyPrompt: fallbackPrompt,
        scenes,
      }
  }


  return {
    copyReadyPrompt,
    scenes,
  };
};
