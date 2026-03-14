import React, { useState, useEffect } from 'react';
import { useTheme, ThemeSettings } from '../context/ThemeContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Save, RotateCcw, Upload, Loader2, Palette, Layout, Type, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ThemeSettingsPage() {
  const { theme, saveTheme, resetTheme } = useTheme();
  const [localTheme, setLocalTheme] = useState<ThemeSettings>(theme);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  const handleChange = (key: keyof ThemeSettings, value: any) => {
    setLocalTheme(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveTheme(localTheme);
      showToast('Theme saved successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to save theme.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset to default theme?')) {
      try {
        await resetTheme();
        showToast('Theme reset to default!', 'success');
      } catch (error) {
        console.error(error);
        showToast('Failed to reset theme.', 'error');
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `logos/navbar-logo-${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      handleChange('navbarLogoUrl', url);
      showToast('Logo uploaded!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to upload logo.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const renderColorInput = (label: string, key: keyof ThemeSettings) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={localTheme[key] as string}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-10 h-10 rounded cursor-pointer"
        />
        <input
          type="text"
          value={localTheme[key] as string}
          onChange={(e) => handleChange(key, e.target.value)}
          className="flex-1 px-2 py-1 text-xs border rounded"
        />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Theme & Design Settings</h2>
        <div className="flex gap-2">
          <button onClick={handleReset} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-2">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-xs font-medium text-white bg-primary rounded hover:bg-primary/90 flex items-center gap-2">
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded-xl shadow-sm border space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Palette className="w-4 h-4" /> Colors</h3>
          <div className="grid grid-cols-2 gap-4">
            {renderColorInput('Primary Color', 'primaryColor')}
            {renderColorInput('Secondary Color', 'secondaryColor')}
            {renderColorInput('Header Color', 'headerColor')}
            {renderColorInput('Header Text Color', 'headerTextColor')}
            {renderColorInput('Button Color', 'buttonColor')}
            {renderColorInput('Button Text Color', 'buttonTextColor')}
            {renderColorInput('Card Color', 'cardColor')}
            {renderColorInput('Card Text Color', 'cardTextColor')}
            {renderColorInput('Background Color', 'backgroundColor')}
            {renderColorInput('Section Background', 'sectionBackgroundColor')}
            {renderColorInput('Border Color', 'borderColor')}
            {renderColorInput('Title Color', 'titleColor')}
            {renderColorInput('Subtitle Color', 'subtitleColor')}
            {renderColorInput('Link Color', 'linkColor')}
            {renderColorInput('Icon Color', 'iconColor')}
            {renderColorInput('Table Header', 'tableHeaderColor')}
            {renderColorInput('Table Row', 'tableRowColor')}
            {renderColorInput('Input Background', 'inputBackgroundColor')}
            {renderColorInput('Input Text', 'inputTextColor')}
            {renderColorInput('Sidebar Color', 'sidebarColor')}
            {renderColorInput('Sidebar Text', 'sidebarTextColor')}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl shadow-sm border space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Layout className="w-4 h-4" /> Layout & Logo</h3>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Navbar Logo</label>
            <div className="flex items-center gap-4">
              {localTheme.navbarLogoUrl && <img src={localTheme.navbarLogoUrl} alt="Logo" className="w-16 h-16 object-contain border rounded" />}
              <label className="px-4 py-2 text-xs font-medium bg-gray-100 rounded cursor-pointer hover:bg-gray-200 flex items-center gap-2">
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload Logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Button Radius</label>
              <input type="text" value={localTheme.buttonRadius} onChange={(e) => handleChange('buttonRadius', e.target.value)} className="px-2 py-1 text-xs border rounded" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Card Radius</label>
              <input type="text" value={localTheme.cardRadius} onChange={(e) => handleChange('cardRadius', e.target.value)} className="px-2 py-1 text-xs border rounded" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={localTheme.shadow} onChange={(e) => handleChange('shadow', e.target.checked)} />
              <label className="text-xs font-medium text-gray-600">Enable Shadow</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
