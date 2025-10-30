
import { GoogleGenAI, Modality } from "@google/genai";
import { parseStoryboard } from "../utils/parser";
import { Scene, StoryboardResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });


const getSystemPrompt = (duration: number, sceneCount: number): string => `
You are a top-tier Director of Photography (DP), Storyboard Engineer, and Visual Reverse-Analyst, specializing in AI video generation. Your task is to generate a multi-scene, highly detailed prompt sequence based on user input.

**CRITICAL REQUIREMENT: You MUST generate exactly ${sceneCount} scenes. No more, no less.**

**RULES:**
- Each scene should have a duration of approximately ${Math.round(duration / sceneCount)} seconds.
- All fields must use "Key: Value" format.
- Prohibit long, prosaic sentences outside of "Narrative/Intent".
- Total duration must be ${duration} seconds.
- Each scene must have 3-4 Action Cues (one every 2-4 seconds).
- Maintain consistency in Subject, Environment, and Grade across scenes.

**OUTPUT STRUCTURE TEMPLATE:**

Sequence Overview: <Concept or Title>

Sequence Coherence
Overall Narrative Arc: <Setup–Climax–Resolution>
Aesthetic Persistent: <Unified visual tone>
Continuity Cues: <Scene connection logic>
Total Duration Target: ${duration}s

Scene 1: <Scene Name>
Scene Duration: <~${Math.round(duration / sceneCount)} Seconds>
Subject / Scene Settings
Narrative/Intent: <Theme>
Subject: <Subject description>
Key Features: <Action/Features>
Environment: <Environment>
Atmosphere/Weather: <Time, weather>
Lighting: <Lighting description>
Grade: <Color grading>
Cinematography & Action
Camera: <Camera perspective>
Move: <Camera movement>
Lens/Focus: <Lens and depth of field>
Structure - <~${Math.round(duration / sceneCount)} Second Version>
Action Cues:
0.0s: <Opening action>
[T1]s: <Action 1>
[T2]s: <Action 2>
[N.0s]: <Closing action>

(Repeat for all ${sceneCount} scenes.)
`;

export const generateImageForScene = async (prompt: string, previousImageUrl: string | undefined, aspectRatio: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const textPart = { text: "" };
        const parts: any[] = [];

        if (previousImageUrl) {
            const match = previousImageUrl.match(/^data:(image\/.+);base64,(.+)$/);
            if (!match) {
                throw new Error("Invalid previous image data URL format for coherence.");
            }
            const mimeType = match[1];
            const data = match[2];
            const imagePart = {
                inlineData: {
                    mimeType: mimeType,
                    data: data,
                },
            };
            parts.push(imagePart);
            textPart.text = `Given the previous frame, generate the next logical cinematic still for the following scene description. Maintain character, style, and environmental consistency. Scene: ${prompt}`;
        } else {
            // First image
            textPart.text = `cinematic still, photorealistic, ${aspectRatio} aspect ratio, high detail, from a video described as: ${prompt}`;
        }
        parts.push(textPart);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
            const base64ImageBytes: string = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            return `data:${mimeType};base64,${base64ImageBytes}`;
        }
        
        const finishReason = response.candidates?.[0]?.finishReason;
        const responseText = response.text;
        
        let errorMessage = "No image was generated for the scene.";
        if (finishReason === 'SAFETY') {
            errorMessage = `Image generation failed due to safety policies. Your prompt may need to be revised.`;
        } else if (responseText && responseText.trim()) {
            errorMessage = `Image generation failed. The model responded with: "${responseText.trim()}"`;
        } else if (finishReason) {
            errorMessage = `Image generation failed. Reason: ${finishReason}.`;
        } else if (!response.candidates || response.candidates.length === 0) {
            errorMessage = "Image generation failed because the model returned no response. This could be due to a network issue, an invalid API key, or a billing problem.";
        }
        
        throw new Error(errorMessage);

    } catch (error) {
        console.error("Error generating image:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while generating the image.");
    }
};


