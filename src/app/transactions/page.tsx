
"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { mockCards, mockTransactions as initialTransactions } from "@/lib/mock-data";
import { formatCurrency, cn } from "@/lib/utils";
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import type { Transaction, CreditCard } from "@/types";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useToast } from "@/hooks/use-toast";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [filterCard, setFilterCard] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => filterCard === 'all' || t.cardId === filterCard)
      .filter(t => filterStatus === 'all' || t.status === filterStatus)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterCard, filterStatus]);

  const handleStatusChange = (transactionId: string, checked: boolean | 'indeterminate') => {
    setTransactions(prev =>
      prev.map(t =>
        t.id === transactionId ? { ...t, status: checked ? 'lunas' : 'belum lunas' } : t
      )
    );
  };
  
  const getCardName = (cardId: string) => {
    return mockCards.find(c => c.id === cardId)?.cardName || 'Unknown Card';
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

  const handleSubmit = (values: Omit<Transaction, "id" | "status"> & {date: Date}) => {
    const transactionData = {
        ...values,
        date: values.date.toISOString(),
    }
    if (selectedTransaction) {
      // Update
      setTransactions(transactions.map(t => t.id === selectedTransaction.id ? { ...selectedTransaction, ...transactionData } : t));
      toast({ title: "Transaksi Diperbarui", description: "Data transaksi berhasil diperbarui." });
    } else {
      // Create
      const newTransaction: Transaction = { 
          id: `txn-${Date.now()}`,
          status: 'belum lunas', 
          ...transactionData
        };
      setTransactions([newTransaction, ...transactions]);
      toast({ title: "Transaksi Ditambahkan", description: "Transaksi baru berhasil ditambahkan." });
    }
    handleCloseForm();
  };

  const handleDelete = () => {
    if (selectedTransaction) {
        setTransactions(transactions.filter(t => t.id !== selectedTransaction.id));
        toast({ title: "Transaksi Dihapus", description: "Data transaksi berhasil dihapus.", variant: 'destructive' });
        handleCloseDeleteAlert();
    }
  };


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
                <Select value={filterCard} onValueChange={setFilterCard}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter Kartu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kartu</SelectItem>
                    {mockCards.map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.cardName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
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
                  Tambah Transaksi
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Lunas</TableHead>
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
                        <Checkbox
                          checked={transaction.status === 'lunas'}
                          onCheckedChange={(checked) => handleStatusChange(transaction.id, checked)}
                          aria-label={`Mark ${transaction.description} as paid`}
                        />
                      </TableCell>
                      <TableCell>
                        {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(transaction.date))}
                      </TableCell>
                      <TableCell>{getCardName(transaction.cardId)}</TableCell>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell>
                          <Badge variant="secondary">{transaction.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(transaction.amount)}</TableCell>
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
                                  <DropdownMenuItem onClick={() => handleOpenForm(transaction)}>
                                      <Edit className="mr-2 h-4 w-4"/>
                                      Edit
                                  </DropdownMenuItem>
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
              {filteredTransactions.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
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
            cards={mockCards}
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
