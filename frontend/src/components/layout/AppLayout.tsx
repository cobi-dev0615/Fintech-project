import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";

const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  
  // Hide search and show date/time on admin pages
  const isAdminPage = location.pathname.startsWith('/admin');
  const hideSearch = isAdminPage;
  const showDateTime = isAdminPage;

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col pb-16 lg:pb-0">
        <TopBar showMenuButton hideSearch={hideSearch} showDateTime={showDateTime} />
        
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default AppLayout;
