import { Shield, Truck, RotateCcw, Headphones, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="bg-foreground text-background mt-16">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">SpareHub</h3>
            <p className="text-sm opacity-70">Your trusted marketplace for genuine mobile spare parts. Quality parts at the best prices with fast delivery.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li><button className="hover:opacity-100 transition-opacity" onClick={() => navigate('/')}>Home</button></li>
              <li><button className="hover:opacity-100 transition-opacity" onClick={() => navigate('/products')}>Shop Products</button></li>
              <li><button className="hover:opacity-100 transition-opacity" onClick={() => navigate('/wishlist')}>Wishlist</button></li>
              <li><button className="hover:opacity-100 transition-opacity" onClick={() => navigate('/about')}>Contact Us</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Customer Service</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li>Track Order</li>
              <li><button className="hover:opacity-100 transition-opacity" onClick={() => navigate('/faq')}>FAQ</button></li>
              <li><button className="hover:opacity-100 transition-opacity" onClick={() => navigate('/terms')}>Terms &amp; Conditions</button></li>
              <li><button className="hover:opacity-100 transition-opacity" onClick={() => navigate('/privacy')}>Privacy Policy</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li>support@sparehub.in</li>
              <li>+91 98765 43210</li>
              <li>Mon-Sat: 9AM - 7PM</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-background/20 mt-8 pt-8 text-center text-sm opacity-50 flex flex-wrap justify-center gap-4">
          <span>© 2026 SpareHub. All rights reserved.</span>
          <button className="hover:opacity-100 transition-opacity underline" onClick={() => navigate('/terms')}>Terms &amp; Conditions</button>
          <button className="hover:opacity-100 transition-opacity underline" onClick={() => navigate('/privacy')}>Privacy Policy</button>
        </div>
      </div>
    </footer>
  );
}

export function TrustBadges() {
  const badges = [
    { icon: Shield, label: 'Genuine Parts', desc: '100% authentic spare parts' },
    { icon: Truck, label: 'Fast Delivery', desc: 'Free shipping above ₹2,000' },
    { icon: RotateCcw, label: 'Easy Returns', desc: '7-day return policy' },
    { icon: Headphones, label: '24/7 Support', desc: 'Expert assistance' },
  ];

  return (
    <section className="py-12 bg-muted/30">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold text-sm">{label}</h4>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const reviews = [
    { name: 'Rahul K.', text: 'Got an original iPhone 12 battery at a great price. Fast delivery and genuine product!', rating: 5 },
    { name: 'Priya M.', text: 'Best place for Samsung spare parts. The display folder quality was excellent.', rating: 5 },
    { name: 'Amit S.', text: 'Ordered multiple Xiaomi parts. All genuine and well-packaged. Highly recommended!', rating: 4 },
  ];

  return (
    <section className="py-12">
      <div className="container">
        <h2 className="text-2xl font-bold text-center mb-8">What Our Customers Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <div key={i} className="bg-card rounded-xl border p-6">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4">"{review.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {review.name.charAt(0)}
                </div>
                <span className="text-sm font-medium">{review.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
