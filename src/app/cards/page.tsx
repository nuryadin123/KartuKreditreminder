
"use client";

import { useState, useMemo } from "react";
import { addMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Landmark, History, Loader2, Search } from "lucide-react";
import type { CreditCard, Transaction } from "@/types";
import { CardForm, type CardFormValues } from "@/components/cards/card-form";
import { PaymentDialog } from "@/components/cards/payment-dialog";
import { useToast } from "@/hooks/use-toast";
import { PaymentHistoryDialog } from "@/components/cards/payment-history-dialog";
import { Progress } from "@/components/ui/progress";
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";


export default function CardsPage() {
  const { user } = useAuth();
  const { data: cards, loading: loadingCards } = useFirestoreCollection<CreditCard>("cards", user?.uid);
  const { data: transactions, loading: loadingTransactions } = useFirestoreCollection<Transaction>("transactions", user?.uid);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<string>("limit-desc");

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

  const filteredCards = useMemo(() => {
    const sorted = [...cards].sort((a, b) => {
        const debtA = cardDebts.get(a.id) || 0;
        const debtB = cardDebts.get(b.id) || 0;
        switch (sortOption) {
            case 'limit-asc':
                return a.creditLimit - b.creditLimit;
            case 'debt-desc':
                return debtB - debtA;
            case 'debt-asc':
                return debtA - debtB;
            case 'name-asc':
                return a.cardName.localeCompare(b.cardName);
            case 'name-desc':
                return b.cardName.localeCompare(a.cardName);
            case 'limit-desc':
            default:
                return b.creditLimit - a.creditLimit;
        }
    });

    return sorted.filter(card =>
        !searchQuery ||
        card.cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.bankName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cards, searchQuery, sortOption, cardDebts]);

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

  const handleSubmit = async (values: CardFormValues) => {
    if (!user) {
        toast({ title: "Gagal", description: "Anda harus masuk untuk menyimpan kartu.", variant: "destructive" });
        return;
    }

    // Create a mutable copy of the values to avoid sending undefined to Firestore
    const cardData: { [key: string]: any } = {
        ...values,
        userId: user.uid,
    };

    if (values.lastLimitIncreaseDate) {
        cardData.lastLimitIncreaseDate = values.lastLimitIncreaseDate.toISOString();
    } else {
        // Firestore doesn't allow 'undefined' fields. Delete the key if it's not set.
        delete cardData.lastLimitIncreaseDate;
    }
    
    try {
        if (selectedCard) {
            const cardRef = doc(db, 'cards', selectedCard.id);
            await updateDoc(cardRef, cardData);
            toast({ title: "Kartu Diperbarui", description: "Data kartu kredit berhasil diperbarui." });
        } else {
            await addDoc(collection(db, 'cards'), cardData);
            toast({ title: "Kartu Ditambahkan", description: "Kartu kredit baru berhasil ditambahkan." });
        }
    } catch (error: any) {
        console.error("Gagal menyimpan kartu:", error);
        toast({ title: "Gagal Menyimpan", description: error.message || "Terjadi kesalahan saat menyimpan kartu.", variant: "destructive" });
    }
    handleCloseForm();
  };

  const handleDelete = async () => {
    if (selectedCard) {
        try {
            await deleteDoc(doc(db, 'cards', selectedCard.id));
            toast({ title: "Kartu Dihapus", description: "Data kartu kredit berhasil dihapus.", variant: 'destructive' });
        } catch (error: any) {
            toast({ title: "Gagal Menghapus", description: error.message || "Terjadi kesalahan saat menghapus kartu.", variant: "destructive" });
        }
        handleCloseDeleteAlert();
    }
  };

  const handlePayment = async ({ amount }: { amount: number }) => {
    if (selectedCard && user) {
      const newPayment: Omit<Transaction, 'id'> = {
        userId: user.uid,
        cardId: selectedCard.id,
        date: new Date().toISOString(),
        description: `Pembayaran Kartu Kredit`,
        amount: amount,
        category: 'Pembayaran',
        status: 'lunas',
      };
      try {
        await addDoc(collection(db, 'transactions'), newPayment);
        toast({ title: "Pembayaran Berhasil", description: `Pembayaran sebesar ${formatCurrency(amount)} telah dicatat.` });
      } catch (error: any) {
        toast({ title: "Gagal Membayar", description: error.message || "Terjadi kesalahan saat mencatat pembayaran.", variant: "destructive" });
      }
      handleClosePaymentDialog();
    }
  };
  
  const getNextReminderDate = (card: CreditCard): Date | null => {
    if (!card.limitIncreaseReminder || card.limitIncreaseReminder === 'tidak' || !card.lastLimitIncreaseDate) {
        return null;
    }
    const lastDate = new Date(card.lastLimitIncreaseDate);
    const monthsToAdd = card.limitIncreaseReminder === '3-bulan' ? 3 : 6;
    return addMonths(lastDate, monthsToAdd);
  };

  const isLoading = loadingCards || loadingTransactions;

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Kartu Kredit Anda</h1>
              <p className="text-muted-foreground">Kelola semua kartu kredit Anda di satu tempat.</p>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Cari kartu..."
                    className="pl-8 w-full sm:w-[150px] lg:w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Urutkan berdasarkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="limit-desc">Limit (Tertinggi)</SelectItem>
                <SelectItem value="limit-asc">Limit (Terendah)</SelectItem>
                <SelectItem value="debt-desc">Utang (Tertinggi)</SelectItem>
                <SelectItem value="debt-asc">Utang (Terendah)</SelectItem>
                <SelectItem value="name-asc">Nama (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nama (Z-A)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => handleOpenForm()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Kartu
            </Button>
          </div>
        </div>

        {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="h-[450px]">
                        <CardHeader><div className="h-6 w-1/2 bg-muted rounded-md animate-pulse" /><div className="h-4 w-1/3 bg-muted rounded-md animate-pulse mt-2" /></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                            <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                            <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                            <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : cards.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground col-span-full border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium">Anda belum punya kartu</h3>
                <p className="text-sm mb-4">Silakan tambahkan kartu kredit pertama Anda.</p>
                <Button onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Kartu
                </Button>
            </div>
        ) : filteredCards.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground col-span-full border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium">Kartu tidak ditemukan</h3>
                <p className="text-sm">Tidak ada kartu yang cocok dengan pencarian Anda.</p>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map(card => {
                const debt = cardDebts.get(card.id) || 0;
                const availableCredit = card.creditLimit - debt;
                const debtPercentage = card.creditLimit > 0 ? ((debt > 0 ? debt : 0) / card.creditLimit) * 100 : 0;
                const nextReminderDate = getNextReminderDate(card);
                
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
                    <span className="text-sm text-muted-foreground">Tgl. Cetak Tagihan</span>
                    <span className="font-semibold">Tanggal {card.billingDate}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Jatuh Tempo</span>
                    <span className="font-semibold">Tanggal {card.dueDate}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Suku Bunga</span>
                    <span className="font-semibold">{card.interestRate}% / tahun</span>
                    </div>
                    {nextReminderDate ? (
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-muted-foreground">Pengingat Berikutnya</span>
                            <span className="font-semibold">{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(nextReminderDate)}</span>
                        </div>
                    ) : (
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-muted-foreground">Pengingat Limit</span>
                            <span className="font-semibold">Tidak Aktif</span>
                        </div>
                    )}
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
        transactions={transactions}
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

    