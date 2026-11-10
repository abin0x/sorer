// Performance optimization utilities

// Query caching layer
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const cachedQuery = (key, queryFn) => {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }

  return queryFn().then(data => {
    queryCache.set(key, { data, timestamp: Date.now() });
    return data;
  });
};

// Debounce search queries
export const debounceSearch = (fn, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Batch API requests
export const batchRequests = async (requests, batchSize = 5) => {
  const results = [];
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }
  return results;
};

// Memoize expensive computations
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Image lazy loading
export const observeImages = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
};

// Clear old cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  }
}, CACHE_TTL);