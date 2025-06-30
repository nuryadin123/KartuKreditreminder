
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { mockCards as initialCards, mockTransactions as initialTransactions } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Landmark, History } from "lucide-react";
import type { CreditCard, Transaction } from "@/types";
import { CardForm } from "@/components/cards/card-form";
import { PaymentDialog } from "@/components/cards/payment-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { PaymentHistoryDialog } from "@/components/cards/payment-history-dialog";
import { Progress } from "@/components/ui/progress";


export default function CardsPage() {
  const [cards, setCards] = useLocalStorage<CreditCard[]>("kredit-track-cards", initialCards);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("kredit-track-transactions", initialTransactions);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const { toast } = useToast();

  const cardDebts = useMemo(() => {
    const debts = new Map<string, number>();
    cards.forEach(card => {
        const cardSpending = transactions
            .filter(t => t.cardId === card.id && t.category !== 'Pembayaran')
            .reduce((sum, t) => sum + t.amount, 0);
        const cardPayments = transactions
            .filter(t => t.cardId === card.id && t.category === 'Pembayaran')
            .reduce((sum, t) => sum + t.amount, 0);
        const debt = cardSpending - cardPayments;
        debts.set(card.id, debt);
    });
    return debts;
  }, [cards, transactions]);

  const handleOpenForm = (card: CreditCard | null = null) => {
    setSelectedCard(card);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedCard(null);
    setIsFormOpen(false);
  };

  const handleOpenDeleteAlert = (card: CreditCard) => {
    setSelectedCard(card);
    setIsDeleteAlertOpen(true);
  };

  const handleCloseDeleteAlert = () => {
    setSelectedCard(null);
    setIsDeleteAlertOpen(false);
  };
  
  const handleOpenPaymentDialog = (card: CreditCard) => {
    setSelectedCard(card);
    setIsPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setSelectedCard(null);
    setIsPaymentDialogOpen(false);
  };
  
  const handleOpenPaymentHistory = (card: CreditCard) => {
    setSelectedCard(card);
    setIsPaymentHistoryOpen(true);
  };

  const handleSubmit = (values: Omit<CreditCard, "id">) => {
    if (selectedCard) {
      setCards(cards.map(c => c.id === selectedCard.id ? { ...c, ...values } : c));
      toast({ title: "Kartu Diperbarui", description: "Data kartu kredit berhasil diperbarui." });
    } else {
      const newCard: CreditCard = { id: `card-${Date.now()}`, ...values };
      setCards([...cards, newCard]);
      toast({ title: "Kartu Ditambahkan", description: "Kartu kredit baru berhasil ditambahkan." });
    }
    handleCloseForm();
  };

  const handleDelete = () => {
    if (selectedCard) {
        setCards(cards.filter(c => c.id !== selectedCard.id));
        toast({ title: "Kartu Dihapus", description: "Data kartu kredit berhasil dihapus.", variant: 'destructive' });
        handleCloseDeleteAlert();
    }
  };

  const handlePayment = ({ amount }: { amount: number }) => {
    if (selectedCard) {
      const newPayment: Transaction = {
        id: `txn-${Date.now()}`,
        cardId: selectedCard.id,
        date: new Date().toISOString(),
        description: `Pembayaran Kartu Kredit`,
        amount: amount,
        category: 'Pembayaran',
        status: 'lunas',
      };
      setTransactions([...transactions, newPayment]);
      toast({ title: "Pembayaran Berhasil", description: `Pembayaran sebesar ${formatCurrency(amount)} telah dicatat.` });
      handleClosePaymentDialog();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Kartu Kredit Anda</h1>
              <p className="text-muted-foreground">Kelola semua kartu kredit Anda di satu tempat.</p>
          </div>
          <Button onClick={() => handleOpenForm()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Kartu
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(card => {
            const debt = cardDebts.get(card.id) || 0;
            const availableCredit = card.creditLimit - debt;
            const debtPercentage = card.creditLimit > 0 ? ((debt > 0 ? debt : 0) / card.creditLimit) * 100 : 0;
            
            return (
            <Card key={card.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{card.cardName}</CardTitle>
                        <CardDescription>{card.bankName}</CardDescription>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenForm(card)}>
                                <Edit className="mr-2 h-4 w-4"/>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenPaymentHistory(card)}>
                                <History className="mr-2 h-4 w-4"/>
                                Riwayat Pembayaran
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenDeleteAlert(card)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Hapus
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                 <div className="text-lg font-mono text-muted-foreground pt-2 tracking-widest">
                    **** **** **** {card.last4Digits}
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">Sisa Utang</span>
                        {debt >= 0 ? (
                            <span className="font-semibold text-destructive">{formatCurrency(debt)}</span>
                        ) : (
                            <span className="font-semibold text-green-600">Surplus {formatCurrency(Math.abs(debt))}</span>
                        )}
                    </div>
                    <Progress value={debtPercentage} aria-label={`${debtPercentage.toFixed(2)}% used`} />
                    <div className="flex justify-between items-baseline text-sm text-muted-foreground">
                        <span>Limit: {formatCurrency(card.creditLimit)}</span>
                        <span>Tersedia: {formatCurrency(availableCredit)}</span>
                    </div>
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
                <Button onClick={() => handleOpenPaymentDialog(card)} className="w-full">
                  <Landmark className="mr-2 h-4 w-4" />
                  Lakukan Pembayaran
                </Button>
              </CardFooter>
            </Card>
          )})}
        </div>
        {cards.length === 0 && (
            <div className="text-center py-10 text-muted-foreground col-span-full border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium">Anda belum punya kartu</h3>
                <p className="text-sm">Silakan tambahkan kartu kredit pertama Anda.</p>
            </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedCard ? "Edit Kartu Kredit" : "Tambah Kartu Kredit Baru"}</DialogTitle>
            <DialogDescription>
              {selectedCard ? "Perbarui detail kartu kredit Anda." : "Isi formulir di bawah untuk menambahkan kartu baru."}
            </DialogDescription>
          </DialogHeader>
          <CardForm
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
            defaultValues={selectedCard || undefined}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat diurungkan. Ini akan menghapus kartu kredit secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteAlert}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentDialog
        card={selectedCard}
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        onSubmit={handlePayment}
      />

      <PaymentHistoryDialog
        card={selectedCard}
        transactions={transactions}
        open={isPaymentHistoryOpen}
        onOpenChange={setIsPaymentHistoryOpen}
      />
    </>
  );
}
