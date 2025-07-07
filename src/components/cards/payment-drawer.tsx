"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreditCard, Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
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
import { AlertTriangle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const formSchema = z.object({
  amount: z.coerce.number().min(1, 'Jumlah pembayaran harus lebih dari 0.'),
});

type PaymentFormValues = z.infer<typeof formSchema>;

interface PaymentDrawerProps {
  card: CreditCard | null;
  transactions: Transaction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { amount: number }) => Promise<void>;
}

export function PaymentDrawer({ card, transactions, open, onOpenChange, onSubmit }: PaymentDrawerProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  const { totalDebt, totalMonthlyInstallment } = useMemo(() => {
    if (!card) return { totalDebt: 0, totalMonthlyInstallment: 0 };
    
    const cardSpending = transactions
        .filter(t => t.cardId === card.id && t.category !== 'Pembayaran')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const cardPayments = transactions
        .filter(t => t.cardId === card.id && t.category === 'Pembayaran')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const debt = cardSpending - cardPayments;

    const activeInstallments = transactions.filter(
      (t) => t.cardId === card.id && (t.installmentDetails || t.description.startsWith("Cicilan:")) && t.status === 'belum lunas'
    );
    const monthlyInstallment = activeInstallments.reduce((acc, t) => acc + (t.installmentDetails?.monthlyInstallment || 0), 0);

    return { totalDebt: debt, totalMonthlyInstallment: monthlyInstallment };
  }, [card, transactions]);

  const paymentTransactions = useMemo(() => {
    if (!card) return [];
    return transactions
      .filter((t) => t.cardId === card.id && t.category === 'Pembayaran')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [card, transactions]);


  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };
  
  const handleFormSubmit = async (values: PaymentFormValues) => {
    await onSubmit(values);
    form.reset();
  };

  if (!card) return null;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Lakukan Pembayaran</DrawerTitle>
          <DrawerDescription>
            Catat pembayaran untuk kartu {card.cardName} ({card.bankName}).
            Total utang saat ini adalah {formatCurrency(totalDebt)}.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 space-y-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                {totalMonthlyInstallment > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Pengingat Cicilan Aktif</AlertTitle>
                        <AlertDescription>
                            Kartu ini memiliki total cicilan bulanan sebesar{" "}
                            <strong>{formatCurrency(totalMonthlyInstallment)}</strong>. 
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
                        <Input type="number" placeholder="500000" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Bayar
                </Button>
                </form>
            </Form>
            
            <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">Riwayat Pembayaran</h3>
                <div className="max-h-48 overflow-y-auto rounded-md border">
                {paymentTransactions.length > 0 ? (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paymentTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                            <TableCell className="py-2">
                                {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(transaction.date))}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600 py-2">
                                +{formatCurrency(transaction.amount)}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">Belum ada riwayat pembayaran.</p>
                    </div>
                )}
                </div>
            </div>
        </div>
        <DrawerFooter>
          {/* Footer bisa kosong jika tombol sudah di dalam konten */}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
