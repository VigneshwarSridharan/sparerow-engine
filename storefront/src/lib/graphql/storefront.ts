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
    defaultTaxRatePercent: bootstrap.defaultTaxRatePercent ?? 0,
    originStateCode: bootstrap.originStateCode ?? '',
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

/** Display INR from minor units (paise) as returned by the API. */
export function formatInrFromMinor(minorStr: string): string {
  const n = BigInt(minorStr || '0');
  const rupees = Number(n) / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
    rupees
  );
}
