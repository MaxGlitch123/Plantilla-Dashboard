# Dashboard Debugging Guide

## Check Browser Console

1. Open DevTools (F12) → Console tab
2. Look for errors from these API calls:
   - `/grafico/ventas/total`
   - `/grafico/pedidos/total`
   - `/grafico/productos/total-vendidos`
   - `/grafico/productos/mas-vendidos`

## Common Issues

### Issue 1: API Returns 403 Forbidden
**Cause:** Token role doesn't match backend authorities
**Fix:** Check that your token contains the correct admin role

### Issue 2: API Returns 0 or Empty Array
**Cause:** No sales data in database
**Fix:** 
- Check if you have POS sales recorded (Today's sales shows "7" so there should be data)
- The `/grafico/*` endpoints might be querying a different table than POS sales
- Backend may need to aggregate POS sales into main sales/pedidos tables

### Issue 3: API Returns 500 Internal Server Error
**Cause:** Backend database query error
**Fix:** Check backend logs for SQL errors or null pointer exceptions

## Quick Test

Open browser console and run:
```javascript
// Test API calls manually
fetch('https://plantilla-pos-production.up.railway.app/grafico/ventas/total', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(d => console.log('Total ventas:', d))
.catch(e => console.error('Error:', e));
```

## Most Likely Issue

Looking at your dashboard:
- **POS Sales Today: 7** (working ✅)
- **POS Revenue Today: $7000** (working ✅)
- **Total Sales: $0.00** (not working ❌)
- **Total Orders: 0** (not working ❌)

This suggests:
1. POS endpoints work fine
2. `/grafico/*` endpoints either:
   - Return 0 because they query old pedidos table (not POS sales)
   - Are failing with 403/500 errors

**Next step:** Check browser console for actual errors from `/grafico/*` API calls.
