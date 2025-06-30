'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting installment plans based on transaction details.
 *
 * - suggestInstallmentPlan - A function that takes transaction details and returns suggested installment plans.
 * - SuggestInstallmentPlanInput - The input type for the suggestInstallmentPlan function.
 * - SuggestInstallmentPlanOutput - The return type for the suggestInstallmentPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestInstallmentPlanInputSchema = z.object({
  cardName: z.string().describe('The name of the credit card used for the transaction.'),
  transactionDate: z.string().describe('The date of the transaction (YYYY-MM-DD).'),
  description: z.string().describe('A description of the transaction.'),
  amount: z.number().describe('The amount of the transaction.'),
});
export type SuggestInstallmentPlanInput = z.infer<typeof SuggestInstallmentPlanInputSchema>;

const SuggestInstallmentPlanOutputSchema = z.array(
  z.object({
    tenor: z.number().describe('The installment tenor in months.'),
    interestRate: z.number().describe('The annual interest rate for the installment plan.'),
    monthlyPayment: z.number().describe('The estimated monthly payment amount.'),
    totalPayment: z.number().describe('The total payment amount over the tenor.'),
  })
).describe('An array of suggested installment plans with varying tenors and interest rates.');

export type SuggestInstallmentPlanOutput = z.infer<typeof SuggestInstallmentPlanOutputSchema>;

export async function suggestInstallmentPlan(input: SuggestInstallmentPlanInput): Promise<SuggestInstallmentPlanOutput> {
  return suggestInstallmentPlanFlow(input);
}

const suggestInstallmentPlanPrompt = ai.definePrompt({
  name: 'suggestInstallmentPlanPrompt',
  input: {schema: SuggestInstallmentPlanInputSchema},
  output: {schema: SuggestInstallmentPlanOutputSchema},
  prompt: `You are a financial advisor specializing in credit card debt management.

  Given the following transaction details, suggest three installment plans with varying tenors and interest rates.
  Provide a JSON array of installment plans, each including the tenor (in months), annual interest rate, monthly payment, and total payment.

  Transaction Details:
  Card Name: {{{cardName}}}
  Transaction Date: {{{transactionDate}}}
  Description: {{{description}}}
  Amount: {{{amount}}}

  The installment plans should offer different combinations of tenors (e.g., 3, 6, 12 months) and interest rates (e.g., 10%, 15%, 20%).
  Ensure that the monthly payment and total payment are calculated accurately based on the tenor and interest rate.
  Do not include any introductory text, only a JSON array.
  `,
});

const suggestInstallmentPlanFlow = ai.defineFlow(
  {
    name: 'suggestInstallmentPlanFlow',
    inputSchema: SuggestInstallmentPlanInputSchema,
    outputSchema: SuggestInstallmentPlanOutputSchema,
  },
  async input => {
    const {output} = await suggestInstallmentPlanPrompt(input);
    return output!;
  }
);
