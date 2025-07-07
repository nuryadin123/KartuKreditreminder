
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { formatCurrency, cn } from "@/lib/utils";
import { PlusCircle, MoreHorizontal, Edit, Trash2, History, Loader2, Search, ArrowUpDown } from "lucide-react";
import type { CreditCard, Transaction } from "@/types";
import { CardForm, type CardFormValues } from "@/components/cards/card-form";
import { useToast } from "@/hooks/use-toast";
import { PaymentHistoryDialog } from "@/components/cards/payment-history-dialog";
import { Progress } from "@/components/ui/progress";
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";


export default function CardsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: cards, loading: loadingCards } = useFirestoreCollection<CreditCard>("cards", user?.uid);
  const { data: transactions, loading: loadingTransactions } = useFirestoreCollection<Transaction>("transactions", user?.uid);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<string>("available-credit-desc");

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
        const availableCreditA = a.creditLimit - debtA;
        const availableCreditB = b.creditLimit - debtB;

        switch (sortOption) {
            case 'available-credit-asc':
                return availableCreditA - availableCreditB;
            case 'debt-desc':
                return debtB - debtA;
            case 'debt-asc':
                return debtA - debtB;
            case 'name-asc':
                return a.cardName.localeCompare(b.cardName);
            case 'name-desc':
                return b.cardName.localeCompare(a.cardName);
            case 'available-credit-desc':
            default:
                return availableCreditB - availableCreditA;
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
  
  const handleOpenPaymentHistory = (card: CreditCard) => {
    setSelectedCard(card);
    setIsPaymentHistoryOpen(true);
  };

  const handleSubmit = async (values: CardFormValues) => {
    if (!user) {
        toast({ title: "Gagal", description: "Anda harus masuk untuk menyimpan kartu.", variant: "destructive" });
        return;
    }

    const cardData: { [key: string]: any } = {
        ...values,
        userId: user.uid,
    };

    if (values.lastLimitIncreaseDate) {
        cardData.lastLimitIncreaseDate = values.lastLimitIncreaseDate.toISOString();
    } else {
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Urutkan</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortOption('available-credit-desc')}>Sisa Limit (Tertinggi)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('available-credit-asc')}>Sisa Limit (Terendah)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('debt-desc')}>Utang (Tertinggi)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('debt-asc')}>Utang (Terendah)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('name-asc')}>Nama (A-Z)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('name-desc')}>Nama (Z-A)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => handleOpenForm()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Kartu
            </Button>
          </div>
        </div>

        {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="p-4">
                            <div className="h-5 w-3/4 bg-muted rounded-md animate-pulse" />
                            <div className="h-4 w-1/2 bg-muted rounded-md animate-pulse mt-2" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <div className="h-8 w-full bg-muted rounded-md animate-pulse" />
                            <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
                            <div className="h-4 w-3/4 bg-muted rounded-md animate-pulse" />
                            <div className="h-4 w-5/6 bg-muted rounded-md animate-pulse" />
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredCards.map(card => {
                const debt = cardDebts.get(card.id) || 0;
                const availableCredit = card.creditLimit - debt;
                const debtPercentage = card.creditLimit > 0 ? ((debt > 0 ? debt : 0) / card.creditLimit) * 100 : 0;
                const nextReminderDate = getNextReminderDate(card);
                
                return (
                <Card 
                  key={card.id} 
                  className="flex flex-col cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/payment?cardId=${card.id}`)}
                >
                <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl">{card.cardName}</CardTitle>
                            <CardDescription>{card.bankName}</CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenForm(card); }}>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenPaymentHistory(card); }}>
                                    <History className="mr-2 h-4 w-4"/>
                                    Riwayat Pembayaran
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDeleteAlert(card); }} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Hapus
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="text-base font-mono text-muted-foreground pt-2 tracking-widest">
                        **** **** **** {card.last4Digits}
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
                    <div>
                        <div className="mb-3">
                            <p className="text-sm text-muted-foreground">Sisa Limit Tersedia</p>
                            <p className={cn(
                                "text-2xl font-bold tracking-tight",
                                availableCredit < 0 ? "text-destructive" : "text-green-600"
                            )}>
                                {formatCurrency(availableCredit)}
                            </p>
                        </div>
                        <div className="space-y-1.5 mb-3">
                            <Progress value={debtPercentage} aria-label={`${debtPercentage.toFixed(2)}% terpakai`} />
                            <div className="flex justify-between items-baseline text-sm text-muted-foreground">
                                <span>Terpakai: {formatCurrency(debt)}</span>
                                <span>Total Limit: {formatCurrency(card.creditLimit)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Tgl. Cetak Tagihan</span>
                            <span className="font-medium">Tanggal {card.billingDate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Jatuh Tempo</span>
                            <span className="font-medium">Tanggal {card.dueDate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Suku Bunga</span>
                            <span className="font-medium">{card.interestRate}% / tahun</span>
                        </div>
                        {nextReminderDate ? (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Pengingat Berikutnya</span>
                                <span className="font-medium">{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(nextReminderDate)}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Pengingat Limit</span>
                                <span className="font-medium">Tidak Aktif</span>
                            </div>
                        )}
                    </div>
                </CardContent>
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

      <PaymentHistoryDialog
        card={selectedCard}
        transactions={transactions}
        open={isPaymentHistoryOpen}
        onOpenChange={setIsPaymentHistoryOpen}
      />
    </>
  );
}
