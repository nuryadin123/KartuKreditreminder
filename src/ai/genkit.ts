
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const globalForGenkit = globalThis as unknown as {
  ai: ReturnType<typeof genkit> | undefined;
};

export const ai =
  globalForGenkit.ai ??
  genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.0-flash',
  });

if (process.env.NODE_ENV !== 'production') globalForGenkit.ai = ai;
