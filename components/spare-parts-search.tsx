// components/spare-parts-search.tsx
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink, Loader2, Search, AlertCircle, CheckCircle, ChevronsUpDown, Check } from 'lucide-react';
import { searchSpareParts, type SparePartResult } from '@/actions/search-spare-parts';
import { cn } from "@/lib/utils";

const APPLIANCE_TYPES = [
  'Washing Machines',
  'Dishwashers',
  'Tumble Dryers',
  'Fridges',
  'Freezers',
  'Ovens',
  'Hobs',
  'Cooker Hoods',
  'Microwaves',
  'Coffee Machines',
  'Vacuum Cleaners',
  'Small Appliances'
];

const BRANDS = [
  'AEG', 'Amica', 'Ariston', 'Balay', 'Bauknecht', 'Baumatic', 'Beko', 'Belling', 
  'Blomberg', 'Bosch', 'Brandt', 'Candy', 'Cannon', 'Caple', 'CDA', 'Creda', 
  'Crosslee', 'Daewoo', 'De Dietrich', 'Delonghi', 'Diplomat', 'Dyson', 
  'Electrolux', 'Elica', 'Fagor', 'Fisher & Paykel', 'Flavel', 'Fridgemaster', 
  'Frigidaire', 'Gorenje', 'Grundig', 'Haier', 'Hisense', 'Hitachi', 'Hoover', 
  'Hotpoint', 'Husky', 'Hygena', 'Ignis', 'Indesit', 'John Lewis', 'Kenwood', 
  'Lamona', 'LEC', 'LG', 'Liebherr', 'Logik', 'Luxair', 'Maytag', 'Miele', 
  'Montpellier', 'Neff', 'New World', 'Nordmende', 'Panasonic', 'Philco', 
  'Philips', 'Prima', 'Proline', 'Rangemaster', 'Russell Hobbs', 'Samsung', 
  'Scholtes', 'Servis', 'Sharp', 'Siemens', 'Smeg', 'Stoves', 'Swan', 'Tecnik', 
  'Teka', 'Tricity Bendix', 'Vestel', 'Westinghouse', 'Whirlpool', 'White Knight', 
  'Zanussi'
];

export function SparePartsSearch() {
  const [applianceType, setApplianceType] = useState('');
  const [brand, setBrand] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SparePartResult[]>([]);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  // Filter brands based on search
  const filteredBrands = useMemo(() => {
    if (!brandSearch) return BRANDS;
    const searchLower = brandSearch.toLowerCase();
    return BRANDS.filter(b => b.toLowerCase().includes(searchLower));
  }, [brandSearch]);

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

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Appliance Type <span className="text-red-500">*</span>
        </label>
        <Select value={applianceType} onValueChange={setApplianceType}>
          <SelectTrigger className="w-full h-8 sm:h-9 text-xs sm:text-sm">
            <SelectValue placeholder="Select appliance" />
          </SelectTrigger>
          <SelectContent>
            {APPLIANCE_TYPES.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Brand <span className="text-red-500">*</span>
        </label>
        <Popover open={brandOpen} onOpenChange={setBrandOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={brandOpen}
              className="w-full justify-between h-8 sm:h-9 text-xs sm:text-sm font-normal"
            >
              {brand || "Select brand..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search brands..." 
                value={brandSearch}
                onValueChange={setBrandSearch}
                className="text-xs sm:text-sm"
              />
              <CommandEmpty>No brand found.</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                {filteredBrands.map((b) => (
                  <CommandItem
                    key={b}
                    value={b}
                    onSelect={(currentValue) => {
                      setBrand(currentValue === brand ? "" : b);
                      setBrandOpen(false);
                      setBrandSearch('');
                    }}
                    className="text-xs sm:text-sm"
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
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
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
            <p className="text-xs text-green-700">{exactMatch.brand} {exactMatch.model_number}</p>
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
