import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'pt-BR', label: 'Portugues BR', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'en', label: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
] as const;

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  // Get current language flag
  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted text-xl"
          aria-label="Change language"
        >
          {currentLang.flag}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[80px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`justify-center text-2xl cursor-pointer ${i18n.language === lang.code ? 'bg-accent' : ''}`}
          >
            {lang.flag}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
