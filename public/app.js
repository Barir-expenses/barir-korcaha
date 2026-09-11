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

// Clean Text Category Tags (Since jsPDF fonts don't render unicode emojis)
function getCategoryTag(title) {
    const t = title.toLowerCase();
    if (t.includes('rent') || t.includes('room') || t.includes('house') || t.includes('flat')) return '[RENT]';
    if (t.includes('food') || t.includes('grocery') || t.includes('ration') || t.includes('rice') || t.includes('milk') || t.includes('veg')) return '[GROCERY]';
    if (t.includes('bill') || t.includes('electric') || t.includes('power') || t.includes('current') || t.includes('light')) return '[UTILITY]';
    if (t.includes('wifi') || t.includes('net') || t.includes('recharge') || t.includes('mobile') || t.includes('phone')) return '[NETWORK]';
    if (t.includes('auto') || t.includes('cab') || t.includes('bus') || t.includes('petrol') || t.includes('diesel') || t.includes('travel') || t.includes('bike')) return '[TRAVEL]';
    if (t.includes('med') || t.includes('doctor') || t.includes('pharma') || t.includes('health')) return '[MEDICAL]';
    if (t.includes('maid') || t.includes('cook') || t.includes('clean') || t.includes('wash')) return '[MAINT]';
    if (t.includes('gas') || t.includes('cylinder')) return '[GAS]';
    return '[GENERAL]';
}

// Custom Font Loader Helper
async function loadFontAsBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

// ALL-CAPS BOLD PDF GENERATOR WITH CLEAN CATEGORY TAGS
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

            // 1. BRAND HEADER (ALL CAPS)
            doc.setFont(activeFont, "bold");
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); 
            doc.text("BARIR KORCHA", 14, 20);

            doc.setFontSize(8.5);
            doc.setFont(activeFont, "bold");
            doc.setTextColor(71, 85, 105);
            doc.text("EXPENSE STATEMENT & LEDGER", 14, 26);

            // CURVED META CARD (TOP RIGHT)
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.3);
            doc.roundedRect(130, 10, 66, 22, 4, 4, 'FD');

            doc.setFontSize(7.5);
            doc.setFont(activeFont, "bold");
            doc.setTextColor(71, 85, 105);
            doc.text("PERIOD:", 134, 16);
            doc.text("DATE:", 134, 21);
            doc.text("REF NO:", 134, 26);

            doc.setTextColor(15, 23, 42);
            doc.text(periodText, 153, 16);
            doc.text(generatedDate, 153, 21);
            doc.text(docRef, 153, 26);

            // 2. CURVED SUMMARY CARDS (ALL CAPS & TAGS)
            const rx = 4;

            // Card 1: Total Transactions
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(14, 38, 56, 20, rx, rx, 'FD');
            doc.setFontSize(7.5);
            doc.setFont(activeFont, "bold");
            doc.setTextColor(71, 85, 105);
            doc.text("TOTAL TRANSACTIONS 💵", 19, 45);
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(`${data.length} RECORDS`, 19, 52);

            // Card 2: Unique Categories
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(76, 38, 56, 20, rx, rx, 'FD');
            doc.setFontSize(7.5);
            doc.setFont(activeFont, "bold");
            doc.setTextColor(71, 85, 105);
            doc.text("UNIQUE CATEGORIES", 81, 45);
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(`${Object.keys(groupedMap).length} ITEMS`, 81, 52);

            // Card 3: Total Spent
            doc.setFillColor(254, 242, 242);
            doc.setDrawColor(252, 165, 165);
            doc.roundedRect(138, 38, 58, 20, rx, rx, 'FD');
            doc.setFontSize(7.5);
            doc.setFont(activeFont, "bold");
            doc.setTextColor(185, 28, 28);
            doc.text("TOTAL SPENT 💰", 143, 45);
            doc.setFontSize(12);
            doc.setTextColor(153, 27, 27);
            doc.text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 143, 52);

            // 3. LEDGER TABLE SECTION (ALL CAPS & TAGS)
            doc.setFontSize(10.5);
            doc.setFont(activeFont, "bold");
            doc.setTextColor(15, 23, 42);
            doc.text("EXPENSE BREAKDOWN 📊", 14, 67);

            const tableRows = Object.keys(groupedMap).map((title, idx) => {
                const totalAmt = groupedMap[title].totalAmount;
                const count = groupedMap[title].count;
                const tag = getCategoryTag(groupedMap[title].rawTitle);

                return [
                    `#${String(idx + 1).padStart(2, '0')}`,
                    `${tag} ${title}`,
                    `${count} ${count > 1 ? 'ENTRIES' : 'ENTRY'}`,
                    `₹${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                ];
            });

            doc.autoTable({
                startY: 71,
                head: [['#', 'EXPENSE DETAILS', 'FREQUENCY', 'TOTAL AMOUNT']],
                body: tableRows,
                theme: 'striped',
                headStyles: { 
                    fillColor: [15, 23, 42], 
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    font: activeFont,
                    fontSize: 8.5,
                    cellPadding: 4
                },
                bodyStyles: { 
                    font: activeFont,
                    fontStyle: 'bold',
                    fontSize: 8.5, 
                    textColor: [15, 23, 42],
                    cellPadding: 3.8
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] },
                    1: { cellWidth: 95, fontStyle: 'bold' },
                    2: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
                    3: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] }
                },
                margin: { left: 14, right: 14 }
            });

            // 4. FOOTER (ALL CAPS)
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setDrawColor(203, 213, 225);
                doc.line(14, 275, 196, 275);

                doc.setFontSize(8);
                doc.setFont(activeFont, "bold");
                doc.setTextColor(100, 116, 139);
                doc.text("THIS IS A COMPUTER-GENERATED STATEMENT FROM BARIR KORCHA.", 14, 282);
                doc.text(`PAGE ${i} OF ${pageCount}`, 178, 282);
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
