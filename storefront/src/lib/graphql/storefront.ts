import { Brand, Model, Product } from '@/types';
import { graphqlRequest } from './client';
import { resolveProductImageUrl } from '@/lib/strapiAssets';

type BootstrapResponse = {
  storefrontCatalogBootstrap: {
    brands: Array<{ id: string; name: string; slug: string; productCount: number }>;
    models: Array<{
      id: string;
      name: string;
      slug: string;
      modelNumber: string;
      brandId: string;
      productCount: number;
    }>;
    categories: Array<{ id: string; name: string; slug: string; productCount: number }>;
    products: Array<{
      id: string;
      sku: string;
      name: string;
      description?: string;
      brandId: string;
      modelId: string;
      categoryName?: string;
      uiPrice: number;
      uiDiscountPrice: number;
      uiDiscountPercent: number;
      availableToSell: number;
      uiWarranty: string;
      uiRating: number;
      uiReviewCount: number;
      uiFeatured: boolean;
      uiBestSeller: boolean;
      uiNewArrival: boolean;
      primaryImageUrl?: string | null;
    }>;
    promoCodes: Array<{
      code: string;
      discountPercent: number;
      minOrderSubtotalInMinor: string;
      maxDiscountInMinor?: string | null;
    }>;
  };
};

type CreateOrderResponse = {
  storefrontCreateOrder: {
    id: string;
    totalInMinor: string;
    subtotalInMinor: string;
    shippingInMinor: string;
    promoCode?: string | null;
    promoDiscountInMinor?: string | null;
  };
};

export type StorefrontBootstrapData = {
  brands: Brand[];
  models: Model[];
  products: Product[];
  categories: Array<{ id: string; name: string; slug: string; productCount: number }>;
  partTypes: string[];
  promoCodes: Array<{
    code: string;
    discountPercent: number;
    minOrderSubtotalInMinor: number;
    maxDiscountInMinor?: number;
  }>;
};

const STOREFRONT_BOOTSTRAP_QUERY = `
  query StorefrontBootstrap {
    storefrontCatalogBootstrap {
      brands { id name slug productCount }
      models { id name slug modelNumber brandId productCount }
      categories { id name slug productCount }
      products {
        id
        sku
        name
        description
        brandId
        modelId
        categoryName
        uiPrice
        uiDiscountPrice
        uiDiscountPercent
        availableToSell
        uiWarranty
        uiRating
        uiReviewCount
        uiFeatured
        uiBestSeller
        uiNewArrival
        primaryImageUrl
      }
      promoCodes { code discountPercent minOrderSubtotalInMinor maxDiscountInMinor }
    }
  }
`;

const CREATE_ORDER_MUTATION = `
  mutation StorefrontCreateOrder($input: StorefrontCreateOrderInput!) {
    storefrontCreateOrder(input: $input) {
      id
      totalInMinor
      subtotalInMinor
      shippingInMinor
      promoCode
      promoDiscountInMinor
    }
  }
`;

export async function fetchStorefrontBootstrap(token?: string): Promise<StorefrontBootstrapData> {
  const data = await graphqlRequest<BootstrapResponse>(STOREFRONT_BOOTSTRAP_QUERY, {}, token);
  const bootstrap = data.storefrontCatalogBootstrap;

  const brands: Brand[] = bootstrap.brands.map((brand) => ({
    id: String(brand.id),
    name: brand.name,
    slug: brand.slug,
    productCount: brand.productCount,
    logo: '/placeholder.svg',
  }));

  const models: Model[] = bootstrap.models.map((model) => ({
    id: String(model.id),
    name: model.name,
    slug: model.slug,
    modelNumber: model.modelNumber,
    brandId: String(model.brandId),
    productCount: model.productCount,
    image: '/placeholder.svg',
  }));

  const products: Product[] = bootstrap.products.map((product) => ({
    id: String(product.id),
    name: product.name,
    brandId: String(product.brandId),
    modelId: String(product.modelId),
    partType: product.categoryName || 'Spare Part',
    price: product.uiPrice,
    discountPercent: product.uiDiscountPercent,
    discountPrice: product.uiDiscountPrice,
    sku: product.sku,
    inStock: product.availableToSell > 0,
    stockQty: product.availableToSell,
    image: resolveProductImageUrl(product.primaryImageUrl, product.categoryName || 'Other'),
    images: [],
    description: product.description || 'No description available.',
    warranty: product.uiWarranty,
    rating: product.uiRating,
    reviewCount: product.uiReviewCount,
    featured: product.uiFeatured,
    bestSeller: product.uiBestSeller,
    newArrival: product.uiNewArrival,
  }));

  const partTypes = Array.from(new Set(products.map((product) => product.partType))).sort((a, b) =>
    a.localeCompare(b)
  );

  return {
    brands,
    models,
    products,
    categories: bootstrap.categories.map((category) => ({
      id: String(category.id),
      name: category.name,
      slug: category.slug,
      productCount: category.productCount,
    })),
    partTypes,
    promoCodes: bootstrap.promoCodes.map((promo) => ({
      code: promo.code,
      discountPercent: promo.discountPercent,
      minOrderSubtotalInMinor: Number(promo.minOrderSubtotalInMinor || 0),
      maxDiscountInMinor:
        promo.maxDiscountInMinor != null ? Number(promo.maxDiscountInMinor) : undefined,
    })),
  };
}

export async function createStorefrontOrder(
  input: {
    lines: Array<{ sku: string; quantity: number }>;
    contactPhone: string;
    contactEmail: string;
    promoCode?: string;
    guestShipping: {
      customerName: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      countryCode?: string;
      phone: string;
    };
  },
  token?: string
) {
  const data = await graphqlRequest<CreateOrderResponse, { input: typeof input }>(
    CREATE_ORDER_MUTATION,
    { input },
    token
  );
  return data.storefrontCreateOrder;
}
