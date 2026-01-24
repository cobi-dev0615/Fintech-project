import { useState, useEffect } from "react";
import { Search, Menu, Clock, UserCircle, LogOut, Users, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { userApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  hideSearch?: boolean;
  showDateTime?: boolean;
}

const TopBar = ({ onMenuClick, showMenuButton = false, hideSearch = false, showDateTime = false }: TopBarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Fetch user counts
  const { data: userCounts } = useQuery({
    queryKey: ['user-counts'],
    queryFn: () => userApi.getUserCounts(),
    refetchInterval: 60000, // Refetch every minute
    enabled: !!user,
  });

  useEffect(() => {
    if (!showDateTime) return;

    // Update every second
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [showDateTime]);

  const formatDate = (date: Date) => {
    return format(date, 'yy.MM.dd');
  };

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm:ss');
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
          <div className="hidden md:flex items-center gap-3 text-muted-foreground">
            <div className="p-2 bg-muted/30 rounded-lg border border-border/50">
              <Clock className="h-4 w-4 text-success animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60 leading-none mb-1">
                {formatDate(currentDateTime)}
              </span>
              <span className="font-digital text-xl leading-none text-success tracking-widest drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                {formatTime(currentDateTime)}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {userCounts && (
          <div className="hidden sm:flex items-center gap-4 px-3 py-1 bg-muted/50 rounded-full border border-border/50 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-muted-foreground" title="Total de usuários">
              <Users className="h-3.5 w-3.5" />
              <span>{userCounts.totalUsers}</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5 text-success" title="Usuários online">
              <Globe className="h-3.5 w-3.5 animate-pulse" />
              <span>{userCounts.onlineUsers} online</span>
            </div>
          </div>
        )}
        <NotificationDropdown />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-9 w-9 cursor-pointer border border-border">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
