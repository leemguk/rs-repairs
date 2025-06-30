// actions/test-spare-parts-direct.ts
'use server';

import { createClient } from '@/lib/supabase';

export async function testDirectQuery() {
  try {
    const supabase = createClient();
    
    // Test 1: Direct query to spare_parts table
    console.log('Testing direct query to spare_parts table...');
    const { data: directData, error: directError } = await supabase
      .from('spare_parts')
      .select('category, brand')
      .limit(10);
    
    if (directError) {
      console.error('Direct query error:', directError);
      return { error: directError.message, data: null };
    }
    
    console.log('Direct query success, sample data:', directData);
    
    // Test 2: Get unique categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('spare_parts')
      .select('category')
      .limit(100);
    
    const uniqueCategories = [...new Set(categoriesData?.map(item => item.category).filter(Boolean) || [])];
    
    // Test 3: Try RPC function
    console.log('Testing RPC function...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_spare_parts_categories');
    
    return {
      directQuerySample: directData?.slice(0, 5),
      uniqueCategories: uniqueCategories.slice(0, 10),
      totalCategories: uniqueCategories.length,
      rpcResult: rpcData,
      rpcError: rpcError?.message
    };
    
  } catch (error) {
    console.error('Test error:', error);
    return { error: String(error), data: null };
  }
}
