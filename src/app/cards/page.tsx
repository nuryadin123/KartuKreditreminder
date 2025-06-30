import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockCards } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle } from "lucide-react";

export default function CardsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Kartu Kredit Anda</h1>
            <p className="text-muted-foreground">Kelola semua kartu kredit Anda di satu tempat.</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Kartu
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockCards.map(card => (
          <Card key={card.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{card.cardName}</span>
                <span className="text-sm font-normal text-muted-foreground">
                    ... {card.last4Digits}
                </span>
              </CardTitle>
              <CardDescription>{card.bankName}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Limit Kredit</span>
                <span className="font-semibold">{formatCurrency(card.creditLimit)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Jatuh Tempo</span>
                <span className="font-semibold">Tanggal {card.dueDate}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Suku Bunga</span>
                <span className="font-semibold">{card.interestRate}% / bulan</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Lihat Transaksi</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
