import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation('landing');

  return (
    <footer className="bg-card border-t border-border py-16">
      <div className="container px-6 sm:px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
            <span className="font-semibold text-xl text-foreground">
              zurT
            </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t('footer.product')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">{t('footer.pricing')}</Link></li>
              <li><Link to="/features" className="hover:text-foreground transition-colors">{t('footer.features')}</Link></li>
              <li><Link to="/security" className="hover:text-foreground transition-colors">{t('footer.security')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t('footer.company')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">{t('footer.about')}</Link></li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">{t('footer.blog')}</Link></li>
              <li><Link to="/careers" className="hover:text-foreground transition-colors">{t('footer.careers')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t('footer.legal')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacyPolicy')}</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">{t('footer.termsOfService')}</Link></li>
              <li><Link to="/cookies" className="hover:text-foreground transition-colors">{t('footer.cookiePolicy')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>{t('footer.copyright')}</p>
          <p>{t('footer.madeWith')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
