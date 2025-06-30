"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { formatCurrency, cn } from "@/lib/utils";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, CheckCircle2, CircleSlash } from "lucide-react";
import type { Transaction, CreditCard } from "@/types";
import { TransactionForm, type TransactionFormValues } from "@/components/transactions/transaction-form";
import { useToast } from "@/hooks/use-toast";
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from '@/context/auth-context';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { data: transactions, loading: loadingTransactions } = useFirestoreCollection<Transaction>("transactions", user?.uid);
  const { data: cards, loading: loadingCards } = useFirestoreCollection<CreditCard>("cards", user?.uid);

  const [filterCard, setFilterCard] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const filteredTransactions = useMemo(() => {
    return [...transactions] // Create a mutable copy for sorting
      .filter(t => filterCard === 'all' || t.cardId === filterCard)
      .filter(t => filterStatus === 'all' || (t.category === 'Pembayaran' ? t.status === 'lunas' : t.status === filterStatus))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterCard, filterStatus]);

  const handleStatusChange = async (transactionId: string, isPaid: boolean) => {
    const transactionRef = doc(db, 'transactions', transactionId);
    try {
        await updateDoc(transactionRef, {
            status: isPaid ? 'lunas' : 'belum lunas'
        });
        toast({ title: "Status Diperbarui", description: "Status transaksi telah berhasil diperbarui." });
    } catch (error: any) {
        console.error("Error updating status: ", error);
        toast({ title: "Gagal Memperbarui", description: error.message || "Terjadi kesalahan saat memperbarui status.", variant: "destructive" });
    }
  };
  
  const getCardName = (cardId: string) => {
    return cards.find(c => c.id === cardId)?.cardName || 'Unknown Card';
  }

  const handleOpenForm = (transaction: Transaction | null = null) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedTransaction(null);
    setIsFormOpen(false);
  };

  const handleOpenDeleteAlert = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteAlertOpen(true);
  };

  const handleCloseDeleteAlert = () => {
    setSelectedTransaction(null);
    setIsDeleteAlertOpen(false);
  };

  const handleSubmit = async (values: TransactionFormValues) => {
    if (!user) {
        toast({ title: "Gagal", description: "Anda harus masuk untuk menyimpan transaksi.", variant: "destructive" });
        return;
    }
    
    const transactionData = {
        ...values,
        userId: user.uid,
        date: values.date.toISOString(),
    };
    try {
        if (selectedTransaction) {
            const transactionRef = doc(db, 'transactions', selectedTransaction.id);
            const { id, ...updateData } = { ...selectedTransaction, ...transactionData };
            await updateDoc(transactionRef, updateData as any);
            toast({ title: "Transaksi Diperbarui", description: "Data transaksi berhasil diperbarui." });
        } else {
            const newTransactionData: Omit<Transaction, 'id'> = { 
            status: 'belum lunas', 
            ...transactionData
            };
            await addDoc(collection(db, 'transactions'), newTransactionData);
            toast({ title: "Transaksi Ditambahkan", description: "Transaksi baru berhasil ditambahkan." });
        }
    } catch(error: any) {
        console.error("Error saving transaction: ", error);
        toast({ title: "Gagal Menyimpan", description: error.message || "Terjadi kesalahan saat menyimpan transaksi.", variant: "destructive" });
    }
    handleCloseForm();
  };

  const handleDelete = async () => {
    if (selectedTransaction) {
        try {
            await deleteDoc(doc(db, 'transactions', selectedTransaction.id));
            toast({ title: "Transaksi Dihapus", description: "Data transaksi berhasil dihapus.", variant: 'destructive' });
        } catch (error: any) {
            console.error("Error deleting transaction: ", error);
            toast({ title: "Gagal Menghapus", description: error.message || "Terjadi kesalahan saat menghapus transaksi.", variant: "destructive" });
        }
        handleCloseDeleteAlert();
    }
  };

  const isLoading = loadingCards || loadingTransactions;

  return (
    <>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riwayat Transaksi</h1>
          <p className="text-muted-foreground">Lihat dan kelola semua transaksi kartu kredit Anda.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Transaksi</CardTitle>
              <div className="flex gap-2">
                <Select value={filterCard} onValueChange={setFilterCard} disabled={isLoading}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter Kartu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kartu</SelectItem>
                    {cards.map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.cardName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus} disabled={isLoading}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="belum lunas">Belum Lunas</SelectItem>
                    <SelectItem value="lunas">Lunas</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => handleOpenForm()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Tambah
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {isLoading ? (
                  <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div>
              ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Kartu</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[50px] text-right">Aksi</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                        <TableCell>
                            {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(transaction.date))}
                        </TableCell>
                        <TableCell>{getCardName(transaction.cardId)}</TableCell>
                        <TableCell className="font-medium">
                            {transaction.installmentDetails ? (
                            <>
                                <span>{`Cicilan: ${formatCurrency(transaction.installmentDetails.monthlyInstallment)}/bln`}</span>
                                <div className="text-xs text-muted-foreground">
                                    {`Dari total ${formatCurrency(transaction.amount)} (${transaction.installmentDetails.tenor} bln)`}
                                </div>
                            </>
                            ) : (
                            transaction.description
                            )}
                        </TableCell>
                        <TableCell>
                            <Badge variant={transaction.category === 'Pembayaran' ? 'default' : 'secondary'}>{transaction.category}</Badge>
                        </TableCell>
                        <TableCell className={cn("text-right", transaction.category === 'Pembayaran' && 'text-green-600')}>
                            {transaction.category === 'Pembayaran' ? `+${formatCurrency(transaction.amount)}` : formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge variant={transaction.status === 'lunas' ? 'default' : 'destructive'} className={cn(transaction.status === 'lunas' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-destructive/10 text-destructive border-destructive/20', 'capitalize')}>
                            {transaction.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenForm(transaction)} disabled={transaction.category === 'Pembayaran' || !!transaction.installmentDetails}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Edit
                                    </DropdownMenuItem>
                                    {transaction.category !== 'Pembayaran' && (
                                        <DropdownMenuItem onClick={() => handleStatusChange(transaction.id, transaction.status !== 'lunas')}>
                                            {transaction.status === 'lunas' ? (
                                                <>
                                                    <CircleSlash className="mr-2 h-4 w-4"/>
                                                    <span>Tandai Belum Lunas</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="mr-2 h-4 w-4"/>
                                                    <span>Tandai Lunas</span>
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleOpenDeleteAlert(transaction)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        Hapus
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              )}
              {!isLoading && filteredTransactions.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg mt-4">
                      <h3 className="text-lg font-medium">Tidak ada transaksi</h3>
                      <p className="text-sm">Tidak ada transaksi yang cocok dengan filter Anda.</p>
                  </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTransaction ? "Edit Transaksi" : "Tambah Transaksi Baru"}</DialogTitle>
            <DialogDescription>
              {selectedTransaction ? "Perbarui detail transaksi Anda." : "Isi formulir di bawah untuk menambahkan transaksi baru."}
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
            cards={cards}
            defaultValues={selectedTransaction || undefined}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat diurungkan. Ini akan menghapus data transaksi secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteAlert}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
