'use server';
/**
 * @fileOverview An AI flow to suggest Indonesian credit card names based on a bank.
 *
 * - suggestCardName - A function that suggests credit card names.
 * - SuggestCardNameInput - The input type for the suggestCardName function.
 * - SuggestCardNameOutput - The return type for the suggestCardName function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestCardNameInputSchema = z.object({
  bankName: z.string().describe('The name of the bank issuing the credit card.'),
  query: z.string().describe('A partial or empty query for a credit card name.'),
});
export type SuggestCardNameInput = z.infer<typeof SuggestCardNameInputSchema>;

const SuggestCardNameOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested credit card names.'),
});
export type SuggestCardNameOutput = z.infer<typeof SuggestCardNameOutputSchema>;


const prompt = ai.definePrompt({
    name: 'suggestCardNamePrompt',
    input: { schema: SuggestCardNameInputSchema },
    output: { schema: SuggestCardNameOutputSchema },
    prompt: `You are a helpful assistant for a financial application. Your task is to suggest names of credit cards issued by a specific bank in Indonesia, based on the user's query.

Bank Name: "{{{bankName}}}"
User Query: "{{{query}}}"

Provide up to 5 relevant credit card names for the given bank. If the query is empty, suggest popular credit cards from that bank. If the bank name is not recognized or is empty, provide general popular card names from various Indonesian banks.

Return the result as a JSON object with a "suggestions" key, which is an array of strings. For example for bank "Bank Central Asia": { "suggestions": ["BCA Card Platinum", "BCA Everyday Card"] }.`,
});


const suggestCardNameFlow = ai.defineFlow(
  {
    name: 'suggestCardNameFlow',
    inputSchema: SuggestCardNameInputSchema,
    outputSchema: SuggestCardNameOutputSchema,
  },
  async (input) => {
    if (!input.bankName) {
        return { suggestions: [] };
    }
    const { output } = await prompt(input);
    return output!;
  }
);

export async function suggestCardName(
  input: SuggestCardNameInput
): Promise<SuggestCardNameOutput> {
  return suggestCardNameFlow(input);
}
