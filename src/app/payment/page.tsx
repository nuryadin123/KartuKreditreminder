'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import type { CreditCard, Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useFirestoreCollection } from '@/hooks/use-firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formSchema = z.object({
  amount: z.coerce.number().min(1, 'Jumlah pembayaran harus lebih dari 0.'),
});

type PaymentFormValues = z.infer<typeof formSchema>;

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardId = searchParams.get('cardId');
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [card, setCard] = useState<CreditCard | null>(null);
  const [loadingCard, setLoadingCard] = useState(true);
  const { data: transactions, loading: loadingTransactions } = useFirestoreCollection<Transaction>('transactions', user?.uid);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  useEffect(() => {
    if (!cardId || !user) {
        setLoadingCard(false);
        return;
    }

    const fetchCard = async () => {
        setLoadingCard(true);
        try {
            const cardRef = doc(db, 'cards', cardId);
            const cardSnap = await getDoc(cardRef);
            if (cardSnap.exists() && cardSnap.data().userId === user.uid) {
                setCard({ id: cardSnap.id, ...cardSnap.data() } as CreditCard);
            } else {
                toast({ title: 'Kartu tidak ditemukan', variant: 'destructive' });
                router.push('/cards');
            }
        } catch (error) {
            toast({ title: 'Gagal memuat kartu', variant: 'destructive' });
            router.push('/cards');
        } finally {
            setLoadingCard(false);
        }
    };
    fetchCard();
  }, [cardId, user, router, toast]);

  const { totalDebt, totalMonthlyInstallment } = useMemo(() => {
    if (!card || loadingTransactions) return { totalDebt: 0, totalMonthlyInstallment: 0 };
    
    const cardSpending = transactions
        .filter(t => t.cardId === card.id && t.category !== 'Pembayaran')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const cardPayments = transactions
        .filter(t => t.cardId === card.id && t.category === 'Pembayaran')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const debt = cardSpending - cardPayments;

    const activeInstallments = transactions.filter(
      (t) => t.cardId === card.id && (t.installmentDetails || t.description.startsWith("Cicilan:")) && t.status === 'belum lunas'
    );
    const monthlyInstallment = activeInstallments.reduce((acc, t) => acc + (t.installmentDetails?.monthlyInstallment || 0), 0);

    return { totalDebt: debt, totalMonthlyInstallment: monthlyInstallment };
  }, [card, transactions, loadingTransactions]);

  const paymentTransactions = useMemo(() => {
    if (!card) return [];
    return transactions
      .filter((t) => t.cardId === card.id && t.category === 'Pembayaran')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [card, transactions]);


  const onSubmit = async (values: PaymentFormValues) => {
    if (!card || !user) {
        toast({ title: 'Gagal', description: 'Kartu atau pengguna tidak valid.', variant: 'destructive' });
        return;
    }
    try {
        const newPayment: Omit<Transaction, 'id'> = {
            userId: user.uid,
            cardId: card.id,
            date: new Date().toISOString(),
            description: 'Pembayaran Kartu Kredit',
            amount: values.amount,
            category: 'Pembayaran',
            status: 'lunas',
        };
        await addDoc(collection(db, 'transactions'), newPayment);
        toast({ title: 'Pembayaran Berhasil', description: `Pembayaran sebesar ${formatCurrency(values.amount)} telah dicatat.` });
        form.reset();
    } catch (error: any) {
        toast({ title: 'Gagal Membayar', description: error.message || 'Terjadi kesalahan.', variant: 'destructive' });
    }
  };

  const isLoading = loadingCard || loadingTransactions;

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!card) {
    return (
        <div className="text-center py-10">
            <p className="text-muted-foreground">Kartu tidak ditemukan atau Anda tidak memiliki akses.</p>
            <Button onClick={() => router.push('/cards')} className="mt-4">Kembali ke Daftar Kartu</Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lakukan Pembayaran</h1>
          <p className="text-muted-foreground">
            Catat pembayaran untuk kartu {card.cardName} ({card.bankName}).
          </p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto w-full">
        <CardHeader>
          <CardTitle>Detail Pembayaran</CardTitle>
          <CardDescription>
            Total utang saat ini adalah {formatCurrency(totalDebt)}. Masukkan jumlah yang ingin Anda bayar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {totalMonthlyInstallment > 0 && (
                  <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Pengingat Cicilan Aktif</AlertTitle>
                      <AlertDescription>
                          Kartu ini memiliki total cicilan bulanan sebesar{" "}
                          <strong>{formatCurrency(totalMonthlyInstallment)}</strong>. 
                          Pastikan pembayaran Anda sudah mencakup jumlah ini beserta tagihan lainnya.
                      </AlertDescription>
                  </Alert>
              )}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Pembayaran (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="500000" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/cards')}>
                    Batal
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Bayar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="max-w-2xl mx-auto w-full">
        <CardHeader>
          <CardTitle>Riwayat Pembayaran</CardTitle>
          <CardDescription>
            Berikut adalah daftar pembayaran yang telah dicatat untuk kartu ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-y-auto">
            {paymentTransactions.length > 0 ? (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paymentTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                        <TableCell>
                            {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(transaction.date))}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                            +{formatCurrency(transaction.amount)}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium">Tidak Ada Riwayat</h3>
                    <p className="text-sm">Belum ada pembayaran yang tercatat untuk kartu ini.</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PaymentPageContent />
        </Suspense>
    )
}
