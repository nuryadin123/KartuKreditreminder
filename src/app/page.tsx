
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, DollarSign, Calendar, Loader2 } from "lucide-react";
import { DebtChart } from "@/components/dashboard/debt-chart";
import type { CreditCard as CreditCardType, Transaction } from "@/types";
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { addDays, isAfter, isBefore, startOfToday, subDays } from "date-fns";

export default function Home() {
  const { data: cards, loading: loadingCards } = useFirestoreCollection<CreditCardType>("cards");
  const { data: transactions, loading: loadingTransactions } = useFirestoreCollection<Transaction>("transactions");
  const [upcomingDueDate, setUpcomingDueDate] = useState<Date | null>(null);
  const { toast } = useToast();
  const [notificationsShown, setNotificationsShown] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);


  useEffect(() => {
    if (loadingCards || cards.length === 0) return;
    
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
  }, [cards, loadingCards]);

  const { totalDebt, chartData } = useMemo(() => {
    if (loadingCards || loadingTransactions) return { totalDebt: 0, chartData: [] };
    
    const spending = transactions
        .filter(t => t.category !== 'Pembayaran')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const payments = transactions
        .filter(t => t.category === 'Pembayaran')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalDebt = spending - payments;

    const chartData = cards.map(card => {
        const cardSpending = transactions
            .filter(t => t.cardId === card.id && t.category !== 'Pembayaran')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const cardPayments = transactions
            .filter(t => t.cardId === card.id && t.category === 'Pembayaran')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const debt = cardSpending - cardPayments;
        return { name: card.cardName, "Total Utang": debt > 0 ? debt : 0 };
    });

    return { totalDebt, chartData };
  }, [cards, transactions, loadingCards, loadingTransactions]);

  useEffect(() => {
    const isLoading = loadingCards || loadingTransactions;
    if (isLoading || notificationsShown || cards.length === 0) {
      return;
    }

    const today = startOfToday();
    const threeDaysFromNow = addDays(today, 3);

    cards.forEach(card => {
      const debtData = chartData.find(d => d.name === card.cardName);
      const debt = debtData ? debtData["Total Utang"] : 0;
      if (debt <= 0) return;

      const dueDateInCycle = new Date(today.getFullYear(), today.getMonth(), card.dueDate);
      
      if (isAfter(dueDateInCycle, subDays(today, 1)) && isBefore(dueDateInCycle, threeDaysFromNow)) {
        const description = `Tagihan kartu ${card.cardName} sebesar ${formatCurrency(debt)} akan jatuh tempo pada ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long'}).format(dueDateInCycle)}.`;
        
        toast({
          title: "🔔 Pengingat Pembayaran",
          description: description,
        });

        if (notificationPermission === 'granted') {
          new Notification("🔔 Pengingat Pembayaran", {
            body: description,
          });
        }
      }
    });

    setNotificationsShown(true);
  }, [cards, chartData, loadingCards, loadingTransactions, notificationsShown, toast, notificationPermission]);

  const isLoading = loadingCards || loadingTransactions;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dasbor</h1>
        <p className="text-muted-foreground">Ringkasan utang dan kartu kredit Anda.</p>
      </div>

      {isLoading ? (
         <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
