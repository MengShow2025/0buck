import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, CheckCircle2, Edit2, Trash2, ChevronDown, Check } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { addressApi } from '../../../services/api';

const STATES: Record<string, string[]> = {
  US: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
  UK: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  CA: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Northwest Territories', 'Nunavut', 'Yukon'],
  AU: ['New South Wales', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia', 'Australian Capital Territory', 'Northern Territory'],
  EU: ['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Sweden', 'Austria', 'Denmark', 'Finland', 'Ireland', 'Portugal', 'Greece', 'Czech Republic', 'Hungary', 'Poland', 'Slovakia', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania', 'Cyprus', 'Luxembourg', 'Malta']
};

const EMPTY_FORM = {
  name: '',
  phone: '',
  country: 'US',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  isDefault: false
};

interface FloatingSelectProps {
  value: string;
  options: { label: string; value: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const FloatingSelect: React.FC<FloatingSelectProps> = ({ value, options, placeholder, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 px-4 rounded-2xl bg-[#F2F2F7] dark:bg-white/8 text-gray-900 dark:text-gray-100 text-[15px] outline-none border border-transparent focus:border-[var(--wa-teal)] transition-all flex items-center justify-between ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10'}`}
      >
        <span className={!value ? 'text-gray-400' : ''}>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white dark:bg-[#2C2C2E] border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl z-[100] max-h-[240px] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-4 py-3.5 text-[15px] font-bold cursor-pointer transition-colors flex items-center justify-between ${value === opt.value ? 'bg-[var(--wa-teal)]/10 text-[var(--wa-teal)]' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-4 h-4" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AddressDrawer: React.FC = () => {
  const { t } = usePreferenceContext();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const countries = [
    { label: t('address.country_us'), value: 'US' },
    { label: t('address.country_uk'), value: 'UK' },
    { label: t('address.country_ca'), value: 'CA' },
    { label: t('address.country_au'), value: 'AU' },
    { label: t('address.country_eu'), value: 'EU' },
    { label: t('address.country_other'), value: 'Other' }
  ];

  const stateOptions = (STATES[form.country] || []).map(s => ({ label: s, value: s }));

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response = await addressApi.list();
        setAddresses(Array.isArray(response.data?.addresses) ? response.data.addresses : []);
      } catch {
        setAddresses([]);
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, []);

  const handleFieldChange = (field: keyof typeof EMPTY_FORM, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'country') {
        next.state = ''; // Reset state when country changes
      }
      return next;
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSaveAddress = async () => {
    if (!form.name || !form.phone || !form.address1 || !form.city || !form.state || !form.zip) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        country: form.country,
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        zip: form.zip,
        isDefault: form.isDefault,
      };

      const response = editingId
        ? await addressApi.update(editingId, payload)
        : await addressApi.create(payload);

      setAddresses(Array.isArray(response.data?.addresses) ? response.data.addresses : []);
      resetForm();
    } catch {
      // Keep current form values so user can retry.
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    resetForm();
  };

  const handleEditAddress = (addr: any) => {
    setEditingId(String(addr.id));
    setForm({
      name: addr.name || '',
      phone: addr.phone || '',
      country: addr.country || 'US',
      address1: addr.address1 || '',
      address2: addr.address2 || '',
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      isDefault: !!addr.isDefault,
    });
    setIsAdding(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const response = await addressApi.remove(addressId);
      setAddresses(Array.isArray(response.data?.addresses) ? response.data.addresses : []);
    } catch {
      // Keep current list when deletion fails.
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await addressApi.setDefault(addressId);
      setAddresses(Array.isArray(response.data?.addresses) ? response.data.addresses : []);
    } catch {
      // Keep current list when request fails.
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {isAdding ? (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] p-6 shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
            <div className="mb-2">
              <div className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">
                {t('address.add_desc')}
              </div>
            </div>

            <div className="relative">
              <FloatingSelect
                value={form.country}
                options={countries}
                placeholder={t('address.country_select')}
                onChange={(v) => handleFieldChange('country', v)}
              />
            </div>

            <input
              value={form.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder={t('address.placeholder_name')}
              className="w-full h-12 px-4 rounded-2xl bg-[#F2F2F7] dark:bg-white/8 text-gray-900 dark:text-gray-100 text-[15px] outline-none border border-transparent focus:border-[var(--wa-teal)]"
            />
            <input
              value={form.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder={t('address.placeholder_phone')}
              className="w-full h-12 px-4 rounded-2xl bg-[#F2F2F7] dark:bg-white/8 text-gray-900 dark:text-gray-100 text-[15px] outline-none border border-transparent focus:border-[var(--wa-teal)]"
            />
            <input
              value={form.address1}
              onChange={(e) => handleFieldChange('address1', e.target.value)}
              placeholder={t('address.placeholder_address1')}
              className="w-full h-12 px-4 rounded-2xl bg-[#F2F2F7] dark:bg-white/8 text-gray-900 dark:text-gray-100 text-[15px] outline-none border border-transparent focus:border-[var(--wa-teal)]"
            />
            <input
              value={form.address2}
              onChange={(e) => handleFieldChange('address2', e.target.value)}
              placeholder={t('address.placeholder_address2')}
              className="w-full h-12 px-4 rounded-2xl bg-[#F2F2F7] dark:bg-white/8 text-gray-900 dark:text-gray-100 text-[15px] outline-none border border-transparent focus:border-[var(--wa-teal)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                placeholder={t('address.placeholder_city')}
                className="w-full h-12 px-4 rounded-2xl bg-[#F2F2F7] dark:bg-white/8 text-gray-900 dark:text-gray-100 text-[15px] outline-none border border-transparent focus:border-[var(--wa-teal)]"
              />
              <FloatingSelect
                value={form.state}
                options={stateOptions}
                placeholder={t('address.placeholder_state')}
                onChange={(v) => handleFieldChange('state', v)}
                disabled={stateOptions.length === 0}
              />
            </div>
            <input
              value={form.zip}
              onChange={(e) => handleFieldChange('zip', e.target.value)}
              placeholder={t('address.placeholder_zip')}
              className="w-full h-12 px-4 rounded-2xl bg-[#F2F2F7] dark:bg-white/8 text-gray-900 dark:text-gray-100 text-[15px] outline-none border border-transparent focus:border-[var(--wa-teal)]"
            />

            <label className="flex items-center gap-3 text-[14px] font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => handleFieldChange('isDefault', e.target.checked)}
                className="accent-[var(--wa-teal)]"
              />
              {t('address.set_default')}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCancelAdd}
              className="h-12 rounded-2xl bg-gray-100 dark:bg-white/8 text-gray-700 dark:text-gray-300 font-semibold active:scale-95 transition-transform"
              >
                {t('address.cancel')}
              </button>
              <button
                onClick={handleSaveAddress}
                disabled={saving}
              className="h-12 rounded-2xl text-white font-semibold active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
              >
                {saving ? t('common.loading') : t('address.save')}
              </button>
            </div>
          </div>
        ) : (
          loading ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-6 text-center text-[13px] font-semibold text-gray-400 shadow-sm border border-gray-100 dark:border-white/5">
              {t('common.loading')}
            </div>
          ) : addresses.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-8 text-center shadow-sm border border-gray-100 dark:border-white/5">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-[16px] font-black text-gray-900 dark:text-white">No saved addresses</div>
              <div className="text-[12px] text-gray-400 mt-1">Add your first delivery address to continue checkout with real data.</div>
            </div>
          ) : addresses.map((addr) => (
            <div
              key={addr.id}
            className={`bg-white dark:bg-[#1C1C1E] rounded-[22px] p-4 shadow-sm border ${addr.isDefault ? 'border-[var(--wa-teal)]/50' : 'border-gray-100 dark:border-white/5'} relative overflow-hidden`}
            >
              {addr.isDefault && (
                <div className="absolute top-0 right-0 bg-[var(--wa-teal)] text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                  {t('address.default_badge')}
                </div>
              )}

              <div className="flex items-start gap-3 mt-3">
                  <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${addr.isDefault ? 'bg-orange-50 dark:bg-orange-500/10 text-[var(--wa-teal)]' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {addr.name} <span className="text-[13px] font-normal text-gray-500">{addr.phone}</span>
                  </div>
                  <div className="text-[13px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {addr.address1}{addr.address2 ? `, ${addr.address2}` : ''}<br />
                    {addr.city}, {addr.state} {addr.zip}
                  </div>

                  <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
                    <button
                      onClick={() => handleEditAddress(addr)}
                      className="flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> {t('address.edit')}
                    </button>
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(String(addr.id))}
                        className="flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t('address.set_default_btn')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(String(addr.id))}
                      className="flex items-center gap-1 text-[12px] font-semibold text-red-500 hover:text-red-600 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t('address.delete')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Action */}
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 p-4 pb-8 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setIsAdding(true)}
          className="w-full h-14 rounded-2xl text-white font-semibold text-[16px] active:scale-95 transition-transform flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' }}
        >
          <Plus className="w-5 h-5" /> {t('address.add_new_btn')}
        </button>
      </div>
    </div>
  );
};
