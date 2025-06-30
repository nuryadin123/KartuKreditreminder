
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type { CreditCard } from "@/types";
import { useState, useEffect } from "react";
import { suggestBankName } from "@/ai/flows/suggest-bank-name-flow";
import { suggestCardName } from "@/ai/flows/suggest-card-name-flow";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";


const formSchema = z.object({
  bankName: z.string().min(2, "Nama bank minimal 2 karakter."),
  cardName: z.string().min(2, "Nama kartu minimal 2 karakter."),
  last4Digits: z.string().length(4, "Harus tepat 4 digit.").regex(/^\d{4}$/, "Harus berupa 4 digit angka."),
  creditLimit: z.coerce.number().min(0, "Limit kredit harus angka positif."),
  billingDate: z.coerce.number().min(1, "Tanggal cetak tagihan harus antara 1 dan 31.").max(31),
  dueDate: z.coerce.number().min(1, "Tanggal jatuh tempo harus antara 1 dan 31.").max(31),
  interestRate: z.coerce.number().min(0, "Suku bunga harus angka positif."),
  limitIncreaseReminder: z.enum(['tidak', '3-bulan', '6-bulan']).optional().default('tidak'),
  lastLimitIncreaseDate: z.date().optional(),
});

export type CardFormValues = z.infer<typeof formSchema>;

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
      billingDate: defaultValues?.billingDate || 1,
      dueDate: defaultValues?.dueDate || 1,
      interestRate: defaultValues?.interestRate || 21,
      limitIncreaseReminder: defaultValues?.limitIncreaseReminder || 'tidak',
      lastLimitIncreaseDate: defaultValues?.lastLimitIncreaseDate ? new Date(defaultValues.lastLimitIncreaseDate) : undefined,
    },
  });

  const reminderType = form.watch("limitIncreaseReminder");

  const [bankSuggestions, setBankSuggestions] = useState<string[]>([]);
  const [isBankSuggesting, setIsBankSuggesting] = useState(false);
  const [isBankSuggestionPopoverOpen, setIsBankSuggestionPopoverOpen] = useState(false);
  const watchedBankName = form.watch("bankName");

  const [cardSuggestions, setCardSuggestions] = useState<string[]>([]);
  const [isCardSuggesting, setIsCardSuggesting] = useState(false);
  const [isCardSuggestionPopoverOpen, setIsCardSuggestionPopoverOpen] = useState(false);
  const watchedCardName = form.watch("cardName");

  useEffect(() => {
    if (watchedBankName.length < 2) {
        setBankSuggestions([]);
        return;
    }
    
    const handler = setTimeout(async () => {
        setIsBankSuggesting(true);
        try {
            const result = await suggestBankName({ query: watchedBankName });
            setBankSuggestions(result.suggestions);
        } catch (error) {
            console.error("Error fetching bank suggestions:", error);
            setBankSuggestions([]);
        } finally {
            setIsBankSuggesting(false);
        }
    }, 500);

    return () => clearTimeout(handler);
  }, [watchedBankName]);

  useEffect(() => {
    if (bankSuggestions.length > 0 && !isBankSuggesting) {
      setIsBankSuggestionPopoverOpen(true);
    } else {
      setIsBankSuggestionPopoverOpen(false);
    }
  }, [bankSuggestions, isBankSuggesting]);

  useEffect(() => {
    if (!watchedBankName) {
        setCardSuggestions([]);
        return;
    }
    
    const handler = setTimeout(async () => {
        setIsCardSuggesting(true);
        try {
            const result = await suggestCardName({ bankName: watchedBankName, query: watchedCardName });
            setCardSuggestions(result.suggestions);
        } catch (error) {
            console.error("Error fetching card suggestions:", error);
            setCardSuggestions([]);
        } finally {
            setIsCardSuggesting(false);
        }
    }, 500);

    return () => clearTimeout(handler);
  }, [watchedCardName, watchedBankName]);

  useEffect(() => {
    if (cardSuggestions.length > 0 && !isCardSuggesting) {
      setIsCardSuggestionPopoverOpen(true);
    } else {
      setIsCardSuggestionPopoverOpen(false);
    }
  }, [cardSuggestions, isCardSuggesting]);


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
                <Popover open={isBankSuggestionPopoverOpen} onOpenChange={setIsBankSuggestionPopoverOpen}>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <div className="relative">
                            <Input
                                placeholder="Ketik untuk mendapat saran AI"
                                {...field}
                                autoComplete="off"
                            />
                             {isBankSuggesting && <Loader2 className="animate-spin absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />}
                        </div>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1">
                        {bankSuggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className="p-2 rounded-sm hover:bg-accent cursor-pointer text-sm"
                            onClick={() => {
                                form.setValue("bankName", suggestion, { shouldValidate: true, shouldDirty: true });
                                setBankSuggestions([]); 
                            }}
                        >
                            {suggestion}
                        </div>
                        ))}
                    </PopoverContent>
                </Popover>
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
                <Popover open={isCardSuggestionPopoverOpen} onOpenChange={setIsCardSuggestionPopoverOpen}>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <div className="relative">
                            <Input
                                placeholder="Pilih bank dulu"
                                {...field}
                                autoComplete="off"
                                disabled={!watchedBankName}
                            />
                             {isCardSuggesting && <Loader2 className="animate-spin absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />}
                        </div>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1">
                        {cardSuggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className="p-2 rounded-sm hover:bg-accent cursor-pointer text-sm"
                            onClick={() => {
                                form.setValue("cardName", suggestion, { shouldValidate: true, shouldDirty: true });
                                setCardSuggestions([]); 
                            }}
                        >
                            {suggestion}
                        </div>
                        ))}
                    </PopoverContent>
                </Popover>
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
            name="billingDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Cetak Tagihan</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </div>
        <FormField
            control={form.control}
            name="interestRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suku Bunga (% per tahun)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="21" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        <FormField
            control={form.control}
            name="limitIncreaseReminder"
            render={({ field }) => (
            <FormItem className="space-y-3">
                <FormLabel>Pengingat Tambah Limit</FormLabel>
                <FormControl>
                <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                        <RadioGroupItem value="tidak" />
                    </FormControl>
                    <FormLabel className="font-normal">
                        Tidak Aktif
                    </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                        <RadioGroupItem value="3-bulan" />
                    </FormControl>
                    <FormLabel className="font-normal">
                        Setiap 3 Bulan
                    </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                        <RadioGroupItem value="6-bulan" />
                    </FormControl>
                    <FormLabel className="font-normal">
                        Setiap 6 Bulan
                    </FormLabel>
                    </FormItem>
                </RadioGroup>
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        {reminderType !== 'tidak' && (
             <FormField
                control={form.control}
                name="lastLimitIncreaseDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel className='mb-2'>Tanggal Terakhir Naik Limit</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "d MMMM yyyy")
                            ) : (
                                <span>Pilih tanggal</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
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
