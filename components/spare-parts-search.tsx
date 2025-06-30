'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Loader2, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { searchSpareParts, type SparePartResult } from '@/actions/search-spare-parts';
import { getSparePartsCategories, getSparePartsBrands } from '@/actions/get-spare-parts-options';

export function SparePartsSearch() {
  const [applianceType, setApplianceType] = useState('');
  const [brand, setBrand] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SparePartResult[]>([]);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Popover states
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  
  // Dynamic data from database
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingOptions(true);
      try {
        const categoriesData = await getSparePartsCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadCategories();
  }, []);

  // Load brands when category changes
  useEffect(() => {
    const loadBrands = async () => {
      if (!applianceType) {
        setBrands([]);
        setBrand('');
        setBrandSearch(''); // Reset brand search when category changes
        return;
      }

      setIsLoadingBrands(true);
      try {
        const brandsData = await getSparePartsBrands(applianceType);
        setBrands(brandsData);
        // Reset brand selection if current brand is not in new list
        if (brand && !brandsData.includes(brand)) {
          setBrand('');
          setBrandSearch('');
        }
      } catch (error) {
        console.error('Error loading brands:', error);
      } finally {
        setIsLoadingBrands(false);
      }
    };

    loadBrands();
  }, [applianceType]);

  const handleSearch = async () => {
    if (!applianceType || !brand || !modelNumber) {
      setError('Please fill in all fields');
      return;
    }

    setIsSearching(true);
    setError('');
    setResults([]);
    setHasSearched(false);

    try {
      const { results: searchResults, error: searchError } = await searchSpareParts(
        applianceType,
        brand,
        modelNumber
      );

      if (searchError) {
        setError(searchError);
      } else {
        setResults(searchResults);
        setHasSearched(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const exactMatch = results.find(r => r.match_type === 'exact');
  const fuzzyMatches = results.filter(r => r.match_type === 'fuzzy');

  if (isLoadingOptions) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading options...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Appliance Type <span className="text-red-500">*</span>
        </label>
        {/* Temporarily use a simple select to test */}
        <select 
          value={applianceType}
          onChange={(e) => setApplianceType(e.target.value)}
          className="w-full h-8 sm:h-9 text-xs sm:text-sm border rounded px-2"
        >
          <option value="">Select appliance type...</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {/* Original Popover/Command commented out for testing
        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
          ... rest of the Popover code ...
        </Popover>
        */}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Brand <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Input
            type="text"
            placeholder={applianceType ? "Type brand name (e.g., Bosch)" : "Select appliance type first"}
            value={brandSearch}
            onChange={(e) => {
              setBrandSearch(e.target.value);
              setBrand('');
              if (e.target.value.length > 0 && applianceType) {
                setBrandOpen(true);
              }
            }}
            onFocus={() => brandSearch.length > 0 && applianceType && setBrandOpen(true)}
            onBlur={() => setTimeout(() => setBrandOpen(false), 200)}
            disabled={!applianceType || isLoadingBrands}
            className="w-full h-8 sm:h-9 text-xs sm:text-sm"
          />
          
          {/* Loading indicator */}
          {isLoadingBrands && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
          )}
          
          {/* Autocomplete dropdown */}
          {brandOpen && brandSearch.length > 0 && !isLoadingBrands && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-auto">
              {brands
                .filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
                .map((b) => (
                  <div
                    key={b}
                    className="px-3 py-2 text-xs sm:text-sm hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setBrand(b);
                      setBrandSearch(b);
                      setBrandOpen(false);
                    }}
                  >
                    {b}
                  </div>
                ))}
              {brands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase())).length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-500">No matching brands</div>
              )}
            </div>
          )}
        </div>
        {brand && (
          <p className="text-xs text-green-600 mt-1">✓ Selected: {brand}</p>
        )}
        {applianceType && brands.length > 0 && !brand && (
          <p className="text-xs text-gray-500 mt-1">{brands.length} brands available</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Model Number</label>
        <Input
          type="text"
          placeholder="e.g., WAW28750GB"
          value={modelNumber}
          onChange={(e) => setModelNumber(e.target.value)}
          className="w-full h-8 sm:h-9 text-xs sm:text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Found on door sticker or back panel</p>
      </div>

      <Button 
        onClick={handleSearch} 
        disabled={isSearching || !applianceType || !brand || !modelNumber}
        className="w-full bg-blue-600 hover:bg-blue-700 h-8 sm:h-9 text-xs sm:text-sm font-medium"
      >
        {isSearching ? (
          <>
            <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Search Parts
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Exact Match Result */}
      {exactMatch && (
        <div className="border-t pt-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              <span className="text-xs sm:text-sm font-medium text-green-800">Model Found!</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-green-700">
                <span className="font-medium">Appliance:</span> {exactMatch.category}
              </p>
              <p className="text-xs text-green-700">
                <span className="font-medium">Model:</span> {exactMatch.brand} {exactMatch.model_number}
              </p>
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 h-7 sm:h-8 text-xs font-medium"
              onClick={() => window.open(exactMatch.url, '_blank')}
            >
              See all parts for your model
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Fuzzy Match Results */}
      {!exactMatch && fuzzyMatches.length > 0 && (
        <div className="border-t pt-3">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
              <span className="text-xs sm:text-sm font-medium text-orange-800">Similar models found</span>
            </div>
            <p className="text-xs text-orange-700">
              We couldn't find an exact match, but these models are similar:
            </p>
            <div className="space-y-2">
              {fuzzyMatches.map((match) => (
                <div key={match.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="text-xs font-medium">{match.model_number}</p>
                    <p className="text-xs text-gray-500">
                      {match.category} • {match.brand}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.round(match.similarity_score * 100)}% match
                    </p>
                  </div>
                  <Button 
                    onClick={() => window.open(match.url, '_blank')}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    View Parts
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Results */}
      {hasSearched && results.length === 0 && (
        <div className="border-t pt-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium text-sm">No parts found for this model</p>
              <p className="text-xs mt-1">
                Please check your model number and try again. You can also visit{' '}
                <a 
                  href="https://www.ransomspares.co.uk" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Ransom Spares
                </a>
                {' '}directly to search for parts.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
