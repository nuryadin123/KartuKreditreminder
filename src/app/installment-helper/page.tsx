
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getInstallmentPlan, type InstallmentPlanOutput } from "@/ai/flows/installment-plan-flow";
import type { CreditCard, Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, ReceiptText, PlusCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";

const formSchema = z.object({
  transactionAmount: z.coerce.number().min(100000, "Jumlah minimal Rp 100.000."),
  adminFeeBankPercentage: z.coerce.number().min(0, "Persentase tidak boleh negatif.").optional(),
  adminFeeMarketplacePercentage: z.coerce.number().min(0, "Persentase tidak boleh negatif.").optional(),
  cardId: z.string().optional(),
  interestRate: z.coerce.number({ required_error: "Suku bunga harus diisi." }).min(0, "Suku bunga tidak boleh negatif."),
  tenor: z.string({ required_error: "Tenor harus diisi." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function InstallmentHelperPage() {
  const { data: cards, loading: loadingCards } = useFirestoreCollection<CreditCard>("cards");
  const [plan, setPlan] = useState<InstallmentPlanOutput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionAmount: undefined,
      adminFeeBankPercentage: undefined,
      adminFeeMarketplacePercentage: undefined,
      cardId: "no-card",
      interestRate: undefined,
      tenor: "",
    },
  });

  const handleCardChange = (cardId: string) => {
    form.setValue("cardId", cardId, { shouldValidate: true });
    const selectedCard = cards.find(c => c.id === cardId);
    if (selectedCard) {
      form.setValue("interestRate", selectedCard.interestRate, { shouldValidate: true });
    } else {
       form.setValue("interestRate", undefined, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: FormValues) => {
    const selectedCard = cards.find(c => c.id === values.cardId);

    setIsSubmitting(true);
    setPlan(null);
    setError(null);

    const adminFeeBankAmount = values.adminFeeBankPercentage ? (values.transactionAmount * values.adminFeeBankPercentage) / 100 : undefined;
    const adminFeeMarketplaceAmount = values.adminFeeMarketplacePercentage ? (values.transactionAmount * values.adminFeeMarketplacePercentage) / 100 : undefined;

    try {
      const result = await getInstallmentPlan({
        transactionAmount: values.transactionAmount,
        interestRate: values.interestRate,
        tenor: Number(values.tenor),
        bankName: selectedCard?.bankName,
        adminFeeBank: adminFeeBankAmount,
        adminFeeMarketplace: adminFeeMarketplaceAmount,
      });
      setPlan(result);
    } catch (e) {
      console.error(e);
      setError("Gagal menghasilkan simulasi. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyInstallment = async () => {
    const formValues = form.getValues();
    if (!plan || !formValues.cardId || formValues.cardId === 'no-card') {
      toast({
        title: "Gagal Menerapkan Cicilan",
        description: "Harap pilih kartu dan jalankan simulasi terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    const adminFeeBankAmount = formValues.adminFeeBankPercentage ? (formValues.transactionAmount * formValues.adminFeeBankPercentage) / 100 : 0;
    const adminFeeMarketplaceAmount = formValues.adminFeeMarketplacePercentage ? (formValues.transactionAmount * formValues.adminFeeMarketplacePercentage) / 100 : 0;
    const totalPrincipal = (formValues.transactionAmount || 0) + adminFeeBankAmount + adminFeeMarketplaceAmount;

    const newTransaction: Omit<Transaction, 'id'> = {
      cardId: formValues.cardId,
      date: new Date().toISOString(),
      description: `Cicilan: Transaksi ${formatCurrency(formValues.transactionAmount)} (+ admin) selama ${formValues.tenor} bulan`,
      amount: totalPrincipal,
      category: 'Lainnya',
      status: 'belum lunas',
      installmentDetails: {
        monthlyInstallment: plan.monthlyInstallment,
        tenor: Number(formValues.tenor),
      },
    };

    try {
        await addDoc(collection(db, 'transactions'), newTransaction);
        toast({
            title: "Cicilan Berhasil Diterapkan",
            description: "Transaksi baru telah ditambahkan dan akan tersinkronisasi.",
        });
        setPlan(null); // Reset the view after applying
    } catch (error) {
        console.error("Error applying installment: ", error);
        toast({ title: "Gagal Menerapkan", description: "Terjadi kesalahan saat menerapkan cicilan.", variant: "destructive" });
    }
  };

  const selectedCardId = form.watch("cardId");


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asisten Cicilan AI</h1>
        <p className="text-muted-foreground">Simulasikan dan terapkan rencana cicilan untuk transaksi Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulir Simulasi</CardTitle>
          <CardDescription>Masukkan detail transaksi untuk melihat simulasi cicilan dari AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="transactionAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Transaksi (IDR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5000000" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="tenor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenor (Bulan)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tenor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[3, 6, 12, 18, 24].map(t => (
                            <SelectItem key={t} value={String(t)}>{t} bulan</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="adminFeeBankPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Bank (%) (Opsional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Contoh: 1.5" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="adminFeeMarketplacePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Marketplace (%) (Opsional)</FormLabel>
                       <FormControl>
                        <Input type="number" step="0.01" placeholder="Contoh: 0.5" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="cardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pilih Kartu (Opsional)</FormLabel>
                      <Select onValueChange={handleCardChange} value={field.value} disabled={loadingCards || cards.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCards ? "Memuat kartu..." : (cards.length > 0 ? "Pilih kartu untuk terapkan cicilan" : "Tidak ada kartu")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="no-card">Jangan gunakan kartu</SelectItem>
                          {cards.map(card => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.cardName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suku Bunga (% per tahun)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="21" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menghitung...
                    </>
                  ) : (
                    "Simulasikan"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isSubmitting && (
         <div className="flex flex-col items-center justify-center text-center gap-4 p-8 border-2 border-dashed rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-xl font-semibold">AI sedang bekerja...</h3>
            <p className="text-muted-foreground">Mohon tunggu, kami sedang menyiapkan simulasi cicilan terbaik untuk Anda.</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {plan && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Hasil Simulasi Cicilan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cicilan per Bulan</CardTitle>
                            <ReceiptText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(plan.monthlyInstallment)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bunga</CardTitle>
                            <ReceiptText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(plan.totalInterest)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Pembayaran</CardTitle>
                            <ReceiptText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(plan.totalPayment)}</div>
                        </CardContent>
                    </Card>
                </div>

                <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle>Saran dari AI</AlertTitle>
                    <AlertDescription>{plan.advice}</AlertDescription>
                </Alert>

                <div>
                    <h3 className="text-lg font-medium mb-2">Tabel Amortisasi</h3>
                    <div className="rounded-md border">
                      <Table>
                          <TableHeader>
                          <TableRow>
                              <TableHead>Bulan Ke</TableHead>
                              <TableHead className="text-right">Pokok</TableHead>
                              <TableHead className="text-right">Bunga</TableHead>
                              <TableHead className="text-right">Sisa Utang</TableHead>
                          </TableRow>
                          </TableHeader>
                          <TableBody>
                          {plan.schedule.map((item) => (
                              <TableRow key={item.month}>
                              <TableCell>{item.month}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.principalPayment)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.interestPayment)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.remainingBalance)}</TableCell>
                              </TableRow>
                          ))}
                          </TableBody>
                      </Table>
                    </div>
                </div>
            </CardContent>
            {selectedCardId && selectedCardId !== 'no-card' && (
                <CardFooter>
                    <Button onClick={handleApplyInstallment} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Terapkan & Sinkronkan dengan Kartu
                    </Button>
                </CardFooter>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
