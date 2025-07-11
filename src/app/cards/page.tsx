"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addMonths } from "date-fns";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
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
import { PlusCircle, Edit, Trash2, History, Loader2, Search, ArrowUpDown, Upload, Download, AlertTriangle } from "lucide-react";
import type { CreditCard, Transaction } from "@/types";
import { CardForm, type CardFormValues } from "@/components/cards/card-form";
import { PaymentDrawer } from "@/components/cards/payment-drawer";
import { useToast } from "@/hooks/use-toast";
import { PaymentHistoryDialog } from "@/components/cards/payment-history-dialog";
import { Progress } from "@/components/ui/progress";
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const CardDetails = ({ card, nextReminderDate }: { card: CreditCard, nextReminderDate: Date | null }) => {
    return (
        <div className="grid gap-3 py-4 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tgl. Cetak</span>
                <span className="font-medium">Tgl {card.billingDate}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Jatuh Tempo</span>
                <span className="font-medium">Tgl {card.dueDate}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bunga</span>
                <span className="font-medium">{card.interestRate}%/thn</span>
            </div>
            {nextReminderDate ? (
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Reminder</span>
                    <span className="font-medium text-right">{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' }).format(nextReminderDate)}</span>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Reminder</span>
                    <span className="font-medium">Off</span>
                </div>
            )}
        </div>
    )
}

function CardsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { data: cards, loading: loadingCards } = useFirestoreCollection<CreditCard>("cards", user?.uid);
  const { data: transactions, loading: loadingTransactions } = useFirestoreCollection<Transaction>("transactions", user?.uid);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [detailsCard, setDetailsCard] = useState<CreditCard | null>(null);
  
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [paymentCard, setPaymentCard] = useState<CreditCard | null>(null);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<string>("available-credit-desc");
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cardsToReview, setCardsToReview] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);


   useEffect(() => {
    if (loadingCards) return;
    const cardIdToPay = searchParams.get('pay_for_card');
    if (cardIdToPay) {
      const card = cards.find(c => c.id === cardIdToPay);
      if (card) {
        setPaymentCard(card);
      }
    }
  }, [searchParams, cards, loadingCards]);

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

  const handlePaymentSubmit = async (values: { amount: number }) => {
    if (!paymentCard || !user) {
      toast({ title: 'Gagal', description: 'Kartu atau pengguna tidak valid.', variant: 'destructive' });
      return;
    }
    try {
      const newPayment: Omit<Transaction, 'id'> = {
        userId: user.uid,
        cardId: paymentCard.id,
        date: new Date().toISOString(),
        description: 'Pembayaran Kartu Kredit',
        amount: values.amount,
        category: 'Pembayaran',
        status: 'lunas',
      };
      await addDoc(collection(db, 'transactions'), newPayment);
      toast({ title: 'Pembayaran Berhasil', description: `Pembayaran sebesar ${formatCurrency(values.amount)} telah dicatat.` });
    } catch (error: any) {
      toast({ title: 'Gagal Membayar', description: error.message || 'Terjadi kesalahan.', variant: 'destructive' });
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
  
  const handleDownloadSample = () => {
    const sampleData = [
      {
        "Bank Name": "Contoh Bank",
        "Card Name": "Kartu Platinum",
        "Last 4 Digits": "1234",
        "Credit Limit": 50000000,
        "Current Debt": 1500000,
        "Billing Date": 20,
        "Due Date": 15,
        "Interest Rate": 21,
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kartu");
    XLSX.writeFile(workbook, "Contoh_Impor_Kartu.xlsx");
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
        toast({ title: "Gagal", description: "Anda harus masuk untuk mengimpor kartu.", variant: "destructive" });
        return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (json.length === 0) {
                toast({ title: "File Kosong", description: "File Excel yang Anda unggah tidak berisi data.", variant: "destructive" });
                return;
            }

            const requiredHeaders = ["Bank Name", "Card Name", "Last 4 Digits", "Credit Limit", "Current Debt"];
            const actualHeaders = Object.keys(json[0]);
            const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

            if (missingHeaders.length > 0) {
                 toast({
                    title: "Format Salah",
                    description: `Kolom berikut tidak ditemukan: ${missingHeaders.join(", ")}. Silakan unduh file contoh.`,
                    variant: "destructive",
                });
                return;
            }
            
            const validatedData = json.map(row => {
              const bankName = String(row["Bank Name"] || '');
              const cardName = String(row["Card Name"] || '');
              const creditLimit = Number(row["Credit Limit"] || 0);
              const last4Digits = String(row["Last 4 Digits"] || '');
              let error = null;

              if (!bankName) error = "Nama Bank wajib diisi.";
              else if (!cardName) error = "Nama Kartu wajib diisi.";
              else if (!last4Digits || !/^\d{4}$/.test(last4Digits)) error = "4 Digit Terakhir harus berupa 4 angka.";
              else if (isNaN(creditLimit) || creditLimit <= 0) error = "Limit Kredit harus angka positif.";

              return { ...row, _isValid: !error, _error: error };
            });

            setCardsToReview(validatedData);

        } catch (error: any) {
            console.error("Gagal memproses file:", error);
            toast({ title: "Gagal Memproses File", description: error.message || "Terjadi kesalahan saat memproses file.", variant: "destructive" });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const handleConfirmImport = async () => {
    if (!user || !cardsToReview) {
      toast({ title: "Gagal", description: "Tidak ada data untuk diimpor atau pengguna tidak masuk.", variant: "destructive" });
      return;
    }

    const validCards = cardsToReview.filter(card => card._isValid);

    if (validCards.length === 0) {
        toast({ title: "Tidak Ada Data Valid", description: "Tidak ada kartu yang valid untuk diimpor.", variant: "destructive" });
        return;
    }

    setIsImporting(true);

    try {
        toast({ title: "Mengimpor...", description: `Memproses ${validCards.length} kartu.` });
        
        const batch = writeBatch(db);

        for (const row of validCards) {
            const cardData: Omit<CreditCard, 'id'> = {
                userId: user.uid,
                bankName: String(row["Bank Name"] || ''),
                cardName: String(row["Card Name"] || ''),
                last4Digits: String(row["Last 4 Digits"] || '0000').slice(-4),
                creditLimit: Number(row["Credit Limit"] || 0),
                billingDate: Number(row["Billing Date"] || 1),
                dueDate: Number(row["Due Date"] || 15),
                interestRate: Number(row["Interest Rate"] || 21),
                limitIncreaseReminder: 'tidak'
            };

            const cardRef = doc(collection(db, 'cards'));
            batch.set(cardRef, cardData);

            const debt = Number(row["Current Debt"] || 0);
            if (debt > 0) {
                const transactionData: Omit<Transaction, 'id'> = {
                    userId: user.uid,
                    cardId: cardRef.id,
                    date: new Date().toISOString(),
                    description: "Saldo awal dari impor",
                    amount: debt,
                    category: 'Lainnya',
                    status: 'belum lunas'
                };
                const transactionRef = doc(collection(db, 'transactions'));
                batch.set(transactionRef, transactionData);
            }
        }
        await batch.commit();

        toast({ title: "Impor Berhasil", description: `${validCards.length} kartu berhasil ditambahkan.` });
        setCardsToReview(null);
    } catch (error: any) {
        console.error("Gagal mengimpor data:", error);
        toast({ title: "Gagal Mengimpor Data", description: error.message || "Terjadi kesalahan saat menyimpan data.", variant: "destructive" });
    } finally {
        setIsImporting(false);
    }
  };


  const isLoading = loadingCards || loadingTransactions;
  const nextReminderDateForDialog = detailsCard ? getNextReminderDate(detailsCard) : null;


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
            <Button variant="outline" size="sm" className="h-9 gap-1" onClick={handleDownloadSample}>
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Contoh</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Impor</span>
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls" />
          </div>
        </div>

        {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="p-3">
                            <div className="h-5 w-3/4 bg-muted rounded-md animate-pulse" />
                            <div className="h-4 w-1/2 bg-muted rounded-md animate-pulse mt-2" />
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-3">
                            <div className="h-8 w-full bg-muted rounded-md animate-pulse" />
                            <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : cards.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground col-span-full border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium">Anda belum punya kartu</h3>
                <p className="text-sm mb-4">Silakan tambahkan kartu kredit pertama Anda.</p>
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
                
                return (
                <Card 
                  key={card.id} 
                  className="flex flex-col cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setPaymentCard(card)}
                >
                <CardHeader className="p-3 pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base font-semibold leading-tight">{card.cardName}</CardTitle>
                            <CardDescription className="text-xs">{card.bankName}</CardDescription>
                        </div>
                         <div className="flex items-center -mr-2 flex-shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleOpenForm(card); }}
                                aria-label="Edit Kartu"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleOpenPaymentHistory(card); }}
                                aria-label="Riwayat Pembayaran"
                            >
                                <History className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive/80 hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleOpenDeleteAlert(card); }}
                                aria-label="Hapus Kartu"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground pt-1 tracking-wider">
                        **** {card.last4Digits}
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-2 flex-grow flex flex-col justify-between">
                    <div>
                        <div className="mb-2">
                            <p className="text-xs text-muted-foreground">Sisa Limit</p>
                            <p className={cn(
                                "text-lg font-bold tracking-tight",
                                availableCredit < 0 ? "text-destructive" : "text-green-600"
                            )}>
                                {formatCurrency(availableCredit)}
                            </p>
                        </div>
                        <div className="space-y-1 mb-2">
                            <Progress value={debtPercentage} aria-label={`${debtPercentage.toFixed(2)}% terpakai`} />
                            <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                                <span>Utang: {formatCurrency(debt)}</span>
                                <span>Limit: {formatCurrency(card.creditLimit)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center -mb-1 mt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDetailsCard(card);
                            }}
                        >
                            Lihat Detail
                        </Button>
                    </div>
                </CardContent>
                </Card>
            )})}
            </div>
        )}
      </div>

      <div className="fixed bottom-8 right-8 z-50">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                     <Button
                        className="rounded-full w-14 h-14 shadow-lg"
                        size="icon"
                        aria-label="Tambah Kartu"
                        onClick={() => handleOpenForm()}
                    >
                        <PlusCircle className="h-6 w-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Tambah Kartu</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      {isMobile ? (
        <Drawer open={!!detailsCard} onOpenChange={(isOpen) => !isOpen && setDetailsCard(null)}>
            <DrawerContent>
                {detailsCard && (
                    <>
                        <DrawerHeader className="text-left">
                            <DrawerTitle>Detail Kartu</DrawerTitle>
                            <DrawerDescription>
                            {detailsCard.cardName} ({detailsCard.bankName})
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="px-4">
                            <CardDetails card={detailsCard} nextReminderDate={nextReminderDateForDialog} />
                        </div>
                    </>
                )}
            </DrawerContent>
        </Drawer>
        ) : (
        <Dialog open={!!detailsCard} onOpenChange={(isOpen) => !isOpen && setDetailsCard(null)}>
            <DialogContent className="sm:max-w-[425px]">
            {detailsCard && (
                <>
                    <DialogHeader>
                        <DialogTitle>Detail Kartu</DialogTitle>
                        <DialogDescription>
                        {detailsCard?.cardName} ({detailsCard?.bankName})
                        </DialogDescription>
                    </DialogHeader>
                    <CardDetails card={detailsCard} nextReminderDate={nextReminderDateForDialog} />
                </>
            )}
            </DialogContent>
        </Dialog>
      )}


      {isMobile ? (
        <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>{selectedCard ? "Edit Kartu Kredit" : "Tambah Kartu Kredit Baru"}</DrawerTitle>
                    <DrawerDescription>
                    {selectedCard ? "Perbarui detail kartu kredit Anda." : "Isi formulir di bawah untuk menambahkan kartu baru."}
                    </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4">
                    <CardForm
                        onSubmit={handleSubmit}
                        onCancel={handleCloseForm}
                        defaultValues={selectedCard || undefined}
                    />
                </div>
            </DrawerContent>
        </Drawer>
      ) : (
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
      )}
      
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
      
      <PaymentDrawer
        card={paymentCard}
        transactions={transactions}
        open={!!paymentCard}
        onOpenChange={(isOpen) => {
            if (!isOpen) {
                setPaymentCard(null);
            }
        }}
        onSubmit={handlePaymentSubmit}
       />

      <PaymentHistoryDialog
        card={selectedCard}
        transactions={transactions}
        open={isPaymentHistoryOpen}
        onOpenChange={setIsPaymentHistoryOpen}
      />

       <Dialog open={!!cardsToReview} onOpenChange={(isOpen) => !isOpen && setCardsToReview(null)}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
            <DialogTitle>Tinjau Impor Kartu</DialogTitle>
            <DialogDescription>
                Periksa data di bawah ini. Kartu dengan error akan dilewati. Anda dapat memperbaiki file Excel dan mengunggahnya kembali.
            </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Bank</TableHead>
                    <TableHead>Kartu</TableHead>
                    <TableHead>4 Digit</TableHead>
                    <TableHead className="text-right">Limit</TableHead>
                    <TableHead className="text-right">Utang</TableHead>
                    <TableHead>Error</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {cardsToReview?.map((card, index) => (
                    <TableRow key={index} className={!card._isValid ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                    <TableCell className="font-medium">{String(card["Bank Name"] || '')}</TableCell>
                    <TableCell>{String(card["Card Name"] || '')}</TableCell>
                    <TableCell>{String(card["Last 4 Digits"] || '')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(card["Credit Limit"] || 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(card["Current Debt"] || 0))}</TableCell>
                    <TableCell>
                        {!card._isValid && (
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{card._error}</p>
                            </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        )}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCardsToReview(null)} disabled={isImporting}>Batal</Button>
                <Button onClick={handleConfirmImport} disabled={isImporting || !cardsToReview?.some(c => c._isValid)}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Konfirmasi & Impor {isImporting ? "" : `(${cardsToReview?.filter(c => c._isValid).length || 0})`}
                </Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    </>
  );
}


export default function CardsPage() {
    return (
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CardsPageContent />
        </Suspense>
    )
}
