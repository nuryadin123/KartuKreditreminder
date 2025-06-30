
"use client";

import { useMemo } from "react";
import { isAfter, isBefore, startOfToday, endOfToday, addDays, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, Bell, Loader2 } from "lucide-react";
import type { CreditCard, Transaction } from "@/types";
import { useFirestoreCollection } from "@/hooks/use-firestore";

export default function RemindersPage() {
  const { data: cards, loading: loadingCards } = useFirestoreCollection<CreditCard>("cards");
  const { data: transactions, loading: loadingTransactions } = useFirestoreCollection<Transaction>("transactions");

  const cardDebts = useMemo(() => {
    const debts = new Map<string, number>();
    if (loadingCards || loadingTransactions) return debts;

    cards.forEach(card => {
        const cardSpending = transactions
            .filter(t => t.cardId === card.id && t.category !== 'Pembayaran')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const cardPayments = transactions
            .filter(t => t.cardId === card.id && t.category === 'Pembayaran')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const debt = cardSpending - cardPayments;
        debts.set(card.id, debt);
    });
    return debts;
  }, [cards, transactions, loadingCards, loadingTransactions]);

  const { upcoming, overdue } = useMemo(() => {
    const upcoming: { card: CreditCard; dueDate: Date }[] = [];
    const overdue: { card: CreditCard; dueDate: Date }[] = [];
    
    if (loadingCards) return { upcoming, overdue };
    
    const today = startOfToday();
    const sevenDaysFromNow = addDays(endOfToday(), 7);

    cards.forEach(card => {
      const debt = cardDebts.get(card.id) || 0;
      if (debt <= 0) return; // No reminder if no debt

      const dueDateThisMonth = new Date(today.getFullYear(), today.getMonth(), card.dueDate);

      if (isAfter(dueDateThisMonth, subDays(today,1)) && isBefore(dueDateThisMonth, sevenDaysFromNow)) {
        upcoming.push({ card, dueDate: dueDateThisMonth });
      } else if (isBefore(dueDateThisMonth, today)) {
        overdue.push({ card, dueDate: dueDateThisMonth });
      }
    });

    // Sort them
    upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    overdue.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return { upcoming, overdue };
  }, [cards, cardDebts, loadingCards]);
  
  const isLoading = loadingCards || loadingTransactions;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengingat Tagihan</h1>
        <p className="text-muted-foreground">Tagihan yang akan atau sudah lewat jatuh tempo.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Lewat Jatuh Tempo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {overdue.length > 0 ? (
                overdue.map(({ card, dueDate }) => (
                  <Alert key={card.id} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{card.cardName} ({card.bankName})</AlertTitle>
                    <AlertDescription className="flex justify-between items-center">
                      <span>Jatuh tempo pada {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dueDate)}</span>
                      <span className="font-semibold">{formatCurrency(cardDebts.get(card.id) || 0)}</span>
                    </AlertDescription>
                  </Alert>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Tidak ada tagihan yang lewat jatuh tempo. Kerja bagus!</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Jatuh Tempo dalam 7 Hari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcoming.length > 0 ? (
                upcoming.map(({ card, dueDate }) => (
                  <Alert key={card.id}>
                    <Bell className="h-4 w-4" />
                    <AlertTitle>{card.cardName} ({card.bankName})</AlertTitle>
                    <AlertDescription className="flex justify-between items-center">
                      <span>Jatuh tempo pada {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dueDate)}</span>
                      <span className="font-semibold">{formatCurrency(cardDebts.get(card.id) || 0)}</span>
                    </AlertDescription>
                  </Alert>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Tidak ada tagihan yang jatuh tempo dalam 7 hari ke depan.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

