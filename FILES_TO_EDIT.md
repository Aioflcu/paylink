# 📍 EXACT FILES TO EDIT - Line-by-Line Guide

## Files You Need to Edit/Create

### 1️⃣ Create `src/pages/Internet.js` (NEW FILE)
**Status:** DOES NOT EXIST - CREATE NEW
**Size:** ~200 lines
**Based on:** Airtime.js (copy pattern)

**What to do:**
1. Create new file at `src/pages/Internet.js`
2. Copy the Internet.js pattern from `IMPLEMENTATION_PATTERNS.md`
3. Save and test

---

### 2️⃣ Create `src/pages/Education.js` (NEW FILE)
**Status:** DOES NOT EXIST - CREATE NEW
**Size:** ~200 lines
**Based on:** Data.js (copy pattern)

**What to do:**
1. Create new file at `src/pages/Education.js`
2. Copy the Education.js pattern from `IMPLEMENTATION_PATTERNS.md`
3. Save and test

---

### 3️⃣ Edit `src/services/transactionProcessor.js` (EXISTING FILE)
**Status:** NEEDS UPDATE
**What to add:** 2 new methods

**Exact Location to Add Methods:**

Find this line (~line 280):
```javascript
/**
 * Fund Wallet via Monnify
 * ...
```

Add BEFORE that line (around line 275):

#### Method 1: processInternetPayment()
Copy from `IMPLEMENTATION_PATTERNS.md` → Pattern 2 section

#### Method 2: processEducationPayment()
Copy from `IMPLEMENTATION_PATTERNS.md` → Pattern 4 section

---

### 4️⃣ Edit `src/pages/TransactionPIN.js` (EXISTING FILE)
**Status:** NEEDS UPDATE
**What to change:** Add 2 new cases to switch statement

**Exact Location to Find:**

Search for: `case 'cabletv':`

Around line ~155-160, you'll find:
```javascript
case 'cabletv':
  result = await TransactionProcessor.processCableSubscription(user.uid, transactionData);
  break;
```

Add AFTER that (before the closing brace):

```javascript
case 'internet':
  result = await TransactionProcessor.processInternetPayment(user.uid, transactionData);
  break;

case 'education':
  result = await TransactionProcessor.processEducationPayment(user.uid, transactionData);
  break;
```

---

### 5️⃣ Update `src/App.js` (EXISTING FILE)
**Status:** NEEDS UPDATE (to add new routes)
**What to add:** 2 new route definitions

**Find:** The route definitions section (usually around line 50-80)

You should see something like:
```javascript
<Route path="/airtime" element={<Airtime />} />
<Route path="/data" element={<Data />} />
<Route path="/electricity" element={<Electricity />} />
<Route path="/cabletv" element={<CableTV />} />
```

Add AFTER these lines:
```javascript
<Route path="/internet" element={<Internet />} />
<Route path="/education" element={<Education />} />
```

Also add imports at the top:
```javascript
import Internet from './pages/Internet';
import Education from './pages/Education';
```

---

### 6️⃣ Update `src/pages/Dashboard.js` (EXISTING FILE)
**Status:** OPTIONAL (add new utility cards)
**What to add:** 2 new card buttons for Internet & Education

**Find:** The utilities grid section (around line 150-200)

You should see something like:
```javascript
<div className="utilities-grid">
  <UtilityCard icon="📱" label="Airtime" onClick={() => navigate('/airtime')} />
  <UtilityCard icon="📊" label="Data" onClick={() => navigate('/data')} />
  {/* ... more cards ... */}
</div>
```

Add:
```javascript
<UtilityCard icon="🌐" label="Internet" onClick={() => navigate('/internet')} />
<UtilityCard icon="🎓" label="Education" onClick={() => navigate('/education')} />
```

---

## 📝 Summary of Changes

| File | Action | Type | Lines |
|------|--------|------|-------|
| `src/pages/Internet.js` | CREATE | New File | 200 |
| `src/pages/Education.js` | CREATE | New File | 200 |
| `src/services/transactionProcessor.js` | ADD 2 Methods | Edit | +180 |
| `src/pages/TransactionPIN.js` | ADD 2 Cases | Edit | +6 |
| `src/App.js` | ADD 2 Routes | Edit | +4 |
| `src/pages/Dashboard.js` | ADD 2 Cards | Edit | +2 |

**Total Lines to Add/Change: ~590 lines**
**Total Files to Modify: 6 files**
**Total New Files: 2 files**

---

## 🔧 Step-by-Step Implementation

### STEP 1: Create Internet.js (5 minutes)
```bash
# Create new file
touch src/pages/Internet.js

# Copy content from IMPLEMENTATION_PATTERNS.md section "Pattern 1"
# Save file
```

### STEP 2: Create Education.js (5 minutes)
```bash
# Create new file
touch src/pages/Education.js

# Copy content from IMPLEMENTATION_PATTERNS.md section "Pattern 3"
# Save file
```

### STEP 3: Update TransactionProcessor.js (10 minutes)
1. Open `src/services/transactionProcessor.js`
2. Find line ~280 (search for "Fund Wallet via Monnify")
3. Add processInternetPayment() method before that line
4. Add processEducationPayment() method after that
5. Save file

### STEP 4: Update TransactionPIN.js (5 minutes)
1. Open `src/pages/TransactionPIN.js`
2. Find the switch statement (around line 155)
3. Find `case 'cabletv':`
4. Add 2 new cases after cabletv
5. Save file

### STEP 5: Update App.js (3 minutes)
1. Open `src/App.js`
2. Add imports for Internet and Education components
3. Add 2 new Route definitions
4. Save file

### STEP 6: Update Dashboard.js (2 minutes)
1. Open `src/pages/Dashboard.js`
2. Find utilities grid
3. Add 2 new UtilityCard components
4. Save file

### STEP 7: Test Everything (10 minutes)
```bash
# Run app
npm start

# Check browser console for errors
# Try to navigate to /internet and /education
# Test payment flow
```

---

## ✅ Verification Checklist

After making all changes:

- [ ] No compile errors in console
- [ ] App starts successfully (`npm start`)
- [ ] Can navigate to `/internet` page
- [ ] Can navigate to `/education` page
- [ ] Internet page shows provider selection
- [ ] Education page shows institution selection
- [ ] Can proceed through full payment flow
- [ ] Transaction is saved to Firestore
- [ ] Wallet balance is deducted
- [ ] Reward points are awarded

---

## 🐛 Debugging Tips

**If app won't compile:**
1. Check for syntax errors in your new files
2. Make sure imports are correct
3. Check file paths are correct

**If pages won't load:**
1. Check routes are added to App.js
2. Check imports are correct
3. Check page file names match import names

**If payment fails:**
1. Check PayFlex API key in .env
2. Check balance is sufficient
3. Check console for error messages

---

## 📚 Reference Files

All patterns and code snippets are in:
- `IMPLEMENTATION_PATTERNS.md` - Copy-paste ready code
- `NEXT_STEPS_ROADMAP.md` - Overview of all steps
- `CRASH_RECOVERY_REPORT.md` - If something breaks

---

**You've got this! Start with Step 1 now! 🚀**

