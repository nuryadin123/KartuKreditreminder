import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockCards, mockTransactions } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, DollarSign, Calendar, Users } from "lucide-react";
import { DebtChart } from "@/components/dashboard/debt-chart";
import type { CreditCard as CreditCardType } from "@/types";

export default function Home() {
  const totalDebt = mockTransactions
    .filter((t) => t.status === 'unpaid')
    .reduce((sum, t) => sum + t.amount, 0);

  const nextPayment = mockTransactions
    .filter((t) => t.status === 'unpaid')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .find(t => {
      const card = mockCards.find(c => c.id === t.cardId);
      if (!card) return false;
      const today = new Date();
      const dueDate = new Date(today.getFullYear(), today.getMonth(), card.dueDate);
      return dueDate >= today;
    });
  
  const getNextDueDate = (card: CreditCardType) => {
    const today = new Date();
    let dueDate = new Date(today.getFullYear(), today.getMonth(), card.dueDate);
    if(dueDate < today) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    return dueDate;
  };

  const upcomingDueDate = mockCards
    .map(getNextDueDate)
    .sort((a,b) => a.getTime() - b.getTime())[0];


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
