import { useState, useEffect } from "react";
import { Search, Menu, UserCircle, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  hideSearch?: boolean;
}

const TopBar = ({ onMenuClick, showMenuButton = false, hideSearch = false }: TopBarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Get abbreviated name (First name or First + Last Initial)
  const getAbbreviatedName = () => {
    if (!user?.full_name) return '';
    const names = user.full_name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0]} ${names[names.length - 1][0]}.`;
    }
    return names[0];
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    const names = user.full_name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.full_name[0].toUpperCase();
  };

  // Get settings path based on user role
  const getSettingsPath = () => {
    if (!user) return '/app/settings';
    
    switch (user.role) {
      case 'consultant':
        return '/consultant/settings';
      case 'admin':
        return '/admin/settings';
      default:
        return '/app/settings';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-card/50 backdrop-blur-xl px-4 lg:px-6">
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
      </div>
      
      <div className="flex items-center gap-3">
        <NotificationDropdown />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center gap-2 px-4 py-2 hover:bg-primary/90 rounded-full transition-all bg-primary text-primary-foreground shadow-sm shadow-primary/20 group">
                <User className="h-4 w-4" />
                <span className="text-xs font-bold tracking-tight">{getAbbreviatedName()}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">{user.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(getSettingsPath())}>
                <UserCircle className="h-4 w-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default TopBar;
