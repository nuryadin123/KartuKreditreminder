export interface CreditCard {
  id: string;
  bankName: string;
  cardName: string;
  creditLimit: number;
  billingDate: number; // day of month
  dueDate: number; // day of month
  interestRate: number;
  last4Digits: string;
  limitIncreaseReminder?: '3-bulan' | '6-bulan' | 'tidak';
  lastLimitIncreaseDate?: string; // ISO date string
}

export interface Transaction {
  id:string;
  cardId: string;
  date: string; // ISO date string
  description: string;
  amount: number;
  category: 'Belanja' | 'Makanan' | 'Transportasi' | 'Hiburan' | 'Lainnya' | 'Pembayaran';
  status: 'lunas' | 'belum lunas';
}
