import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type NavbarContextType = {
  isNavbarVisible: boolean;
  hideNavbar: () => void;
  showNavbar: () => void;
};

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export const useNavbar = (): NavbarContextType => {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error('useNavbar must be used within a NavbarProvider');
  }
  return context;
};

type NavbarProviderProps = {
  children: ReactNode;
};

export const NavbarProvider: React.FC<NavbarProviderProps> = ({ children }) => {
  const [isNavbarVisible, setIsNavbarVisible] = useState<boolean>(true);

  const hideNavbar = () => setIsNavbarVisible(false);
  const showNavbar = () => setIsNavbarVisible(true);

  return (
    <NavbarContext.Provider value={{ isNavbarVisible, hideNavbar, showNavbar }}>
      {children}
    </NavbarContext.Provider>
  );
};
