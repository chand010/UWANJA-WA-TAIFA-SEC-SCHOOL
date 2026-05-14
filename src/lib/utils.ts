import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTanzanianCurrency(amount: number) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
  }).format(amount);
}

export const ACADEMIC_TERMS = [1, 2, 3];
export const FORMS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'];
export const GENDERS = ['Male', 'Female'];
export const FEE_CATEGORIES = ['Tuition', 'Uniform', 'Books', 'Transport', 'Other'];
export const PAYMENT_METHODS = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'HaloPesa', 'Bank', 'Cash'];
