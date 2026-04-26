import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateClinicalReport = async (data: any) => {
  const { 
    user, 
    plan, 
    routine, 
    insight, 
    analysis,
    products 
  } = data;

  const doc = new jsPDF() as any;
  const teal = '#0d9488';
  const lightTeal = '#f0fdfa';
  const slate = '#0f172a';
  const gray = '#64748b';
  const marginX = 20;

  // --- HELPER: PAGE BREAK CHECK ---
  const checkPage = (currentY: number, needed: number) => {
    if (currentY + needed > 280) {
      doc.addPage();
      return 20;
    }
    return currentY;
  };

  // --- HEADER ---
  doc.setFillColor(lightTeal);
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(teal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('DeepSkyn', marginX, 25);
  
  doc.setTextColor(gray);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('PROFESSIONAL CLINICAL SKIN DIAGNOSIS', marginX, 34);
  
  doc.setTextColor(teal);
  doc.setFontSize(10);
  doc.text(`REPORT ID: DS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 145, 20);
  doc.text(`DATE: ${new Date().toLocaleDateString()}`, 145, 26);
  doc.text(`${plan} ACCESS LEVEL`, 145, 32);

  let y = 60;

  // --- SECTION 0: PROFESSIONAL REPORT VALUE ---
  doc.setFillColor(lightTeal);
  doc.roundedRect(marginX, y, 170, 25, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(teal);
  doc.setFont('helvetica', 'bold');
  doc.text('THE VALUE OF YOUR PROFESSIONAL CLINICAL REPORT', marginX + 5, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gray);
  const proExplain = "This clinical-grade protocol is driven by DeepSkyn's AI Diagnostic Engine. Unlike standard routines, it correlates your specific biomarkers (Acne, Wrinkles, Pores) with high-concentration active ingredients to ensure medical-grade efficacy and skin barrier safety.";
  const splitPro = doc.splitTextToSize(proExplain, 160);
  doc.text(splitPro, marginX + 5, y + 14);

  y += 35;

  // --- SECTION 1: DERMATOLOGICAL PROFILE ---
  doc.setFillColor(teal);
  doc.rect(marginX, y, 5, 10, 'F');
  doc.setTextColor(slate);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Dermatological Profile', marginX + 10, y + 8);
  
  y += 18;
  
  const profileData = [
    ['Patient Name', user?.name || user?.email || 'Valued Member'],
    ['Biological Age', analysis?.realAge || localStorage.getItem('userAge') || '—'],
    ['AI-Estimated Skin Age', insight?.currentSkinAge || analysis?.skinAge || '—'],
    ['Primary Skin Type', routine?.inferredSkinType || analysis?.aiRawResponse?.globalAnalysis?.dominantCondition || 'Normal'],
    ['Dominant Condition', analysis?.aiRawResponse?.globalAnalysis?.dominantCondition || 'Standard'],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: profileData,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 4, textColor: gray },
    columnStyles: { 0: { fontStyle: 'bold', width: 55, textColor: slate } },
    margin: { left: marginX + 5 }
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // --- SECTION 2: DEEP SKIN ANALYSIS (AI RESULTS) ---
  y = checkPage(y, 80);
  doc.setFillColor(teal);
  doc.rect(marginX, y, 5, 10, 'F');
  doc.setFontSize(18);
  doc.text('Clinical Analysis Results', marginX + 10, y + 8);
  
  y += 18;

  let conditionScores: any[] = [];

  // --- SOURCE 1: COMBINED INSIGHTS (Best fusion data) ---
  if (analysis?.combinedInsights) {
    conditionScores = Object.entries(analysis.combinedInsights).map(([key, entry]: [string, any]) => ({
      type: key,
      score: entry.combinedScore || entry.aiScore || entry.userScore || 0,
      description: `Analysis based on ${entry.weight?.ai > 0 ? 'AI Scan' : ''}${entry.weight?.ai > 0 && entry.weight?.user > 0 ? ' & ' : ''}${entry.weight?.user > 0 ? 'Profile' : ''}.`
    }));
  } 
  // --- SOURCE 2: ROOT CONDITION SCORES ---
  else if (Array.isArray(analysis?.conditionScores)) {
    conditionScores = analysis.conditionScores;
  }
  // --- SOURCE 3: AI RAW RESPONSE ---
  else if (Array.isArray(analysis?.aiRawResponse?.conditionScores)) {
    conditionScores = analysis.aiRawResponse.conditionScores;
  }

  // --- SOURCE 4: BACKEND METRICS FALLBACK ---
  if (conditionScores.length === 0) {
    const rawMetrics = analysis?.metrics || analysis?.data?.metrics || [];
    if (Array.isArray(rawMetrics)) {
      conditionScores = rawMetrics.map((m: any) => ({
        type: m.metricType || m.name || 'Unknown',
        score: m.score || 0,
        description: m.severityLevel || 'Analysis complete.'
      }));
    }
  }

  // --- SOURCE 5: PERSONALIZATION TRENDS (Routines Page data) ---
  if (conditionScores.length === 0 && routine?.trends) {
    const trends = routine.trends;
    if (trends.hydration) conditionScores.push({ type: 'Hydratation', score: trends.hydration.current, description: 'Current hydration levels detected.' });
    if (trends.oil) conditionScores.push({ type: 'Sébum', score: trends.oil.current, description: 'Sebum and lipid activity.' });
    if (trends.acne) conditionScores.push({ type: 'Acné', score: trends.acne.current, description: 'Inflammatory activity level.' });
    if (trends.wrinkles) conditionScores.push({ type: 'Rides', score: trends.wrinkles.current, description: 'Elasticity and line depth.' });
  }

  const analysisTable = conditionScores.map((c: any) => [
    c.type.charAt(0).toUpperCase() + c.type.slice(1),
    `${Math.round(c.score || 0)}%`,
    (c.score || 0) > 70 ? 'CRITICAL' : (c.score || 0) > 40 ? 'MODERATE' : 'OPTIMAL',
    c.description || 'Monitoring recommended.'
  ]);

  if (analysisTable.length === 0) {
      analysisTable.push(['General Health', 'Normal', 'STABLE', 'Skin barrier appears functional.']);
  }

  autoTable(doc, {
    startY: y,
    head: [['Skin Biomarker', 'Severity', 'Status', 'Clinical Observation']],
    body: analysisTable,
    theme: 'grid',
    headStyles: { fillColor: teal, textColor: '#fff', fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 
        0: { fontStyle: 'bold', textColor: slate },
        1: { halign: 'center' },
        2: { fontStyle: 'bold' }
    },
    margin: { left: marginX }
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // --- PATHOLOGY SUMMARY ---
  const criticalConcerns = conditionScores.filter((c: any) => c.score > 40).map((c: any) => c.type);
  if (criticalConcerns.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(gray);
    doc.setFont('helvetica', 'bold');
    doc.text('PRIMARY PATHOLOGICAL CONCERNS DETECTED:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(criticalConcerns.join(', ').toUpperCase(), marginX, y + 6);
    y += 15;
  }

  // --- SECTION 2.5: DEEP DIAGNOSTIC & ACTIVE RESOLUTION ---
  y = checkPage(y, 100);
  doc.setFillColor(teal);
  doc.rect(marginX, y, 5, 10, 'F');
  doc.setFontSize(18);
  doc.setTextColor(slate);
  doc.text('Deep Diagnostic & Active Resolution', marginX + 10, y + 8);
  y += 18;

  const diagnosticMap: Record<string, { why: string; ingredients: string }> = {
    acne: {
      why: "Acne is typically caused by a combination of excess sebum production (oil), clogging of hair follicles by dead skin cells, and colonization by P. acnes bacteria. This leads to inflammation and visible lesions.",
      ingredients: "Salicylic Acid (BHA) to exfoliate inside pores, Zinc PCA to regulate oil, and Niacinamide to reduce post-acne redness."
    },
    'acné': {
      why: "L'acné est causée par une surproduction de sébum, l'obstruction des follicules et la prolifération bactérienne, entraînant une inflammation cutanée.",
      ingredients: "Acide Salicylique pour désincruster, Zinc PCA pour réguler le sébum et Niacinamide pour apaiser."
    },
    wrinkles: {
      why: "Wrinkles occur due to a natural decline in collagen and elastin production, accelerated by UV exposure (photo-aging) and oxidative stress. This results in structural weakening of the skin matrix.",
      ingredients: "Retinoids to stimulate collagen turnover, Peptides to firm the skin structure, and Hyaluronic Acid for deep plumping."
    },
    rides: {
      why: "Les rides sont le résultat d'une diminution du collagène et de l'élastine, souvent accentuée par l'exposition aux UV et le stress oxydatif.",
      ingredients: "Rétinol pour le renouvellement cellulaire, Peptides pour la fermeté et Acide Hyaluronique pour repulper."
    },
    'enlarged-pores': {
      why: "Enlarged pores are often the result of loss of skin elasticity around the pore wall and chronic congestion from oil and debris, making them appear wider and more visible.",
      ingredients: "Niacinamide to tighten pore appearance, Salicylic Acid to clear debris, and Glycolic Acid (AHA) to refine surface texture."
    },
    pores: {
      why: "Enlarged pores are often the result of loss of skin elasticity around the pore wall and chronic congestion from oil and debris.",
      ingredients: "Niacinamide to tighten pore appearance, Salicylic Acid to clear debris."
    },
    'skin redness': {
      why: "Persistent redness or sensitivity usually indicates a compromised skin barrier and dilated surface capillaries, often triggered by environmental stressors or inflammatory responses.",
      ingredients: "Azelaic Acid to reduce vascular inflammation, Centella Asiatica to soothe the barrier, and Ceramides to repair skin defense."
    },
    redness: {
      why: "Persistent redness or sensitivity usually indicates a compromised skin barrier and dilated surface capillaries.",
      ingredients: "Azelaic Acid to reduce vascular inflammation, Centella Asiatica to soothe the barrier."
    },
    'rougeurs': {
      why: "Les rougeurs persistantes indiquent une barrière cutanée fragilisée et une microcirculation réactive aux agresseurs extérieurs.",
      ingredients: "Acide Azélaïque pour l'inflammation, Centella Asiatica pour apaiser et Céramides pour réparer."
    },
    'dark-spots': {
      why: "Dark spots and uneven tone are caused by an overproduction of melanin in response to UV damage, hormonal changes, or post-inflammatory responses (PIH).",
      ingredients: "Vitamin C to inhibit melanin synthesis, Tranexamic Acid to fade existing spots, and high SPF to prevent further darkening."
    },
    'taches brunes': {
      why: "Les taches sont dues à une surproduction de mélanine suite à l'exposition solaire ou des changements hormonaux.",
      ingredients: "Vitamine C pour inhiber la mélanine et Acide Tranexamique pour atténuer les taches existantes."
    },
    pigmentation: {
      why: "Dark spots and uneven tone are caused by an overproduction of melanin.",
      ingredients: "Vitamin C to inhibit melanin synthesis, Tranexamic Acid to fade existing spots."
    },
    hydration: {
      why: "Skin dehydration is a lack of water in the stratum corneum, often caused by low humidity, harsh cleansers, or an impaired lipid barrier that allows Trans-Epidermal Water Loss (TEWL).",
      ingredients: "Multi-weight Hyaluronic Acid to pull moisture deep, Glycerin for surface hydration, and Squalane to lock in moisture."
    },
    'hydratation': {
      why: "La déshydratation est un manque d'eau dans la couche cornée, souvent lié à une barrière lipidique altérée ou des nettoyants trop agressifs.",
      ingredients: "Acide Hyaluronique pour hydrater en profondeur et Glycérine pour maintenir l'eau en surface."
    },
    blackheads: {
      why: "Blackheads (open comedones) form when pores become clogged with oxidized sebum and dead skin cells. The dark color is due to surface oxidation, not dirt.",
      ingredients: "Salicylic Acid to dissolve oil plugs, Charcoal/Clay masks for extraction, and Niacinamide to regulate sebum."
    },
    'points noirs': {
      why: "Les points noirs se forment lorsque les pores sont obstrués par du sébum oxydé au contact de l'air.",
      ingredients: "Acide Salicylique pour dissoudre les bouchons de sébum et Charbon actif pour l'extraction."
    },
    sensitivity: {
      why: "Skin sensitivity often stems from a weakened moisture barrier (Stratum Corneum) that allows irritants to penetrate and trigger inflammatory responses.",
      ingredients: "Ceramides to rebuild the barrier, Panthenol (Pro-Vitamin B5) for soothing, and Centella Asiatica for repair."
    },
    'atrophic scars': {
      why: "Atrophic scars are indentations caused by a loss of tissue during the healing process, commonly following severe inflammatory acne.",
      ingredients: "Retinoids to stimulate skin remodeling, Vitamin C for healing, and Peptides to support tissue repair."
    },
    oiliness: {
      why: "Excessive oiliness (seborrhea) is caused by overactive sebaceous glands, often influenced by hormones, heat, or using overly stripping cleansers that trigger reactive oil production.",
      ingredients: "Zinc PCA to regulate sebum, Niacinamide to balance oil, and Salicylic Acid to clear follicle congestion."
    },
    texture: {
      why: "Rough skin texture is usually the result of accumulated dead skin cells (hyperkeratosis) and uneven cell turnover, making the surface look dull and feel uneven.",
      ingredients: "Glycolic Acid (AHA) for resurfacing, Gluconolactone (PHA) for gentle exfoliation, and Hydrating factors."
    }
  };

  const activeConditions = conditionScores.filter((c: any) => (c.score || 0) >= 5);
  
  if (activeConditions.length > 0) {
    activeConditions.forEach((c: any) => {
      const typeKey = c.type.toLowerCase().trim();
      const detail = diagnosticMap[typeKey];
      if (detail) {
        const score = Math.round(c.score || 0);
        const status = score > 70 ? 'CRITICAL' : score > 40 ? 'MODERATE' : 'STABLE';
        const cardHeight = 70; // Adjust based on text length estimation
        
        y = checkPage(y, cardHeight + 10);

        // --- DRAW CARD ---
        doc.setFillColor(252, 255, 254); // Very light mint
        doc.setDrawColor(204, 251, 241); // Light teal border
        doc.roundedRect(marginX, y, 170, cardHeight, 3, 3, 'FD');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(teal);
        doc.text(`${c.type.toUpperCase()} — ${score}% Severity (${status})`, marginX + 8, y + 10);
        
        doc.setFontSize(8);
        doc.setTextColor(slate);
        doc.text('SCORE INTERPRETATION:', marginX + 8, y + 18);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(gray);
        const interpretation = score > 70 
          ? "Critical level. Immediate clinical intervention is recommended."
          : score > 40
          ? "Moderate concern. Targeted treatment required to stabilize barrier."
          : "Stable/Preventive. Focus on maintenance and long-term protection.";
        const splitInterp = doc.splitTextToSize(interpretation, 155);
        doc.text(splitInterp, marginX + 8, y + 23);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slate);
        doc.text('CLINICAL REASONING:', marginX + 8, y + 35);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(gray);
        const splitWhy = doc.splitTextToSize(detail.why, 155);
        doc.text(splitWhy, marginX + 8, y + 40);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slate);
        doc.text('ACTIVE RESOLUTION:', marginX + 8, y + 55);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(teal);
        const splitIng = doc.splitTextToSize(detail.ingredients, 155);
        doc.text(splitIng, marginX + 8, y + 60);
        
        y += cardHeight + 10;
      }
    });
  } else {
    // Fallback if no conditions are high enough
    doc.setFontSize(10);
    doc.setTextColor(gray);
    doc.setFont('helvetica', 'italic');
    doc.text('Skin appears balanced and healthy. Maintaining the current preventive routine is recommended to preserve barrier integrity.', marginX + 5, y + 5);
    y += 15;
  }

  // --- SECTION 3: KEY ACTIVE INGREDIENTS ---
  y = checkPage(y, 60);
  doc.setFillColor(teal);
  doc.rect(marginX, y, 5, 10, 'F');
  doc.setFontSize(18);
  doc.text('Targeted Active Ingredients', marginX + 10, y + 8);
  
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(gray);
  doc.setFont('helvetica', 'normal');
  
  const ingredients = Array.from(new Set(products?.flatMap((p: any) => p.keyIngredients) || []));
  const ingredientsList = ingredients.length > 0 ? ingredients.slice(0, 8) : ["Niacinamide", "Hyaluronic Acid", "Retinol", "Vitamin C", "Ceramides"];
  
  const ingredientChunks = [];
  for (let i = 0; i < ingredientsList.length; i += 2) {
      ingredientChunks.push(ingredientsList.slice(i, i + 2));
  }

  ingredientChunks.forEach((chunk: any) => {
      doc.text(`• ${chunk[0]}`, marginX + 10, y);
      if (chunk[1]) doc.text(`• ${chunk[1]}`, marginX + 90, y);
      y += 8;
  });

  y += 10;

  // --- SECTION 4: PRESCRIBED AM/PM ROUTINE ---
  y = checkPage(y, 100);
  doc.setFillColor(teal);
  doc.rect(marginX, y, 5, 10, 'F');
  doc.setFontSize(18);
  doc.text('Prescribed Routine Protocol', marginX + 10, y + 8);
  
  y += 18;

  // --- SUBSECTION: CLINICAL OBJECTIVE ---
  doc.setFillColor(lightTeal);
  doc.roundedRect(marginX, y, 170, 20, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(teal);
  doc.setFont('helvetica', 'bold');
  doc.text('ROUTINE CLINICAL OBJECTIVE:', marginX + 5, y + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gray);
  const topConcerns = conditionScores
    .filter((c: any) => (c.score || 0) > 10)
    .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
    .slice(0, 3)
    .map((c: any) => `${c.type} (${Math.round(c.score)}%)`);
  
  const objectiveText = topConcerns.length > 0 
    ? `This routine is bio-engineered to prioritize ${topConcerns.join(', ')}. The active concentrations have been adjusted based on these severity levels to ensure visible repair without barrier irritation.`
    : "This routine focuses on broad-spectrum skin health and barrier preservation through optimized hydration and UV protection.";
  
  const splitObj = doc.splitTextToSize(objectiveText, 160);
  doc.text(splitObj, marginX + 5, y + 14);
  
  y += 30;

  const routineSteps = [
    ... (routine?.morning || []).map((s: any) => ({ ...s, time: 'MORNING (AM)' })),
    ... (routine?.night || []).map((s: any) => ({ ...s, time: 'EVENING (PM)' }))
  ];

  if (routineSteps.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Time', 'Step', 'Product Name', 'Instructions']],
      body: routineSteps.map((s: any) => [
        s.time,
        s.stepName || 'Treatment',
        s.product?.name || 'SVR Treatment',
        s.instruction || 'Apply to clean skin.'
      ]),
      theme: 'striped',
      headStyles: { fillColor: '#f8fafc', textColor: teal, fontStyle: 'bold', lineWidth: 0.1, lineColor: teal },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', width: 30 }, 1: { fontStyle: 'bold', width: 30 }, 2: { width: 50 } },
      margin: { left: marginX }
    });
    y = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.text('No specific routine generated. Please complete a full AI scan.', marginX + 5, y);
    y += 10;
  }

  // --- SECTION 5: RECOMMENDED PRODUCTS DEEP DIVE ---
  y = checkPage(y, 80);
  doc.setFillColor(teal);
  doc.rect(marginX, y, 5, 10, 'F');
  doc.setFontSize(18);
  doc.text('Recommended Clinical Products', marginX + 10, y + 8);
  
  y += 18;

  const productTable = (products || []).slice(0, 6).map((p: any) => [
      p.name,
      p.category.toUpperCase(),
      p.skinBenefit || 'Targeted Treatment',
      (p.keyIngredients || []).join(', ')
  ]);

  if (productTable.length > 0) {
      autoTable(doc, {
          startY: y,
          head: [['Product', 'Category', 'Key Benefit', 'Active Ingredients']],
          body: productTable,
          theme: 'grid',
          headStyles: { fillColor: lightTeal, textColor: slate, fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: { 0: { fontStyle: 'bold', width: 45 }, 3: { fontSize: 7 } },
          margin: { left: marginX }
      });
      y = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- SECTION 6: EXPERT DERMATOLOGICAL ADVICE ---
  y = checkPage(y, 60);
  doc.setFillColor(teal);
  doc.rect(marginX, y, 5, 10, 'F');
  doc.setFontSize(18);
  doc.text('Expert Clinical Guidance', marginX + 10, y + 8);
  
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(gray);
  
  const advice = insight?.expertAdvice || [
    "UV Protection: Apply SPF 50+ every morning to prevent photo-aging and pigmentation.",
    "Hydration: Prioritize Hyaluronic Acid during both AM and PM cycles to reinforce the skin barrier.",
    "Consistency: Visible clinical improvements typically require 4-6 weeks of consistent routine adherence.",
    "Barrier Health: Avoid over-exfoliation; limit active treatments if redness or sensitivity increases."
  ];

  advice.forEach((text: string) => {
    const splitText = doc.splitTextToSize(`• ${text}`, 170);
    doc.text(splitText, marginX + 5, y);
    y += (splitText.length * 6);
  });

  // --- FOOTER & BRANDING ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(teal);
    doc.rect(0, 285, 210, 15, 'F');
    doc.setFontSize(9);
    doc.setTextColor('#ffffff');
    doc.text(`DeepSkyn AI Clinical System  |  Page ${i} of ${pageCount}`, 105, 292, { align: 'center' });
    
    doc.setTextColor(gray);
    doc.setFontSize(7);
    doc.text('CONFIDENTIAL MEDICAL GRADE REPORT - NOT FOR RESALE', marginX, 280);
  }

  doc.save(`DeepSkyn_Clinical_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
