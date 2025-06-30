
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CreditCard, Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface PaymentHistoryDialogProps {
  card: CreditCard | null;
  transactions: Transaction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentHistoryDialog({ card, transactions, open, onOpenChange }: PaymentHistoryDialogProps) {
  if (!card) return null;

  const paymentTransactions = transactions.filter(
    (t) => t.cardId === card.id && t.category === 'Pembayaran'
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Riwayat Pembayaran - {card.cardName}</DialogTitle>
          <DialogDescription>
            Berikut adalah riwayat pembayaran untuk kartu **** **** **** {card.last4Digits}.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
            {paymentTransactions.length > 0 ? (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paymentTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                        <TableCell>
                            {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(transaction.date))}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                            +{formatCurrency(transaction.amount)}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium">Tidak Ada Riwayat</h3>
                    <p className="text-sm">Belum ada pembayaran yang tercatat untuk kartu ini.</p>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
