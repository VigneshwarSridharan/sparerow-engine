import { Brand, Model, Product } from '@/types';
import { graphqlRequest } from './client';
import { resolveProductImageUrl, resolveBrandLogoUrl } from '@/lib/strapiAssets';
import { getBrandLogo } from '@/lib/brandLogos';

type BootstrapResponse = {
  storefrontCatalogBootstrap: {
    brands: Array<{ id: string; name: string; slug: string; productCount: number; logoUrl: string | null }>;
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
      imageUrls: string[];
      variants: Array<{
        id: string;
        sku: string;
        attributes: string;
        priceInMinor: string;
        quantityOnHand: number;
        availableToSell: number;
        imageUrl?: string | null;
      }>;
    }>;
    promoCodes: Array<{
      code: string;
      discountPercent: number;
      minOrderSubtotalInMinor: string;
      maxDiscountInMinor?: string | null;
    }>;
    defaultTaxRatePercent: number;
    originStateCode: string;
  };
};

type CreateOrderResponse = {
  storefrontCreateOrder: {
    paymentContinuationSecret: string;
    order: {
      id: string;
      totalInMinor: string;
      subtotalInMinor: string;
      taxInMinor: string;
      taxRatePercent: number;
      shippingInMinor: string;
      promoCode?: string | null;
      promoDiscountInMinor?: string | null;
    };
  };
};

type PrepareRazorpayResponse = {
  storefrontPrepareRazorpayPayment: {
    razorpayOrderId: string;
    amountInMinor: string;
    amount: number;
    currency: string;
    keyId: string;
    strapiOrderId: string;
  };
};

type VerifyRazorpayResponse = {
  storefrontVerifyRazorpayPayment: {
    id: string;
    status: string;
  };
};

export type StorefrontCreatedOrder = CreateOrderResponse['storefrontCreateOrder'];
export type StorefrontCreatedOrderData = StorefrontCreatedOrder['order'];

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
  defaultTaxRatePercent: number;
  originStateCode: string;
};

const STOREFRONT_BOOTSTRAP_QUERY = `
  query StorefrontBootstrap {
    storefrontCatalogBootstrap {
      brands { id name slug productCount logoUrl }
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
        imageUrls
        variants {
          id sku attributes priceInMinor quantityOnHand availableToSell imageUrl
        }
      }
      promoCodes { code discountPercent minOrderSubtotalInMinor maxDiscountInMinor }
      defaultTaxRatePercent
      originStateCode
    }
  }
`;

const CREATE_ORDER_MUTATION = `
  mutation StorefrontCreateOrder($token: String, $input: StorefrontCreateOrderInput!) {
    storefrontCreateOrder(token: $token, input: $input) {
      paymentContinuationSecret
      order {
        id
        totalInMinor
        subtotalInMinor
        taxInMinor
        taxRatePercent
        shippingInMinor
        promoCode
        promoDiscountInMinor
      }
    }
  }
`;

const PREPARE_RAZORPAY_MUTATION = `
  mutation StorefrontPrepareRazorpay($orderId: ID!, $paymentContinuationSecret: String!) {
    storefrontPrepareRazorpayPayment(orderId: $orderId, paymentContinuationSecret: $paymentContinuationSecret) {
      razorpayOrderId
      amountInMinor
      amount
      currency
      keyId
      strapiOrderId
    }
  }
`;

const VERIFY_RAZORPAY_MUTATION = `
  mutation StorefrontVerifyRazorpay($input: StorefrontVerifyRazorpayPaymentInput!) {
    storefrontVerifyRazorpayPayment(input: $input) {
      id
      status
    }
  }
`;

type GraphQLProductNode = {
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
  imageUrls: string[];
  variants?: Array<{
    id: string;
    sku: string;
    attributes: string;
    priceInMinor: string;
    quantityOnHand: number;
    availableToSell: number;
    imageUrl?: string | null;
  }>;
};