export const generateStoryboardAndImages = async (
    userInput: string, 
    duration: number, 
    sceneCount: number, 
    isCoherent: boolean, 
    aspectRatio: string, 
    referenceImages: { base64: string; mimeType: string }[]
): Promise<StoryboardResult> => {
    const ai = getAiClient();
    
    // 1. Analyze reference images to enrich the user prompt
    let finalUserInput = userInput;
    if (referenceImages && referenceImages.length > 0) {
        try {
            const imageAnalysisPromises = referenceImages.map((img, index) => 
                analyzeImage(img.base64, img.mimeType, `Describe this image in detail for a film director, focusing on subject, environment, lighting, and mood. This is reference image ${index + 1} of ${referenceImages.length}.`)
            );
            const analyses = await Promise.all(imageAnalysisPromises);
            
            const visualContext = analyses.map((analysis, index) => 
                `REFERENCE IMAGE ${index + 1} DESCRIPTION: "${analysis}"`
            ).join('\n\n');

            finalUserInput = `USER IDEA: "${userInput}"\n\nVISUAL CONTEXT FROM REFERENCE IMAGES:\n${visualContext}\n\nCombine the user's idea with the visual context to create the storyboard. The reference images set the overall style, mood, and content. Use the first reference image as the primary inspiration for the first scene.`;
        } catch (error) {
            console.warn("Could not analyze one or more reference images, proceeding with text prompt only.", error);
        }
    }
    
    // 2. Generate the full structured storyboard text
    let fullResponseText;
    try {
        const systemPrompt = getSystemPrompt(duration, sceneCount);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `${systemPrompt}\n\nHere is the user's idea:\n\n'${finalUserInput}'`,
        });
        fullResponseText = response.text;
    } catch (error) {
        console.error("Error generating storyboard text:", error);
        throw new Error("Failed to generate storyboard from Gemini API.");
    }
    
    // 3. Parse the text to extract scenes and the copy-ready prompt
    const { scenes: parsedScenes, copyReadyPrompt } = parseStoryboard(fullResponseText);
    if (parsedScenes.length === 0) {
        throw new Error("Could not parse any scenes from the generated text. The model might have returned an unexpected format.");
    }

    // 4. Generate an image for each scene SEQUENTIALLY for coherence
    const scenesWithImages: Scene[] = [];
    let previousImageUrl: string | undefined = undefined;

    if (referenceImages && referenceImages.length > 0) {
        const firstImage = referenceImages[0];
        previousImageUrl = `data:${firstImage.mimeType};base64,${firstImage.base64}`;
    }

    for (let i = 0; i < parsedScenes.length; i++) {
        const scene = parsedScenes[i];
        let imageUrl: string | undefined;

        // If it's the first scene and we have a reference image, use it directly.
        if (i === 0 && referenceImages && referenceImages.length > 0) {
            const firstImage = referenceImages[0];
            imageUrl = `data:${firstImage.mimeType};base64,${firstImage.base64}`;
        } else {
            // Otherwise, generate the image. Use the previous image if coherence is on.
            const prevImgForGen = isCoherent ? previousImageUrl : undefined;
            imageUrl = await generateImageForScene(scene.description, prevImgForGen, aspectRatio);
        }
        
        scenesWithImages.push({
            ...scene,
            imageUrl: imageUrl,
        });
        
        // The current image becomes the next 'previous' image.
        previousImageUrl = imageUrl;
    }

    return {
        copyReadyPrompt,
        scenes: scenesWithImages,
    };
};

// --- New Service Functions ---

// Image Combination
export const combineImages = async (
    images: { base64: string; mimeType: string }[],
    prompt: string
): Promise<{ base64: string, mimeType: string }> => {
    const ai = getAiClient();
    const imageParts = images.map(img => ({
        inlineData: {
            data: img.base64,
            mimeType: img.mimeType,
        }
    }));
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [...imageParts, textPart],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData) {
        return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    const responseText = response.text;
    
    let errorMessage = "Image combination failed to produce an image.";
    if (finishReason === 'SAFETY') {
        errorMessage = `Image combination failed due to safety policies. Your prompt may need to be revised.`;
    } else if (responseText && responseText.trim()) {
        errorMessage = `Image combination failed. The model responded with: "${responseText.trim()}"`;
    } else if (finishReason) {
        errorMessage = `Image combination failed. Reason: ${finishReason}.`;
    } else if (!response.candidates || response.candidates.length === 0) {
        errorMessage = "Image combination failed because the model returned no response. This could be due to a network issue, an invalid API key, or a billing problem.";
    }
    
    throw new Error(errorMessage);
};

