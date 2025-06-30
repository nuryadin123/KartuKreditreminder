
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getInstallmentPlan, type InstallmentPlanOutput } from "@/ai/flows/installment-plan-flow";
import type { CreditCard } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, ReceiptText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
  transactionAmount: z.coerce.number().min(100000, "Jumlah minimal Rp 100.000."),
  cardId: z.string().optional(),
  interestRate: z.coerce.number({ required_error: "Suku bunga harus diisi." }).min(0, "Suku bunga tidak boleh negatif."),
  tenor: z.string({ required_error: "Tenor harus diisi." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function InstallmentHelperPage() {
  const [cards] = useLocalStorage<CreditCard[]>("kredit-track-cards", []);
  const [plan, setPlan] = useState<InstallmentPlanOutput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionAmount: undefined,
      cardId: "",
      interestRate: undefined,
      tenor: "",
    },
  });

  const handleCardChange = (cardId: string) => {
    form.setValue("cardId", cardId, { shouldValidate: true });
    const selectedCard = cards.find(c => c.id === cardId);
    if (selectedCard) {
      form.setValue("interestRate", selectedCard.interestRate * 12, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: FormValues) => {
    const selectedCard = cards.find(c => c.id === values.cardId);

    setIsSubmitting(true);
    setPlan(null);
    setError(null);

    try {
      const result = await getInstallmentPlan({
        transactionAmount: values.transactionAmount,
        interestRate: values.interestRate,
        tenor: Number(values.tenor),
        bankName: selectedCard?.bankName,
      });
      setPlan(result);
    } catch (e) {
      console.error(e);
      setError("Gagal menghasilkan simulasi. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asisten Cicilan AI</h1>
        <p className="text-muted-foreground">Simulasikan rencana cicilan untuk transaksi Anda.</p>
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
                  name="cardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pilih Kartu (Opsional)</FormLabel>
                      <Select onValueChange={handleCardChange} value={field.value} disabled={cards.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={cards.length > 0 ? "Pilih kartu untuk isi bunga otomatis" : "Tidak ada kartu"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
          </Card>
        </div>
      )}
    </div>
  );
}
