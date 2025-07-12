# Knowledge Graph Migration Checklist

## ✅ Database Changes Applied

- [ ] Applied main migration: `20250111_add_is_global_to_data_sources.sql`
- [ ] Applied vector functions: `20250115_add_vector_relationship_functions.sql`
- [ ] Verified migrations using verification SQL

## 🔧 Code Changes Required

After migrations are applied, update these files:

### 1. `src/components/KnowledgeGraph/KnowledgeGraph.jsx` (Line ~64)

**CHANGE FROM:**
```javascript
const filteredDocs = documents.filter(() => {
  // TODO: Uncomment once is_global column exists in database
  // if (viewMode === 'global') return doc.is_global === true;
  // if (viewMode === 'account') return !doc.is_global;
  return true; // For now, show all documents
});
```

**CHANGE TO:**
```javascript
const filteredDocs = documents.filter(doc => {
  if (viewMode === 'global') return doc.is_global === true;
  if (viewMode === 'account') return !doc.is_global;
  return true; // 'both'
});
```

### 2. `src/pages/AccountDashboard.jsx` (Line ~180)

**UNCOMMENT THIS:**
```javascript
// Fetch from account_data_sources where is_global = true
const { data: globalFromAccounts, error: error1 } = await supabase
  .from('account_data_sources')
  .select('*')
  .eq('is_global', true)
  .order('created_at', { ascending: false });

if (error1) throw error1;
```

**AND UNCOMMENT THE REALTIME SUBSCRIPTION:**
```javascript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'account_data_sources',
  filter: 'is_global=eq.true'
}, () => {
  fetchGlobalDocuments();
})
```

## 🧪 Testing Steps

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test Knowledge Graph:**
   - Navigate to any account page
   - Click "Graph View" toggle
   - Verify graph loads without errors

3. **Test Global Documents:**
   - Go to Account Dashboard
   - Check if "Company Knowledge Base" section appears
   - Upload a test document and mark it as global

4. **Test Vector Database (Optional):**
   - Open browser console
   - Navigate to: `http://localhost:5173/test-vector-database.js`
   - Check for successful vector search results

## 🚨 Troubleshooting

If you get errors:

1. **Database Connection Issues:**
   - Check Supabase project URL and keys
   - Verify migrations applied successfully

2. **TypeScript Errors:**
   - Already fixed - using JavaScript files only

3. **Missing Dependencies:**
   - Run `npm install` to ensure all packages are installed

4. **Graph Not Loading:**
   - Check browser console for specific errors
   - Verify documents exist in your database

## ✨ New Features Available

After migration, you can:

- **Mark documents as global** (company-wide access)
- **View account-specific vs global knowledge**
- **Save graph node positions** (persistent layout)
- **Use real semantic relationships** (if you have embeddings)
- **Search documents by content similarity**

## 🎯 Success Indicators

You know it's working when:

- ✅ Knowledge Graph loads without console errors
- ✅ Can toggle between Account/Global/Both views
- ✅ Documents appear with file type colors
- ✅ Can mark documents as global/not global
- ✅ Graph remembers node positions between reloads
- ✅ Vector database shows meaningful relationships 