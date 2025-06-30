
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreditCard } from "@/types";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  bankName: z.string().min(2, "Nama bank minimal 2 karakter."),
  cardName: z.string().min(2, "Nama kartu minimal 2 karakter."),
  last4Digits: z.string().length(4, "Harus tepat 4 digit.").regex(/^\d{4}$/, "Harus berupa 4 digit angka."),
  creditLimit: z.coerce.number().min(0, "Limit kredit harus angka positif."),
  dueDate: z.coerce.number().min(1, "Tanggal jatuh tempo harus antara 1 dan 31.").max(31),
  interestRate: z.coerce.number().min(0, "Suku bunga harus angka positif."),
});

type CardFormValues = z.infer<typeof formSchema>;

interface CardFormProps {
  onSubmit: (values: CardFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<CreditCard>;
  isSubmitting?: boolean;
}

export function CardForm({ onSubmit, onCancel, defaultValues, isSubmitting }: CardFormProps) {
  const form = useForm<CardFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankName: defaultValues?.bankName || "",
      cardName: defaultValues?.cardName || "",
      last4Digits: defaultValues?.last4Digits || "",
      creditLimit: defaultValues?.creditLimit || 0,
      dueDate: defaultValues?.dueDate || 1,
      interestRate: defaultValues?.interestRate || 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Bank</FormLabel>
                <FormControl>
                  <Input placeholder="Contoh: Bank Pusat Asia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cardName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Kartu</FormLabel>
                <FormControl>
                  <Input placeholder="Contoh: BPA Platinum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
            control={form.control}
            name="last4Digits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>4 Digit Terakhir</FormLabel>
                <FormControl>
                  <Input placeholder="1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        <FormField
          control={form.control}
          name="creditLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limit Kredit (IDR)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="50000000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Jatuh Tempo</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="25" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="interestRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suku Bunga (% per bulan)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="2.5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
