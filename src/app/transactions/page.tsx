"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockCards, mockTransactions } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import type { Transaction, CreditCard } from "@/types";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [filterCard, setFilterCard] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  return (
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
               <Button>
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
                      <Badge variant={transaction.status === 'lunas' ? 'default' : 'destructive'} className={transaction.status === 'lunas' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredTransactions.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    Tidak ada transaksi yang cocok dengan filter Anda.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
