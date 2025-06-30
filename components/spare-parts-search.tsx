'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink, Loader2, Search, AlertCircle, CheckCircle, ChevronsUpDown, Check } from 'lucide-react';
import { searchSpareParts, type SparePartResult } from '@/actions/search-spare-parts';
import { getSparePartsCategories, getSparePartsBrands } from '@/actions/get-spare-parts-options';
import { cn } from "@/lib/utils";

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
        setBrand(''); // Reset brand when category changes
        return;
      }

      setIsLoadingBrands(true);
      try {
        const brandsData = await getSparePartsBrands(applianceType);
        setBrands(brandsData);
        // Reset brand selection if current brand is not in new list
        if (brand && !brandsData.includes(brand)) {
          setBrand('');
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
        <Popover open={brandOpen} onOpenChange={setBrandOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                type="text"
                placeholder={applianceType ? "Type to search brands..." : "Select appliance type first"}
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setBrandOpen(true);
                }}
                onFocus={() => applianceType && setBrandOpen(true)}
                disabled={!applianceType || isLoadingBrands}
                className="w-full h-8 sm:h-9 text-xs sm:text-sm pr-8"
              />
              {isLoadingBrands ? (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              ) : (
                <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandGroup className="max-h-[200px] overflow-auto">
                {brands
                  .filter(b => b.toLowerCase().includes(brand.toLowerCase()))
                  .map((b) => (
                    <CommandItem
                      key={b}
                      onSelect={() => {
                        setBrand(b);
                        setBrandOpen(false);
                      }}
                      className="text-xs sm:text-sm cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          brand === b ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {b}
                    </CommandItem>
                  ))}
                {brands.filter(b => b.toLowerCase().includes(brand.toLowerCase())).length === 0 && (
                  <p className="text-xs text-gray-500 p-2">No matching brands</p>
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {applianceType && brands.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">{brands.length} brands available for {applianceType}</p>
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
