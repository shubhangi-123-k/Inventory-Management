import React, { useState, useEffect } from 'react';

const ProductSchemesManager = ({
  product,
  onChange,
  title = "Product Schemes & Turnover Targets",
  subtitle = "Use checkboxes to activate or configure offers and rebates.",
  badgeText = "Interactive Checkboxes",
  section1Title = "1. Product Item Schemes",
  section2Title = "2. Bill Wise & Turnover Rebates"
}) => {
  // ==========================================
  // 1. PRODUCT PE PRODUCT (BOGO)
  // ==========================================
  const currentBogoStr = product?.product_pe_product || '';
  const bogoMatch = currentBogoStr.match(/(\d+)\s*(?:\+|plus|get|and)\s*(\d+)/i);
  const initialBuy = bogoMatch ? bogoMatch[1] : '1';
  const initialFree = bogoMatch ? bogoMatch[2] : '1';

  const [buyQty, setBuyQty] = useState(initialBuy);
  const [freeQty, setFreeQty] = useState(initialFree);
  const isBogoActive = Boolean(currentBogoStr.trim());

  useEffect(() => {
    if (bogoMatch) {
      setBuyQty(bogoMatch[1]);
      setFreeQty(bogoMatch[2]);
    }
  }, [currentBogoStr]);

  const handleApplyBogo = (buy, free) => {
    const bStr = String(buy);
    const fStr = String(free);
    setBuyQty(bStr);
    setFreeQty(fStr);
    const bNum = parseInt(bStr, 10);
    const fNum = parseInt(fStr, 10);
    if (!isNaN(bNum) && bNum > 0 && !isNaN(fNum) && fNum > 0) {
      onChange('product_pe_product', `${bNum}+${fNum}`);
    }
  };

  const handleToggleBogo = (checked) => {
    if (checked) {
      const b = parseInt(buyQty, 10) || 1;
      const f = parseInt(freeQty, 10) || 1;
      setBuyQty(String(b));
      setFreeQty(String(f));
      onChange('product_pe_product', `${b}+${f}`);
    } else {
      onChange('product_pe_product', '');
    }
  };

  const numBuy = parseInt(buyQty, 10) || 0;
  const numFree = parseInt(freeQty, 10) || 0;
  const bogoEffectiveDiscount = isBogoActive && numBuy + numFree > 0
    ? ((numFree / (numBuy + numFree)) * 100).toFixed(1)
    : 0;

  // ==========================================
  // 2. DISCOUNT ON PRODUCT (OFFER)
  // ==========================================
  const currentOfferStr = product?.discount_on_product || '';
  const isOfferFlat = currentOfferStr.includes('₹');
  const offerRawNum = currentOfferStr ? (parseFloat(currentOfferStr.replace(/[^0-9.]/g, '')) || '') : '';

  const [offerType, setOfferType] = useState(isOfferFlat ? 'FLAT' : 'PERCENT');
  const [offerVal, setOfferVal] = useState(offerRawNum !== '' ? String(offerRawNum) : '10');
  const isOfferActive = Boolean(currentOfferStr.trim());

  useEffect(() => {
    if (currentOfferStr) {
      setOfferType(isOfferFlat ? 'FLAT' : 'PERCENT');
      if (offerRawNum !== '') setOfferVal(String(offerRawNum));
    }
  }, [currentOfferStr]);

  const handleUpdateOffer = (type, val) => {
    setOfferType(type);
    setOfferVal(String(val));
    if (val === '' || parseFloat(val) <= 0) {
      onChange('discount_on_product', '');
      return;
    }
    const num = parseFloat(val);
    if (type === 'PERCENT') {
      const clamped = Math.min(100, Math.max(0, num));
      onChange('discount_on_product', `${clamped}% off`);
    } else {
      onChange('discount_on_product', `₹${num} off`);
    }
  };

  const handleToggleOffer = (checked) => {
    if (checked) {
      const val = parseFloat(offerVal) > 0 ? parseFloat(offerVal) : 10;
      setOfferVal(String(val));
      handleUpdateOffer(offerType, val);
    } else {
      onChange('discount_on_product', '');
    }
  };

  // Price & Margin Calculations
  const stdSellPrice = parseFloat(product?.selling_price || product?.mrp || 0);
  const purchaseCost = parseFloat(product?.purchase_price || 0);
  let offerDiscountAmt = 0;
  if (isOfferActive) {
    const parsedOfferNum = parseFloat(offerVal) || 0;
    if (offerType === 'PERCENT') {
      offerDiscountAmt = stdSellPrice * (parsedOfferNum / 100);
    } else {
      offerDiscountAmt = parsedOfferNum;
    }
  }
  const effectiveBilledPrice = Math.max(0, stdSellPrice - offerDiscountAmt);
  const effectiveMargin = effectiveBilledPrice - purchaseCost;
  const isNegativeMargin = isOfferActive && effectiveBilledPrice < purchaseCost;

  // ==========================================
  // 3. PRODUCT TARGET SCHEME
  // ==========================================
  const currentTargetStr = product?.product_target_scheme || '';
  const targetMatch = currentTargetStr.match(/buy\s*(\d+)\s*get\s*(?:extra\s*)?(\d+)\s*(free|%|₹|units)/i);
  const [targetBuyQty, setTargetBuyQty] = useState(targetMatch ? targetMatch[1] : '100');
  const [targetRewardVal, setTargetRewardVal] = useState(targetMatch ? targetMatch[2] : '5');
  const [targetRewardType, setTargetRewardType] = useState(targetMatch ? (targetMatch[3].includes('%') ? 'PERCENT' : 'FREE_UNITS') : 'FREE_UNITS');
  const isTargetActive = Boolean(currentTargetStr.trim());

  const handleApplyTarget = (buy, rewardVal, rewardType) => {
    setTargetBuyQty(String(buy));
    setTargetRewardVal(String(rewardVal));
    setTargetRewardType(rewardType);
    if (!buy || !rewardVal) {
      onChange('product_target_scheme', '');
      return;
    }
    if (rewardType === 'FREE_UNITS') {
      onChange('product_target_scheme', `Buy ${buy} get extra ${rewardVal} free`);
    } else if (rewardType === 'PERCENT') {
      onChange('product_target_scheme', `Buy ${buy} get extra ${rewardVal}% off`);
    } else {
      onChange('product_target_scheme', `Buy ${buy} get extra ₹${rewardVal} cashback`);
    }
  };

  const handleToggleTarget = (checked) => {
    if (checked) {
      handleApplyTarget(targetBuyQty || '100', targetRewardVal || '5', targetRewardType);
    } else {
      onChange('product_target_scheme', '');
    }
  };

  // ==========================================
  // 4. BILL WISE DISCOUNT
  // ==========================================
  const currentBillStr = product?.discount_on_bill_amount || '';
  const billMatch = currentBillStr.match(/(?:₹|Rs\.?)?\s*(\d+(?:\.\d+)?)\s*(%|off)?\s*on\s*(?:₹|Rs\.?)?\s*([\d,]+)/i);
  const [minBillAmt, setMinBillAmt] = useState(billMatch ? billMatch[3].replace(/,/g, '') : '5000');
  const [billDiscountVal, setBillDiscountVal] = useState(billMatch ? billMatch[1] : '500');
  const [billDiscountType, setBillDiscountType] = useState(billMatch && billMatch[2] === '%' ? 'PERCENT' : 'FLAT');
  const isBillActive = Boolean(currentBillStr.trim());

  useEffect(() => {
    if (billMatch) {
      setMinBillAmt(billMatch[3].replace(/,/g, ''));
      setBillDiscountVal(billMatch[1]);
      setBillDiscountType(billMatch[2] === '%' ? 'PERCENT' : 'FLAT');
    }
  }, [currentBillStr]);

  const handleApplyBillDiscount = (minBill, discVal, discType) => {
    const mStr = String(minBill);
    const dStr = String(discVal);
    setMinBillAmt(mStr);
    setBillDiscountVal(dStr);
    setBillDiscountType(discType);
    const mNum = parseFloat(mStr);
    const dNum = parseFloat(dStr);
    if (!isNaN(mNum) && mNum > 0 && !isNaN(dNum) && dNum > 0) {
      if (discType === 'PERCENT') {
        const clamped = Math.min(100, dNum);
        onChange('discount_on_bill_amount', `${clamped}% off on ₹${mNum.toLocaleString('en-IN')}`);
      } else {
        onChange('discount_on_bill_amount', `₹${dNum.toLocaleString('en-IN')} off on ₹${mNum.toLocaleString('en-IN')}`);
      }
    }
  };

  const handleToggleBillDiscount = (checked) => {
    if (checked) {
      handleApplyBillDiscount(minBillAmt || '5000', billDiscountVal || '500', billDiscountType);
    } else {
      onChange('discount_on_bill_amount', '');
    }
  };

  // ==========================================
  // 5. TURNOVER DISCOUNTS
  // ==========================================
  const currentQtrStr = product?.quarterly_discount_on_turnover || '';
  const isQtrActive = Boolean(currentQtrStr.trim());
  const qtrMatch = currentQtrStr.match(/(\d+(?:\.\d+)?)\s*%\s*(?:on)?\s*(?:₹|Rs\.?)?\s*([\d,]+)/i);
  const [qtrPct, setQtrPct] = useState(qtrMatch ? qtrMatch[1] : '2');
  const [qtrTurnover, setQtrTurnover] = useState(qtrMatch ? qtrMatch[2].replace(/,/g, '') : '100000');

  useEffect(() => {
    if (qtrMatch) {
      setQtrPct(qtrMatch[1]);
      setQtrTurnover(qtrMatch[2].replace(/,/g, ''));
    }
  }, [currentQtrStr]);

  const handleApplyQtr = (pct, turnover) => {
    const pStr = String(pct);
    const tStr = String(turnover);
    setQtrPct(pStr);
    setQtrTurnover(tStr);
    const pNum = parseFloat(pStr);
    const tNum = parseFloat(tStr);
    if (!isNaN(pNum) && pNum > 0 && !isNaN(tNum) && tNum > 0) {
      onChange('quarterly_discount_on_turnover', `${pNum}% on ₹${tNum.toLocaleString('en-IN')}`);
    }
  };

  const handleToggleQtr = (checked) => {
    if (checked) {
      handleApplyQtr(qtrPct || '2', qtrTurnover || '100000');
    } else {
      onChange('quarterly_discount_on_turnover', '');
    }
  };

  const currentYrStr = product?.yearly_discount_on_turnover || '';
  const isYrActive = Boolean(currentYrStr.trim());
  const yrMatch = currentYrStr.match(/(\d+(?:\.\d+)?)\s*%\s*(?:on)?\s*(?:₹|Rs\.?)?\s*([\d,]+)/i);
  const [yrPct, setYrPct] = useState(yrMatch ? yrMatch[1] : '5');
  const [yrTurnover, setYrTurnover] = useState(yrMatch ? yrMatch[2].replace(/,/g, '') : '1000000');

  useEffect(() => {
    if (yrMatch) {
      setYrPct(yrMatch[1]);
      setYrTurnover(yrMatch[2].replace(/,/g, ''));
    }
  }, [currentYrStr]);

  const handleApplyYr = (pct, turnover) => {
    const pStr = String(pct);
    const tStr = String(turnover);
    setYrPct(pStr);
    setYrTurnover(tStr);
    const pNum = parseFloat(pStr);
    const tNum = parseFloat(tStr);
    if (!isNaN(pNum) && pNum > 0 && !isNaN(tNum) && tNum > 0) {
      onChange('yearly_discount_on_turnover', `${pNum}% on ₹${tNum.toLocaleString('en-IN')}`);
    }
  };

  const handleToggleYr = (checked) => {
    if (checked) {
      handleApplyYr(yrPct || '5', yrTurnover || '1000000');
    } else {
      onChange('yearly_discount_on_turnover', '');
    }
  };

  // ==========================================
  // 6. SEASONAL SCHEME STATUS
  // ==========================================
  const isSeasonActive = Boolean(product?.seasonal_scheme_name?.trim());
  const getSeasonalStatus = () => {
    if (!isSeasonActive) return { label: 'Not Applied', bg: '#f1f5f9', color: '#64748b' };
    const start = product?.seasonal_period_start;
    const end = product?.seasonal_period_end;
    if (!start && !end) return { label: 'Applied (No Date Limit)', bg: '#dcfce7', color: '#15803d' };
    const today = new Date().toISOString().split('T')[0];
    if (start && today < start) return { label: 'Upcoming Promotion', bg: '#fef3c7', color: '#b45309' };
    if (end && today > end) return { label: 'Promotion Expired', bg: '#fee2e2', color: '#b91c1c' };
    return { label: 'Active Promotion Now', bg: '#dcfce7', color: '#15803d' };
  };
  const seasonStatus = getSeasonalStatus();

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      padding: '14px',
      marginBottom: '16px',
      boxShadow: '0 2px 4px -1px rgba(0,0,0,0.02)'
    }}>
      <style>{`
        .schemes-three-col-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 860px) {
          .schemes-three-col-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }
        }
        @media (max-width: 580px) {
          .schemes-three-col-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎁</span> {title}
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
            {subtitle}
          </p>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#4338ca', backgroundColor: '#e0e7ff', padding: '3px 8px', borderRadius: '999px', fontWeight: '700' }}>
          {badgeText}
        </span>
      </div>

      {/* 1. PRODUCT LEVEL SCHEMES */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '0.78rem', fontWeight: '800', color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>1.</span> {String(section1Title).replace(/^\s*1\.\s*/i, '')}
        </h4>

        <div className="schemes-three-col-grid">
          
          {/* ==========================================
              A. PRODUCT PE PRODUCT (BOGO)
          ========================================== */}
          <div style={{
            border: isBogoActive ? '2px solid #6366f1' : '1px solid #cbd5e1',
            backgroundColor: isBogoActive ? '#faf5ff' : '#f8fafc',
            borderRadius: '8px',
            padding: '10px 12px',
            transition: 'all 0.2s ease',
            opacity: isBogoActive ? 1 : 0.85
          }}>
            {/* Header with Checkbox */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={isBogoActive}
                  onChange={(e) => handleToggleBogo(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#4338ca', cursor: 'pointer' }}
                />
                <span style={{ color: isBogoActive ? '#312e81' : '#475569', fontSize: '0.82rem', fontWeight: '800' }}>
                  Product Pe Product (BOGO)
                </span>
              </label>

              <span style={{
                fontSize: '0.68rem',
                backgroundColor: isBogoActive ? '#4338ca' : '#e2e8f0',
                color: isBogoActive ? '#ffffff' : '#64748b',
                padding: '2px 7px',
                borderRadius: '999px',
                fontWeight: '800'
              }}>
                {isBogoActive ? `● ${currentBogoStr}` : '○ OFF'}
              </span>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {[
                { label: '1+1 (50%)', buy: '1', free: '1' },
                { label: '2+1 (33%)', buy: '2', free: '1' },
                { label: '3+1 (25%)', buy: '3', free: '1' },
                { label: '5+1 (16%)', buy: '5', free: '1' },
                { label: '10+1 (9%)', buy: '10', free: '1' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    handleApplyBogo(p.buy, p.free);
                  }}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: isBogoActive && currentBogoStr === `${p.buy}+${p.free}` ? '1.5px solid #4338ca' : '1px solid #cbd5e1',
                    backgroundColor: isBogoActive && currentBogoStr === `${p.buy}+${p.free}` ? '#4338ca' : '#ffffff',
                    color: isBogoActive && currentBogoStr === `${p.buy}+${p.free}` ? '#ffffff' : '#475569',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              ))}
              {isBogoActive && (
                <button
                  type="button"
                  onClick={() => handleToggleBogo(false)}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid #fca5a5',
                    backgroundColor: '#fff1f2',
                    color: '#e11d48',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Structured Dual Stepper */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '6px', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Buy Qty</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: isBogoActive ? '1.5px solid #6366f1' : '1px solid #cbd5e1',
                    borderRadius: '5px',
                    backgroundColor: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    color: '#1e293b'
                  }}
                  value={buyQty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBuyQty(val);
                    if (val !== '' && parseInt(val, 10) > 0) {
                      const f = parseInt(freeQty, 10) || 1;
                      onChange('product_pe_product', `${val}+${f}`);
                    }
                  }}
                  onBlur={() => {
                    if (!buyQty || parseInt(buyQty, 10) < 1) {
                      setBuyQty('1');
                      const f = parseInt(freeQty, 10) || 1;
                      onChange('product_pe_product', `1+${f}`);
                    }
                  }}
                />
              </div>

              <span style={{ fontSize: '1rem', fontWeight: '800', color: '#6366f1', marginTop: '12px' }}>+</span>

              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Free Qty</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: isBogoActive ? '1.5px solid #6366f1' : '1px solid #cbd5e1',
                    borderRadius: '5px',
                    backgroundColor: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    color: '#1e293b'
                  }}
                  value={freeQty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFreeQty(val);
                    if (val !== '' && parseInt(val, 10) > 0) {
                      const b = parseInt(buyQty, 10) || 1;
                      onChange('product_pe_product', `${b}+${val}`);
                    }
                  }}
                  onBlur={() => {
                    if (!freeQty || parseInt(freeQty, 10) < 1) {
                      setFreeQty('1');
                      const b = parseInt(buyQty, 10) || 1;
                      onChange('product_pe_product', `${b}+1`);
                    }
                  }}
                />
              </div>
            </div>

            {/* Outcome calculation banner - shown only when active */}
            {isBogoActive && (
              <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '5px', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', fontSize: '0.72rem', color: '#3730a3', fontWeight: '700' }}>
                ✓ Buy {buyQty || 1}, get {freeQty || 1} free (Effective: <strong>{bogoEffectiveDiscount}%</strong> off)
              </div>
            )}
          </div>

          {/* ==========================================
              B. DISCOUNT ON PRODUCT (OFFER)
          ========================================== */}
          <div style={{
            border: isNegativeMargin ? '2px solid #ef4444' : (isOfferActive ? '2px solid #22c55e' : '1px solid #cbd5e1'),
            backgroundColor: isNegativeMargin ? '#fff5f5' : (isOfferActive ? '#f0fdf4' : '#f8fafc'),
            borderRadius: '8px',
            padding: '10px 12px',
            transition: 'all 0.2s ease',
            opacity: isOfferActive ? 1 : 0.85
          }}>
            {/* Header with Checkbox */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={isOfferActive}
                  onChange={(e) => handleToggleOffer(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                />
                <span style={{ color: isOfferActive ? '#14532d' : '#475569', fontSize: '0.82rem', fontWeight: '800' }}>
                  Discount on Product (Offer)
                </span>
              </label>

              <span style={{
                fontSize: '0.68rem',
                backgroundColor: isOfferActive ? '#16a34a' : '#e2e8f0',
                color: isOfferActive ? '#ffffff' : '#64748b',
                padding: '2px 7px',
                borderRadius: '999px',
                fontWeight: '800'
              }}>
                {isOfferActive ? `● ${currentOfferStr}` : '○ OFF'}
              </span>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {[5, 10, 15, 20, 25, 50].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    handleUpdateOffer('PERCENT', pct);
                  }}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: isOfferActive && offerType === 'PERCENT' && parseFloat(offerVal) === pct ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                    backgroundColor: isOfferActive && offerType === 'PERCENT' && parseFloat(offerVal) === pct ? '#16a34a' : '#ffffff',
                    color: isOfferActive && offerType === 'PERCENT' && parseFloat(offerVal) === pct ? '#ffffff' : '#475569',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {pct}%
                </button>
              ))}
              {isOfferActive && (
                <button
                  type="button"
                  onClick={() => handleToggleOffer(false)}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid #fca5a5',
                    backgroundColor: '#fff1f2',
                    color: '#e11d48',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Unit selector + Value Input */}
            <div style={{ display: 'grid', gridTemplateColumns: '105px 1fr', gap: '6px', alignItems: 'center' }}>
              <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '5px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => handleUpdateOffer('PERCENT', offerVal || 10)}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    border: 'none',
                    backgroundColor: offerType === 'PERCENT' ? '#16a34a' : '#f1f5f9',
                    color: offerType === 'PERCENT' ? '#ffffff' : '#475569',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  % Pct
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateOffer('FLAT', offerVal || 50)}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    border: 'none',
                    backgroundColor: offerType === 'FLAT' ? '#16a34a' : '#f1f5f9',
                    color: offerType === 'FLAT' ? '#ffffff' : '#475569',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ₹ Flat
                </button>
              </div>

              <div>
                <input
                  type="number"
                  min="0"
                  max={offerType === 'PERCENT' ? '100' : undefined}
                  step="0.5"
                  placeholder={offerType === 'PERCENT' ? 'e.g. 10' : 'e.g. 50'}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    border: isOfferActive ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
                    borderRadius: '5px',
                    backgroundColor: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    color: '#1e293b'
                  }}
                  value={offerVal}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOfferVal(val);
                    if (val !== '' && parseFloat(val) > 0) {
                      handleUpdateOffer(offerType, val);
                    }
                  }}
                  onBlur={() => {
                    if (offerVal === '' || parseFloat(offerVal) <= 0) {
                      if (isOfferActive) handleToggleOffer(false);
                    }
                  }}
                />
              </div>
            </div>

            {/* Real-time Margin Guardrail Banner */}
            {isNegativeMargin ? (
              <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '5px', backgroundColor: '#fee2e2', border: '1.5px solid #ef4444', fontSize: '0.72rem', color: '#991b1b', lineHeight: 1.3 }}>
                ⚠️ <strong>Loss Alert!</strong> Price ₹{effectiveBilledPrice.toFixed(2)} &lt; Cost ₹{purchaseCost.toFixed(2)} (-₹{(purchaseCost - effectiveBilledPrice).toFixed(2)}/u)
              </div>
            ) : isOfferActive ? (
              <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '5px', backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', fontSize: '0.72rem', color: '#166534', lineHeight: 1.3 }}>
                {stdSellPrice > 0 ? (
                  <>✓ Price: <strong>₹{effectiveBilledPrice.toFixed(2)}</strong> (Base ₹{stdSellPrice.toFixed(2)} - ₹{offerDiscountAmt.toFixed(2)}) • Profit: +₹{effectiveMargin.toFixed(2)}/u</>
                ) : (
                  <>✓ Active Offer: <strong>{offerType === 'PERCENT' ? `${offerVal}% Discount` : `₹${offerVal} Flat Off`}</strong></>
                )}
              </div>
            ) : null}
          </div>

          {/* ==========================================
              C. PRODUCT TARGET SCHEME
          ========================================== */}
          <div style={{
            border: isTargetActive ? '2px solid #f59e0b' : '1px solid #cbd5e1',
            backgroundColor: isTargetActive ? '#fffbeb' : '#f8fafc',
            borderRadius: '8px',
            padding: '10px 12px',
            transition: 'all 0.2s ease',
            opacity: isTargetActive ? 1 : 0.85
          }}>
            {/* Header with Checkbox */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={isTargetActive}
                  onChange={(e) => handleToggleTarget(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#d97706', cursor: 'pointer' }}
                />
                <span style={{ color: isTargetActive ? '#78350f' : '#475569', fontSize: '0.82rem', fontWeight: '800' }}>
                  Quantity Target Incentive
                </span>
              </label>

              <span style={{
                fontSize: '0.68rem',
                backgroundColor: isTargetActive ? '#d97706' : '#e2e8f0',
                color: isTargetActive ? '#ffffff' : '#64748b',
                padding: '2px 7px',
                borderRadius: '999px',
                fontWeight: '800'
              }}>
                {isTargetActive ? '● APPLIED' : '○ OFF'}
              </span>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {[
                { label: '50 get 2 free', buy: '50', val: '2', type: 'FREE_UNITS' },
                { label: '100 get 5 free', buy: '100', val: '5', type: 'FREE_UNITS' },
                { label: '200 get 12 free', buy: '200', val: '12', type: 'FREE_UNITS' },
                { label: '100 get 5%', buy: '100', val: '5', type: 'PERCENT' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyTarget(p.buy, p.val, p.type)}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              ))}
              {isTargetActive && (
                <button
                  type="button"
                  onClick={() => handleToggleTarget(false)}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid #fca5a5',
                    backgroundColor: '#fff1f2',
                    color: '#e11d48',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Structured 3-field input */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Target Qty</span>
                <input
                  type="number"
                  min="1"
                  style={{ width: '100%', padding: '5px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#ffffff', fontSize: '0.82rem', fontWeight: '700' }}
                  value={targetBuyQty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setTargetBuyQty(e.target.value);
                    if (isTargetActive) handleApplyTarget(e.target.value, targetRewardVal, targetRewardType);
                  }}
                  placeholder="100"
                />
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Reward Type</span>
                <select
                  style={{ width: '100%', padding: '5px 3px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#ffffff', fontSize: '0.78rem', fontWeight: '700' }}
                  value={targetRewardType}
                  onChange={(e) => {
                    setTargetRewardType(e.target.value);
                    if (isTargetActive) handleApplyTarget(targetBuyQty, targetRewardVal, e.target.value);
                  }}
                >
                  <option value="FREE_UNITS">Free Units</option>
                  <option value="PERCENT">% Disc</option>
                  <option value="CASHBACK">₹ Cashback</option>
                </select>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Reward Val</span>
                <input
                  type="number"
                  min="1"
                  style={{ width: '100%', padding: '5px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#ffffff', fontSize: '0.82rem', fontWeight: '700' }}
                  value={targetRewardVal}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setTargetRewardVal(e.target.value);
                    if (isTargetActive) handleApplyTarget(targetBuyQty, e.target.value, targetRewardType);
                  }}
                  placeholder="5"
                />
              </div>
            </div>

            {isTargetActive && (
              <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '5px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', fontSize: '0.72rem', color: '#92400e', fontWeight: '700' }}>
                🎯 {currentTargetStr}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. BILL WISE & TURNOVER DISCOUNTS */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '0.78rem', fontWeight: '800', color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>2.</span> {String(section2Title).replace(/^\s*2\.\s*/i, '')}
        </h4>

        <div className="schemes-three-col-grid">
          
          {/* Bill-Wise Discount */}
          <div style={{
            border: isBillActive ? '2px solid #4338ca' : '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '10px 12px',
            backgroundColor: isBillActive ? '#eef2ff' : '#f8fafc',
            opacity: isBillActive ? 1 : 0.85
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={isBillActive}
                  onChange={(e) => handleToggleBillDiscount(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#4338ca', cursor: 'pointer' }}
                />
                <span style={{ color: isBillActive ? '#312e81' : '#475569', fontSize: '0.82rem', fontWeight: '800' }}>
                  Discount on Bill Amount
                </span>
              </label>

              <span style={{
                fontSize: '0.68rem',
                backgroundColor: isBillActive ? '#4338ca' : '#e2e8f0',
                color: isBillActive ? '#ffffff' : '#64748b',
                padding: '2px 7px',
                borderRadius: '999px',
                fontWeight: '800'
              }}>
                {isBillActive ? '● APPLIED' : '○ OFF'}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {[
                { label: '₹200 on ₹2K', min: '2000', val: '200', type: 'FLAT' },
                { label: '₹500 on ₹5K', min: '5000', val: '500', type: 'FLAT' },
                { label: '5% on ₹5K', min: '5000', val: '5', type: 'PERCENT' },
                { label: '10% on ₹10K', min: '10000', val: '10', type: 'PERCENT' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyBillDiscount(p.min, p.val, p.type)}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              ))}
              {isBillActive && (
                <button
                  type="button"
                  onClick={() => handleToggleBillDiscount(false)}
                  style={{ fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', border: '1px solid #fca5a5', backgroundColor: '#fff1f2', color: '#e11d48', fontWeight: '700', cursor: 'pointer' }}
                >
                  ✕ Clear
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 1fr', gap: '6px' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Min Bill (₹)</span>
                <input
                  type="number"
                  placeholder="5000"
                  style={{ width: '100%', padding: '5px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.82rem' }}
                  value={minBillAmt}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setMinBillAmt(e.target.value);
                    if (isBillActive) handleApplyBillDiscount(e.target.value, billDiscountVal, billDiscountType);
                  }}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Type</span>
                <select
                  style={{ width: '100%', padding: '5px 2px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.78rem', fontWeight: '700' }}
                  value={billDiscountType}
                  onChange={(e) => {
                    setBillDiscountType(e.target.value);
                    if (isBillActive) handleApplyBillDiscount(minBillAmt, billDiscountVal, e.target.value);
                  }}
                >
                  <option value="FLAT">₹ Flat</option>
                  <option value="PERCENT">% Pct</option>
                </select>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Discount</span>
                <input
                  type="number"
                  placeholder="500"
                  style={{ width: '100%', padding: '5px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.82rem' }}
                  value={billDiscountVal}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setBillDiscountVal(e.target.value);
                    if (isBillActive) handleApplyBillDiscount(minBillAmt, e.target.value, billDiscountType);
                  }}
                />
              </div>
            </div>
            {isBillActive && (
              <div style={{ marginTop: '8px', padding: '5px 8px', borderRadius: '5px', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', fontSize: '0.72rem', color: '#3730a3', fontWeight: '700' }}>
                ✓ {currentBillStr}
              </div>
            )}
          </div>

          {/* Quarterly Turnover */}
          <div style={{
            border: isQtrActive ? '2px solid #4338ca' : '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '10px 12px',
            backgroundColor: isQtrActive ? '#eef2ff' : '#f8fafc',
            opacity: isQtrActive ? 1 : 0.85,
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={isQtrActive}
                  onChange={(e) => handleToggleQtr(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#4338ca', cursor: 'pointer' }}
                />
                <span style={{ color: isQtrActive ? '#312e81' : '#475569', fontSize: '0.82rem', fontWeight: '800' }}>
                  Quarterly Turnover Rebate
                </span>
              </label>

              <span style={{
                fontSize: '0.68rem',
                backgroundColor: isQtrActive ? '#4338ca' : '#e2e8f0',
                color: isQtrActive ? '#ffffff' : '#64748b',
                padding: '2px 7px',
                borderRadius: '999px',
                fontWeight: '800'
              }}>
                {isQtrActive ? '● APPLIED' : '○ OFF'}
              </span>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {[
                { label: '2% on ₹1L', pct: '2', turnover: '100000' },
                { label: '3% on ₹2.5L', pct: '3', turnover: '250000' },
                { label: '5% on ₹5L', pct: '5', turnover: '500000' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyQtr(p.pct, p.turnover)}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: isQtrActive && qtrPct === p.pct && qtrTurnover === p.turnover ? '1.5px solid #4338ca' : '1px solid #cbd5e1',
                    backgroundColor: isQtrActive && qtrPct === p.pct && qtrTurnover === p.turnover ? '#4338ca' : '#ffffff',
                    color: isQtrActive && qtrPct === p.pct && qtrTurnover === p.turnover ? '#ffffff' : '#475569',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              ))}
              {isQtrActive && (
                <button
                  type="button"
                  onClick={() => handleToggleQtr(false)}
                  style={{ fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', border: '1px solid #fca5a5', backgroundColor: '#fff1f2', color: '#e11d48', fontWeight: '700', cursor: 'pointer' }}
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Structured Dual Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '6px' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Quarterly Target (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  placeholder="100000"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.82rem', fontWeight: '700' }}
                  value={qtrTurnover}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setQtrTurnover(e.target.value);
                    handleApplyQtr(qtrPct, e.target.value);
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Rebate (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="2"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.82rem', fontWeight: '700' }}
                  value={qtrPct}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setQtrPct(e.target.value);
                    handleApplyQtr(e.target.value, qtrTurnover);
                  }}
                />
              </div>
            </div>

            {/* Real-time outcome banner */}
            {isQtrActive && (
              <div style={{ marginTop: '8px', padding: '5px 8px', borderRadius: '5px', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', fontSize: '0.72rem', color: '#3730a3', fontWeight: '700' }}>
                ✓ {qtrPct}% on ₹{parseFloat(qtrTurnover || 0).toLocaleString('en-IN')} (Reward: ₹{((parseFloat(qtrTurnover || 0) * parseFloat(qtrPct || 0)) / 100).toLocaleString('en-IN')})
              </div>
            )}
          </div>

          {/* Yearly Turnover */}
          <div style={{
            border: isYrActive ? '2px solid #4338ca' : '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '10px 12px',
            backgroundColor: isYrActive ? '#eef2ff' : '#f8fafc',
            opacity: isYrActive ? 1 : 0.85,
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={isYrActive}
                  onChange={(e) => handleToggleYr(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#4338ca', cursor: 'pointer' }}
                />
                <span style={{ color: isYrActive ? '#312e81' : '#475569', fontSize: '0.82rem', fontWeight: '800' }}>
                  Yearly Turnover Rebate
                </span>
              </label>

              <span style={{
                fontSize: '0.68rem',
                backgroundColor: isYrActive ? '#4338ca' : '#e2e8f0',
                color: isYrActive ? '#ffffff' : '#64748b',
                padding: '2px 7px',
                borderRadius: '999px',
                fontWeight: '800'
              }}>
                {isYrActive ? '● APPLIED' : '○ OFF'}
              </span>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {[
                { label: '3% on ₹5L', pct: '3', turnover: '500000' },
                { label: '5% on ₹10L', pct: '5', turnover: '1000000' },
                { label: '7% on ₹25L', pct: '7', turnover: '2500000' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyYr(p.pct, p.turnover)}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: isYrActive && yrPct === p.pct && yrTurnover === p.turnover ? '1.5px solid #4338ca' : '1px solid #cbd5e1',
                    backgroundColor: isYrActive && yrPct === p.pct && yrTurnover === p.turnover ? '#4338ca' : '#ffffff',
                    color: isYrActive && yrPct === p.pct && yrTurnover === p.turnover ? '#ffffff' : '#475569',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              ))}
              {isYrActive && (
                <button
                  type="button"
                  onClick={() => handleToggleYr(false)}
                  style={{ fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', border: '1px solid #fca5a5', backgroundColor: '#fff1f2', color: '#e11d48', fontWeight: '700', cursor: 'pointer' }}
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Structured Dual Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '6px' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Annual Target (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  placeholder="1000000"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.82rem', fontWeight: '700' }}
                  value={yrTurnover}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setYrTurnover(e.target.value);
                    handleApplyYr(yrPct, e.target.value);
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Rebate (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="5"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.82rem', fontWeight: '700' }}
                  value={yrPct}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setYrPct(e.target.value);
                    handleApplyYr(e.target.value, yrTurnover);
                  }}
                />
              </div>
            </div>

            {/* Real-time outcome banner */}
            {isYrActive && (
              <div style={{ marginTop: '8px', padding: '5px 8px', borderRadius: '5px', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', fontSize: '0.72rem', color: '#3730a3', fontWeight: '700' }}>
                ✓ {yrPct}% on ₹{parseFloat(yrTurnover || 0).toLocaleString('en-IN')} (Reward: ₹{((parseFloat(yrTurnover || 0) * parseFloat(yrPct || 0)) / 100).toLocaleString('en-IN')})
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. SEASONAL SCHEMES WITH DATE GUARDS */}
      <div style={{
        border: isSeasonActive ? '2px solid #4338ca' : '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '10px 12px',
        backgroundColor: isSeasonActive ? '#faf5ff' : '#f8fafc',
        opacity: isSeasonActive ? 1 : 0.85
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', margin: 0 }}>
            <input
              type="checkbox"
              checked={isSeasonActive}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange('seasonal_scheme_name', product?.seasonal_scheme_name || 'Diwali Dhamaka');
                } else {
                  onChange('seasonal_scheme_name', '');
                  onChange('seasonal_period_start', '');
                  onChange('seasonal_period_end', '');
                }
              }}
              style={{ width: '16px', height: '16px', accentColor: '#4338ca', cursor: 'pointer' }}
            />
            <span style={{ color: isSeasonActive ? '#312e81' : '#475569', fontSize: '0.82rem', fontWeight: '800' }}>
              Seasonal & Festival Scheme
            </span>
          </label>

          <span style={{ fontSize: '0.7rem', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', backgroundColor: seasonStatus.bg, color: seasonStatus.color }}>
            ● {seasonStatus.label}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', color: '#64748b', fontSize: '0.68rem', fontWeight: '700', marginBottom: '2px' }}>Season / Festival Name</label>
            <input
              type="text"
              placeholder="e.g. Diwali Dhamaka"
              style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#ffffff', fontSize: '0.82rem' }}
              value={product?.seasonal_scheme_name || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => onChange('seasonal_scheme_name', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#64748b', fontSize: '0.68rem', fontWeight: '700', marginBottom: '2px' }}>Applicability Scope</label>
            <select
              style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#ffffff', fontSize: '0.82rem', fontWeight: '600' }}
              value={product?.seasonal_applicability || 'All Products'}
              onChange={(e) => onChange('seasonal_applicability', e.target.value)}
            >
              <option value="All Products">All Products</option>
              <option value="Specific Category">Specific Category</option>
              <option value="Select Customers Only">Select Customers Only</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: '#64748b', fontSize: '0.68rem', fontWeight: '700', marginBottom: '2px' }}>Period Start Date</label>
            <input
              type="date"
              style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#ffffff', fontSize: '0.82rem' }}
              value={product?.seasonal_period_start || ''}
              onChange={(e) => {
                const newStart = e.target.value;
                onChange('seasonal_period_start', newStart);
                if (product?.seasonal_period_end && product.seasonal_period_end < newStart) {
                  onChange('seasonal_period_end', newStart);
                }
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#64748b', fontSize: '0.68rem', fontWeight: '700', marginBottom: '2px' }}>Period End Date</label>
            <input
              type="date"
              min={product?.seasonal_period_start || ''}
              style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#ffffff', fontSize: '0.82rem' }}
              value={product?.seasonal_period_end || ''}
              onChange={(e) => onChange('seasonal_period_end', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSchemesManager;
