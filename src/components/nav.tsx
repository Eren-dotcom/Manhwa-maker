import { createContext, useContext } from 'react';

export const NavCtx = createContext<(route: string) => void>(() => {});
export const useNavigate = () => useContext(NavCtx);
