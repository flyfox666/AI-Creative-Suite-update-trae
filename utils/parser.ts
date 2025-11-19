
import { Scene } from '../types';

export interface ParsedStoryboard {
  copyReadyPrompt: string;
  scenes: Omit<Scene, 'imageUrl'>[];
}

export const parseStoryboard = (fullResponse: string): ParsedStoryboard => {
  const scenes: Omit<Scene, 'imageUrl'>[] = [];
  const sceneRegex1 = /(?:Scene|场景)\s*\d+\s*[:：\-]([\s\S]*?)(?=(?:Scene|场景)\s*\d+\s*[:：\-]|$)/g;
  let match;
  while ((match = sceneRegex1.exec(fullResponse)) !== null) {
    const fullPrompt = `Scene ${scenes.length + 1}:${match[1].trim()}`;
    const content = match[1].trim();
    const title = content.split('\n')[0].trim();
    const subjectMatch = content.match(/(?:Subject|主体)\s*[:：]\s*(.*)/);
    const environmentMatch = content.match(/(?:Environment|环境)\s*[:：]\s*(.*)/);
    const lightingMatch = content.match(/(?:Lighting|光照|灯光)\s*[:：]\s*(.*)/);
    const gradeMatch = content.match(/(?:Grade|色彩|风格)\s*[:：]\s*(.*)/);
    const actionMatch = content.match(/(?:Action Cues|动作提示)[\s\S]*?0\.0s\s*[:：]\s*(.*)/m);
    let descriptionParts = [];
    if (subjectMatch) descriptionParts.push(subjectMatch[1].trim());
    if (actionMatch) descriptionParts.push(actionMatch[1].trim());
    if (environmentMatch) descriptionParts.push(`in ${environmentMatch[1].trim()}`);
    if (lightingMatch) descriptionParts.push(`with ${lightingMatch[1].trim()}`);
    if (gradeMatch) descriptionParts.push(`(${gradeMatch[1].trim()} color grade)`);
    let description = descriptionParts.join(', ').trim();
    if (!description) description = title;
    scenes.push({ title, description, fullPrompt });
  }
  if (scenes.length === 0) {
    const sceneRegex2 = /(?:^|\n)\s*(?:Scene|场景)?\s*(\d+)[\.\、:：\-]\s*([\s\S]*?)(?=(?:\n\s*(?:Scene|场景)?\s*\d+[\.\、:：\-])|$)/g;
    let m;
    while ((m = sceneRegex2.exec(fullResponse)) !== null) {
      const content = m[2].trim();
      const fullPrompt = `Scene ${scenes.length + 1}:${content}`;
      const title = content.split('\n')[0].trim();
      const subjectMatch = content.match(/(?:Subject|主体)\s*[:：]\s*(.*)/);
      const environmentMatch = content.match(/(?:Environment|环境)\s*[:：]\s*(.*)/);
      const lightingMatch = content.match(/(?:Lighting|光照|灯光)\s*[:：]\s*(.*)/);
      const gradeMatch = content.match(/(?:Grade|色彩|风格)\s*[:：]\s*(.*)/);
      const actionMatch = content.match(/(?:Action Cues|动作提示)[\s\S]*?0\.0s\s*[:：]\s*(.*)/m);
      let descriptionParts = [];
      if (subjectMatch) descriptionParts.push(subjectMatch[1].trim());
      if (actionMatch) descriptionParts.push(actionMatch[1].trim());
      if (environmentMatch) descriptionParts.push(`in ${environmentMatch[1].trim()}`);
      if (lightingMatch) descriptionParts.push(`with ${lightingMatch[1].trim()}`);
      if (gradeMatch) descriptionParts.push(`(${gradeMatch[1].trim()} color grade)`);
      let description = descriptionParts.join(', ').trim();
      if (!description) description = title;
      scenes.push({ title, description, fullPrompt });
    }
  }

  // The final prompt is a concatenation of all individual full scene prompts
  const copyReadyPrompt = scenes.map(s => s.fullPrompt).join('\n\n');

  // Fallback if regex fails: use first line as Scene 1
  if (scenes.length === 0 && fullResponse.length > 0) {
      const firstLine = fullResponse.split('\n')[0].trim();
      const fallbackPrompt = `Scene 1:${fullResponse}`;
      scenes.push({
          title: firstLine || 'Scene 1',
          description: firstLine || 'Generated scene',
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
