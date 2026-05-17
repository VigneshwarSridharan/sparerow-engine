import { useQuery } from '@tanstack/react-query';
import { fetchStorefrontCmsPage } from '@/lib/graphql/storefront';
import { Skeleton } from '@/components/ui/skeleton';

export default function PrivacyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'privacy-policy'],
    queryFn: () => fetchStorefrontCmsPage('privacy-policy'),
  });

  return (
    <div className="container max-w-3xl py-10">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : data ? (
        <>
          <h1 className="text-3xl font-bold mb-6">{data.title}</h1>
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: data.body ?? '' }}
          />
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
          <p>This page is not yet available. Please check back soon.</p>
        </div>
      )}
    </div>
  );
}