function mapGraphQLProduct(product: GraphQLProductNode): Product {
  return {
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
    images: product.imageUrls ?? [],
    description: product.description || 'No description available.',
    warranty: product.uiWarranty,
    rating: product.uiRating,
    reviewCount: product.uiReviewCount,
    featured: product.uiFeatured,
    bestSeller: product.uiBestSeller,
    newArrival: product.uiNewArrival,
    variants: (product.variants ?? []).map((v) => {
      let attrs: Record<string, string> = {};
      try { attrs = JSON.parse(v.attributes || '{}'); } catch { /* ignore */ }
      const priceMinor = Number(v.priceInMinor || '0');
      return {
        id: String(v.id),
        sku: v.sku,
        attributes: attrs,
        priceInMinor: v.priceInMinor,
        price: Math.round(priceMinor / 100),
        quantityOnHand: v.quantityOnHand,
        availableToSell: v.availableToSell,
        inStock: v.availableToSell > 0,
        imageUrl: v.imageUrl ?? null,
      };
    }),
  };
}

export async function fetchStorefrontBootstrap(token?: string): Promise<StorefrontBootstrapData> {
  const data = await graphqlRequest<BootstrapResponse>(STOREFRONT_BOOTSTRAP_QUERY, {}, token);
  const bootstrap = data.storefrontCatalogBootstrap;

  const brands: Brand[] = bootstrap.brands.map((brand) => ({
    id: String(brand.id),
    name: brand.name,
    slug: brand.slug,
    productCount: brand.productCount,
    logo: resolveBrandLogoUrl(brand.logoUrl) ?? getBrandLogo(brand.slug) ?? '/placeholder.svg',
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

  const products: Product[] = bootstrap.products.map(mapGraphQLProduct);

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
    defaultTaxRatePercent: bootstrap.defaultTaxRatePercent ?? 0,
    originStateCode: bootstrap.originStateCode ?? '',
  };
}

// ——— Lightweight, scoped queries for Homepage + Smart Part Finder ———
// Unlike fetchStorefrontBootstrap above, these never load the full product catalog.

const PRODUCT_CARD_FIELDS = `
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
  imageUrls
`;

const HOME_FILTERS_QUERY = `
  query StorefrontHomeFilters {
    storefrontHomeFilters {
      brands { id name slug productCount logoUrl }
      categories { id name slug productCount }
    }
  }
`;

const PRODUCT_SECTIONS_QUERY = `
  query StorefrontProductSections($limit: Int) {
    storefrontProductSections(limit: $limit) {
      featured { ${PRODUCT_CARD_FIELDS} }
      bestSellers { ${PRODUCT_CARD_FIELDS} }
      newArrivals { ${PRODUCT_CARD_FIELDS} }
    }
  }
`;

const MODELS_BY_BRAND_QUERY = `
  query StorefrontModelsByBrand($brandSlug: String!) {
    storefrontModelsByBrand(brandSlug: $brandSlug) {
      id name slug modelNumber brandId brandSlug productCount
    }
  }
`;

const PRODUCTS_BY_FILTER_QUERY = `
  query StorefrontProductsByFilter($filter: StorefrontCatalogFilterInput) {
    storefrontProducts(filter: $filter) {
      ${PRODUCT_CARD_FIELDS}
    }
  }
`;

export type HomeFilterCategory = { id: string; name: string; slug: string; productCount: number };

type HomeFiltersResponse = {
  storefrontHomeFilters: {
    brands: Array<{ id: string; name: string; slug: string; productCount: number; logoUrl: string | null }>;
    categories: Array<{ id: string; name: string; slug: string; productCount: number }>;
  };
};

export async function fetchStorefrontHomeFilters(): Promise<{
  brands: Brand[];
  categories: HomeFilterCategory[];
}> {
  const data = await graphqlRequest<HomeFiltersResponse>(HOME_FILTERS_QUERY);
  return {
    brands: data.storefrontHomeFilters.brands.map((brand) => ({
      id: String(brand.id),
      name: brand.name,
      slug: brand.slug,
      productCount: brand.productCount,
      logo: resolveBrandLogoUrl(brand.logoUrl) ?? getBrandLogo(brand.slug) ?? '/placeholder.svg',
    })),
    categories: data.storefrontHomeFilters.categories.map((category) => ({
      id: String(category.id),
      name: category.name,
      slug: category.slug,
      productCount: category.productCount,
    })),
  };
}

type ProductSectionsResponse = {
  storefrontProductSections: {
    featured: GraphQLProductNode[];
    bestSellers: GraphQLProductNode[];
    newArrivals: GraphQLProductNode[];
  };
};

export async function fetchStorefrontProductSections(limit = 8): Promise<{
  featured: Product[];
  bestSellers: Product[];
  newArrivals: Product[];
}> {
  const data = await graphqlRequest<ProductSectionsResponse, { limit: number }>(PRODUCT_SECTIONS_QUERY, {
    limit,
  });
  return {
    featured: data.storefrontProductSections.featured.map(mapGraphQLProduct),
    bestSellers: data.storefrontProductSections.bestSellers.map(mapGraphQLProduct),
    newArrivals: data.storefrontProductSections.newArrivals.map(mapGraphQLProduct),
  };
}

type ModelsByBrandResponse = {
  storefrontModelsByBrand: Array<{
    id: string;
    name: string;
    slug: string;
    modelNumber: string;
    brandId: string;
    productCount: number;
  }>;
};

export async function fetchModelsByBrand(brandSlug: string): Promise<Model[]> {
  const data = await graphqlRequest<ModelsByBrandResponse, { brandSlug: string }>(MODELS_BY_BRAND_QUERY, {
    brandSlug,
  });
  return data.storefrontModelsByBrand.map((model) => ({
    id: String(model.id),
    name: model.name,
    slug: model.slug,
    modelNumber: model.modelNumber,
    brandId: String(model.brandId),
    productCount: model.productCount,
    image: '/placeholder.svg',
  }));
}

export type StorefrontProductFilter = {
  brandSlug?: string;
  modelSlug?: string;
  categorySlug?: string;
  search?: string;
  inStockOnly?: boolean;
};

type ProductsByFilterResponse = { storefrontProducts: GraphQLProductNode[] };

export async function fetchStorefrontProducts(filter: StorefrontProductFilter): Promise<Product[]> {
  const data = await graphqlRequest<ProductsByFilterResponse, { filter: StorefrontProductFilter }>(
    PRODUCTS_BY_FILTER_QUERY,
    { filter }
  );
  return data.storefrontProducts.map(mapGraphQLProduct);
}

export async function createStorefrontOrder(
  input: {
    lines: Array<{ sku: string; quantity: number; variantSku?: string }>;
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
  const data = await graphqlRequest<CreateOrderResponse, { token?: string; input: typeof input }>(
    CREATE_ORDER_MUTATION,
    { token, input }
  );
  return data.storefrontCreateOrder;
}

export async function prepareStorefrontRazorpayPayment(orderId: string, paymentContinuationSecret: string) {
  const data = await graphqlRequest<PrepareRazorpayResponse, { orderId: string; paymentContinuationSecret: string }>(
    PREPARE_RAZORPAY_MUTATION,
    { orderId, paymentContinuationSecret }
  );
  return data.storefrontPrepareRazorpayPayment;
}

export async function verifyStorefrontRazorpayPayment(input: {
  orderId: string;
  paymentContinuationSecret: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const data = await graphqlRequest<VerifyRazorpayResponse, { input: typeof input }>(VERIFY_RAZORPAY_MUTATION, {
    input,
  });
  return data.storefrontVerifyRazorpayPayment;
}

// ——— Customer account (GraphQL) ———

const CUSTOMER_TOKEN_KEY = 'sparehub_customer_token';

export function getStoredCustomerToken(): string | null {
  try {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function persistCustomerToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export type StorefrontCustomer = {
  id: string;
  email: string | null;
  phone: string | null;
};

export type StorefrontAddress = {
  id: string;
  customerName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  phone: string;
};

export type StorefrontShipment = {
  id: string;
  carrier: string;
  status: string;
  trackingNumber: string | null;
  carrierShipmentRef: string | null;
  carrierStatusLabel: string | null;
  lastSyncedAt: string | null;
};

export type StorefrontOrderLine = {
  id: string;
  skuSnapshot: string;
  nameSnapshot: string;
  unitPriceInMinor: string;
  quantity: number;
  lineTotalInMinor: string;
};

export type StorefrontOrderSummary = {
  id: string;
  createdAt: string | null;
  status: string;
  currency: string;
  subtotalInMinor: string;
  taxInMinor: string;
  taxRatePercent: number;
  shippingInMinor: string;
  totalInMinor: string;
  promoCode: string | null;
  promoDiscountInMinor: string | null;
  contactEmail: string;
  contactPhone: string;
  shippingRecipientName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountryCode: string;
  shippingPhone: string;
  lineItems: StorefrontOrderLine[];
  shipments: StorefrontShipment[];
};

const SESSION_QUERY = `
  query StorefrontSession($token: String) {
    storefrontSession(token: $token) {
      authenticated
      customer {
        id
        email
        phone
      }
    }
  }
`;

const LOGIN_MUTATION = `
  mutation StorefrontLogin($input: StorefrontAuthInput!) {
    storefrontLogin(input: $input) {
      token
      customer {
        id
        email
        phone
      }
    }
  }
`;

const REGISTER_MUTATION = `
  mutation StorefrontRegister($input: StorefrontAuthInput!) {
    storefrontRegister(input: $input) {
      token
      customer {
        id
        email
        phone
      }
    }
  }
`;

const ORDER_DETAIL_FIELDS = `
  id
  createdAt
  status
  currency
  subtotalInMinor
  taxInMinor
  taxRatePercent
  shippingInMinor
  totalInMinor
  promoCode
  promoDiscountInMinor
  contactEmail
  contactPhone
  shippingRecipientName
  shippingLine1
  shippingLine2
  shippingCity
  shippingState
  shippingPostalCode
  shippingCountryCode
  shippingPhone
  lineItems {
    id
    skuSnapshot
    nameSnapshot
    unitPriceInMinor
    quantity
    lineTotalInMinor
  }
  shipments {
    id
    carrier
    status
    trackingNumber
    carrierShipmentRef
    carrierStatusLabel
    lastSyncedAt
  }
`;

const ORDERS_QUERY = `
  query StorefrontOrders($token: String!) {
    storefrontOrders(token: $token) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

const ORDER_QUERY = `
  query StorefrontOneOrder($token: String!, $id: ID!) {
    storefrontOrder(id: $id, token: $token) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

const ADDRESSES_QUERY = `
  query StorefrontAddresses($token: String!) {
    storefrontAddresses(token: $token) {
      id
      customerName
      line1
      line2
      city
      state
      postalCode
      countryCode
      phone
    }
  }
`;

const CREATE_ADDRESS_MUTATION = `
  mutation StorefrontCreateAddress($token: String!, $input: StorefrontAddressInput!) {
    storefrontCreateAddress(token: $token, input: $input) {
      id
      customerName
      line1
      line2
      city
      state
      postalCode
      countryCode
      phone
    }
  }
`;

const UPDATE_ADDRESS_MUTATION = `
  mutation StorefrontUpdateAddress($token: String!, $id: ID!, $input: StorefrontAddressInput!) {
    storefrontUpdateAddress(token: $token, id: $id, input: $input) {
      id
      customerName
      line1
      line2
      city
      state
      postalCode
      countryCode
      phone
    }
  }
`;

const DELETE_ADDRESS_MUTATION = `
  mutation StorefrontDeleteAddress($token: String!, $id: ID!) {
    storefrontDeleteAddress(token: $token, id: $id) {
      ok
    }
  }
`;

type SessionResponse = {
  storefrontSession: {
    authenticated: boolean;
    customer: StorefrontCustomer | null;
  };
};

type AuthPayloadResponse = {
  storefrontLogin?: { token: string; customer: StorefrontCustomer };
  storefrontRegister?: { token: string; customer: StorefrontCustomer };
};

type OrdersResponse = { storefrontOrders: StorefrontOrderSummary[] };
type OrderResponse = { storefrontOrder: StorefrontOrderSummary | null };
type AddressesResponse = { storefrontAddresses: StorefrontAddress[] };

export async function fetchStorefrontSession(token?: string | null): Promise<SessionResponse['storefrontSession']> {
  const data = await graphqlRequest<SessionResponse, { token?: string | null }>(SESSION_QUERY, {
    token: token ?? null,
  });
  return data.storefrontSession;
}

export async function loginStorefront(input: {
  email?: string;
  phone?: string;
  password: string;
}): Promise<{ token: string; customer: StorefrontCustomer }> {
  const data = await graphqlRequest<AuthPayloadResponse, { input: typeof input }>(LOGIN_MUTATION, { input });
  const payload = data.storefrontLogin;
  if (!payload) throw new Error('Login failed');
  return payload;
}

export async function registerStorefront(input: {
  email?: string;
  phone?: string;
  password: string;
}): Promise<{ token: string; customer: StorefrontCustomer }> {
  const data = await graphqlRequest<AuthPayloadResponse, { input: typeof input }>(REGISTER_MUTATION, { input });
  const payload = data.storefrontRegister;
  if (!payload) throw new Error('Registration failed');
  return payload;
}

const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($email: String!) {
    storefrontRequestPasswordReset(email: $email) {
      ok
    }
  }
`;

const RESET_PASSWORD_MUTATION = `
  mutation ResetPassword($token: String!, $newPassword: String!) {
    storefrontResetPassword(token: $token, newPassword: $newPassword) {
      ok
    }
  }
`;

export async function requestPasswordReset(email: string): Promise<void> {
  await graphqlRequest<{ storefrontRequestPasswordReset: { ok: boolean } }, { email: string }>(
    REQUEST_PASSWORD_RESET_MUTATION,
    { email }
  );
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await graphqlRequest<
    { storefrontResetPassword: { ok: boolean } },
    { token: string; newPassword: string }
  >(RESET_PASSWORD_MUTATION, { token, newPassword });
}

export async function fetchStorefrontOrders(token: string): Promise<StorefrontOrderSummary[]> {
  const data = await graphqlRequest<OrdersResponse, { token: string }>(ORDERS_QUERY, { token });
  return data.storefrontOrders;
}

export async function fetchStorefrontOrder(token: string, orderId: string): Promise<StorefrontOrderSummary | null> {
  const data = await graphqlRequest<OrderResponse, { token: string; id: string }>(ORDER_QUERY, {
    token,
    id: orderId,
  });
  return data.storefrontOrder;
}

export async function fetchStorefrontAddresses(token: string): Promise<StorefrontAddress[]> {
  const data = await graphqlRequest<AddressesResponse, { token: string }>(ADDRESSES_QUERY, { token });
  return data.storefrontAddresses;
}

export async function createStorefrontAddress(
  token: string,
  input: Omit<StorefrontAddress, 'id'>
): Promise<StorefrontAddress> {
  const body = {
    ...input,
    countryCode: input.countryCode || 'IN',
  };
  const data = await graphqlRequest<
    { storefrontCreateAddress: StorefrontAddress },
    { token: string; input: typeof body }
  >(CREATE_ADDRESS_MUTATION, { token, input: body });
  return data.storefrontCreateAddress;
}

export async function updateStorefrontAddress(
  token: string,
  id: string,
  input: Partial<Omit<StorefrontAddress, 'id'>>
): Promise<StorefrontAddress> {
  const data = await graphqlRequest<
    { storefrontUpdateAddress: StorefrontAddress },
    { token: string; id: string; input: typeof input }
  >(UPDATE_ADDRESS_MUTATION, { token, id, input });
  return data.storefrontUpdateAddress;
}

export async function deleteStorefrontAddress(token: string, id: string): Promise<void> {
  await graphqlRequest<{ storefrontDeleteAddress: { ok: boolean } }, { token: string; id: string }>(
    DELETE_ADDRESS_MUTATION,
    { token, id }
  );
}

const CMS_PAGE_QUERY = `
  query StorefrontCmsPage($slug: String!) {
    storefrontCmsPage(slug: $slug) {
      slug
      title
      body
    }
  }
`;

const FAQS_QUERY = `
  query StorefrontFaqs {
    storefrontFaqs {
      id
      question
      answer
      sortOrder
    }
  }
`;

export type StorefrontCmsPage = { slug: string; title: string; body: string | null };
export type StorefrontFaq = { id: string; question: string; answer: string | null; sortOrder: number };

export async function fetchStorefrontCmsPage(slug: string): Promise<StorefrontCmsPage | null> {
  const data = await graphqlRequest<{ storefrontCmsPage: StorefrontCmsPage | null }, { slug: string }>(
    CMS_PAGE_QUERY,
    { slug }
  );
  return data.storefrontCmsPage;
}

export async function fetchStorefrontFaqs(): Promise<StorefrontFaq[]> {
  const data = await graphqlRequest<{ storefrontFaqs: StorefrontFaq[] }>(FAQS_QUERY);
  return data.storefrontFaqs;
}

export interface StorefrontReview {
  id: string;
  rating: number;
  title: string;
  body?: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface StorefrontProductReviewsPayload {
  reviews: StorefrontReview[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

const PRODUCT_REVIEWS_QUERY = `
  query ProductReviews($sku: String!, $page: Int) {
    storefrontProductReviews(sku: $sku, page: $page) {
      reviews {
        id
        rating
        title
        body
        verifiedPurchase
        createdAt
      }
      total
      page
      pageSize
      pageCount
    }
  }
`;

const CREATE_REVIEW_MUTATION = `
  mutation CreateReview($token: String, $input: StorefrontCreateReviewInput!) {
    storefrontCreateReview(token: $token, input: $input) {
      id
      rating
      title
      body
      verifiedPurchase
    }
  }
`;

export interface StorefrontReturnLineItem {
  skuSnapshot: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceInMinor: string;
}

export interface StorefrontReturnRequest {
  id: string;
  orderId: string;
  reason: string;
  status: string;
  notes?: string | null;
  refundAmountInMinor?: string | null;
  lineItems: StorefrontReturnLineItem[];
  createdAt: string;
}

const RETURN_REQUESTS_QUERY = `
  query ReturnRequests($token: String!) {
    storefrontReturnRequests(token: $token) {
      id
      orderId
      reason
      status
      notes
      refundAmountInMinor
      lineItems {
        skuSnapshot
        nameSnapshot
        quantity
        unitPriceInMinor
      }
      createdAt
    }
  }
`;

export async function fetchProductReviews(
  sku: string,
  page = 1
): Promise<StorefrontProductReviewsPayload> {
  const data = await graphqlRequest<
    { storefrontProductReviews: StorefrontProductReviewsPayload },
    { sku: string; page: number }
  >(PRODUCT_REVIEWS_QUERY, { sku, page });
  return data.storefrontProductReviews;
}

export async function createProductReview(
  input: { sku: string; rating: number; title: string; body?: string },
  token?: string | null
): Promise<StorefrontReview> {
  const data = await graphqlRequest<
    { storefrontCreateReview: StorefrontReview },
    { token?: string | null; input: typeof input }
  >(CREATE_REVIEW_MUTATION, { token: token ?? null, input });
  return data.storefrontCreateReview;
}

const CREATE_RETURN_REQUEST_MUTATION = `
  mutation CreateReturnRequest($token: String!, $input: StorefrontCreateReturnRequestInput!) {
    storefrontCreateReturnRequest(token: $token, input: $input) {
      id
      orderId
      reason
      status
      notes
      refundAmountInMinor
      lineItems {
        skuSnapshot
        nameSnapshot
        quantity
        unitPriceInMinor
      }
      createdAt
    }
  }
`;

export async function fetchReturnRequests(token: string): Promise<StorefrontReturnRequest[]> {
  const data = await graphqlRequest<
    { storefrontReturnRequests: StorefrontReturnRequest[] },
    { token: string }
  >(RETURN_REQUESTS_QUERY, { token });
  return data.storefrontReturnRequests;
}

export async function createReturnRequest(
  token: string,
  input: {
    orderId: string;
    reason: string;
    lineItems: Array<{ lineItemId: string }>;
    notes?: string;
  }
): Promise<StorefrontReturnRequest> {
  const data = await graphqlRequest<
    { storefrontCreateReturnRequest: StorefrontReturnRequest },
    { token: string; input: typeof input }
  >(CREATE_RETURN_REQUEST_MUTATION, { token, input });
  return data.storefrontCreateReturnRequest;
}

/** Display INR from minor units (paise) as returned by the API. */
export function formatInrFromMinor(minorStr: string): string {
  const n = BigInt(minorStr || '0');
  const rupees = Number(n) / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
    rupees
  );
}
