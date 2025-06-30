
'use server';
/**
 * @fileOverview An AI flow to generate reminder email content for upcoming credit card payments.
 *
 * - generateReminderEmail - A function that generates the email content.
 * - GenerateReminderEmailInput - The input type for the generateReminderEmail function.
 * - GenerateReminderEmailOutput - The return type for the generateReminderEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateReminderEmailInputSchema = z.object({
  cardName: z.string().describe('The name of the credit card.'),
  bankName: z.string().describe('The name of the bank.'),
  dueDate: z.string().describe('The due date of the payment in a user-friendly format (e.g., "30 Juni 2024").'),
  amountDue: z.number().describe('The total amount due.'),
  recipientName: z.string().describe("The name of the card holder."),
});
export type GenerateReminderEmailInput = z.infer<typeof GenerateReminderEmailInputSchema>;

const GenerateReminderEmailOutputSchema = z.object({
  subject: z.string().describe('The subject line for the reminder email.'),
  body: z.string().describe('The HTML body content for the reminder email.'),
});
export type GenerateReminderEmailOutput = z.infer<typeof GenerateReminderEmailOutputSchema>;


const prompt = ai.definePrompt({
    name: 'generateReminderEmailPrompt',
    input: { schema: GenerateReminderEmailInputSchema },
    output: { schema: GenerateReminderEmailOutputSchema },
    prompt: `You are a helpful financial assistant. Your task is to generate a friendly and clear reminder email for an upcoming credit card payment. The email must be in Indonesian.

Use the following details:
- Recipient Name: {{{recipientName}}}
- Card: {{{cardName}}} ({{{bankName}}})
- Due Date: {{{dueDate}}}
- Amount Due: {{{amountDue}}}

Generate a JSON object with a "subject" and "body".
- The subject should be concise, like "Pengingat Pembayaran Kartu Kredit {{{cardName}}}".
- The body should be a simple HTML paragraph. It should be warm and direct, reminding the user of the upcoming payment. Mention the amount and the due date clearly. For example: "Halo {{{recipientName}}}, ini adalah pengingat bahwa tagihan kartu kredit {{{cardName}}} Anda sebesar [format currency for amountDue] akan jatuh tempo pada {{{dueDate}}}. Mohon segera lakukan pembayaran untuk menghindari denda."
`,
});


const generateReminderEmailFlow = ai.defineFlow(
  {
    name: 'generateReminderEmailFlow',
    inputSchema: GenerateReminderEmailInputSchema,
    outputSchema: GenerateReminderEmailOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function generateReminderEmail(
  input: GenerateReminderEmailInput
): Promise<GenerateReminderEmailOutput> {
  return generateReminderEmailFlow(input);
}
