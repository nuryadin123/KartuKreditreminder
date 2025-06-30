
"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreditCard, Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
  amount: z.coerce.number().min(1, "Jumlah pembayaran harus lebih dari 0."),
});

type PaymentFormValues = z.infer<typeof formSchema>;

interface PaymentDialogProps {
  card: CreditCard | null;
  transactions: Transaction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { amount: number }) => void;
}

export function PaymentDialog({ card, transactions, open, onOpenChange, onSubmit }: PaymentDialogProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const { totalMonthlyInstallment } = useMemo(() => {
    if (!card || !transactions) return { totalMonthlyInstallment: 0 };
    
    const activeInstallments = transactions.filter(
      (t) => t.cardId === card.id && (t.installmentDetails || t.description.startsWith("Cicilan:")) && t.status === 'belum lunas'
    );

    if (activeInstallments.length === 0) {
        return { totalMonthlyInstallment: 0 };
    }

    const total = activeInstallments.reduce((acc, t) => {
        if (t.installmentDetails) {
            return acc + t.installmentDetails.monthlyInstallment;
        }

        // Fallback for old data without installmentDetails
        const principal = t.amount;
        const tenorMatch = t.description.match(/selama (\d+) bulan/);
        
        if (!tenorMatch || !card.interestRate) {
            return acc;
        }

        const tenor = parseInt(tenorMatch[1], 10);
        const annualInterestRate = card.interestRate;

        const totalInterest = principal * (annualInterestRate / 100) * (tenor / 12);
        const totalPayment = principal + totalInterest;
        const monthlyInstallment = totalPayment / tenor;
        
        return acc + monthlyInstallment;
    }, 0);

    return { totalMonthlyInstallment: total };
  }, [card, transactions]);

  const handleSubmit = (values: PaymentFormValues) => {
    onSubmit(values);
    form.reset();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };
  
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Lakukan Pembayaran</DialogTitle>
          <DialogDescription>
            Masukkan jumlah pembayaran untuk kartu {card.cardName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            {totalMonthlyInstallment > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Pengingat Cicilan Aktif</AlertTitle>
                    <AlertDescription>
                        Kartu ini memiliki total cicilan bulanan sebesar{" "}
                        <strong>{formatCurrency(totalMonthlyInstallment)}</strong>. 
                        Pastikan pembayaran Anda sudah mencakup jumlah ini beserta tagihan lainnya.
                    </AlertDescription>
                </Alert>
            )}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah Pembayaran (IDR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="500000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit">Bayar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
