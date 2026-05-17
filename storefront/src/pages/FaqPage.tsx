import { useQuery } from '@tanstack/react-query';
import { fetchStorefrontFaqs } from '@/lib/graphql/storefront';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function FaqPage() {
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: fetchStorefrontFaqs,
  });

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
      <p className="text-muted-foreground mb-8">Everything you need to know about orders, shipping, and returns.</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : faqs.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No FAQs available yet. Check back soon.</p>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent>
                {faq.answer ? (
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                ) : (
                  <span className="text-muted-foreground">No answer provided.</span>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
