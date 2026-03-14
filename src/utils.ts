import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (price: number) => {
  if (price === undefined || price === null) return '৳০';
  return `৳${price.toLocaleString('bn-BD')}`;
};

export const BANGLA_NUMBERS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const toBanglaNumber = (n: number | string | undefined | null) => {
  if (n === undefined || n === null) return '';
  return n.toString().split('').map(char => {
    const num = parseInt(char);
    return isNaN(num) ? char : BANGLA_NUMBERS[num];
  }).join('');
};

export const formatDate = (date: any) => {
  if (!date) return 'অজানা তারিখ';
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('bn-BD', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return 'অজানা তারিখ';
  }
};
