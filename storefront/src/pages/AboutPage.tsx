import { Mail, MapPin, Phone, Shield, Truck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const highlights = [
  { icon: Shield, title: 'Trusted Quality', description: 'Every part is quality checked and backed by warranty support.' },
  { icon: Truck, title: 'Fast Delivery', description: 'Pan-India shipping with real-time order tracking and reliable packaging.' },
  { icon: Users, title: 'Expert Support', description: 'Dedicated support team for compatibility and installation guidance.' },
];

export default function AboutPage() {
  return (
    <div className="container py-10">
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About Sparerow</h1>
        <p className="mt-4 text-muted-foreground text-lg">
          Sparerow is a modern storefront focused on genuine mobile spare parts, dependable fulfilment, and customer-first support.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-4 mt-10">
        {highlights.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /> {title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-6 mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> support@sparerow.in</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +91 98765 43210</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Bengaluru, Karnataka, India</p>
            <Button className="mt-2">Start a Support Request</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Monday - Saturday: 9:00 AM - 7:00 PM</p>
            <p>Sunday: 10:00 AM - 4:00 PM</p>
            <p>Response SLA: within 4 business hours</p>
            <p className="pt-2 text-foreground">Need bulk orders? Email us for wholesale pricing.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
