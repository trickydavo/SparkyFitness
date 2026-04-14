const { log } = require('../../config/logging');
const { name, version } = require('../../package.json');
const { normalizeBarcode } = require('../../utils/foodUtils');

const USER_AGENT = `${name}/${version} (https://github.com/CodeWithCJ/SparkyFitness)`;

const OFF_HEADERS = {
  'User-Agent': USER_AGENT,
};

const OFF_FIELDS = [
  'product_name',
  'product_name_en',
  'brands',
  'code',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'countries_tags',
];

function offErrorMessage(status) {
  if (status === 429)
    return 'Food search rate limit reached — please try again in a moment.';
  if (status === 503)
    return 'Food search temporarily unavailable — please try again shortly.';
  return `Food search returned an unexpected error (HTTP ${status}).`;
}

async function _fetchOffSearch(url) {
  const response = await fetch(url, { method: 'GET', headers: OFF_HEADERS });
  if (!response.ok) {
    throw new Error(offErrorMessage(response.status));
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Food search temporarily unavailable — please try again shortly.'
    );
  }
  return response.json();
}

/**
 * Sort products so AU/NZ items appear first, then global results.
 * The OFF search API does not support server-side country filtering,
 * so we fetch a larger result set and reorder client-side.
 * For searches with no AU products in OFF's database (e.g. UK/French brands),
 * global results are returned as-is.
 */
function prioritiseAuProducts(products) {
  const AU_NZ = new Set(['en:australia', 'en:new-zealand']);
  const au = [];
  const rest = [];
  for (const p of products) {
    const tags = Array.isArray(p.countries_tags) ? p.countries_tags : [];
    if (tags.some((t) => AU_NZ.has(t))) {
      au.push(p);
    } else {
      rest.push(p);
    }
  }
  return [...au, ...rest];
}

async function searchOpenFoodFacts(query, page = 1, language = 'en') {
  try {
    const fieldSet = new Set(OFF_FIELDS);
    if (language !== 'en') {
      fieldSet.add(`product_name_${language}`);
    }
    const fieldsParam = [...fieldSet].join(',');

    // Fetch 40 results so we have enough AU products to fill a page of 20
    // after reordering — without making two requests.
    // Do NOT sort_by=unique_scans_n — that buries relevant results under
    // popular French products with high global scan counts.
    // Default relevance scoring returns correct matches first.
    const fetchSize = 40;
    const searchUrl = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page=${page}&page_size=${fetchSize}&fields=${fieldsParam}&lc=${language}`;

    log('debug', `OpenFoodFacts search: ${searchUrl}`);
    const data = await _fetchOffSearch(searchUrl);

    const rawProducts = data.hits ?? data.products ?? [];

    // Reorder: AU/NZ products first, rest follow
    const products = prioritiseAuProducts(rawProducts);

    const totalCount =
      data.totalHits ?? data.estimatedTotalHits ?? data.count ?? 0;
    const currentPage = data.page ?? page;
    return {
      products,
      pagination: {
        page: currentPage,
        pageSize: fetchSize,
        totalCount,
        hasMore: currentPage * fetchSize < totalCount,
      },
    };
  } catch (error) {
    log(
      'error',
      `Error searching OpenFoodFacts with query "${query}" in foodService:`,
      error.message
    );
    throw error;
  }
}

async function searchOpenFoodFactsByBarcodeFields(
  barcode,
  fields = OFF_FIELDS,
  language = 'en'
) {
  try {
    const fieldSet = new Set(fields);
    if (language !== 'en') {
      fieldSet.add(`product_name_${language}`);
    }
    const finalFields = [...fieldSet];
    const fieldsParam = finalFields.join(',');
    const searchUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fieldsParam}&lc=${language}`;
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: OFF_HEADERS,
    });
    if (!response.ok) {
      if (response.status === 404) {
        log(
          'debug',
          `OpenFoodFacts product not found for barcode "${barcode}"`
        );
        return { status: 0, status_verbose: 'product not found' };
      }
      const msg = offErrorMessage(response.status);
      log(
        'error',
        `OpenFoodFacts Barcode Fields Search API error: HTTP ${response.status} for barcode "${barcode}"`
      );
      throw new Error(msg);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    log(
      'error',
      `Error searching OpenFoodFacts with barcode "${barcode}" and fields "${fields.join(',')}" in foodService:`,
      error.message
    );
    throw error;
  }
}

function mapOpenFoodFactsProduct(
  product,
  { autoScale = true, language = 'en' } = {}
) {
  const nutriments = product.nutriments || {};
  const servingSize = autoScale
    ? product.serving_quantity > 0
      ? product.serving_quantity
      : 100
    : 100;
  const scale = servingSize / 100;

  const defaultVariant = {
    serving_size: servingSize,
    serving_unit: 'g',
    calories: Math.round((nutriments['energy-kcal_100g'] || 0) * scale),
    protein: Math.round((nutriments['proteins_100g'] || 0) * scale * 10) / 10,
    carbs:
      Math.round((nutriments['carbohydrates_100g'] || 0) * scale * 10) / 10,
    fat: Math.round((nutriments['fat_100g'] || 0) * scale * 10) / 10,
    saturated_fat:
      Math.round((nutriments['saturated-fat_100g'] || 0) * scale * 10) / 10,
    sodium: nutriments['sodium_100g']
      ? Math.round(nutriments['sodium_100g'] * 1000 * scale)
      : 0,
    dietary_fiber:
      Math.round((nutriments['fiber_100g'] || 0) * scale * 10) / 10,
    sugars: Math.round((nutriments['sugars_100g'] || 0) * scale * 10) / 10,
    polyunsaturated_fat:
      Math.round((nutriments['polyunsaturated-fat_100g'] || 0) * scale * 10) /
      10,
    monounsaturated_fat:
      Math.round((nutriments['monounsaturated-fat_100g'] || 0) * scale * 10) /
      10,
    trans_fat:
      Math.round((nutriments['trans-fat_100g'] || 0) * scale * 10) / 10,
    cholesterol: nutriments['cholesterol_100g']
      ? Math.round(nutriments['cholesterol_100g'] * 1000 * scale)
      : 0,
    potassium: nutriments['potassium_100g']
      ? Math.round(nutriments['potassium_100g'] * 1000 * scale)
      : 0,
    vitamin_a: nutriments['vitamin-a_100g']
      ? Math.round(nutriments['vitamin-a_100g'] * 1000000 * scale)
      : 0,
    vitamin_c: nutriments['vitamin-c_100g']
      ? Math.round(nutriments['vitamin-c_100g'] * 1000 * scale * 10) / 10
      : 0,
    calcium: nutriments['calcium_100g']
      ? Math.round(nutriments['calcium_100g'] * 1000 * scale)
      : 0,
    iron: nutriments['iron_100g']
      ? Math.round(nutriments['iron_100g'] * 1000 * scale * 10) / 10
      : 0,
    is_default: true,
  };

  // Language fallback priority:
  // 1. product_name_${language}
  // 2. product_name_en
  // 3. product_name (default/original)
  const name =
    product[`product_name_${language}`] ||
    product.product_name_en ||
    product.product_name;

  return {
    name,
    brand: Array.isArray(product.brands)
      ? product.brands[0]?.trim() || ''
      : product.brands?.split(',')[0]?.trim() || '',
    barcode: normalizeBarcode(product.code),
    provider_external_id: product.code,
    provider_type: 'openfoodfacts',
    is_custom: false,
    default_variant: defaultVariant,
  };
}
module.exports = {
  searchOpenFoodFacts,
  searchOpenFoodFactsByBarcodeFields,
  mapOpenFoodFactsProduct,
};
