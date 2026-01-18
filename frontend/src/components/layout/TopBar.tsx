import { useState, useEffect } from "react";
import { Bell, Search, Menu, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  hideSearch?: boolean;
  showDateTime?: boolean;
}

const TopBar = ({ onMenuClick, showMenuButton = false, hideSearch = false, showDateTime = false }: TopBarProps) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    if (!showDateTime) return;

    // Update every second
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [showDateTime]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/50 backdrop-blur-xl px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {!hideSearch && (
        <div className="hidden md:flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar transações, contas..."
            className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 w-64 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        )}
        {showDateTime && (
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{formatDate(currentDateTime)}</span>
              <span>{formatTime(currentDateTime)}</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <Avatar className="h-9 w-9 cursor-pointer border border-border">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
            JD
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default TopBar;
