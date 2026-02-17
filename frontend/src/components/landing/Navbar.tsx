import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('landing');

  const navLinks = [
    { href: "/", label: t('navbar.home') },
    { href: "/#contents", label: t('navbar.contents') },
    { href: "/#tools", label: t('navbar.tools') },
  ];

  // Handle smooth scrolling for hash links
  const handleNavClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Close mobile menu
    setIsOpen(false);

    // Extract path and hash
    const [path, hash] = href.split('#');

    // Navigate to the path first
    if (path !== location.pathname) {
      navigate(path);
      // Wait for navigation, then scroll to hash
      setTimeout(() => {
        if (hash) {
          const element = document.getElementById(hash);
          if (element) {
            // Account for fixed header height
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } else {
      // Already on the same page, just scroll to hash
      if (hash) {
        const element = document.getElementById(hash);
        if (element) {
          // Account for fixed header height
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Handle hash navigation on page load
  useEffect(() => {
    if (location.hash) {
      const hash = location.hash.substring(1); // Remove the '#'
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [location.hash]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg">
      <div className="container px-6 sm:px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-semibold text-xl text-foreground">
              zurT
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href.split('#')[0];
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(link.href, e)}
                  className={cn(
                    "text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher />
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/register">{t('navbar.createAccount')}</Link>
            </Button>
            <Button asChild variant="default" className="bg-primary text-primary-foreground">
              <Link to="/login">{t('navbar.login')}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </nav>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-fade-in bg-background rounded-xl">
            <div className="flex flex-col items-center gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-center cursor-pointer"
                  onClick={(e) => handleNavClick(link.href, e)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col items-center gap-2 pt-4 border-t border-gray-800 w-full">
                <div className="mb-2">
                  <LanguageSwitcher />
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="w-48 rounded-xl"
                >
                  <Link to="/login" onClick={() => setIsOpen(false)}>{t('navbar.signIn')}</Link>
                </Button>
                <Button
                  asChild
                  variant="hero"
                  className="w-48 rounded-xl"
                >
                  <Link to="/register" onClick={() => setIsOpen(false)}>{t('navbar.getStarted')}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
