
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

export const InstallmentPlanInputSchema = z.object({
  transactionAmount: z.number().describe('The total amount of the transaction to be converted into installments.'),
  interestRate: z.number().describe('The monthly interest rate of the credit card (as a percentage, e.g., 1.75 for 1.75%).'),
  tenor: z.number().int().min(1).describe('The desired number of months for the installment plan (tenor).'),
});
export type InstallmentPlanInput = z.infer<typeof InstallmentPlanInputSchema>;

const InstallmentDetailSchema = z.object({
    month: z.number().int().describe('The month number of the installment.'),
    principalPayment: z.number().describe('The portion of the payment that goes towards the principal amount.'),
    interestPayment: z.number().describe('The portion of the payment that goes towards interest.'),
    remainingBalance: z.number().describe('The outstanding balance after the payment.'),
});

export const InstallmentPlanOutputSchema = z.object({
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
    prompt: `You are an expert financial advisor specializing in credit card debt management in Indonesia. A user wants to convert a transaction into an installment plan.

Transaction Details:
- Amount: {{{transactionAmount}}} IDR
- Monthly Interest Rate: {{{interestRate}}}%
- Tenor: {{{tenor}}} months

Your tasks are:
1.  **Calculate the fixed monthly installment amount.** Use the standard formula for an annuity loan. The formula is: M = P * (i * (1 + i)^n) / ((1 + i)^n - 1), where P is the principal, i is the monthly interest rate in decimal form (e.g., 1.75% becomes 0.0175), and n is the tenor. Round the result to the nearest whole number.
2.  **Calculate the total payment and total interest.** Total Payment = Monthly Installment * Tenor. Total Interest = Total Payment - Principal.
3.  **Generate a month-by-month amortization schedule.** For each month, show the principal payment, interest payment, and the remaining balance. The interest for a month is calculated on the remaining balance from the previous month. The principal payment is the monthly installment minus the interest payment.
4.  **Provide a brief, insightful piece of financial advice** based on the calculation. The advice must be in Indonesian, easy to understand, and contextually relevant (e.g., comment on the amount of interest, the feasibility of the plan, or offer a helpful tip).

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