// Image Studio: Generate with Gemini Flash Image
export const generateImage = async (prompt: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData) {
        const base64ImageBytes: string = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType;
        return `data:${mimeType};base64,${base64ImageBytes}`;
    }

    // Handle errors
    const finishReason = response.candidates?.[0]?.finishReason;
    const responseText = response.text;
    
    let errorMessage = "Image generation failed to produce an image.";
    if (finishReason === 'SAFETY') {
        errorMessage = `Image generation failed due to safety policies. Your prompt may need to be revised.`;
    } else if (responseText && responseText.trim()) {
        errorMessage = `Image generation failed. The model responded with: "${responseText.trim()}"`;
    } else if (finishReason) {
        errorMessage = `Image generation failed. Reason: ${finishReason}.`;
    } else if (!response.candidates || response.candidates.length === 0) {
        errorMessage = "Image generation failed because the model returned no response. This could be due to a network issue, an invalid API key, or a billing problem.";
    }
    
    throw new Error(errorMessage);
};

// Image Studio: Edit
export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType: mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData) {
        const base64ImageBytes: string = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType;
        return `data:${mimeType};base64,${base64ImageBytes}`;
    }

    // Handle cases where no image is returned
    const finishReason = response.candidates?.[0]?.finishReason;
    const responseText = response.text;
    
    let errorMessage = "Image editing failed to produce an image.";
    if (finishReason === 'SAFETY') {
        errorMessage = `Image editing failed due to safety policies. Your prompt may need to be revised.`;
    } else if (responseText && responseText.trim()) {
        errorMessage = `Image editing failed. The model responded with: "${responseText.trim()}"`;
    } else if (finishReason) {
        errorMessage = `Image editing failed. Reason: ${finishReason}.`;
    } else if (!response.candidates || response.candidates.length === 0) {
        errorMessage = "Image editing failed because the model returned no response. This could be due to a network issue, an invalid API key, or a billing problem.";
    }
    
    throw new Error(errorMessage);
};

// Media Analyzer: Image
export const analyzeImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { data: base64ImageData, mimeType: mimeType } },
            ]
        }
    });
    return response.text;
};

// Media Analyzer: Video (Replication Mode)
export const analyzeVideo = async (base64VideoData: string, mimeType: string, useThinkingMode: boolean): Promise<string> => {
    const ai = getAiClient();
    const videoAnalysisSystemPrompt = `You are a top-tier Director of Photography and Visual Reverse-Analyst. Analyze the provided video and generate a detailed, structured storyboard script based on its content. Deconstruct its [Style], [Lighting], [Camera Movement], and [Action Rhythm] to create a replication prompt. Follow the multi-scene storyboard format provided in previous instructions.

**CRITICAL INSTRUCTION:** Your entire response must ONLY be the structured storyboard script, starting directly with "Sequence Overview:". Do not add any conversational introductions, summaries, or explanations before or after the script.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { text: 'Analyze this video and generate a replication storyboard.' },
                { inlineData: { data: base64VideoData, mimeType: mimeType } },
            ]
        },
        config: {
            systemInstruction: videoAnalysisSystemPrompt,
            ...(useThinkingMode && { thinkingConfig: { thinkingBudget: 32768 } })
        }
    });
    return response.text;
};

// Audio Lab: Analyze Voice
export const analyzeVoice = async (base64AudioData: string, mimeType: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { text: "Describe the speaker's voice in this audio clip using a short phrase of descriptive adjectives. Your response should ONLY be the description, with no preamble. Example: 'A deep, warm, male voice' or 'A high-pitched, cheerful, female voice'." },
                { inlineData: { data: base64AudioData, mimeType: mimeType } },
            ]
        },
    });
    return response.text.trim();
};

// TTS Generation
export const generateSpeech = async (prompt: string, voiceName: string, voiceDescription?: string): Promise<string> => {
    const ai = getAiClient();
    const finalPrompt = voiceDescription ? `(${voiceDescription}) ${prompt}` : prompt;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: finalPrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (audioPart && audioPart.inlineData) {
            return audioPart.inlineData.data;
        }

        const finishReason = response.candidates?.[0]?.finishReason;
        const responseText = response.text;
        
        let errorMessage = "No audio was generated.";
        if (finishReason === 'SAFETY') {
            errorMessage = `Audio generation failed due to safety policies. Your prompt may need to be revised.`;
        } else if (responseText && responseText.trim()) {
            errorMessage = `Audio generation failed. The model responded with: "${responseText.trim()}"`;
        } else if (finishReason) {
            errorMessage = `Audio generation failed. Reason: ${finishReason}.`;
        }
        
        throw new Error(errorMessage);

    } catch (error) {
        console.error("Error generating speech:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while generating the speech.");
    }
};