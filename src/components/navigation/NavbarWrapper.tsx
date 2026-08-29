"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();
  
  // Do not render the main public navbar on the dashboard, 
  // as the dashboard has its own specialized header.
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  return <Navbar />;
}
