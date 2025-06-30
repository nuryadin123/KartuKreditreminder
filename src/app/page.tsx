"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockCards as initialCards, mockTransactions as initialTransactions } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, DollarSign, Calendar } from "lucide-react";
import { DebtChart } from "@/components/dashboard/debt-chart";
import type { CreditCard as CreditCardType, Transaction } from "@/types";
import { useLocalStorage } from "@/hooks/use-local-storage";

export default function Home() {
  const [cards] = useLocalStorage<CreditCardType[]>("kredit-track-cards", initialCards);
  const [transactions] = useLocalStorage<Transaction[]>("kredit-track-transactions", initialTransactions);
  const [upcomingDueDate, setUpcomingDueDate] = useState<Date | null>(null);

  useEffect(() => {
    if (cards.length === 0) return;
    
    const getNextDueDate = (card: CreditCardType) => {
      const today = new Date();
      let dueDate = new Date(today.getFullYear(), today.getMonth(), card.dueDate);
      if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      return dueDate;
    };

    const nextDueDate = cards
      .map(getNextDueDate)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    
    setUpcomingDueDate(nextDueDate || null);
  }, [cards]);

  const { totalDebt, chartData } = (() => {
    const spending = transactions
        .filter(t => t.category !== 'Pembayaran')
        .reduce((sum, t) => sum + t.amount, 0);

    const payments = transactions
        .filter(t => t.category === 'Pembayaran')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalDebt = spending - payments;

    const chartData = cards.map(card => {
        const cardSpending = transactions
            .filter(t => t.cardId === card.id && t.category !== 'Pembayaran')
            .reduce((sum, t) => sum + t.amount, 0);
        const cardPayments = transactions
            .filter(t => t.cardId === card.id && t.category === 'Pembayaran')
            .reduce((sum, t) => sum + t.amount, 0);
        const debt = cardSpending - cardPayments;
        return { name: card.cardName, "Total Utang": debt > 0 ? debt : 0 };
    });

    return { totalDebt, chartData };
  })();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dasbor</h1>
        <p className="text-muted-foreground">Ringkasan utang dan kartu kredit Anda.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utang</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDebt)}</div>
            <p className="text-xs text-muted-foreground">Di semua kartu kredit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kartu Aktif</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.length}</div>
            <p className="text-xs text-muted-foreground">Total kartu kredit terdaftar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pembayaran Berikutnya</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingDueDate ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' }).format(upcomingDueDate) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Tanggal jatuh tempo terdekat
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribusi Utang</CardTitle>
        </CardHeader>
        <CardContent>
          <DebtChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
