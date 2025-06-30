
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

  const hasActiveInstallments = useMemo(() => {
    if (!card || !transactions) return false;
    return transactions.some(
      (t) => t.cardId === card.id && t.description.startsWith("Cicilan:") && t.status === 'belum lunas'
    );
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
            {hasActiveInstallments && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Pengingat Cicilan</AlertTitle>
                    <AlertDescription>
                        Kartu ini memiliki cicilan aktif. Pastikan pembayaran Anda sudah mencakup tagihan reguler dan cicilan bulanan.
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
