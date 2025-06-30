
"use client";

import { useState, useMemo } from "react";
import { addMonths } from "date-fns";
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
import { formatCurrency } from "@/lib/utils";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Landmark, History, Loader2, Database } from "lucide-react";
import type { CreditCard, Transaction } from "@/types";
import { CardForm, type CardFormValues } from "@/components/cards/card-form";
import { PaymentDialog } from "@/components/cards/payment-dialog";
import { useToast } from "@/hooks/use-toast";
import { PaymentHistoryDialog } from "@/components/cards/payment-history-dialog";
import { Progress } from "@/components/ui/progress";
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";

// --- Seed Data from Image ---
const initialCards: Omit<CreditCard, 'id' | 'userId'>[] = [
  { bankName: 'Ovo', cardName: 'Ovo Nur Card', last4Digits: '0600', creditLimit: 45000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Touch', cardName: 'Touch Nur Card', last4Digits: '5409', creditLimit: 25500000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Tokopedia', cardName: 'Tokped Nur Card', last4Digits: '5200', creditLimit: 72000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'BTN', cardName: 'Btn Nur Card', last4Digits: '6007', creditLimit: 40000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Samsung', cardName: 'Samsung Nur Card', last4Digits: '1111', creditLimit: 50000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Line', cardName: 'Line Nur', last4Digits: '2222', creditLimit: 132000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'BNI', cardName: 'Bni World', last4Digits: '4740', creditLimit: 51000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'BNI', cardName: 'Bni Signa Nur', last4Digits: '3333', creditLimit: 30000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Mega', cardName: 'Mega Card', last4Digits: '4857', creditLimit: 30000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'CIMB Niaga', cardName: 'Golf Card', last4Digits: '9073', creditLimit: 100000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'BCA', cardName: 'BCA Card', last4Digits: '5308', creditLimit: 70000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'PCS', cardName: 'PCS Nur Card', last4Digits: '4157', creditLimit: 40000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'CIMB Niaga', cardName: 'Octo Card', last4Digits: '4444', creditLimit: 15000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Gojek', cardName: 'Gopinjam Nur', last4Digits: '5555', creditLimit: 11000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Gojek', cardName: 'Gopaylater Nur', last4Digits: '6666', creditLimit: 11000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Kredivo', cardName: 'Kredivo Nur', last4Digits: '7777', creditLimit: 50000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Honest', cardName: 'Honest Card', last4Digits: '8888', creditLimit: 51000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'UOB', cardName: 'UOB Nur Card', last4Digits: '9999', creditLimit: 10000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'BTN', cardName: 'BTN Ali Card', last4Digits: '8409', creditLimit: 60000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Tokopedia', cardName: 'Toped Ali Card', last4Digits: '8201', creditLimit: 49000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Ovo', cardName: 'Ovo Ali Card', last4Digits: '1001', creditLimit: 23700000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Samsung', cardName: 'Samsung Ali Card', last4Digits: '1002', creditLimit: 35000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Paper', cardName: 'Paper Ali Card', last4Digits: '1003', creditLimit: 30000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Nex', cardName: 'Nex Ali Card', last4Digits: '1004', creditLimit: 20000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'BCA', cardName: 'BCA Ali Card', last4Digits: '1005', creditLimit: 30000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'BNI', cardName: 'BNI Batik Ali Card', last4Digits: '1006', creditLimit: 28000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'BNI', cardName: 'BNI Word Ali Card', last4Digits: '1007', creditLimit: 30000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'BNI', cardName: 'BNI Titanium Ali Card', last4Digits: '1008', creditLimit: 30000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Mandiri', cardName: 'Mandiri Ali Card', last4Digits: '1009', creditLimit: 40000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'PCS', cardName: 'PCS Ali Card', last4Digits: '1010', creditLimit: 10000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'CIMB Niaga', cardName: 'CIMB Accor Ali Card', last4Digits: '1011', creditLimit: 20000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'Line', cardName: 'Line Ali Card', last4Digits: '1012', creditLimit: 105000000, billingDate: 15, dueDate: 25, interestRate: 21 },
  { bankName: 'UOB', cardName: 'UOB Ali Card', last4Digits: '1013', creditLimit: 10000000, billingDate: 15, dueDate: 25, interestRate: 21 },
];

const initialUsages: (number | null)[] = [
  27699994, 937846, 47088763, 18556750, 35736663, 132000000, 50984923, 29920003,
  10004074, 100113716, 41391666, 40000000, 14975999, 11000000, null, null, null, null,
  24215862, 39737899, 7868906, 21227557, 14109333, 2582782, 18318736, 23438334,
  25755006, 23348340, 40213519, 3798793, 19984331, 105000000, null,
];
// --- End Seed Data ---


export default function CardsPage() {
  const { user } = useAuth();
  const { data: cards, loading: loadingCards } = useFirestoreCollection<CreditCard>("cards", user?.uid);
  const { data: transactions, loading: loadingTransactions } = useFirestoreCollection<Transaction>("transactions", user?.uid);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const { toast } = useToast();

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
    const cardData = {
        ...values,
        userId: user.uid,
        lastLimitIncreaseDate: values.lastLimitIncreaseDate?.toISOString()
    }
    try {
        if (selectedCard) {
            const cardRef = doc(db, 'cards', selectedCard.id);
            await updateDoc(cardRef, cardData as any);
            toast({ title: "Kartu Diperbarui", description: "Data kartu kredit berhasil diperbarui." });
        } else {
            await addDoc(collection(db, 'cards'), cardData);
            toast({ title: "Kartu Ditambahkan", description: "Kartu kredit baru berhasil ditambahkan." });
        }
    } catch (error) {
        toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan kartu.", variant: "destructive" });
    }
    handleCloseForm();
  };

  const handleDelete = async () => {
    if (selectedCard) {
        try {
            await deleteDoc(doc(db, 'cards', selectedCard.id));
            toast({ title: "Kartu Dihapus", description: "Data kartu kredit berhasil dihapus.", variant: 'destructive' });
        } catch (error) {
            toast({ title: "Gagal Menghapus", description: "Terjadi kesalahan saat menghapus kartu.", variant: "destructive" });
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
      } catch (error) {
        toast({ title: "Gagal Membayar", description: "Terjadi kesalahan saat mencatat pembayaran.", variant: "destructive" });
      }
      handleClosePaymentDialog();
    }
  };
  
  const handleSeedData = async () => {
    if (!user) {
        toast({ title: "Gagal", description: "Anda harus masuk untuk menambahkan data contoh.", variant: "destructive" });
        return;
    }
    if (cards.length > 0) {
        toast({ title: "Informasi", description: "Anda sudah memiliki data kartu." });
        return;
    }

    setIsSeeding(true);
    try {
        const addedCardIds: string[] = [];
        for (const cardData of initialCards) {
            const docRef = await addDoc(collection(db, 'cards'), { ...cardData, userId: user.uid });
            addedCardIds.push(docRef.id);
        }

        const transactionBatch = writeBatch(db);
        initialUsages.forEach((usage, index) => {
            if (usage !== null && usage > 0) {
                const cardId = addedCardIds[index];
                if (cardId) {
                    const transactionRef = doc(collection(db, 'transactions'));
                    const transactionData: Omit<Transaction, 'id'> = {
                        userId: user.uid,
                        cardId: cardId,
                        date: new Date().toISOString(),
                        description: 'Pemakaian Awal',
                        amount: usage,
                        category: 'Lainnya',
                        status: 'belum lunas'
                    };
                    transactionBatch.set(transactionRef, transactionData);
                }
            }
        });
        await transactionBatch.commit();
        
        toast({ title: "Data Contoh Ditambahkan", description: "Data kartu dan transaksi berhasil ditambahkan." });
    } catch (error) {
        toast({ title: "Gagal Menambahkan Data", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
        setIsSeeding(false);
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
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map(card => {
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
        {cards.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground col-span-full border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium">Anda belum punya kartu</h3>
                <p className="text-sm mb-4">Silakan tambahkan kartu kredit pertama Anda atau gunakan data contoh.</p>
                <div className="flex justify-center gap-2">
                    <Button onClick={() => handleOpenForm()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah Kartu Manual
                    </Button>
                    <Button onClick={handleSeedData} variant="secondary" disabled={isSeeding}>
                        {isSeeding ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Database className="mr-2 h-4 w-4" />
                        )}
                        Isi dengan Data Contoh
                    </Button>
                </div>
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

    