'use server';
/**
 * @fileOverview An AI flow to suggest Indonesian bank names.
 *
 * - suggestBankName - A function that suggests bank names.
 * - SuggestBankNameInput - The input type for the suggestBankName function.
 * - SuggestBankNameOutput - The return type for the suggestBankName function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestBankNameInputSchema = z.object({
  query: z.string().describe('A partial or empty query for a bank name.'),
});
export type SuggestBankNameInput = z.infer<typeof SuggestBankNameInputSchema>;

const SuggestBankNameOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested bank names.'),
});
export type SuggestBankNameOutput = z.infer<typeof SuggestBankNameOutputSchema>;


const prompt = ai.definePrompt({
    name: 'suggestBankNamePrompt',
    input: { schema: SuggestBankNameInputSchema },
    output: { schema: SuggestBankNameOutputSchema },
    prompt: `You are a helpful assistant for a financial application. Your task is to suggest names of banks that exist in Indonesia based on the user's query.

Provide up to 5 relevant bank names. If the query is empty, suggest popular Indonesian banks.

User Query: "{{{query}}}"

Return the result as a JSON object with a "suggestions" key, which is an array of strings. For example: { "suggestions": ["Bank Central Asia", "Bank Mandiri"] }.`,
});


const suggestBankNameFlow = ai.defineFlow(
  {
    name: 'suggestBankNameFlow',
    inputSchema: SuggestBankNameInputSchema,
    outputSchema: SuggestBankNameOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function suggestBankName(
  input: SuggestBankNameInput
): Promise<SuggestBankNameOutput> {
  return suggestBankNameFlow(input);
}
