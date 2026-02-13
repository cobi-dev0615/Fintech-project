import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'pt-BR', label: 'Portugues BR', short: 'BR', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'en', label: 'English', short: 'US', flag: '\u{1F1FA}\u{1F1F8}' },
] as const;

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  // Get current language flag
  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Change language"
        >
          <span className="text-base leading-none">{currentLang.flag}</span>
          <span className="text-xs font-medium">{currentLang.short}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`gap-2 cursor-pointer ${i18n.language === lang.code ? 'bg-accent' : ''}`}
          >
            <span className="text-base">{lang.flag}</span>
            <span className="text-sm">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
