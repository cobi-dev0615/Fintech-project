import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FlagBR = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className}>
    <rect width="512" height="512" rx="64" fill="#6DA544" />
    <polygon points="256,100 462,256 256,412 50,256" fill="#FFDA44" />
    <circle cx="256" cy="256" r="90" fill="#0052B4" />
    <path
      d="M186,230c-2,8-3,17-3,26a73,73 0 0 0 1,13c40-6 83-3 120,9a73,73 0 0 0-6-35c-34-10-74-14-112-13z"
      fill="#F0F0F0"
    />
  </svg>
);

const FlagUS = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className}>
    <rect width="512" height="512" rx="64" fill="#F0F0F0" />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <rect key={i} y={i * 78.77} width="512" height={39.38} fill="#D80027" />
    ))}
    <rect width="256" height="275.69" fill="#0052B4" />
    {[
      [48, 40], [96, 40], [144, 40], [192, 40],
      [72, 72], [120, 72], [168, 72],
      [48, 104], [96, 104], [144, 104], [192, 104],
      [72, 136], [120, 136], [168, 136],
      [48, 168], [96, 168], [144, 168], [192, 168],
      [72, 200], [120, 200], [168, 200],
      [48, 232], [96, 232], [144, 232], [192, 232],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="8" fill="#F0F0F0" />
    ))}
  </svg>
);

const languages = [
  { code: 'pt-BR', label: 'Portugues BR', short: 'BR', Flag: FlagBR },
  { code: 'en', label: 'English', short: 'US', Flag: FlagUS },
] as const;

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus-visible:outline-none"
          aria-label="Change language"
        >
          <currentLang.Flag className="h-5 w-5 rounded-sm shrink-0" />
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
            <lang.Flag className="h-5 w-5 rounded-sm shrink-0" />
            <span className="text-sm">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
