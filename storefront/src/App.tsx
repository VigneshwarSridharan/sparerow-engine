import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { RecentlyViewedProvider } from "@/contexts/RecentlyViewedContext";
import { StorefrontDataProvider } from "@/contexts/StorefrontDataContext";
import HomePage from "./pages/HomePage.tsx";
import ProductListingPage from "./pages/ProductListingPage.tsx";
import ProductDetailsPage from "./pages/ProductDetailsPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import WishlistPage from "./pages/WishlistPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import { StorefrontLayout } from "./layouts/StorefrontLayout.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StorefrontDataProvider>
        <CartProvider>
          <WishlistProvider>
            <RecentlyViewedProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<StorefrontLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="products" element={<ProductListingPage />} />
                    <Route path="products/:productId" element={<ProductDetailsPage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="wishlist" element={<WishlistPage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </RecentlyViewedProvider>
          </WishlistProvider>
        </CartProvider>
      </StorefrontDataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
