
'use server';
/**
 * @fileOverview An AI flow to calculate and suggest credit card installment plans.
 *
 * - getInstallmentPlan - A function that handles the installment plan calculation.
 * - InstallmentPlanInput - The input type for the getInstallmentPlan function.
 * - InstallmentPlanOutput - The return type for the getInstallmentPlan function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const InstallmentPlanInputSchema = z.object({
  transactionAmount: z.number().describe('The total amount of the transaction to be converted into installments.'),
  interestRate: z.number().describe('The annual interest rate of the credit card (as a percentage, e.g., 21 for 21%).'),
  tenor: z.number().int().min(1).describe('The desired number of months for the installment plan (tenor).'),
  bankName: z.string().optional().describe('The name of the bank for providing contextual advice on the interest rate.'),
});
export type InstallmentPlanInput = z.infer<typeof InstallmentPlanInputSchema>;

const InstallmentDetailSchema = z.object({
    month: z.number().int().describe('The month number of the installment.'),
    principalPayment: z.number().describe('The portion of the payment that goes towards the principal amount.'),
    interestPayment: z.number().describe('The portion of the payment that goes towards interest.'),
    remainingBalance: z.number().describe('The outstanding balance after the payment.'),
});

const InstallmentPlanOutputSchema = z.object({
  monthlyInstallment: z.number().describe('The fixed amount to be paid each month.'),
  totalPayment: z.number().describe('The total amount that will be paid over the entire period.'),
  totalInterest: z.number().describe('The total interest paid over the entire period.'),
  advice: z.string().describe('A brief, helpful financial advice regarding this installment plan in Indonesian.'),
  schedule: z.array(InstallmentDetailSchema).describe('A detailed amortization schedule for each month.'),
});
export type InstallmentPlanOutput = z.infer<typeof InstallmentPlanOutputSchema>;

const prompt = ai.definePrompt({
    name: 'installmentPlanPrompt',
    input: { schema: InstallmentPlanInputSchema },
    output: { schema: InstallmentPlanOutputSchema },
    prompt: `You are an expert financial advisor specializing in credit card debt management in Indonesia. A user wants to convert a transaction into an installment plan using a **flat interest rate** calculation.

Transaction Details:
- Amount (Principal): {{{transactionAmount}}} IDR
- Annual Interest Rate: {{{interestRate}}}%
- Tenor: {{{tenor}}} months
{{#if bankName}}- Bank: {{{bankName}}}{{/if}}

Your tasks are:
1.  **Calculate Total Interest (Flat):** Calculate the total interest for the entire period. Formula: Total Interest = Principal * (Annual Interest Rate / 100) * (Tenor in months / 12).
2.  **Calculate Total Payment:** Total Payment = Principal + Total Interest.
3.  **Calculate Monthly Installment:** Monthly Installment = Total Payment / Tenor. Round this to the nearest whole number.
4.  **Generate a month-by-month amortization schedule:** For each month, calculate the components of the installment.
    - **Monthly Principal:** This is constant. Formula: Principal / Tenor.
    - **Monthly Interest:** This is also constant. Formula: Total Interest / Tenor.
    - **Remaining Balance:** This decreases each month. For month \`m\`, the Remaining Balance = Principal - (Monthly Principal * \`m\`).
5.  **Provide a brief, insightful piece of financial advice** based on the calculation. The advice must be in Indonesian and easy to understand.
    - Explain that this is a **flat interest** calculation. Mention that while it's simple, the *effective interest rate* is often higher than it appears compared to annuity/effective rate calculations, especially for longer tenors.
    {{#if bankName}}
    - Critically evaluate the provided annual interest rate ({{{interestRate}}}%). Compare it to typical credit card *flat* interest rates for {{bankName}} in Indonesia. State whether the user's rate is competitive, average, or high. For example: "Untuk perhitungan bunga flat, suku bunga tahunan {{interestRate}}% termasuk kompetitif untuk bank {{bankName}}."
    {{else}}
    - Comment on the total interest paid relative to the principal amount.
    {{/if}}
    - Offer a relevant tip, like ensuring timely payments to avoid additional fees.

Return the result strictly in the specified JSON format. Ensure all calculations are accurate.`,
});

const installmentPlanFlow = ai.defineFlow(
  {
    name: 'installmentPlanFlow',
    inputSchema: InstallmentPlanInputSchema,
    outputSchema: InstallmentPlanOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function getInstallmentPlan(
  input: InstallmentPlanInput
): Promise<InstallmentPlanOutput> {
  return installmentPlanFlow(input);
}
