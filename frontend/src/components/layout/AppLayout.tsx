import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Hide search and show date/time on all authenticated pages (customer, consultant, admin)
  // All routes starting with /app, /consultant, or /admin are authenticated pages
  const isAuthenticatedPage = location.pathname.startsWith('/app') || 
                               location.pathname.startsWith('/consultant') || 
                               location.pathname.startsWith('/admin');
  
  // Hide search box on all authenticated pages
  const hideSearch = isAuthenticatedPage;
  
  // Check if it's a customer panel page
  const isCustomerPage = location.pathname.startsWith('/app');

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col">
        <TopBar 
          showMenuButton 
          hideSearch={hideSearch}
          onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        
        <main className={`flex-1 py-4 px-4 ${isCustomerPage ? 'lg:py-4 lg:px-4 xl:py-6 xl:px-4' : 'lg:py-10 lg:px-10'}`}>
          <div className={isCustomerPage ? 'max-w-[95%] xl:max-w-[90%] 2xl:max-w-8xl mx-auto' : 'max-w-8xl mx-auto'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
