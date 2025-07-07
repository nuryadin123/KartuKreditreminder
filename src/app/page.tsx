
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, DollarSign, Calendar, Loader2, Bell, Wallet, AlertTriangle, X } from "lucide-react";
import { DebtChart } from "@/components/dashboard/debt-chart";
import type { CreditCard as CreditCardType, Transaction } from "@/types";
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { addDays, isAfter, isBefore, startOfToday, subDays } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: cards, loading: loadingCards } = useFirestoreCollection<CreditCardType>("cards", user?.uid);
  const { data: transactions, loading: loadingTransactions } = useFirestoreCollection<Transaction>("transactions", user?.uid);
  const [upcomingDueDate, setUpcomingDueDate] = useState<Date | null>(null);
  const { toast } = useToast();
  const [notificationsShown, setNotificationsShown] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [showUpcomingBills, setShowUpcomingBills] = useState(true);
  const [showOverdueBills, setShowOverdueBills] = useState(true);

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

  const { totalDebt, totalRemainingLimit, chartData } = useMemo(() => {
    if (loadingCards || loadingTransactions) return { totalDebt: 0, totalRemainingLimit: 0, chartData: [] };
    
    const spending = transactions
        .filter(t => t.category !== 'Pembayaran')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const payments = transactions
        .filter(t => t.category === 'Pembayaran')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalDebt = spending - payments;

    const totalCreditLimit = cards.reduce((sum, card) => sum + Number(card.creditLimit || 0), 0);
    const totalRemainingLimit = totalCreditLimit - totalDebt;

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

    return { totalDebt, totalRemainingLimit, chartData };
  }, [cards, transactions, loadingCards, loadingTransactions]);

  const { upcomingBills, overdueBills } = useMemo(() => {
    if (loadingCards || loadingTransactions) {
      return { upcomingBills: [], overdueBills: [] };
    }

    const today = startOfToday();
    const upcoming: { card: CreditCardType; debt: number; dueDate: Date }[] = [];
    const overdue: { card: CreditCardType; debt: number; dueDate: Date }[] = [];

    cards.forEach(card => {
      const debtData = chartData.find(d => d.name === card.cardName);
      const debt = debtData ? debtData["Total Utang"] : 0;
      if (debt <= 0) return; // Only process cards with debt

      const dueDateThisMonth = new Date(today.getFullYear(), today.getMonth(), card.dueDate);
      
      if (isAfter(today, dueDateThisMonth)) {
        // Due date for this month's cycle has passed, it's overdue
        overdue.push({ card, debt, dueDate: dueDateThisMonth });
      } else {
        // Due date is today or in the future this month, it's upcoming
        upcoming.push({ card, debt, dueDate: dueDateThisMonth });
      }
    });

    // Sort upcoming by the nearest due date
    upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    // Sort overdue by the most recently missed due date
    overdue.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());

    return { upcomingBills: upcoming.slice(0, 7), overdueBills: overdue };
  }, [cards, chartData, loadingCards, loadingTransactions]);

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
  
  const filteredChartData = useMemo(() => {
    return chartData.filter(d => d['Total Utang'] > 0);
  }, [chartData]);


  return (
    <>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Link href="/transactions">
                    <Card className="hover:bg-muted/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Utang</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalDebt)}</div>
                        <p className="text-xs text-muted-foreground">Di semua kartu kredit</p>
                    </CardContent>
                    </Card>
                  </Link>
                  <Link href="/cards">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Sisa Limit</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalRemainingLimit)}</div>
                            <p className="text-xs text-muted-foreground">Di semua kartu kredit</p>
                        </CardContent>
                    </Card>
                  </Link>
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
              
              {showUpcomingBills && upcomingBills.length > 0 && (
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Ringkasan Tagihan Terdekat</CardTitle>
                            <CardDescription>Tagihan dengan jatuh tempo terdekat yang belum lunas.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2 -mt-2" onClick={() => setShowUpcomingBills(false)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Tutup</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {upcomingBills.map(({ card, debt, dueDate }) => (
                        <Alert key={card.id}>
                            <Bell className="h-4 w-4" />
                            <AlertTitle>{card.cardName} ({card.bankName})</AlertTitle>
                            <AlertDescription>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span>Jatuh tempo pada {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dueDate)}</span>
                                        <span className="font-semibold block sm:inline sm:ml-4 text-destructive">{formatCurrency(debt)}</span>
                                    </div>
                                    <Button size="sm" onClick={() => router.push(`/cards?pay_for_card=${card.id}`)}>Bayar</Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    ))}
                </CardContent>
              </Card>
              )}

              {showOverdueBills && overdueBills.length > 0 && (
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Tagihan Lewat Jatuh Tempo</CardTitle>
                            <CardDescription>Tagihan dari siklus saat ini yang telah melewati tanggal pembayaran.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2 -mt-2" onClick={() => setShowOverdueBills(false)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Tutup</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {overdueBills.map(({ card, debt, dueDate }) => (
                        <Alert key={card.id} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{card.cardName} ({card.bankName})</AlertTitle>
                            <AlertDescription>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span>Seharusnya dibayar pada {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dueDate)}</span>
                                        <span className="font-semibold block sm:inline sm:ml-4">{formatCurrency(debt)}</span>
                                    </div>
                                    <Button variant="destructive" size="sm" onClick={() => router.push(`/cards?pay_for_card=${card.id}`)}>Bayar Sekarang</Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    ))}
                </CardContent>
              </Card>
              )}

              <Card>
                  <CardHeader>
                      <CardTitle>Distribusi Utang</CardTitle>
                      <CardDescription>Visualisasi total utang per kartu kredit.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {filteredChartData.length > 0 ? (
                          <div className="relative">
                              <DebtChart data={filteredChartData} />
                          </div>
                      ) : (
                          <div className="flex h-64 items-center justify-center">
                              <p className="text-muted-foreground">Tidak ada data utang untuk ditampilkan.</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </>
        )}
      </div>
    </>
  );
}
