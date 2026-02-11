import { useTranslation } from 'react-i18next';
import { ptBR, enUS } from 'date-fns/locale';

export const useDateLocale = () => {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? enUS : ptBR;
};
