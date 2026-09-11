// Credentials (Apni Supabase URL & Anon Key yaha daalein)
const SUPABASE_URL = "https://gmsapmodgwhmsgmgdzfm.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtc2FwbW9kZ3dobXNnbWdkemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTEyMzAsImV4cCI6MjEwNDYyNzIzMH0.XJm5a28xV-wF9_y7F4q8JiS73Ui8rFIczUDb63WJ1RM";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editingExpenseId = null;

document.addEventListener('DOMContentLoaded', () => {
    const expenseDateInput = document.getElementById('expense_date');
    if (expenseDateInput) expenseDateInput.valueAsDate = new Date();
    
    const yearInput = document.getElementById('pdfYear');
    if (yearInput) yearInput.value = new Date().getFullYear();

    const monthSelect = document.getElementById('pdfMonth');
    if (monthSelect) monthSelect.value = new Date().getMonth() + 1;

    loadExpenses();
    loadExpenseSuggestions();

    const drawer = document.getElementById('drawerMenu');
    const menuToggle = document.getElementById('menuToggle');
    const closeDrawer = document.getElementById('closeDrawer');

    if (menuToggle && drawer) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            drawer.classList.add('active');
        });
    }

    if (closeDrawer && drawer) {
        closeDrawer.addEventListener('click', (e) => {
            e.stopPropagation();
            drawer.classList.remove('active');
        });
    }

    const reportTypeSelect = document.getElementById('reportType');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', handleReportTypeToggle);
        handleReportTypeToggle();
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => loadExpenses());
    }
});

function handleReportTypeToggle() {
    const reportTypeSelect = document.getElementById('reportType');
    const monthlyGroup = document.getElementById('monthlyGroup');
    if (!monthlyGroup || !reportTypeSelect) return;

    if (reportTypeSelect.value === 'monthly') {
        monthlyGroup.style.display = 'block';
    } else {
        monthlyGroup.style.display = 'none';
    }
}

