"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockCards, mockTransactions } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, DollarSign, Calendar } from "lucide-react";
import { DebtChart } from "@/components/dashboard/debt-chart";
import type { CreditCard as CreditCardType } from "@/types";

export default function Home() {
  const [upcomingDueDate, setUpcomingDueDate] = useState<Date | null>(null);

  useEffect(() => {
    const getNextDueDate = (card: CreditCardType) => {
      const today = new Date();
      let dueDate = new Date(today.getFullYear(), today.getMonth(), card.dueDate);
      if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      return dueDate;
    };

    const nextDueDate = mockCards
      .map(getNextDueDate)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    
    setUpcomingDueDate(nextDueDate || null);
  }, []);

  const totalDebt = mockTransactions
    .filter((t) => t.status === 'unpaid')
    .reduce((sum, t) => sum + t.amount, 0);

  const chartData = mockCards.map(card => {
    const debt = mockTransactions
      .filter(t => t.cardId === card.id && t.status === 'unpaid')
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: card.cardName, "Total Utang": debt };
  });

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
            <div className="text-2xl font-bold">{mockCards.length}</div>
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
              {upcomingDueDate ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' }).format(upcomingDueDate) : 'Memuat...'}
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
