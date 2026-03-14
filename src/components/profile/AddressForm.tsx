import React, { useState, useEffect } from 'react';
import { MapPin, Check, X, Home, Briefcase, Map, Loader2 } from 'lucide-react';
import { cn } from '../../utils';

export interface AddressData {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  fullAddress: string;
  landmark?: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AddressFormProps {
  initialData?: AddressData | null;
  onSubmit: (data: AddressData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const DIVISIONS = ['ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'সিলেট', 'রংপুর', 'ময়মনসিংহ'];

export default function AddressForm({ initialData, onSubmit, onCancel, isSubmitting }: AddressFormProps) {
  const [formData, setFormData] = useState<AddressData>({
    label: initialData?.label || 'বাসা',
    fullName: initialData?.fullName || '',
    phone: initialData?.phone || '',
    division: initialData?.division || '',
    district: initialData?.district || '',
    area: initialData?.area || '',
    fullAddress: initialData?.fullAddress || '',
    landmark: initialData?.landmark || '',
    postalCode: initialData?.postalCode || '',
    isDefault: initialData?.isDefault || false,
    id: initialData?.id
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AddressData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        label: initialData.label || 'বাসা',
        fullName: initialData.fullName || '',
        phone: initialData.phone || '',
        division: initialData.division || '',
        district: initialData.district || '',
        area: initialData.area || '',
        fullAddress: initialData.fullAddress || '',
        landmark: initialData.landmark || '',
        postalCode: initialData.postalCode || '',
        isDefault: initialData.isDefault || false,
        id: initialData.id
      });
    }
  }, [initialData]);

  const validate = () => {
    const newErrors: Partial<Record<keyof AddressData, string>> = {};
    if (!(formData.fullName || '').trim()) newErrors.fullName = 'নাম আবশ্যক';
    
    const phoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
    if (!(formData.phone || '').trim()) {
      newErrors.phone = 'মোবাইল নাম্বার আবশ্যক';
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'সঠিক মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)';
    }

    if (!formData.division) newErrors.division = 'বিভাগ নির্বাচন করুন';
    if (!(formData.district || '').trim()) newErrors.district = 'জেলা আবশ্যক';
    if (!(formData.area || '').trim()) newErrors.area = 'উপজেলা/এলাকা আবশ্যক';
    
    if (!(formData.fullAddress || '').trim()) {
      newErrors.fullAddress = 'সম্পূর্ণ ঠিকানা আবশ্যক';
    } else if ((formData.fullAddress || '').trim().length < 10) {
      newErrors.fullAddress = 'ঠিকানা খুব ছোট, বিস্তারিত লিখুন';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">ঠিকানার ধরন</label>
        <div className="flex gap-2">
          {[
            { label: 'বাসা', icon: Home },
            { label: 'অফিস', icon: Briefcase },
            { label: 'অন্যান্য', icon: Map }
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setFormData({ ...formData, label: item.label })}
              className={cn(
                "flex-1 py-3 rounded-xl border flex flex-col items-center gap-1 transition-all",
                formData.label === item.label 
                  ? 'bg-primary/10 border-primary text-primary' 
                  : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">সম্পূর্ণ নাম *</label>
          <input
            type="text"
            placeholder="আপনার নাম"
            className={cn(
              "w-full p-3 bg-gray-50 rounded-xl outline-none border text-sm focus:ring-2 focus:ring-primary/20",
              errors.fullName ? "border-red-300 focus:border-red-500" : "border-gray-100"
            )}
            value={formData.fullName || ''}
            onChange={e => {
              setFormData({ ...formData, fullName: e.target.value });
              if (errors.fullName) setErrors({ ...errors, fullName: undefined });
            }}
          />
          {errors.fullName && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.fullName}</p>}
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">মোবাইল নাম্বার *</label>
          <input
            type="tel"
            placeholder="01XXXXXXXXX"
            className={cn(
              "w-full p-3 bg-gray-50 rounded-xl outline-none border text-sm focus:ring-2 focus:ring-primary/20",
              errors.phone ? "border-red-300 focus:border-red-500" : "border-gray-100"
            )}
            value={formData.phone || ''}
            onChange={e => {
              setFormData({ ...formData, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
          />
          {errors.phone && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">বিভাগ *</label>
          <select
            className={cn(
              "w-full p-3 bg-gray-50 rounded-xl outline-none border text-sm focus:ring-2 focus:ring-primary/20 appearance-none",
              errors.division ? "border-red-300 focus:border-red-500" : "border-gray-100"
            )}
            value={formData.division || ''}
            onChange={e => {
              setFormData({ ...formData, division: e.target.value });
              if (errors.division) setErrors({ ...errors, division: undefined });
            }}
          >
            <option value="">নির্বাচন করুন</option>
            {DIVISIONS.map(div => <option key={div} value={div}>{div}</option>)}
          </select>
          {errors.division && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.division}</p>}
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">জেলা *</label>
          <input
            type="text"
            placeholder="আপনার জেলা"
            className={cn(
              "w-full p-3 bg-gray-50 rounded-xl outline-none border text-sm focus:ring-2 focus:ring-primary/20",
              errors.district ? "border-red-300 focus:border-red-500" : "border-gray-100"
            )}
            value={formData.district || ''}
            onChange={e => {
              setFormData({ ...formData, district: e.target.value });
              if (errors.district) setErrors({ ...errors, district: undefined });
            }}
          />
          {errors.district && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.district}</p>}
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">উপজেলা / এলাকা *</label>
          <input
            type="text"
            placeholder="আপনার উপজেলা/এলাকা"
            className={cn(
              "w-full p-3 bg-gray-50 rounded-xl outline-none border text-sm focus:ring-2 focus:ring-primary/20",
              errors.area ? "border-red-300 focus:border-red-500" : "border-gray-100"
            )}
            value={formData.area || ''}
            onChange={e => {
              setFormData({ ...formData, area: e.target.value });
              if (errors.area) setErrors({ ...errors, area: undefined });
            }}
          />
          {errors.area && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.area}</p>}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">সম্পূর্ণ ঠিকানা *</label>
        <textarea
          placeholder="যেমন: বাড়ি নং-১০, রোড নং-৫, সেক্টর-৩"
          className={cn(
            "w-full p-3 bg-gray-50 rounded-xl outline-none border h-20 focus:ring-2 focus:ring-primary/20 text-sm",
            errors.fullAddress ? "border-red-300 focus:border-red-500" : "border-gray-100"
          )}
          value={formData.fullAddress || ''}
          onChange={e => {
            setFormData({ ...formData, fullAddress: e.target.value });
            if (errors.fullAddress) setErrors({ ...errors, fullAddress: undefined });
          }}
        />
        {errors.fullAddress && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.fullAddress}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">ল্যান্ডমার্ক (ঐচ্ছিক)</label>
          <input
            type="text"
            placeholder="নিকটস্থ পরিচিত স্থান"
            className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-100 text-sm focus:ring-2 focus:ring-primary/20"
            value={formData.landmark || ''}
            onChange={e => setFormData({ ...formData, landmark: e.target.value })}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">পোস্টাল কোড (ঐচ্ছিক)</label>
          <input
            type="text"
            placeholder="যেমন: ১২৩০"
            className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-100 text-sm focus:ring-2 focus:ring-primary/20"
            value={formData.postalCode || ''}
            onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer mt-2">
        <input
          type="checkbox"
          checked={formData.isDefault}
          onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-700">ডিফল্ট ঠিকানা হিসেবে সেট করুন</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
        >
          বাতিল
        </button>
        <button
          disabled={isSubmitting}
          type="button"
          onClick={handleSubmit}
          className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> অপেক্ষা করুন...</> : <><Check className="w-5 h-5" /> সেভ করুন</>}
        </button>
      </div>
    </div>
  );
}
