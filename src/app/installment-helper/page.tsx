"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { suggestInstallmentPlan, type SuggestInstallmentPlanOutput, type SuggestInstallmentPlanInput } from "@/ai/flows/suggest-installment-plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockCards } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Wand2 } from "lucide-react";

const formSchema = z.object({
  cardName: z.string().min(1, "Nama kartu harus diisi"),
  description: z.string().min(1, "Deskripsi transaksi harus diisi"),
  amount: z.coerce.number().min(100000, "Jumlah minimal Rp 100.000"),
});

type FormValues = z.infer<typeof formSchema>;

export default function InstallmentHelperPage() {
  const [suggestions, setSuggestions] = useState<SuggestInstallmentPlanOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cardName: "",
      description: "",
      amount: 1000000,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setSuggestions(null);
    setError(null);
    try {
      const input: SuggestInstallmentPlanInput = {
        ...values,
        transactionDate: new Date().toISOString().split('T')[0],
      };
      const result = await suggestInstallmentPlan(input);
      setSuggestions(result);
    } catch (e) {
      console.error(e);
      setError("Gagal mendapatkan saran. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saran Cicilan Bertenaga AI</h1>
        <p className="text-muted-foreground">
          Dapatkan rekomendasi rencana cicilan untuk transaksi Anda.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi</CardTitle>
          <CardDescription>
            Masukkan detail transaksi yang ingin Anda ubah menjadi cicilan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="cardName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pilih Kartu Kredit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kartu..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockCards.map(card => (
                          <SelectItem key={card.id} value={card.cardName}>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi Transaksi</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: Pembelian Laptop Baru" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Transaksi</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">Rp</span>
                        <Input type="number" placeholder="1000000" className="pl-8" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Dapatkan Saran Cicilan
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-center">{error}</p>}
      
      {suggestions && (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">Rekomendasi Rencana Cicilan</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((plan, index) => (
                <Card key={index} className="flex flex-col bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>{plan.tenor} Bulan</CardTitle>
                    <CardDescription>Suku Bunga: {plan.interestRate}% / tahun</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                    <div>
                        <p className="text-sm text-muted-foreground">Cicilan per Bulan</p>
                        <p className="text-xl font-semibold">{formatCurrency(plan.monthlyPayment)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                        <p className="font-medium">{formatCurrency(plan.totalPayment)}</p>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button className="w-full" variant={index === 0 ? "default" : "secondary"}>Pilih Paket Ini</Button>
                </CardFooter>
                </Card>
            ))}
            </div>
        </div>
      )}
    </div>
  );
}