async function loadExpenses() {
    try {
        let query = supabaseClient.from('expenses').select('*');

        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            query = query.ilike('title', `%${searchInput.value.trim()}%`);
        }

        const { data, error } = await query
            .order('expense_date', { ascending: false })
            .limit(5);

        if (error) throw error;

        const tbody = document.getElementById('expenseList');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.expense_date}</td>
                        <td>${item.title}</td>
                        <td class="amount-td">₹${Number(item.amount).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No records found.</td></tr>`;
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

async function loadExpenseSuggestions() {
    try {
        const { data, error } = await supabaseClient
            .from('expenses')
            .select('title, amount');

        if (error) throw error;

        const datalist = document.getElementById('expenseSuggestions');
        if (!datalist) return;
        datalist.innerHTML = '';

        if (data && data.length > 0) {
            const categoryTotals = {};
            data.forEach(item => {
                const title = item.title.trim();
                const amount = Number(item.amount) || 0;
                categoryTotals[title] = (categoryTotals[title] || 0) + amount;
            });

            Object.keys(categoryTotals).forEach(title => {
                const totalFormatted = categoryTotals[title].toLocaleString('en-IN', { minimumFractionDigits: 2 });
                const option = document.createElement('option');
                option.value = title; 
                option.label = `${title} (Total: ₹${totalFormatted})`;
                datalist.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Suggestions Fetch Error:", err);
    }
}

const expenseForm = document.getElementById('expenseForm');
if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('amount').value;
        const title = document.getElementById('title').value;
        const expense_date = document.getElementById('expense_date').value;

        if (!amount || !title || !expense_date) {
            alert("Kripya saare fields bharein.");
            return;
        }

        try {
            if (editingExpenseId) {
                const { error } = await supabaseClient
                    .from('expenses')
                    .update({ amount: parseFloat(amount), title: title.trim(), expense_date })
                    .eq('id', editingExpenseId);

                if (error) throw error;
                editingExpenseId = null;

                const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Save Expense';
            } else {
                const { error } = await supabaseClient
                    .from('expenses')
                    .insert([{ amount: parseFloat(amount), title: title.trim(), expense_date }]);

                if (error) throw error;
            }

            document.getElementById('amount').value = '';
            document.getElementById('title').value = '';
            const badge = document.getElementById('categorySpendBadge');
            if (badge) badge.style.display = 'none';
            
            loadExpenses();
            loadExpenseSuggestions();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    });
}

// Category Tag Helper - General aur Travel tags bilkul hata diye gaye hain[cite: 2]
function getCategoryTag(title) {
    const t = title.toLowerCase();
    if (t.includes('rent') || t.includes('room') || t.includes('house') || t.includes('flat')) return '[RENT] ';
    if (t.includes('food') || t.includes('grocery') || t.includes('ration') || t.includes('rice') || t.includes('milk') || t.includes('veg')) return '[GROCERY] ';
    if (t.includes('bill') || t.includes('electric') || t.includes('power') || t.includes('current') || t.includes('light')) return '[UTILITY] ';
    if (t.includes('wifi') || t.includes('net') || t.includes('recharge') || t.includes('mobile') || t.includes('phone')) return '[NETWORK] ';
    if (t.includes('med') || t.includes('doctor') || t.includes('pharma') || t.includes('health')) return '[MEDICAL] ';
    if (t.includes('maid') || t.includes('cook') || t.includes('clean') || t.includes('wash')) return '[MAINT] ';
    if (t.includes('gas') || t.includes('cylinder')) return '[GAS] ';
    
    return ''; // Baki cases me koi tag nahi judega[cite: 2]
}

// Custom Font Loader Helper[cite: 2]
async function loadFontAsBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

// ADVANCED HIGH-END PDF GENERATOR
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', async () => {
        const reportTypeSelect = document.getElementById('reportType');
        const monthSelect = document.getElementById('pdfMonth');
        const yearInput = document.getElementById('pdfYear');

        const reportType = reportTypeSelect ? reportTypeSelect.value : 'monthly';
        const month = monthSelect ? monthSelect.value : '';
        const year = yearInput ? yearInput.value : '';

        if (!year) {
            alert('Kripya Year enter karein (e.g. 2026).');
            return;
        }

        try {
            let query = supabaseClient.from('expenses').select('*');

            if (reportType === 'monthly' && month) {
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
                query = query.gte('expense_date', startDate).lte('expense_date', endDate);
            } else {
                query = query.gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`);
            }

            const { data, error } = await query.order('expense_date', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                alert(`Selected duration ke liye koi data nahi milaa.`);
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });

            try {
                const fontBoldBase64 = await loadFontAsBase64("https://cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@latest/latin-700-normal.ttf");

                doc.addFileToVFS('PlusJakartaSans-Bold.ttf', fontBoldBase64);
                doc.addFont('PlusJakartaSans-Bold.ttf', 'PlusJakartaSans', 'bold');

                doc.setFont("PlusJakartaSans", "bold");
            } catch (fErr) {
                console.warn("Custom font fetch failed, falling back to Helvetica Bold:", fErr);
                doc.setFont("helvetica", "bold");
            }

            const activeFont = doc.getFont().fontName;

            const monthNames = ["", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
            const periodText = reportType === 'monthly' ? `${monthNames[month]} ${year}` : `YEAR ${year}`;
            const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
            const docRef = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

            const groupedMap = {};
            let grandTotal = 0;

            data.forEach(item => {
                const titleKey = item.title.trim().toUpperCase();
                const amt = Number(item.amount) || 0;
                grandTotal += amt;

                if (!groupedMap[titleKey]) {
                    groupedMap[titleKey] = { totalAmount: 0, count: 0, rawTitle: item.title.trim() };
                }
                groupedMap[titleKey].totalAmount += amt;
                groupedMap[titleKey].count += 1;
            });

            // 1. TOP ACCENT STRIPE
            doc.setFillColor(15, 23, 42); 
            doc.rect(0, 0, 210, 5, 'F');
            doc.setFillColor(16, 185, 129); 
            doc.rect(0, 5, 210, 1.5, 'F');

            // 2. BRAND HEADER
            doc.setFont(activeFont, "bold");
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); 
            doc.text("BARIR KORCHA", 14, 22);

            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text("FINANCIAL STATEMENT & LEDGER REPORT", 14, 27);

            // 3. META DATA CARD
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.roundedRect(128, 12, 68, 22, 3, 3, 'FD');

            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text("STATEMENT PERIOD", 132, 18);
            doc.text("GENERATED ON", 132, 23);
            doc.text("REFERENCE NO", 132, 28);

            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text(periodText, 163, 18);
            doc.text(generatedDate, 163, 23);
            doc.text(docRef, 163, 28);

            // 4. METRIC KPI CARDS
            const rx = 3;

            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, 38, 56, 20, rx, rx, 'FD');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text("TOTAL TRANSACTIONS", 18, 44);
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text(`${data.length} Records`, 18, 52);

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(76, 38, 56, 20, rx, rx, 'FD');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text("CATEGORIES ENGAGED", 80, 44);
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text(`${Object.keys(groupedMap).length} Items`, 80, 52);

            doc.setFillColor(240, 253, 244);
            doc.setDrawColor(187, 247, 208);
            doc.roundedRect(138, 38, 58, 20, rx, rx, 'FD');
            doc.setFontSize(7);
            doc.setTextColor(22, 101, 52);
            doc.text("TOTAL NET EXPENSE", 142, 44);
            doc.setFontSize(12);
            doc.setTextColor(21, 128, 61);
            doc.text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 142, 52);

            // 5. LEDGER TABLE SECTION
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text("ITEMIZED BREAKDOWN", 14, 67);

            const tableRows = Object.keys(groupedMap).map((title, idx) => {
                const totalAmt = groupedMap[title].totalAmount;
                const count = groupedMap[title].count;
                const tag = getCategoryTag(groupedMap[title].rawTitle);

                return [
                    `#${String(idx + 1).padStart(2, '0')}`,
                    `${tag}${title}`,
                    `${count} ${count > 1 ? 'Entries' : 'Entry'}`,
                    `₹${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                ];
            });

            doc.autoTable({
                startY: 71,
                head: [['NO.', 'EXPENSE CATEGORY & DESCRIPTION', 'FREQUENCY', 'AMOUNT (INR)']],
                body: tableRows,
                theme: 'grid',
                headStyles: { 
                    fillColor: [15, 23, 42], 
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    font: activeFont,
                    fontSize: 8,
                    cellPadding: 4,
                    lineColor: [15, 23, 42]
                },
                bodyStyles: { 
                    font: activeFont,
                    fontStyle: 'bold',
                    fontSize: 8.5, 
                    textColor: [30, 41, 59],
                    cellPadding: 3.5,
                    lineColor: [241, 245, 249]
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 14, halign: 'center', textColor: [100, 116, 139] },
                    1: { cellWidth: 104 },
                    2: { cellWidth: 30, halign: 'center' },
                    3: { cellWidth: 34, halign: 'right', textColor: [185, 28, 28] }
                },
                margin: { left: 14, right: 14 }
            });

            // 6. BOTTOM SUMMARY BANNER
            const finalY = doc.lastAutoTable.finalY + 6;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, finalY, 182, 12, 2, 2, 'FD');
            
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text("GRAND TOTAL SPENT", 20, finalY + 7.5);
            
            doc.setFontSize(10);
            doc.setTextColor(185, 28, 28);
            doc.text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 188, finalY + 7.5, { align: 'right' });

            // 7. FOOTER
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setDrawColor(226, 232, 240);
                doc.line(14, 276, 196, 276);

                doc.setFontSize(7.5);
                doc.setFont(activeFont, "bold");
                doc.setTextColor(148, 163, 184);
                doc.text("CONFIDENTIAL  |  GENERATED VIA BARIR KORCHA SYSTEM", 14, 282);
                doc.text(`PAGE ${i} OF ${pageCount}`, 196, 282, { align: 'right' });
            }

            const fileName = reportType === 'monthly' ? `BARIR_KORCHA_${monthNames[month]}_${year}.pdf` : `BARIR_KORCHA_${year}.pdf`;
            doc.save(fileName);

            const drawer = document.getElementById('drawerMenu');
            if (drawer) drawer.classList.remove('active');

        } catch (err) {
            alert(`PDF Error: ${err.message}`);
        }
    });
}
